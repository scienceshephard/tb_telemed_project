import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../client';
import Chat from './Chat';

export default function VideoChat({ 
  roomName,
  displayName,
  onHangup,
  isDoctor,
  appointmentId,
  currentUserId,
  otherUserId,
  otherUserName 
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const channelRef = useRef(null);
  const makingOfferRef = useRef(false);
  const politeRef = useRef(!isDoctor); // Patient is polite, doctor is impolite
  const pendingCandidatesRef = useRef([]); // Queue for early ICE candidates
  
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [showPrejoin, setShowPrejoin] = useState(true);
  const [error, setError] = useState(null);
  const [showChat, setShowChat] = useState(false);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { 
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
    ],
  };

  // Initialize media stream
  async function initializeMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getAudioTracks().forEach(track => {
        track.enabled = !audioMuted;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = !videoMuted;
      });

      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Could not access camera/microphone. Please check permissions.');
      throw err;
    }
  }

  // Create peer connection with perfect negotiation pattern
  function createPeerConnection() {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Perfect negotiation - handle offers
    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current = true;
        console.log('Negotiation needed, creating offer...');
        await pc.setLocalDescription();
        sendSignal({
          type: 'description',
          description: pc.localDescription,
        });
      } catch (err) {
        console.error('Error in negotiation:', err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        sendSignal({
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsJoining(false);
      } else if (pc.connectionState === 'failed') {
        setError('Connection failed. Please try again.');
        setIsConnected(false);
      } else if (pc.connectionState === 'disconnected') {
        setIsConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        // Restart ICE
        pc.restartIce();
      }
    };

    return pc;
  }

  // Send signaling message
  async function sendSignal(signal) {
    try {
      const { error } = await supabase.from('video_signals').insert({
        room_name: roomName,
        signal_data: signal,
        sender_name: displayName,
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
    } catch (err) {
      console.error('Error sending signal:', err);
    }
  }

  // Handle incoming signals with perfect negotiation + candidate queuing
  async function handleSignal(signal) {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (signal.type === 'description') {
        const description = signal.description;
        const offerCollision = description.type === 'offer' &&
          (makingOfferRef.current || pc.signalingState !== 'stable');

        const ignoreOffer = !politeRef.current && offerCollision;
        
        if (ignoreOffer) {
          console.log('Ignoring offer due to collision (impolite peer)');
          return;
        }

        console.log('Received description:', description.type);
        await pc.setRemoteDescription(description);

        if (description.type === 'offer') {
          console.log('Creating answer...');
          await pc.setLocalDescription();
          sendSignal({
            type: 'description',
            description: pc.localDescription,
          });
        }

        // ⭐ Process any queued ICE candidates now that we have remote description
        console.log(`Processing ${pendingCandidatesRef.current.length} pending candidates`);
        while (pendingCandidatesRef.current.length > 0) {
          const candidate = pendingCandidatesRef.current.shift();
          try {
            await pc.addIceCandidate(candidate);
            console.log('Added queued ICE candidate');
          } catch (err) {
            console.error('Error adding queued candidate:', err);
          }
        }

      } else if (signal.type === 'candidate') {
        try {
          // ⭐ If we don't have a remote description yet, queue the candidate
          if (!pc.remoteDescription || !pc.remoteDescription.type) {
            console.log('Queueing ICE candidate (no remote description yet)');
            pendingCandidatesRef.current.push(signal.candidate);
          } else {
            console.log('Adding ICE candidate');
            await pc.addIceCandidate(signal.candidate);
          }
        } catch (err) {
          if (!politeRef.current) {
            console.warn('Error adding ICE candidate:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error handling signal:', err);
    }
  }

  // Join room - FIXED VERSION
  async function joinRoom() {
    setIsJoining(true);
    setError(null);
    pendingCandidatesRef.current = []; // Reset queue

    try {
      console.log('Starting to join room:', roomName, 'as', isDoctor ? 'doctor' : 'patient');
      
      // Clear old signals from this room (optional but recommended)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase
        .from('video_signals')
        .delete()
        .eq('room_name', roomName)
        .lt('created_at', tenMinutesAgo);

      await initializeMedia();
      console.log('Media initialized successfully');

      createPeerConnection();
      console.log('Peer connection created');

      // Subscribe to signaling channel
      const channel = supabase.channel(`video-room-${roomName}`);
      
      // Listen for signaling messages from Realtime
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'video_signals',
        filter: `room_name=eq.${roomName}`
      }, (payload) => {
        const signal = payload.new.signal_data;
        const sender = payload.new.sender_name;
        
        console.log('Received signal from:', sender, 'type:', signal.type);
        if (sender !== displayName) {
          handleSignal(signal);
        }
      });

      await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to signaling channel');
        }
      });

      channelRef.current = channel;

      // ⭐ CRITICAL FIX: Fetch and process existing signals
      // Wait a tiny bit to ensure subscription is fully active
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Fetching existing signals...');
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: existingSignals, error: fetchError } = await supabase
        .from('video_signals')
        .select('*')
        .eq('room_name', roomName)
        .neq('sender_name', displayName)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching existing signals:', fetchError);
      } else if (existingSignals && existingSignals.length > 0) {
        console.log(`Processing ${existingSignals.length} existing signals`);
        
        // ⭐ Process descriptions first, then candidates
        const descriptions = existingSignals.filter(s => s.signal_data.type === 'description');
        const candidates = existingSignals.filter(s => s.signal_data.type === 'candidate');
        
        for (const signal of descriptions) {
          await handleSignal(signal.signal_data);
        }
        
        for (const signal of candidates) {
          await handleSignal(signal.signal_data);
        }
      } else {
        console.log('No existing signals found - waiting for other participant');
      }

      setShowPrejoin(false);
      setIsJoining(false);
      console.log('Successfully joined room');
      
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room: ' + err.message);
      setIsJoining(false);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    }
  }

  // Leave room
  function leaveRoom() {
    console.log('Leaving room...');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    pendingCandidatesRef.current = [];
    setIsConnected(false);
    setShowPrejoin(true);
    
    if (typeof onHangup === 'function') {
      onHangup();
    }
  }

  // Toggle audio
  function toggleAudio() {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setAudioMuted(!audioTracks[0].enabled);
    }
  }

  // Toggle video
  function toggleVideo() {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setVideoMuted(!videoTracks[0].enabled);
    }
  }

  // Initialize preview
  useEffect(() => {
    async function initPreview() {
      if (showPrejoin) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true,
          });

          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          stream.getAudioTracks().forEach(track => {
            track.enabled = !audioMuted;
          });
          stream.getVideoTracks().forEach(track => {
            track.enabled = !videoMuted;
          });
        } catch (err) {
          console.error('Error initializing preview:', err);
          setError('Could not access camera/microphone. Please check permissions.');
        }
      }
    }

    initPreview();
  }, [showPrejoin]);

  useEffect(() => {
    if (localStreamRef.current && showPrejoin) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !audioMuted;
      });
    }
  }, [audioMuted, showPrejoin]);

  useEffect(() => {
    if (localStreamRef.current && showPrejoin) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoMuted;
      });
    }
  }, [videoMuted, showPrejoin]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative">
      {/* Video Area */}
      <div className={`flex-1 relative transition-all duration-300 ${showChat ? 'mr-96' : ''}`}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-black"
        />

        <div className="absolute top-4 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            You ({displayName})
          </div>
        </div>

        {!isConnected && !isJoining && !showPrejoin && (
          <div className="absolute top-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
            ⏳ Waiting for other participant...
          </div>
        )}

        {isJoining && (
          <div className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
            🔄 Connecting...
          </div>
        )}

        {isConnected && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            ✓ Connected
          </div>
        )}
      </div>

      {/* Pre-join screen */}
      {showPrejoin && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black z-50">
          <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4">
            <h3 className="text-2xl font-bold mb-2 text-gray-900">
              {isDoctor ? '👨‍⚕️ Doctor Consultation' : '🏥 Patient Consultation'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Room: <strong className="text-blue-600">{roomName}</strong>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display name
              </label>
              <input
                type="text"
                value={displayName || ''}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>

            <div className="mb-6 relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
              {videoMuted && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-white text-center">
                    <div className="text-4xl mb-2">📷</div>
                    <p>Camera is off</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setAudioMuted(!audioMuted)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                  audioMuted 
                    ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                    : 'bg-green-100 text-green-700 border-2 border-green-300'
                }`}
              >
                {audioMuted ? '🔇 Mic Muted' : '🎤 Mic On'}
              </button>
              <button
                onClick={() => setVideoMuted(!videoMuted)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                  videoMuted 
                    ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                    : 'bg-green-100 text-green-700 border-2 border-green-300'
                }`}
              >
                {videoMuted ? '📹 Camera Off' : '📷 Camera On'}
              </button>
            </div>

            {isJoining ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Joining consultation...</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={joinRoom}
                  disabled={isJoining}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
                >
                  🎥 Join Now
                </button>
                <button
                  onClick={() => {
                    if (localStreamRef.current) {
                      localStreamRef.current.getTracks().forEach(track => track.stop());
                      localStreamRef.current = null;
                    }
                    if (typeof onHangup === 'function') {
                      onHangup();
                    }
                  }}
                  className="px-6 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control buttons */}
      {!showPrejoin && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 bg-black/80 p-4 rounded-xl backdrop-blur-md shadow-2xl z-40">
          <button
            onClick={toggleAudio}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              audioMuted 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur'
            }`}
          >
            {audioMuted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              videoMuted 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur'
            }`}
          >
            {videoMuted ? '📹 Camera On' : '📷 Camera Off'}
          </button>

          {appointmentId && currentUserId && otherUserId && (
            <button
              onClick={() => setShowChat(!showChat)}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                showChat 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur'
              }`}
            >
              💬 Chat
            </button>
          )}
          
          <button
            onClick={leaveRoom}
            className="px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
          >
            📞 End Call
          </button>
        </div>
      )}

      {/* Chat Sidebar */}
      {showChat && appointmentId && currentUserId && otherUserId && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-300 z-50 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <Chat
              appointmentId={appointmentId}
              currentUserId={currentUserId}
              otherUserId={otherUserId}
              otherUserName={otherUserName}
            />
          </div>
        </div>
      )}

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
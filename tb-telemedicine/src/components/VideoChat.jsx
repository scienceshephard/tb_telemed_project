import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../client';

// WebRTC Video Chat using Supabase Realtime for signaling
// Props:
// - roomName: unique room identifier (string)
// - displayName: user display name
// - onHangup: optional callback invoked when the user hangs up
// - isDoctor: optional flag for role-based UI
export default function VideoChat({ roomName, displayName, onHangup, isDoctor }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const channelRef = useRef(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [showPrejoin, setShowPrejoin] = useState(true);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('new');

  // ICE servers configuration (using free STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
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

      // Apply initial mute states
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

  // Create peer connection
  function createPeerConnection() {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        sendSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsJoining(false);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('Connection lost. Please try rejoining.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  }

  // Send signaling message via Supabase
  async function sendSignal(signal) {
    try {
      await supabase.from('video_signals').insert({
        room_name: roomName,
        signal_data: signal,
        sender_name: displayName,
      });
    } catch (err) {
      console.error('Error sending signal:', err);
    }
  }

  // Handle incoming signaling messages
  async function handleSignal(signal) {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (signal.type === 'offer') {
        console.log('Received offer');
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({
          type: 'answer',
          answer: pc.localDescription,
        });
      } else if (signal.type === 'answer') {
        console.log('Received answer');
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === 'ice-candidate') {
        console.log('Received ICE candidate');
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error('Error handling signal:', err);
    }
  }

  // Join the video room
  async function joinRoom() {
    setIsJoining(true);
    setError(null);

    try {
      console.log('Starting to join room:', roomName);
      
      // Initialize media
      const stream = await initializeMedia();
      console.log('Media initialized successfully');

      // Create peer connection
      createPeerConnection();
      console.log('Peer connection created');

      // Subscribe to signaling channel using Supabase Realtime
      const channel = supabase.channel(`video-room-${roomName}`, {
        config: {
          broadcast: { self: false },
        },
      });
      
      // Listen for signaling messages
      channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
        console.log('Received signal from:', payload.sender);
        if (payload.sender !== displayName) {
          handleSignal(payload.signal);
        }
      });

      // Subscribe to the channel
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to channel');
          
          // Create and send offer (initiator creates offer)
          const pc = peerConnectionRef.current;
          if (pc) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            // Broadcast offer
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                sender: displayName,
                signal: {
                  type: 'offer',
                  offer: pc.localDescription,
                },
              },
            });

            console.log('Offer sent, waiting for answer...');
          }
        }
      });

      channelRef.current = channel;
      setShowPrejoin(false);
      setIsJoining(false);
      console.log('Successfully joined room');
      
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room: ' + err.message);
      setIsJoining(false);
      
      // Clean up on error
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

  // Leave the room
  function leaveRoom() {
    console.log('Leaving room...');
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log('Closed peer connection');
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      console.log('Unsubscribed from channel');
    }

    setIsConnected(false);
    setShowPrejoin(true);
    
    if (typeof onHangup === 'function') {
      console.log('Calling onHangup callback');
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

  // Initialize preview stream when component mounts
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

          // Apply initial mute states
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

  // Update track states when mute buttons are toggled during prejoin
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up...');
      
      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Unsubscribe from channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col relative">
      {/* Video containers - always rendered */}
      <div className={`flex-1 relative ${showPrejoin ? 'hidden' : 'flex'}`}>
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-black"
        />

        {/* Local video (picture-in-picture) */}
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

        {/* Connection status indicator */}
        {!isConnected && !isJoining && (
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
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
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

            {/* Video preview */}
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
                    // Stop any preview streams
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

      {/* Control buttons - only show when in call */}
      {!showPrejoin && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 bg-black/80 p-4 rounded-xl backdrop-blur-md shadow-2xl">
          <button
            onClick={toggleAudio}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              audioMuted 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur'
            }`}
            title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
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
            title={videoMuted ? 'Enable camera' : 'Disable camera'}
          >
            {videoMuted ? '📹 Camera On' : '📷 Camera Off'}
          </button>
          
          <button
            onClick={leaveRoom}
            className="px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
            title="Leave consultation"
          >
            📞 End Call
          </button>
        </div>
      )}

      {/* CSS for mirror effect on local video */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
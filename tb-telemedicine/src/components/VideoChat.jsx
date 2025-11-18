import React, { useEffect, useRef, useState } from 'react';
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
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  
  const [showPrejoin, setShowPrejoin] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  function loadJitsiScript() {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        console.log('✅ Jitsi API already loaded');
        resolve();
        return;
      }

      console.log('📥 Loading Jitsi script...');
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Jitsi script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Jitsi script');
        reject(new Error('Failed to load Jitsi'));
      };
      document.body.appendChild(script);
    });
  }

  async function joinRoom() {
    setIsJoining(true);
    console.log('🚀 Starting to join room:', roomName);

    try {
      await loadJitsiScript();
      console.log('📹 Creating Jitsi meeting...');

      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: audioMuted,
          startWithVideoMuted: videoMuted,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fullscreen', 'fodeviceselection', 'hangup',
            'chat', 'videoquality', 'filmstrip',
            'tileview', 'mute-everyone', 'security'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        },
        userInfo: {
          displayName: displayName,
        }
      };

      console.log('🔧 Jitsi options:', options);

      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;

      console.log('✅ Jitsi API created');

      // Event listeners
      api.addEventListener('videoConferenceJoined', (event) => {
        console.log('✅ Joined conference successfully', event);
        setShowPrejoin(false);
        setIsJoining(false);
      });

      api.addEventListener('videoConferenceLeft', () => {
        console.log('👋 Left conference');
        if (onHangup) onHangup();
      });

      api.addEventListener('readyToClose', () => {
        console.log('🔚 Ready to close');
        if (onHangup) onHangup();
      });

      api.addEventListener('participantJoined', (event) => {
        console.log('👤 Participant joined:', event);
      });

      api.addEventListener('errorOccurred', (error) => {
        console.error('❌ Jitsi error:', error);
      });

    } catch (error) {
      console.error('❌ Error joining Jitsi room:', error);
      setIsJoining(false);
      alert('Failed to join video call. Please try again.');
    }
  }

  function leaveRoom() {
    console.log('👋 Leaving room...');
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    if (onHangup) onHangup();
  }

  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up Jitsi...');
      // Only cleanup if we're actually leaving the page, not during React StrictMode double-mount
      if (jitsiApiRef.current && !showPrejoin) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [showPrejoin]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative">
      {/* Video Container */}
      <div className={`flex-1 relative transition-all duration-300 ${showChat ? 'mr-96' : ''}`}>
        <div 
          ref={jitsiContainerRef} 
          className="w-full h-full bg-black"
          style={{ 
            display: showPrejoin ? 'none' : 'block',
            minHeight: '100vh'
          }}
        ></div>

        {showPrejoin && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <div className="p-8 bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4">
              <h3 className="text-2xl font-bold mb-2 text-gray-900">
                {isDoctor ? '👨‍⚕️ Doctor Consultation' : '🏥 Patient Consultation'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Room: <strong className="text-blue-600">{roomName}</strong>
              </p>

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

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Powered by Jitsi Meet - Free, secure video conferencing
                </p>
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
                    🎥 Join Consultation
                  </button>
                  <button
                    onClick={() => {
                      if (onHangup) onHangup();
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
      </div>

      {/* Chat Sidebar */}
      {showChat && appointmentId && currentUserId && otherUserId && !showPrejoin && (
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

      {/* Toggle Chat Button (only show when in call) */}
      {!showPrejoin && appointmentId && currentUserId && otherUserId && (
        <button
          onClick={() => setShowChat(!showChat)}
          className={`fixed bottom-6 right-6 z-40 px-6 py-3 rounded-lg font-medium transition shadow-2xl ${
            showChat 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          💬 {showChat ? 'Hide' : 'Show'} Chat
        </button>
      )}
    </div>
  );
}
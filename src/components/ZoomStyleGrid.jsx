import React from 'react';
import { useParticipants } from '@livekit/components-react';

function ParticipantThumb({ participant, currentUser, onMuteToggle, isHost }) {
  const videoTrack = participant?.videoTracks?.values?.()?.next?.()?.value || null;
  const participantName = participant?.name || participant?.identity || "Guest";
  const isCurrentUser = currentUser?.name === participantName || currentUser?.id === participant?.identity;
  const isMicOn = !!participant?.isMicrophoneEnabled;
  const isCameraOn = !!participant?.isCameraEnabled;

  const handleToggleCamera = async () => {
    if (participant?.setCameraEnabled) {
      try {
        await participant.setCameraEnabled(!isCameraOn);
      } catch (e) {
        console.error('Failed to toggle camera:', e);
      }
    }
  };

  const handleToggleMic = async () => {
    if (participant?.setMicrophoneEnabled) {
      try {
        await participant.setMicrophoneEnabled(!isMicOn);
      } catch (e) {
        console.error('Failed to toggle mic:', e);
      }
    }
  };

  return (
    <div className="relative flex-shrink-0 w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden border border-white/10 bg-black group">
      {/* Video or Avatar */}
      {videoTrack?.videoTrack && isCameraOn ? (
        <video
          ref={(el) => {
            if (el && videoTrack?.videoTrack) {
              try {
                videoTrack.videoTrack.attach(el);
              } catch (e) {
                console.warn('Failed to attach video track:', e);
              }
            }
          }}
          autoPlay
          playsInline
          muted={participant?.isLocal}
          className={`w-full h-full object-cover ${participant?.isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-900/30 to-indigo-900/30">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-lg font-bold mx-auto">
              {participantName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        </div>
      )}

      {/* Controls overlay (for current user or host) */}
      {(isCurrentUser || isHost) && (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isCurrentUser && (
            <>
              <button
                onClick={handleToggleCamera}
                className={`p-1 rounded text-[10px] ${
                  isCameraOn ? 'bg-white/20' : 'bg-red-500/80'
                }`}
                title={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
              >
                📷
              </button>
              <button
                onClick={handleToggleMic}
                className={`p-1 rounded text-[10px] ${
                  isMicOn ? 'bg-emerald-500/80' : 'bg-red-500/80'
                }`}
                title={isMicOn ? 'Mute' : 'Unmute'}
              >
                🎙️
              </button>
            </>
          )}
          {isHost && !isCurrentUser && (
            <button
              onClick={() => onMuteToggle?.(participantName)}
              className={`p-1 rounded text-[10px] ${
                isMicOn ? 'bg-emerald-500/80' : 'bg-red-500/80'
              }`}
              title={isMicOn ? 'Mute participant' : 'Unmute participant'}
            >
              🎙️
            </button>
          )}
        </div>
      )}

      {/* Info bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold truncate text-white">
            {participantName}
            {isCurrentUser && <span className="text-white/60"> (You)</span>}
          </span>
          
          {/* Mic indicator */}
          <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
            isMicOn ? 'bg-emerald-500/80' : 'bg-red-500/80'
          }`}>
            <span className="text-[8px]">{isMicOn ? '🎙️' : '🔇'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoomStyleGrid({ currentUser, onMuteToggle, onMuteAll, isHost }) {
  const liveKitParticipants = useParticipants() || [];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Live Video</div>
          <h3 className="text-lg font-extrabold">
            Participants <span className="text-white/60">({liveKitParticipants.length})</span>
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-white/10 bg-black/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_18px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-medium">LIVE</span>
          </div>

          {isHost && liveKitParticipants.length > 0 && (
            <button
              onClick={onMuteAll}
              className="px-3 py-1.5 rounded-xl font-semibold bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition text-xs flex items-center gap-1"
              title="Mute all participants"
            >
              <span>🔇</span>
              <span>Mute All</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable horizontal thumbnails */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {liveKitParticipants.map((participant) => (
            <ParticipantThumb
              key={participant.identity}
              participant={participant}
              currentUser={currentUser}
              onMuteToggle={onMuteToggle}
              isHost={isHost}
            />
          ))}
        </div>
        
        {liveKitParticipants.length === 0 && (
          <div className="text-center py-8 text-white/50">
            <div className="text-3xl mb-2">👻</div>
            <div className="text-sm">No one else here yet</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

export default ZoomStyleGrid;
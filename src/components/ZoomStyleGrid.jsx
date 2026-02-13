import React from 'react';
import { useParticipants } from '@livekit/components-react';

function ParticipantThumb({ participant, currentUser }) {
  const videoTrack = participant.videoTracks.values().next().value;
  const participantName = participant.name || participant.identity;
  const isCurrentUser = currentUser?.name === participantName || currentUser?.id === participant.identity;
  const isMicOn = participant.isMicrophoneEnabled;
  const isCameraOn = participant.isCameraEnabled;

  return (
    <div className="relative flex-shrink-0 w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden border border-white/10 bg-black group">
      {/* Video or Avatar */}
      {videoTrack?.videoTrack && isCameraOn ? (
        <video
          ref={(el) => {
            if (el && videoTrack.videoTrack) {
              videoTrack.videoTrack.attach(el);
            }
          }}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`w-full h-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
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

      {/* Info bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold truncate text-white">
            {participantName}
            {isCurrentUser && <span className="text-white/60"> (You)</span>}
          </span>
          
          {/* Mic indicator */}
          <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
            isMicOn ? 'bg-emerald-500/80' : 'bg-red-500/80'
          }`}>
            {isMicOn ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoomStyleGrid({ currentUser }) {
  const liveKitParticipants = useParticipants();

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Live Video</div>
          <h3 className="text-lg font-extrabold">
            Participants <span className="text-white/60">({liveKitParticipants.length})</span>
          </h3>
        </div>
        
        <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-white/10 bg-black/30">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_18px_rgba(239,68,68,0.8)]" />
          <span className="text-[10px] font-medium">LIVE</span>
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
import React from 'react';
import { useParticipants, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';


function ParticipantTile({ participant, isSinging, isNext, isMuted, onMuteToggle }) {
  if (!participant) return null;

  // These may not exist depending on SDK version / participant state
  const videoPub = participant.videoTracks?.values ? participant.videoTracks.values().next().value : null;
  const audioPub = participant.audioTracks?.values ? participant.audioTracks.values().next().value : null;

  const videoTrack = videoPub?.videoTrack || null;
  const participantName = participant.name || participant.identity || "Unknown";

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border ${
        isSinging 
          ? 'border-fuchsia-500 ring-4 ring-fuchsia-500/30' 
          : isNext
          ? 'border-yellow-500/50 ring-2 ring-yellow-500/20'
          : 'border-white/10'
      } bg-black aspect-video group`}
    >
      {/* Video or Avatar */}
{videoTrack ? (
  <video
    ref={(el) => {
      if (el && videoTrack) videoTrack.attach(el);
    }}
    autoPlay
    playsInline
    muted={participant.isLocal}
    className={`w-full h-full object-cover ${participant.isLocal ? "scale-x-[-1]" : ""}`}
  />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-fuchsia-900/30 to-indigo-900/30">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              {participantName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <p className="text-sm text-white/70">{participantName}</p>
            <p className="text-xs text-white/40 mt-1">Camera off</p>
          </div>
        </div>
      )}

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold truncate">{participantName}</span>
            
            {isSinging && (
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500 text-xs font-bold whitespace-nowrap animate-pulse">
                🎤 SINGING
              </span>
            )}
            
            {isNext && !isSinging && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/80 text-xs font-bold whitespace-nowrap">
                ⏭️ NEXT
              </span>
            )}
          </div>

          {/* Mic Control */}
          <button
            onClick={() => onMuteToggle(participantName, !isMuted)}
            className={`p-1.5 rounded-lg transition ${
              isMuted
                ? 'bg-red-500/90 hover:bg-red-500'
                : 'bg-emerald-500/90 hover:bg-emerald-500'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Singing border effect */}
      {isSinging && (
        <div className="absolute inset-0 pointer-events-none border-4 border-fuchsia-500 rounded-2xl animate-pulse" />
      )}
    </div>
  );
}

function SingerSpotlight({ roomCode, currentSong, participants, participantMutes, onMuteToggle, onMuteAll, queue }) {
  // Get LiveKit participants
  const liveKitParticipants = useParticipants();
  
  const currentSinger = currentSong?.requestedBy || currentSong?.singerName;
  const nextSong = queue && queue.length > 0 ? [...queue].sort((a, b) => a.addedAt - b.addedAt)[0] : null;
  const nextSinger = nextSong?.requestedBy || nextSong?.singerName;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/50">Live Video</div>
          <h3 className="text-2xl font-extrabold">
            {currentSinger ? (
              <>
                <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff)]">
                  {currentSinger}
                </span>
                <span className="text-white/60 text-lg ml-2">is singing</span>
              </>
            ) : (
              <span className="text-white/60">Participants</span>
            )}
          </h3>
          
          {nextSinger && (
            <div className="mt-1 text-sm text-white/50">
              Up next: <span className="text-fuchsia-400 font-semibold">{nextSinger}</span>
            </div>
          )}
        </div>

        {/* Emergency Mute All */}
        <button
          onClick={onMuteAll}
          className="px-4 py-2 rounded-xl font-bold bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition flex items-center gap-2"
          title="Mute everyone except current singer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <span className="text-xs">Mute All</span>
        </button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {liveKitParticipants.map((participant) => {
          const participantName = participant.name || participant.identity;
          const isSinging = participantName === currentSinger;
          const isNext = participantName === nextSinger;
          const isMuted = participantMutes[participantName] === true;

          return (
            <ParticipantTile
              key={participant.identity}
              participant={participant}
              isSinging={isSinging}
              isNext={isNext}
              isMuted={isMuted}
              onMuteToggle={onMuteToggle}
            />
          );
        })}
      </div>

      {liveKitParticipants.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-center">
          <div className="text-5xl mb-3">👻</div>
          <div className="text-lg font-bold">No participants yet</div>
          <div className="mt-1 text-white/60 text-sm">
            Share the room code for people to join
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-fuchsia-500 ring-2 ring-fuchsia-500/30" />
          <span>Currently singing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border border-yellow-500/50 ring-2 ring-yellow-500/20" />
          <span>Up next</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Mic on</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Muted</span>
        </div>
      </div>
    </div>
  );
}

export default SingerSpotlight;
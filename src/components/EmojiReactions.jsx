import React, { useState, useEffect } from "react";
import { database, ref, push, set, onValue } from "../utils/firebase";

const REACTION_EMOJIS = ["🔥", "❤️", "😂", "👏", "😭", "🎤", "⭐", "💯"];

function EmojiReactions({ roomCode, currentUser }) {
  const [reactions, setReactions] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  // Listen to reactions
  useEffect(() => {
    if (!roomCode) return;

    const reactionsRef = ref(database, `karaoke-rooms/${roomCode}/reactions`);
    
    const unsubscribe = onValue(reactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reactionList = Object.entries(data).map(([id, reaction]) => ({
          id,
          ...reaction,
        }));
        setReactions(reactionList);
      } else {
        setReactions([]);
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  // Auto-cleanup old reactions (older than 5 seconds)
  useEffect(() => {
    if (!roomCode) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const reactionsRef = ref(database, `karaoke-rooms/${roomCode}/reactions`);
      
      reactions.forEach((reaction) => {
        if (now - reaction.timestamp > 5000) {
          const reactionRef = ref(database, `karaoke-rooms/${roomCode}/reactions/${reaction.id}`);
          set(reactionRef, null).catch(() => {});
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomCode, reactions]);

  const handleSendReaction = async (emoji) => {
    const reactionsRef = ref(database, `karaoke-rooms/${roomCode}/reactions`);
    const newReactionRef = push(reactionsRef);

    await set(newReactionRef, {
      emoji,
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: Date.now(),
      // Random starting position for animation
      startX: Math.random() * 80 + 10, // 10-90% from left
    });

    setShowPicker(false);
  };

  // Filter recent reactions (last 5 seconds)
  const recentReactions = reactions.filter(
    (r) => Date.now() - r.timestamp < 5000
  );

  return (
    <>
      {/* Floating reactions overlay */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        {recentReactions.map((reaction) => {
          const age = Date.now() - reaction.timestamp;
          const progress = age / 5000; // 0 to 1 over 5 seconds

          return (
            <div
              key={reaction.id}
              className="absolute animate-float-up"
              style={{
                left: `${reaction.startX}%`,
                bottom: `${10 + progress * 80}%`, // Rise from 10% to 90%
                fontSize: '3rem',
                opacity: 1 - progress, // Fade out
                transform: `scale(${1 - progress * 0.3})`, // Shrink slightly
                transition: 'all 0.5s ease-out',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {reaction.emoji}
            </div>
          );
        })}
      </div>

      {/* Reaction picker button */}
      <div className="relative">
        {!showPicker ? (
          <button
            onClick={() => setShowPicker(true)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition backdrop-blur-xl"
            title="Send a reaction"
          >
            <span className="text-xl">😊</span>
          </button>
        ) : (
          <div className="absolute bottom-full mb-2 right-0 rounded-2xl border border-white/20 bg-black/95 backdrop-blur-2xl shadow-2xl p-3 animate-scale-in">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
              <span className="text-xs text-white/60 font-semibold">Quick Reactions</span>
              <button
                onClick={() => setShowPicker(false)}
                className="text-white/60 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="text-3xl hover:scale-125 transition-transform active:scale-95 p-2 rounded-xl hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float-up {
          from {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: translateY(-100px) scale(0.7);
            opacity: 0;
          }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-float-up {
          animation: float-up 5s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default EmojiReactions;
import React, { useState, useEffect, useRef, useMemo } from "react";
import { database, ref, push, set, onValue } from "../utils/firebase";

const EMOJI_REACTIONS = ["🔥", "❤️", "😂", "👏", "😭", "🎤", "⭐", "💯"];

// Throttle helper
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

function ChatPanel({ roomCode, currentUser, currentSong }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Throttled update function
  const updateMessages = useRef(
    throttle((messageList) => {
      setMessages(messageList);
    }, 100) // Update at most every 100ms
  ).current;

  // Listen to chat messages
  useEffect(() => {
    if (!roomCode) return;

    const messagesRef = ref(database, `karaoke-rooms/${roomCode}/chat`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]) => ({
          id,
          ...msg,
        }));
        // Sort by timestamp
        messageList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        updateMessages(messageList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [roomCode, updateMessages]);

  // Auto-scroll to bottom when new messages arrive - optimized
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      // Use requestAnimationFrame to avoid blocking
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages.length, isOpen]); // Only trigger on message count change

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Clear input immediately for instant feedback
    const messageToSend = message.trim();
    setMessage("");

    // Fire and forget - don't await
    const chatRef = ref(database, `karaoke-rooms/${roomCode}/chat`);
    const newMessageRef = push(chatRef);

    set(newMessageRef, {
      userId: currentUser.id,
      userName: currentUser.name,
      message: messageToSend,
      timestamp: Date.now(),
    }).catch((err) => {
      console.error("Failed to send message:", err);
      // Optionally restore message on error
      setMessage(messageToSend);
    });
  };

  const handleSendEmoji = (emoji) => {
    // Fire and forget - don't await, don't block UI
    const chatRef = ref(database, `karaoke-rooms/${roomCode}/chat`);
    const newMessageRef = push(chatRef);

    set(newMessageRef, {
      userId: currentUser.id,
      userName: currentUser.name,
      message: emoji,
      isEmoji: true,
      timestamp: Date.now(),
    }).catch((err) => {
      console.error("Failed to send emoji:", err);
    });
  };

  const unreadCount = useMemo(() => {
    if (isOpen) return 0;
    // You could track last read timestamp here
    return 0;
  }, [isOpen, messages]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600/90 to-indigo-600/90 hover:from-fuchsia-600 hover:to-indigo-600 text-white font-bold shadow-2xl border border-white/20 backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span>Chat</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-xs">
              {unreadCount}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-80 sm:w-96 h-[32rem] rounded-3xl border border-white/20 bg-black/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-fuchsia-900/40 to-indigo-900/40">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h3 className="font-bold text-lg">Chat</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.2) transparent'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-white/40 text-sm mt-8">
            <div className="text-4xl mb-2">👋</div>
            <div>No messages yet</div>
            <div className="text-xs mt-1">Be the first to say something!</div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser.id;
            const isEmojiOnly = msg.isEmoji || (msg.message && msg.message.length <= 2 && /^\p{Emoji}+$/u.test(msg.message));

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && (
                    <div className="text-xs text-white/50 mb-1 px-2">
                      {msg.userName}
                    </div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isEmojiOnly
                        ? 'bg-transparent text-4xl'
                        : isMe
                        ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <div className="text-[10px] text-white/30 mt-1 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Quick Reactions */}
      <div className="px-4 py-2 border-t border-white/10 bg-black/50">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendEmoji(emoji)}
              className="text-2xl hover:scale-125 transition-transform active:scale-95 shrink-0"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition font-bold"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default React.memo(ChatPanel, (prevProps, nextProps) => {
  // Only re-render if roomCode or currentUser.id changes
  // Don't re-render for currentSong changes
  return prevProps.roomCode === nextProps.roomCode && 
         prevProps.currentUser?.id === nextProps.currentUser?.id;
});
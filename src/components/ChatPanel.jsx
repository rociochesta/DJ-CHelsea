import React, { useState, useEffect, useRef } from "react";
import { database, ref, push, set, onValue } from "../utils/firebase";
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Flame,
  Heart,
  Laugh,
  Hand,
  Star,
  Mic,
  Sparkles,
} from "lucide-react";

// Replace emoji reactions with lucide-only mapping
const QUICK_REACTIONS = [
  { key: "fire", label: "🔥", icon: Flame },
  { key: "love", label: "❤️", icon: Heart },
  { key: "lol", label: "😂", icon: Laugh },
  { key: "clap", label: "👏", icon: Hand },
  { key: "star", label: "⭐", icon: Star },
  { key: "mic", label: "🎤", icon: Mic },
  { key: "wow", label: "💯", icon: Sparkles },
];

// Throttle helper
const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

function ChatPanel({ roomCode, currentUser, currentSong, inline = false }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Throttled update function
  const updateMessages = useRef(
    throttle((messageList) => {
      setMessages(messageList);
    }, 100)
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
        messageList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        updateMessages(messageList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [roomCode, updateMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages.length, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const messageToSend = message.trim();
    setMessage("");

    const chatRef = ref(database, `karaoke-rooms/${roomCode}/chat`);
    const newMessageRef = push(chatRef);

    set(newMessageRef, {
      userId: currentUser.id,
      userName: currentUser.name,
      message: messageToSend,
      timestamp: Date.now(),
    }).catch((err) => {
      console.error("Failed to send message:", err);
      setMessage(messageToSend);
    });
  };

  const handleSendReaction = (reaction) => {
    const chatRef = ref(database, `karaoke-rooms/${roomCode}/chat`);
    const newMessageRef = push(chatRef);

    // Keep existing wire format (message is emoji string) so your DB / other clients don't break.
    set(newMessageRef, {
      userId: currentUser.id,
      userName: currentUser.name,
      message: reaction.label,
      isEmoji: true,
      timestamp: Date.now(),
    }).catch((err) => {
      console.error("Failed to send reaction:", err);
    });
  };

  const CardShell = ({ children, className = "", style }) => (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg",
        "flex flex-col overflow-hidden",
        className,
      ].join(" ")}
      style={style}
    >
      {children}
    </div>
  );

  const Header = ({ compact = false }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-white/70" />
        <h3 className={["font-semibold", compact ? "text-sm" : "text-base"].join(" ")}>
          Chat
        </h3>
        {currentSong?.title ? (
          <div className="hidden sm:flex items-center gap-2 ml-3 text-xs text-white/50">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate max-w-[220px]">{currentSong.title}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 rounded-xl border border-white/10 bg-transparent text-white/70 hover:text-white hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.12)] transition active:scale-[0.98]"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const ReactionsRow = () => (
    <div className="px-3 py-2 border-t border-white/10 bg-black/20">
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {QUICK_REACTIONS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => handleSendReaction(r)}
              className={[
                "shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl",
                "border border-fuchsia-500/25 text-white/80 bg-transparent",
                "hover:border-fuchsia-400/40 hover:text-white hover:shadow-[0_0_14px_rgba(232,121,249,0.14)]",
                "transition active:scale-[0.98]",
              ].join(" ")}
              title={r.key}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{r.key}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const Messages = ({ compact = false }) => (
    <div
      ref={chatContainerRef}
      className={[
        "flex-1 overflow-y-auto",
        compact ? "p-3 space-y-2" : "p-4 space-y-3",
      ].join(" ")}
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.18) transparent",
      }}
    >
      {messages.length === 0 ? (
        <div className="text-center text-white/45 text-sm mt-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.02]">
            <MessageSquare className="w-5 h-5 text-white/50" />
          </div>
          <div className="mt-3">No messages yet</div>
          <div className="text-xs mt-1 text-white/35">Say something to start the chaos (politely).</div>
        </div>
      ) : (
        messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isEmojiOnly =
            msg.isEmoji ||
            (msg.message &&
              msg.message.length <= 2 &&
              /^\p{Emoji}+$/u.test(msg.message));

          // Keep emoji messages readable but avoid “emoji UI” elsewhere
          const bubbleClass = isEmojiOnly
            ? "bg-transparent border-transparent text-3xl px-2 py-1"
            : isMe
            ? "bg-white/[0.04] border-fuchsia-500/25 text-white"
            : "bg-white/[0.03] border-white/10 text-white/90";

          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                {!isMe && (
                  <div className="text-[10px] text-white/45 mb-1 px-2">
                    {msg.userName}
                  </div>
                )}

                <div
                  className={[
                    "rounded-2xl border",
                    "px-3 py-2 text-sm",
                    "shadow-sm",
                    bubbleClass,
                  ].join(" ")}
                >
                  {msg.message}
                </div>

                {!compact && msg.timestamp ? (
                  <div className="text-[10px] text-white/25 mt-1 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const Input = ({ compact = false }) => (
    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/20">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message…"
          className={[
            "flex-1 px-3 py-2 rounded-xl",
            "bg-white/[0.03] border border-white/10",
            "text-white text-sm placeholder-white/35",
            "focus:outline-none focus:border-fuchsia-400/40 focus:ring-2 focus:ring-fuchsia-400/10",
          ].join(" ")}
          maxLength={200}
        />

        <button
          type="submit"
          disabled={!message.trim()}
          className={[
            "inline-flex items-center gap-2 px-3 py-2 rounded-xl",
            "bg-transparent border border-fuchsia-500/35 text-white/85",
            "hover:border-fuchsia-400/50 hover:text-white hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "transition active:scale-[0.98]",
          ].join(" ")}
          title="Send"
        >
          <Send className="w-4 h-4" />
          <span className="text-sm font-semibold hidden sm:inline">Send</span>
        </button>
      </div>
    </form>
  );

  // --- INLINE MODE (embedded in layout) ---
  if (inline) {
    if (!isOpen) {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className={[
            "w-full px-4 py-3 rounded-2xl text-left",
            "border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg",
            "hover:border-white/20 hover:bg-white/[0.04] transition",
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white/70" />
            <span className="font-semibold">Chat</span>
            <span className="text-xs text-white/45 ml-auto">Open</span>
          </div>
        </button>
      );
    }

    return (
      <CardShell style={{ height: "28rem" }}>
        <Header compact />
        <Messages compact />
        <ReactionsRow />
        <Input compact />
      </CardShell>
    );
  }

  // --- FLOATING MODE (original behavior, restyled) ---
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={[
          "fixed bottom-4 left-4 z-40",
          "px-4 py-3 rounded-2xl",
          "border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg",
          "hover:border-white/20 hover:bg-white/[0.04] transition",
          "active:scale-[0.98]",
        ].join(" ")}
        title="Open chat"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-white/70" />
          <span className="font-semibold">Chat</span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-80 sm:w-96 h-[32rem]">
      <CardShell className="h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white/70" />
            <h3 className="font-semibold">Chat</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={[
              "px-3 py-1.5 rounded-xl",
              "bg-transparent border border-white/10 text-white/70",
              "hover:text-white hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.12)]",
              "transition active:scale-[0.98]",
            ].join(" ")}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Messages />
        <ReactionsRow />
        <Input />
      </CardShell>
    </div>
  );
}

export default React.memo(ChatPanel, (prevProps, nextProps) => {
  return (
    prevProps.roomCode === nextProps.roomCode &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    prevProps.inline === nextProps.inline
  );
});
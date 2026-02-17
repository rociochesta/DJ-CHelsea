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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const QUICK_REACTIONS = [
  { key: "fire", label: "🔥", icon: Flame },
  { key: "love", label: "❤️", icon: Heart },
  { key: "lol", label: "😂", icon: Laugh },
  { key: "clap", label: "👏", icon: Hand },
  { key: "star", label: "⭐", icon: Star },
  { key: "mic", label: "🎤", icon: Mic },
  { key: "wow", label: "💯", icon: Sparkles },
];

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

  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Track whether user is near bottom (so we don't yank them around)
  const stickToBottomRef = useRef(true);

  const updateMessages = useRef(
    throttle((messageList) => setMessages(messageList), 100)
  ).current;

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

  // Track if user scrolls up
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 120;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, [isOpen]);

  // Scroll only the chat container, only if user is near bottom
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!isOpen || !el) return;

    if (stickToBottomRef.current) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
    })
      .then(() => {
        requestAnimationFrame(() => inputRef.current?.focus());
      })
      .catch((err) => {
        console.error("Failed to send message:", err);
        setMessage(messageToSend);
      });
  };

  const handleSendReaction = (reaction) => {
    const chatRef = ref(database, `karaoke-rooms/${roomCode}/chat`);
    const newMessageRef = push(chatRef);

    set(newMessageRef, {
      userId: currentUser.id,
      userName: currentUser.name,
      message: reaction.label,
      isEmoji: true,
      timestamp: Date.now(),
    })
      .then(() => {
        requestAnimationFrame(() => inputRef.current?.focus());
      })
      .catch((err) => {
        console.error("Failed to send reaction:", err);
      });
  };

  // ── Reusable JSX fragments (inlined, NOT components) ──

  const headerJsx = (compact = false) => (
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

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsOpen(false)}
        className="p-2 rounded-xl border border-white/10 bg-transparent text-white/70 hover:text-white hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.12)] transition active:scale-[0.98]"
        title="Minimize"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );

  const messagesJsx = (compact = false) => (
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
          <div className="text-xs mt-1 text-white/35">
            Say something to start the chaos (politely).
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const isEmojiOnly =
            msg.isEmoji ||
            (msg.message &&
              msg.message.length <= 2 &&
              /^\p{Emoji}+$/u.test(msg.message));

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

                <div className={["rounded-2xl border px-3 py-2 text-sm shadow-sm", bubbleClass].join(" ")}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const reactionsRowJsx = (
    <div className="px-3 py-2 border-t border-white/10 bg-black/20">
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {QUICK_REACTIONS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSendReaction(r)}
              className={[
                "group shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl",
                "border border-fuchsia-500/25 text-white/80 bg-transparent",
                "hover:border-fuchsia-400/45 hover:text-white",
                "hover:shadow-[0_0_14px_rgba(232,121,249,0.18)]",
                "transition active:scale-[0.98]",
              ].join(" ")}
              title={r.key}
            >
              <Icon className="w-4 h-4 text-white/70 group-hover:text-white" />
              <span className="text-xs font-medium">{r.key}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const inputJsx = (
    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/20">
      <div className="flex gap-2">
        <input
          ref={inputRef}
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

  // ── CLOSED STATE (shared between inline and floating) ──

  const closedButton = (extraClass = "") => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => setIsOpen(true)}
      className={[
        "px-4 py-3 rounded-2xl text-left",
        "border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg",
        "hover:border-white/20 hover:bg-white/[0.04] transition",
        "active:scale-[0.98]",
        extraClass,
      ].join(" ")}
      title="Open chat"
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-white/70" />
        <span className="font-semibold">Chat</span>
        <ChevronUp className="w-4 h-4 text-white/60 ml-auto" />
      </div>
    </button>
  );

  // ── INLINE ──
  if (inline) {
    if (!isOpen) return closedButton("w-full");

    return (
      <div
        className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg flex flex-col overflow-hidden"
        style={{ height: "28rem" }}
      >
        {headerJsx(true)}
        {messagesJsx(true)}
        {reactionsRowJsx}
        {inputJsx}
      </div>
    );
  }

  // ── FLOATING ──
  if (!isOpen) return closedButton("fixed bottom-4 left-4 z-40");

  return (
    <div className="fixed bottom-4 left-4 z-40 w-80 sm:w-96 h-[32rem]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg flex flex-col overflow-hidden h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white/70" />
            <h3 className="font-semibold">Chat</h3>
          </div>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl bg-transparent border border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.12)] transition active:scale-[0.98]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {messagesJsx()}
        {reactionsRowJsx}
        {inputJsx}
      </div>
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

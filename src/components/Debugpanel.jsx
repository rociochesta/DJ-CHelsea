import React, { useState } from "react";

/**
 * Debug Panel - Add to HostView or ParticipantView for testing
 * Shows current state and allows clearing localStorage
 */
function DebugPanel({ currentUser, roomState }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClearLocalStorage = () => {
    if (confirm("⚠️ Clear ALL local data? You'll need to rejoin the room.")) {
      localStorage.clear();
      alert("✅ Cleared! Refreshing page...");
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const handleClearUserOnly = () => {
    if (confirm("Clear user identity only? (keeps DJ name)")) {
      localStorage.removeItem("karaoke-userid");
      localStorage.removeItem("karaoke-username");
      alert("✅ User cleared! Refreshing...");
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const copyDebugInfo = () => {
    const info = {
      currentUser,
      localStorage: {
        userid: localStorage.getItem("karaoke-userid"),
        username: localStorage.getItem("karaoke-username"),
        djname: localStorage.getItem("karaoke-djname"),
      },
      roomState: {
        participants: roomState?.participants,
        hostId: roomState?.hostId,
        hostName: roomState?.hostName,
      },
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    alert("📋 Debug info copied to clipboard!");
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-xs font-mono"
        title="Debug Panel"
      >
        🐛 DEBUG
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 max-h-96 overflow-auto rounded-2xl border border-white/20 bg-black/90 backdrop-blur-xl p-4 text-xs font-mono">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-purple-400">🐛 Debug Panel</div>
        <button
          onClick={() => setIsOpen(false)}
          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 text-white/70">
        <div>
          <div className="text-white/50 text-[10px] uppercase">Current User</div>
          <div className="text-white">ID: {currentUser?.id}</div>
          <div className="text-white">Name: {currentUser?.name}</div>
        </div>

        <div>
          <div className="text-white/50 text-[10px] uppercase">LocalStorage</div>
          <div>userid: {localStorage.getItem("karaoke-userid")}</div>
          <div>username: {localStorage.getItem("karaoke-username")}</div>
          <div>djname: {localStorage.getItem("karaoke-djname")}</div>
        </div>

        <div>
          <div className="text-white/50 text-[10px] uppercase">Room</div>
          <div>Host ID: {roomState?.hostId}</div>
          <div>Host Name: {roomState?.hostName}</div>
          <div>
            Participants:{" "}
            {roomState?.participants
              ? Object.keys(roomState.participants).length
              : 0}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-white/10">
          <button
            onClick={copyDebugInfo}
            className="w-full px-3 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white"
          >
            📋 Copy Debug Info
          </button>
          <button
            onClick={handleClearUserOnly}
            className="w-full px-3 py-2 rounded-lg bg-yellow-600/80 hover:bg-yellow-600 text-white"
          >
            🔄 Clear User ID
          </button>
          <button
            onClick={handleClearLocalStorage}
            className="w-full px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white"
          >
            🗑️ Clear All Data
          </button>
        </div>

        <div className="text-[10px] text-white/40 pt-2 border-t border-white/10">
          Press F12 → Console for more details
        </div>
      </div>
    </div>
  );
}

export default DebugPanel;
import React, { useState, useEffect } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";

import { database, ref, onValue, set, get, isConfigured } from "./utils/firebase";
import { generateRoomCode, generateUserId } from "./utils/helpers";
import { useDevicePreferences } from "./hooks/useDevicePreferences";

import WelcomeScreen from "./components/WelcomeScreen";
import HostView from "./components/HostView";
import ParticipantView from "./components/ParticipantView";
import EnableMediaOnJoin from "./components/EnableMediaOnJoin";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [screen, setScreen] = useState("welcome"); // welcome, room
  const [djName, setDjName] = useState(
    localStorage.getItem("karaoke-djname") || ""
  );

  // LiveKit token state
  const [lkToken, setLkToken] = useState(null);
  const [lkError, setLkError] = useState("");

  // Device preferences
  const { cameraId, micId } = useDevicePreferences();

  // Check if Firebase is configured
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚙️</div>
            <h1 className="text-3xl font-bold text-karaoke-accent mb-2">
              Setup Required
            </h1>
          </div>

          <div className="space-y-4 text-left">
            <p className="text-gray-300">
              Before you can use 3PM Karaoke, you need to configure Firebase and
              YouTube API.
            </p>

            <div className="bg-karaoke-bg p-4 rounded-lg">
              <h3 className="font-semibold mb-2">📋 Quick Setup Checklist:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-400">
                <li>
                  Open <code className="text-karaoke-accent">SETUP.md</code> in
                  the project folder
                </li>
                <li>Follow the Firebase setup instructions (5 minutes)</li>
                <li>Follow the YouTube API setup instructions (5 minutes)</li>
                <li>
                  Update{" "}
                  <code className="text-karaoke-accent">
                    src/utils/firebase.js
                  </code>{" "}
                  with your config
                </li>
                <li>
                  Update{" "}
                  <code className="text-karaoke-accent">
                    src/utils/youtube.js
                  </code>{" "}
                  with your API key
                </li>
                <li>Refresh this page</li>
              </ol>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> This is a one-time setup. Once
                configured, you'll never see this screen again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initialize user on mount - PERSISTENT ID (prevents duplicates)
  useEffect(() => {
    let userId = localStorage.getItem("karaoke-userid");
    if (!userId) {
      userId = generateUserId();
      localStorage.setItem("karaoke-userid", userId);
    }

    const userName = localStorage.getItem("karaoke-username") || "Guest";

    setCurrentUser({
      id: userId,
      name: userName,
    });
  }, []);

  // Listen to room state from Firebase
  useEffect(() => {
    if (!roomCode) return;

    const roomRef = ref(database, `karaoke-rooms/${roomCode}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      console.log("📊 Room update:", data);

      if (data) {
        setRoomState(data);

        // compute isHost from DB truth
        if (currentUser && data.hostId === currentUser.id) {
          setIsHost(true);
        } else {
          setIsHost(false);
        }
      } else if (screen !== "welcome") {
        alert("Room no longer exists");
        setScreen("welcome");
        setRoomCode("");
        setIsHost(false);
        setRoomState(null);
        setLkToken(null);
        setLkError("");
      }
    });

    return () => unsubscribe();
  }, [roomCode, currentUser, screen]);

  // Fetch LiveKit token when entering room
  useEffect(() => {
    if (!roomCode) return;
    if (screen === "welcome") return;
    if (!currentUser?.name) return;

    let cancelled = false;

    (async () => {
      try {
        setLkError("");
        setLkToken(null);

        const res = await fetch("/.netlify/functions/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomCode, name: currentUser.name }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "LiveKit token request failed");

        if (!cancelled) setLkToken(data.token);
      } catch (e) {
        if (!cancelled) setLkError(String(e?.message || e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode, screen, currentUser?.name]);

  const handleCreateRoom = (chosenDj, roomMode, externalVideoLink) => {
  const code = generateRoomCode();
  setRoomCode(code);

  const updatedUser = { ...currentUser, name: chosenDj };
  setCurrentUser(updatedUser);
  localStorage.setItem("karaoke-username", chosenDj);
  localStorage.setItem("karaoke-djname", chosenDj);

  setIsHost(true);

  const roomRef = ref(database, `karaoke-rooms/${code}`);
  set(roomRef, {
    hostId: updatedUser.id,
    hostName: chosenDj,
    createdAt: Date.now(),
    roomMode: roomMode,
    
    // ADD THESE TWO LINES:
    externalVideoLink: externalVideoLink || null,
    useExternalVideo: !!externalVideoLink,

    micPolicy: roomMode === "karaoke" ? "auto" : "open",
    hostControls: {
      micsLocked: false,
      autoMuteOnJoin: roomMode === "karaoke" || roomMode === "meeting",
      onlySingerMic: roomMode === "karaoke",
    },
    activeReadingId: null,
    activeSingerId: null,
    activeSingerName: null,
    queue: [],
    currentSong: null,
    participants: {
      [updatedUser.id]: {
        id: updatedUser.id,
        name: chosenDj,
        role: "host",
        joinedAt: Date.now(),
      },
    },
    playbackState: {
      isPlaying: false,
      currentTime: 0,
      videoId: null,
    },
  });

  setScreen("room");
};
  const handleJoinRoom = async (code, userName) => {
    const upper = code.toUpperCase();
    setRoomCode(upper);

    const updatedUser = { ...currentUser, name: userName };
    setCurrentUser(updatedUser);
    localStorage.setItem("karaoke-username", userName);

    // Add participant to room (WITH id)
    const participantRef = ref(
      database,
      `karaoke-rooms/${upper}/participants/${updatedUser.id}`
    );

    await set(participantRef, {
      id: updatedUser.id,
      name: userName,
      role: "participant",
      joinedAt: Date.now(),
    });

    // Auto-mute on join if host has it enabled
    try {
      const controlsSnap = await get(ref(database, `karaoke-rooms/${upper}/hostControls`));
      const controls = controlsSnap.val();
      if (controls?.autoMuteOnJoin) {
        const muteRef = ref(database, `karaoke-rooms/${upper}/participantMutes/${userName}`);
        await set(muteRef, true);
      }
    } catch (e) {
      console.error("Failed to check auto-mute setting:", e);
    }

    setScreen("room");
    setIsHost(false);
  };

  // Loading state
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-karaoke-accent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Welcome
  if (screen === "welcome") {
    return (
      <WelcomeScreen
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    );
  }

  // LiveKit wrapper states
  if (lkError) {
    return <div className="text-white p-6">LiveKit error: {lkError}</div>;
  }

  if (!lkToken) {
    return <div className="text-white p-6">Connecting video…</div>;
  }

  const roomMode = roomState?.roomMode || roomState?.meta?.roomMode || "karaoke";
  const isKaraoke = roomMode === "karaoke";

  return (
    <LiveKitRoom
      token={lkToken}
      serverUrl={import.meta.env.VITE_LIVEKIT_URL}
      connect={true}
      audio={false}
      video={true}
      options={{
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
        },
      }}
      style={{ minHeight: "100vh", overflow: "auto" }}
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      {/* <EnableMediaOnJoin /> */}

      {isHost ? (
        <HostView
          roomCode={roomCode}
          currentUser={currentUser}
          roomState={roomState}
        />
      ) : (
        <ParticipantView
          roomCode={roomCode}
          currentUser={currentUser}
          roomState={roomState}
        />
      )}
    </LiveKitRoom>
  );
}

export default App;
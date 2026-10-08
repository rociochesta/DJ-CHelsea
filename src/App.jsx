import React, { useState, useEffect } from "react";

import { database, ref, onValue, set, get, remove, onDisconnect, isConfigured } from "./utils/firebase";
import { generateRoomCode, generateUserId } from "./utils/helpers";
import { createRoomPassword, verifyRoomPassword, playbackRoomMode, getRoomMode, isSecretRoom } from './utils/secretRoom';

import WelcomeScreen from "./components/WelcomeScreen";
import HostView from "./components/HostView";
import ParticipantView from "./components/ParticipantView";
// Temporarily disabled for testing with real guests and song requests.
// import NASimulator from "./components/NASimulator";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [screen, setScreen] = useState("welcome"); // welcome, room
  const [djName, setDjName] = useState(
    localStorage.getItem("karaoke-djname") || ""
  );

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
              Before you can use Rociwi's Hub, you need to configure Firebase and
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

  // Listen to room state from Firebase (debounced to batch rapid writes)
  useEffect(() => {
    if (!roomCode) return;

    const roomRef = ref(database, `karaoke-rooms/${roomCode}`);
    let timer;

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (data) {
          setRoomState(data);
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


        }
      }, 150);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [roomCode, currentUser, screen]);

  const handleCreateRoom = async (chosenDj, groupName, avatar, roomMode, password) => {
    const passwordVerifier = roomMode === 'secret' ? await createRoomPassword(password) : null;
    const code = generateRoomCode();

    const updatedUser = { ...currentUser, name: chosenDj, group: groupName || "", avatar: avatar || "🎤" };
    setCurrentUser(updatedUser);
    localStorage.setItem("karaoke-username", chosenDj);
    localStorage.setItem("karaoke-djname", chosenDj);

    setIsHost(true);

    const roomRef = ref(database, `karaoke-rooms/${code}`);
    const newRoom = {
      hostId: updatedUser.id,
      hostName: chosenDj,
      createdAt: Date.now(),
      roomMode: roomMode,
      ...(passwordVerifier ? { passwordVerifier } : {}),
      activeReadingId: null,
      activeSingerId: null,
      activeSingerName: null,
      queue: [],
      currentSong: null,
      participants: {
        [updatedUser.id]: {
          id: updatedUser.id,
          name: chosenDj,
          group: groupName || "",
          avatar: avatar || "🎤",
          role: "host",
          joinedAt: Date.now(),
        },
      },
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        videoId: null,
      },
    };
    await set(roomRef, newRoom);
    setRoomState(newRoom);
    setRoomCode(code);

    // Auto-remove host from participants list on disconnect (browser close/refresh)
    const hostParticipantRef = ref(database, `karaoke-rooms/${code}/participants/${updatedUser.id}`);
    onDisconnect(hostParticipantRef).remove();

    // Auto-close the entire room when the host disconnects
    if (roomMode !== 'secret') onDisconnect(roomRef).remove();

    setScreen("room");
  };

  const handleJoinRoom = async (code, userName, groupName, avatar, password) => {
    const upper = code.toUpperCase();
    const snapshot = await get(ref(database, `karaoke-rooms/${upper}`));
    if (!snapshot.exists()) throw new Error('Room not found. Check the code and try again.');
    if (!await verifyRoomPassword(snapshot.val(), password)) throw new Error('Incorrect password. Try again.');
    setRoomState({ ...snapshot.val(), roomMode: getRoomMode(snapshot.val()) });
    setRoomCode(upper);

    const updatedUser = { ...currentUser, name: userName, group: groupName || "", avatar: avatar || "🎤" };
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
      group: groupName || "",
      avatar: avatar || "🎤",
      role: "participant",
      joinedAt: Date.now(),
    });

    // Auto-remove participant on disconnect (browser close/refresh)
    onDisconnect(participantRef).remove();
    setScreen("room");
    setIsHost(false);
  };

  const handleCloseRoom = async () => {
    if (!roomCode) return;
    const roomRef = ref(database, `karaoke-rooms/${roomCode}`);
    // Cancel the onDisconnect so it doesn't fire after manual close
    onDisconnect(roomRef).cancel();
    if (isSecretRoom(roomState)) {
      await remove(ref(database, `karaoke-rooms/${roomCode}/participants/${currentUser.id}`));
    } else {
      await remove(roomRef);
    }
    setScreen("welcome");
    setRoomCode("");
    setIsHost(false);
    setRoomState(null);


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

  return (
    <>
      {isHost || isSecretRoom(roomState) ? (
        <HostView
          roomCode={roomCode}
          currentUser={currentUser}
          roomState={roomState}
          onCloseRoom={handleCloseRoom}
        />
      ) : (
        <ParticipantView
          roomCode={roomCode}
          currentUser={currentUser}
          roomState={roomState}
        />
      )}
    </>
  );
}

export default App;

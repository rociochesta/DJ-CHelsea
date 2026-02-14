import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { useDevicePreferences } from "../hooks/useDevicePreferences";

export default function DeviceSettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const previewStreamRef = useRef(null);

  const { localParticipant } = useLocalParticipant();
  const { cameraId, micId, saveCamera, saveMic } = useDevicePreferences();

  // Enumerate devices when panel opens
  useEffect(() => {
    if (!isOpen) return;

    async function enumerateDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audio = devices.filter((d) => d.kind === "audioinput");
        const video = devices.filter((d) => d.kind === "videoinput");

        setAudioDevices(audio);
        setVideoDevices(video);

        // Set initial selections
        if (video.length > 0 && !selectedCamera) {
          setSelectedCamera(cameraId || video[0].deviceId);
        }
        if (audio.length > 0 && !selectedMic) {
          setSelectedMic(micId || audio[0].deviceId);
        }
      } catch (error) {
        console.error("Failed to enumerate devices:", error);
      }
    }

    enumerateDevices();
  }, [isOpen, cameraId, micId, selectedCamera, selectedMic]);

  // Start camera preview when panel opens
  useEffect(() => {
    if (!isOpen || !selectedCamera) return;

    async function startPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedCamera ? { exact: selectedCamera } : undefined },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        previewStreamRef.current = stream;
      } catch (error) {
        console.error("Failed to start camera preview:", error);
      }
    }

    startPreview();

    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
        previewStreamRef.current = null;
      }
    };
  }, [isOpen, selectedCamera]);

  // Start microphone level monitoring
  useEffect(() => {
    if (!isOpen || !selectedMic) return;

    async function startMicMonitoring() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined },
          video: false,
        });

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function updateLevel() {
          if (!analyserRef.current || !isOpen) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setMicLevel(Math.min(100, (average / 255) * 100 * 2));

          animationRef.current = requestAnimationFrame(updateLevel);
        }

        updateLevel();

        // Clean up mic monitoring stream
        return () => {
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (error) {
        console.error("Failed to monitor microphone:", error);
      }
    }

    const cleanup = startMicMonitoring();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (cleanup) {
        cleanup.then((fn) => fn && fn());
      }
    };
  }, [isOpen, selectedMic]);

  // Handle camera change
  const handleCameraChange = async (deviceId) => {
    if (isSwitching) return;

    setIsSwitching(true);
    setSelectedCamera(deviceId);

    try {
      if (localParticipant) {
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setCameraEnabled(true, { deviceId });
      }
      saveCamera(deviceId);
    } catch (error) {
      console.error("Failed to switch camera:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  // Handle microphone change
  const handleMicChange = async (deviceId) => {
    if (isSwitching) return;

    setIsSwitching(true);
    setSelectedMic(deviceId);

    try {
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(false);
        await localParticipant.setMicrophoneEnabled(true, { deviceId });
      }
      saveMic(deviceId);
    } catch (error) {
      console.error("Failed to switch microphone:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-20 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600/90 to-indigo-600/90 hover:from-fuchsia-600 hover:to-indigo-600 text-white font-bold shadow-2xl border border-white/20 backdrop-blur-xl transition-all hover:scale-105 active:scale-95"
        title="Audio & Video Settings"
      >
        ⚙️ Settings
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-20 z-40 w-96 max-h-[90vh] rounded-3xl border border-white/20 bg-black/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-fuchsia-900/40 to-indigo-900/40 flex items-center justify-between">
        <h3 className="font-bold text-lg">Audio & Video Settings</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/60 hover:text-white text-2xl leading-none transition"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Camera Section */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2">
            Camera
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            disabled={isSwitching}
            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20 disabled:opacity-50"
          >
            {videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>

          {/* Camera Preview */}
          <div className="mt-3 rounded-xl overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        </div>

        {/* Microphone Section */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2">
            Microphone
          </label>
          <select
            value={selectedMic}
            onChange={(e) => handleMicChange(e.target.value)}
            disabled={isSwitching}
            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20 disabled:opacity-50"
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>

          {/* Mic Level Meter */}
          <div className="mt-3">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-100"
                style={{ width: `${micLevel}%` }}
              />
            </div>
            <p className="text-xs text-white/40 mt-1">Speak to test microphone</p>
          </div>
        </div>

        {isSwitching && (
          <div className="text-center py-2">
            <p className="text-sm text-fuchsia-400 animate-pulse">Switching devices...</p>
          </div>
        )}
      </div>
    </div>
  );
}

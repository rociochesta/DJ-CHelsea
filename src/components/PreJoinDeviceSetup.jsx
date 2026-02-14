import React, { useState, useEffect, useRef } from "react";
import { useDevicePreferences } from "../hooks/useDevicePreferences";

export default function PreJoinDeviceSetup({ onContinue, onSkip }) {
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [permissionError, setPermissionError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const { saveCamera, saveMic } = useDevicePreferences();

  // Request permissions and enumerate devices
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        setPermissionError(null);

        // Request permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Stop the permission stream
        stream.getTracks().forEach((track) => track.stop());

        // Enumerate devices after permissions granted
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audio = devices.filter((d) => d.kind === "audioinput");
        const video = devices.filter((d) => d.kind === "videoinput");

        setAudioDevices(audio);
        setVideoDevices(video);

        // Set default selections
        if (video.length > 0) setSelectedCamera(video[0].deviceId);
        if (audio.length > 0) setSelectedMic(audio[0].deviceId);

        setIsLoading(false);
      } catch (error) {
        console.error("Permission error:", error);
        setPermissionError(
          "Camera/microphone access denied. Please allow access in your browser settings."
        );
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Start camera preview
  useEffect(() => {
    if (!selectedCamera || permissionError) return;

    async function startPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } },
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
  }, [selectedCamera, permissionError]);

  // Start microphone level monitoring
  useEffect(() => {
    if (!selectedMic || permissionError) return;

    async function startMicMonitoring() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: selectedMic } },
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
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setMicLevel(Math.min(100, (average / 255) * 100 * 2));

          animationRef.current = requestAnimationFrame(updateLevel);
        }

        updateLevel();

        // Return cleanup function
        return () => {
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (error) {
        console.error("Failed to monitor microphone:", error);
      }
    }

    const cleanupPromise = startMicMonitoring();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (cleanupPromise) {
        cleanupPromise.then((cleanup) => cleanup && cleanup());
      }
    };
  }, [selectedMic, permissionError]);

  const handleContinue = () => {
    // Save preferences
    saveCamera(selectedCamera);
    saveMic(selectedMic);

    // Clean up streams
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    onContinue();
  };

  const handleSkip = () => {
    // Clean up streams
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    onSkip();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-fuchsia-400 text-lg font-bold">
          Requesting permissions...
        </div>
        <p className="text-white/60 text-sm mt-2">
          Please allow camera and microphone access
        </p>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 text-lg font-bold mb-4">⚠️ Permission Denied</div>
        <p className="text-white/70 text-sm mb-6">{permissionError}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95 transition"
          >
            Retry
          </button>
          <button
            onClick={handleSkip}
            className="px-6 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition"
          >
            Skip Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-indigo-400">
            Setup Your Devices
          </span>
        </h2>
        <p className="text-white/60 text-sm">
          Select your camera and microphone before joining
        </p>
      </div>

      {/* Camera Section */}
      <div>
        <label className="block text-sm font-semibold text-white/70 mb-2">
          Camera
        </label>
        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20 mb-3"
        >
          {videoDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>

        {/* Camera Preview */}
        <div className="rounded-2xl overflow-hidden bg-black aspect-video">
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
          onChange={(e) => setSelectedMic(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20 mb-3"
        >
          {audioDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>

        {/* Mic Level Meter */}
        <div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-100"
              style={{ width: `${micLevel}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-1">Speak to test your microphone</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleContinue}
          className="flex-1 px-6 py-4 rounded-xl font-bold bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:opacity-95 active:scale-[0.99] transition text-lg"
        >
          Continue to Room
        </button>
        <button
          onClick={handleSkip}
          className="px-6 py-4 rounded-xl font-semibold text-white/60 hover:text-white/80 transition"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

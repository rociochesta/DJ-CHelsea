import React, { useState, useEffect, useRef } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { useDevicePreferences } from "../hooks/useDevicePreferences";
import { Settings, X, Camera, Mic, Loader2 } from "lucide-react";

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

  // Listen for open event from participant tile gear button
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-device-settings", handleOpen);
    return () => window.removeEventListener("open-device-settings", handleOpen);
  }, []);

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

    let stopStream = null;

    async function startMicMonitoring() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined },
          video: false,
        });

        stopStream = () => stream.getTracks().forEach((track) => track.stop());

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
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setMicLevel(Math.min(100, (average / 255) * 100 * 2));

          animationRef.current = requestAnimationFrame(updateLevel);
        }

        updateLevel();
      } catch (error) {
        console.error("Failed to monitor microphone:", error);
      }
    }

    startMicMonitoring();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (stopStream) stopStream();
    };
  }, [isOpen, selectedMic]);

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

  // When closed, render nothing - opened via gear icon in participant tile
  if (!isOpen) {
    return null;
  }

  // ====== OPEN (outlined, minimal overlays, icons) ======
  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-h-[90vh] rounded-3xl border border-white/12 bg-black/60 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-white/80" />
          <h3 className="font-semibold text-white/90">Device Settings</h3>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="w-9 h-9 rounded-xl border border-white/12 bg-white/5
            hover:bg-white/8 hover:border-white/20 transition flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Camera */}
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white/80" />
            </div>
            <div className="font-semibold text-white/90">Camera</div>
          </div>

          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            disabled={isSwitching}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
              focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15
              disabled:opacity-50"
          >
            {videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>

          <div className="mt-3 rounded-xl overflow-hidden bg-black/60 aspect-video border border-white/10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        </div>

        {/* Microphone */}
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white/80" />
            </div>
            <div className="font-semibold text-white/90">Microphone</div>
          </div>

          <select
            value={selectedMic}
            onChange={(e) => handleMicChange(e.target.value)}
            disabled={isSwitching}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
              focus:outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/15
              disabled:opacity-50"
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>

          {/* Mic Meter (no gradient, subtle neon) */}
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className="h-full bg-fuchsia-400/70 transition-all duration-100"
                style={{ width: `${micLevel}%` }}
              />
            </div>
            <p className="text-xs text-white/45 mt-2">Speak to test microphone</p>
          </div>
        </div>

        {isSwitching && (
          <div className="flex items-center justify-center gap-2 text-sm text-white/70 py-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            Switching devices…
          </div>
        )}
      </div>
    </div>
  );
}
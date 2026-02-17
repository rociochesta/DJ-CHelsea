import React, { useEffect, useRef, useState } from "react";
import { useDevicePreferences } from "../hooks/useDevicePreferences";
import {
  Camera,
  Mic,
  AlertTriangle,
  RefreshCcw,
  ChevronRight,
  SkipForward,
} from "lucide-react";

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

  const Card = ({ children, className = "" }) => (
    <div
      className={[
        "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-lg",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );

  const OutlineBtn = ({ children, onClick, tone = "fuchsia", className = "", disabled }) => {
    const toneClass =
      tone === "indigo"
        ? "border-indigo-500/30 hover:border-indigo-400/45 hover:shadow-[0_0_14px_rgba(99,102,241,0.14)]"
        : tone === "neutral"
        ? "border-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(232,121,249,0.10)]"
        : "border-fuchsia-500/35 hover:border-fuchsia-400/50 hover:shadow-[0_0_14px_rgba(232,121,249,0.16)]";

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={[
          "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl",
          "bg-transparent border text-white/85",
          "transition active:scale-[0.98]",
          toneClass,
          disabled ? "opacity-50 cursor-not-allowed" : "",
          className,
        ].join(" ")}
      >
        {children}
      </button>
    );
  };

  // Request permissions and enumerate devices
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        setPermissionError(null);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        stream.getTracks().forEach((track) => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audio = devices.filter((d) => d.kind === "audioinput");
        const video = devices.filter((d) => d.kind === "videoinput");

        setAudioDevices(audio);
        setVideoDevices(video);

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

        return () => {
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (error) {
        console.error("Failed to monitor microphone:", error);
      }
    }

    const cleanupPromise = startMicMonitoring();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (cleanupPromise) cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [selectedMic, permissionError]);

  const handleContinue = () => {
    saveCamera(selectedCamera);
    saveMic(selectedMic);

    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    onContinue();
  };

  const handleSkip = () => {
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
      <Card className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.02] mb-4">
          <Camera className="w-5 h-5 text-white/70" />
        </div>
        <div className="text-white/85 font-semibold">Requesting permissions…</div>
        <p className="text-white/50 text-sm mt-2">
          Allow camera and microphone access to continue
        </p>
      </Card>
    );
  }

  if (permissionError) {
    return (
      <Card className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.02] mb-4">
          <AlertTriangle className="w-5 h-5 text-white/70" />
        </div>
        <div className="text-white/85 font-semibold mb-2">Permissions blocked</div>
        <p className="text-white/55 text-sm mb-6">{permissionError}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <OutlineBtn onClick={() => window.location.reload()} tone="fuchsia">
            <RefreshCcw className="w-4 h-4" />
            Retry
          </OutlineBtn>

          <OutlineBtn onClick={handleSkip} tone="neutral">
            <SkipForward className="w-4 h-4" />
            Skip setup
          </OutlineBtn>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-extrabold">
          <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#ff3aa7,#9b7bff,#ffd24a)]">
            Setup your devices
          </span>
        </h2>
        <p className="text-white/50 text-sm mt-2">
          Pick your camera and mic before joining
        </p>
      </div>

      {/* Camera */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-white/70" />
          <div className="text-sm font-semibold text-white/80">Camera</div>
        </div>

        <select
          value={selectedCamera}
          onChange={(e) => setSelectedCamera(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white/85 focus:outline-none focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-400/10 mb-4"
        >
          {videoDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId} className="bg-[#070712]">
              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>

        <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/40 aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>
      </Card>

      {/* Microphone */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Mic className="w-4 h-4 text-white/70" />
          <div className="text-sm font-semibold text-white/80">Microphone</div>
        </div>

        <select
          value={selectedMic}
          onChange={(e) => setSelectedMic(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white/85 focus:outline-none focus:border-indigo-400/45 focus:ring-2 focus:ring-indigo-400/10 mb-4"
        >
          {audioDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId} className="bg-[#070712]">
              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>

        {/* Mic meter (subtle, no gradient) */}
        <div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/35 transition-all duration-100"
              style={{ width: `${micLevel}%` }}
            />
          </div>
          <p className="text-xs text-white/45 mt-2">Speak to test your microphone</p>
        </div>
      </Card>

      {/* Actions (outline only) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <OutlineBtn onClick={handleContinue} tone="fuchsia" className="flex-1 py-4">
          Continue
          <ChevronRight className="w-4 h-4" />
        </OutlineBtn>

        <OutlineBtn onClick={handleSkip} tone="neutral" className="sm:w-40 py-4">
          Skip
        </OutlineBtn>
      </div>
    </div>
  );
}
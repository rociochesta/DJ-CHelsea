import { useEffect } from "react";
import { useLocalParticipant } from "@livekit/components-react";

/**
 * Component that ensures camera and mic are enabled when joining the room
 */
export default function EnableMediaOnJoin() {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    if (!localParticipant) return;

    async function enableMedia() {
      try {
        // Enable camera and mic
        await localParticipant.setCameraEnabled(true);
        await localParticipant.setMicrophoneEnabled(true);
        console.log("Camera and microphone enabled");
      } catch (error) {
        console.error("Failed to enable camera/mic:", error);
      }
    }

    // Small delay to ensure connection is established
    const timeout = setTimeout(enableMedia, 500);

    return () => clearTimeout(timeout);
  }, [localParticipant]);

  return null; // This component doesn't render anything
}

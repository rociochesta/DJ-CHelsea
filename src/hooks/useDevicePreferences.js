import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'karaoke-device-preferences';

/**
 * Custom hook for managing camera and microphone device preferences
 * Persists selections to localStorage and validates device availability
 */
export function useDevicePreferences() {
  const [cameraId, setCameraId] = useState(null);
  const [micId, setMicId] = useState(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        setCameraId(prefs.cameraDeviceId || null);
        setMicId(prefs.micDeviceId || null);
      }
    } catch (error) {
      console.error('Failed to load device preferences:', error);
    }
  }, []);

  // Save camera preference
  const saveCamera = useCallback((deviceId) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const prefs = stored ? JSON.parse(stored) : {};

      const updated = {
        ...prefs,
        cameraDeviceId: deviceId,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCameraId(deviceId);
    } catch (error) {
      console.error('Failed to save camera preference:', error);
    }
  }, []);

  // Save microphone preference
  const saveMic = useCallback((deviceId) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const prefs = stored ? JSON.parse(stored) : {};

      const updated = {
        ...prefs,
        micDeviceId: deviceId,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMicId(deviceId);
    } catch (error) {
      console.error('Failed to save mic preference:', error);
    }
  }, []);

  // Clear all preferences
  const clearPreferences = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setCameraId(null);
      setMicId(null);
    } catch (error) {
      console.error('Failed to clear preferences:', error);
    }
  }, []);

  return {
    cameraId,
    micId,
    saveCamera,
    saveMic,
    clearPreferences,
  };
}

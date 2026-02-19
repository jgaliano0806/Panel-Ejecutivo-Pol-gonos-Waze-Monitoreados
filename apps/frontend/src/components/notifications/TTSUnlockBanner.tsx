/**
 * Banner que pide al usuario activar el audio para notificaciones TTS.
 * Los navegadores bloquean la reproducción hasta que haya interacción.
 */
import React, { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { initializeAudio, isAudioUnlocked } from "@/lib/tts-utils";

export const TTSUnlockBanner: React.FC = () => {
  const [show, setShow] = useState(() => !isAudioUnlocked());

  useEffect(() => {
    if (isAudioUnlocked()) {
      setShow(false);
      return;
    }
    const onUnlocked = () => setShow(false);
    window.addEventListener("tts-unlocked", onUnlocked);
    return () => window.removeEventListener("tts-unlocked", onUnlocked);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]">
      <button
        onClick={() => {
          initializeAudio();
          setShow(false);
        }}
        className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-colors"
      >
        <Volume2 className="w-5 h-5" />
        <span>Activar notificaciones de voz</span>
      </button>
    </div>
  );
};

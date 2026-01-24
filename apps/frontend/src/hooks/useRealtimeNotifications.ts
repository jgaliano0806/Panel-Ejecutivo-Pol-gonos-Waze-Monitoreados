import { useEffect, useRef } from "react";
import { socket } from "@/services/websocket";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { translateWazeMessage } from "@/lib/waze-translator";

import { speakNotification } from "@/lib/tts-utils";

/**
 * Hook para gestionar la recepción de notificaciones en tiempo real
 * Escucha el evento 'notification:new' del socket y actualiza el store
 */
export function useRealtimeNotifications() {
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Inicializar objeto de audio para el "ding" inicial
    audioRef.current = new Audio("/sounds/notification.mp3");
  }, []);

  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      console.log("🔔 Notificación recibida:", notification);

      // Traducir el mensaje antes de guardar y hablar
      const translatedMessage = translateWazeMessage(notification.message);
      const updatedNotification = {
        ...notification,
        message: translatedMessage,
      };

      // 1. Agregar al store
      addNotification(updatedNotification);

      // 2. Reproducir sonido base
      try {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      } catch (error) {}

      // 3. Verbalizar (TTS) secuencial
      // Agregamos un pequeñísimo delay para que el "ding" no se solape con la voz
      setTimeout(() => {
        speakNotification(
          updatedNotification.title,
          updatedNotification.message,
        );
      }, 500);
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [addNotification]);
}

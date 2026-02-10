import { useEffect, useRef, useCallback } from "react";
import { socket } from "@/services/websocket";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { speakNotification, isAudioUnlocked } from "@/lib/tts-utils";
import { shouldShowTTSAndSnackbar } from "@/config/notificationFilters";

/**
 * Genera un sonido de alerta usando Web Audio API.
 * Solo funciona despues de interaccion del usuario (autoplay policy).
 */
const playAlertBeep = (): void => {
  if (!isAudioUnlocked()) return; // No intentar si audio esta bloqueado

  try {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();

    const playTone = (
      frequency: number,
      startTime: number,
      duration: number,
    ) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    playTone(523.25, now, 0.15);
    playTone(659.25, now + 0.15, 0.2);
  } catch (error) {
    // Silencioso - beep no es critico
  }
};

/**
 * Reproduce TTS de forma sincrona con manejo de errores.
 * speakNotification ya maneja internamente el encolamiento
 * si el audio esta bloqueado, asi que no marcamos como played
 * a menos que el audio este desbloqueado.
 */
const executeTTS = async (
  notification: Notification,
  markTTSPlayed: (id: string) => void,
): Promise<void> => {
  // Si audio no esta desbloqueado, speakNotification solo encola.
  // No marcar como played para que el retry lo intente despues.
  if (!isAudioUnlocked()) {
    await speakNotification(notification.title, notification.message);
    return;
  }

  try {
    // Beep primero
    playAlertBeep();
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Ejecutar TTS
    await speakNotification(notification.title, notification.message);

    // Marcar como reproducido solo si el audio esta desbloqueado
    markTTSPlayed(notification.id);
    console.log("✅ TTS completado para:", notification.id);
  } catch (error) {
    console.error("❌ Error en TTS:", error);
    // NO marcar como played si fallo - el retry lo reintentara
  }
};

/**
 * Hook para gestionar notificaciones en tiempo real con TTS
 */
export function useRealtimeNotifications() {
  const markTTSPlayed = useNotificationStore((state) => state.markTTSPlayed);
  const getPendingTTSNotifications = useNotificationStore(
    (state) => state.getPendingTTSNotifications,
  );

  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // NOTA: El desbloqueo de audio ahora se maneja globalmente en tts-service.ts
  // mediante listeners de click/keydown/touchstart en el document.

  // NOTA: El handler principal para notification:new está en websocket.ts (global)
  // Este hook solo maneja el retry de TTS pendientes para evitar duplicación de TTS
  useEffect(() => {
    console.log("════════════════════════════════════════════════════════");
    console.log("🔌 useRealtimeNotifications: Hook inicializado");
    console.log("🔌 Socket conectado:", socket.connected, "ID:", socket.id);
    console.log("📝 TTS global handler está en websocket.ts");
    console.log("════════════════════════════════════════════════════════");
  }, []);

  // Validación periódica: reintentar TTS para notificaciones pendientes con incidentes activos
  const retryPendingTTS = useCallback(async () => {
    const pending = getPendingTTSNotifications();

    if (pending.length === 0) return;

    console.log(
      `🔄 Revisando ${pending.length} notificaciones pendientes de TTS...`,
    );

    try {
      // Obtener incidentes activos del backend
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
      const response = await fetch(`${API_URL}/incidents/all`);

      if (!response.ok) {
        console.warn("⚠️ No se pudieron obtener incidentes activos");
        return;
      }

      const activeIncidents = await response.json();
      const activeIds = new Set(
        (activeIncidents || []).map((i: any) => i.id || i.uuid),
      );

      console.log(`📊 ${activeIds.size} incidentes activos en el mapa`);

      // Procesar UNA notificación pendiente por ciclo
      for (const notification of pending) {
        const alertId = notification.data?.alertId;
        const incidentType =
          notification.type || notification.data?.incidentType;
        const subtype = notification.data?.subtype;

        console.log(`🔍 Evaluando notificación pendiente:`, {
          id: notification.id,
          alertId,
          type: incidentType,
          subtype,
        });

        // Verificar si debe mostrar TTS según filtros
        if (!shouldShowTTSAndSnackbar(incidentType, subtype)) {
          console.log(`🔕 Filtrado por reglas TTS`);
          markTTSPlayed(notification.id);
          continue;
        }

        // Si tiene alertId, verificar si sigue activo
        if (alertId && !activeIds.has(alertId)) {
          console.log(`⏭️ Incidente ${alertId} ya no activo, omitiendo TTS`);
          markTTSPlayed(notification.id);
          continue;
        }

        // Intentar reproducir TTS
        console.log(`🎤 Intentando TTS para: ${notification.title}`);
        await executeTTS(notification, markTTSPlayed);

        // Solo uno por ciclo para no saturar
        break;
      }
    } catch (error) {
      console.error("❌ Error en validación de TTS pendientes:", error);
    }
  }, [getPendingTTSNotifications, markTTSPlayed]);

  // Configurar intervalo de reintento cada 30 segundos
  useEffect(() => {
    console.log("🔄 Configurando validación periódica de TTS (30s)");

    // Primera validación después de 10 segundos
    const timeout = setTimeout(retryPendingTTS, 10000);

    // Luego cada 30 segundos
    retryIntervalRef.current = setInterval(retryPendingTTS, 30000);

    return () => {
      clearTimeout(timeout);
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
    };
  }, [retryPendingTTS]);
}

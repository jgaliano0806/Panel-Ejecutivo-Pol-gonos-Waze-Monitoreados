/**
 * Alertas sonoras zona roja: sirena (MP3) + TTS con la misma vía que incidentes
 * (Edge TTS / cola compartida y fallback Web Speech de `tts-service`).
 */
import { getIncidentDescription } from "./wazeTranslations";
import {
  initializeAudio,
  isAudioUnlocked,
  speakUsingIncidentVoice,
} from "@/lib/tts-utils";
import { useAuthStore } from "@/stores/useAuthStore";

const SIREN_URL = "/police-siren-repeat-it-wow.mp3";

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

/** Datos mínimos del incidente Waze para traducir tipo/subtipo. */
export interface RedZoneIncidentAudioData {
  type?: string;
  subtype?: string;
}

function normalizeType(t?: string): string {
  if (!t) return "";
  return t.trim().toLowerCase();
}

/**
 * Sirena policial (MP3 público) y, al terminar, mensaje táctico con la misma voz que incidentes.
 */
export async function playCriticalAlert(
  incidentData: RedZoneIncidentAudioData,
  zoneName: string,
): Promise<void> {
  if (!useAuthStore.getState().isAuthenticated) {
    return;
  }
  try {
    const type = normalizeType(incidentData?.type);
    const subtype = incidentData?.subtype;
    const translation = getIncidentDescription(type, subtype || undefined);
    const z = (zoneName || "").trim() || "zona de riesgo";
    const text =
      `Atención sala. ${translation} en zona de riesgo: ${z}. Aguardando validación por cámara y comunicación por radio para despliegue de unidades.`;

    const audio = new Audio(SIREN_URL);
    audio.preload = "auto";

    audio.onended = () => {
      try {
        speakUsingIncidentVoice(text, { priority: true });
      } catch (e) {
        console.warn("[playCriticalAlert] Error al encolar TTS", e);
      }
    };

    await audio.play();
  } catch (e: unknown) {
    const name =
      e && typeof e === "object" && "name" in e
        ? String((e as { name: string }).name)
        : "";
    if (name === "NotAllowedError") {
      console.warn(
        "[playCriticalAlert] Autoplay bloqueado (NotAllowedError). Use «Activar Alertas Sonoras» en el encabezado.",
      );
      return;
    }
    console.warn("[playCriticalAlert] No se pudo reproducir la alerta", e);
  }
}

/**
 * Desbloquea el contexto de audio de la pestaña (política de autoplay).
 * Debe llamarse desde un clic explícito del operador.
 */
export async function activateSoundAlertsFromUserGesture(): Promise<boolean> {
  const probe = new Audio(SILENT_WAV);
  probe.volume = 0.0001;
  try {
    await probe.play();
  } catch {
    // Se sigue con initializeAudio (AudioContext + wav silencioso)
  }
  await initializeAudio();
  return isAudioUnlocked();
}

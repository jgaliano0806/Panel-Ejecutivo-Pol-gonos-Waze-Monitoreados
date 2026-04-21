/**
 * Servicio de TTS profesional para sala de control
 * Usa Edge TTS (voces neuronales de Microsoft) via backend - 100% GRATUITO
 *
 * AUTOPLAY POLICY: Los navegadores modernos bloquean play() si el usuario
 * no ha interactuado con la pagina. Este servicio implementa un sistema de
 * desbloqueo automatico: los mensajes se encolan hasta que el usuario
 * hace click/tecla, y entonces se reproducen todos los pendientes.
 */

import { API_CONFIG } from "../config/constants";
import { logger } from "./logger";

// Voces disponibles (argentinas y mexicanas)
export const EDGE_TTS_VOICES = {
  // Voces argentinas (recomendadas)
  ELENA_AR: "es-AR-ElenaNeural", // Femenina argentina - RECOMENDADA
  TOMAS_AR: "es-AR-TomasNeural", // Masculina argentina
  // Voces mexicanas (alternativa)
  DALIA_MX: "es-MX-DaliaNeural", // Femenina mexicana
  JORGE_MX: "es-MX-JorgeNeural", // Masculina mexicana
} as const;

export interface TTSConfig {
  voice: string;
  rate: string; // ej: "-5%", "+10%"
  pitch: string; // ej: "+0Hz", "-2Hz"
}

// Configuración por defecto
const DEFAULT_CONFIG: TTSConfig = {
  voice: EDGE_TTS_VOICES.ELENA_AR,
  rate: "-5%", // Un poco más lento para claridad
  pitch: "+0Hz",
};

// Estado del servicio
let currentConfig: TTSConfig = { ...DEFAULT_CONFIG };
let audioQueue: string[] = [];
let isPlaying = false;
let currentAudio: HTMLAudioElement | null = null;
let audioInitialized = false;

/**
 * Inicializar contexto de audio (desbloquear Autoplay)
 * Debe llamarse desde una interacción de usuario (click/tap)
 */
export const initializeAudio = async () => {
  if (audioInitialized) {
    forceUnlockAudio(); // Asegurar desbloqueo si ya inicializado
    return;
  }

  try {
    // Crear y reanudar AudioContext (necesario para navegadores modernos)
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      await ctx.resume();

      // Reproducir oscilador silencioso
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0; // Silencio
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);
      oscillator.stop(0.1);

      logger.debug("AudioContext inicializado y desbloqueado");
    }

    // Método fallback para HTML5 Audio
    const silentAudio = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
    );
    await silentAudio.play().catch(() => {}); // Ignorar error si falla

    audioInitialized = true;
    forceUnlockAudio(); // Desbloquear TTS para que processQueue pueda reproducir
    logger.info("Sistema de audio desbloqueado por interacción de usuario");
  } catch (e) {
    logger.warn("No se pudo inicializar el audio", { error: e });
  }
};

// ============================================================
// SISTEMA DE MUTE (toggle manual del operador)
// ============================================================
const TTS_MUTE_KEY = "tts_muted";
let _muted: boolean =
  typeof window !== "undefined"
    ? localStorage.getItem(TTS_MUTE_KEY) === "true"
    : false;

export const isTTSMuted = (): boolean => _muted;

export const setTTSMuted = (value: boolean): void => {
  _muted = value;
  if (typeof window !== "undefined") {
    localStorage.setItem(TTS_MUTE_KEY, String(value));
    window.dispatchEvent(new CustomEvent("tts-mute-change", { detail: value }));
  }
  if (value) {
    // Silenciar inmediatamente lo que esté sonando
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audioQueue = [];
    isPlaying = false;
    logger.debug("TTS silenciado por el operador");
  } else {
    logger.debug("TTS sonido reactivado por el operador");
  }
};

export const toggleTTSMuted = (): boolean => {
  setTTSMuted(!_muted);
  return _muted;
};

// ============================================================
// SISTEMA DE DESBLOQUEO DE AUDIO (Autoplay Policy)
// ============================================================
// MODO VIDEOWALL: En centros de operaciones/videowall nadie hace click.
// El audio se intenta desbloquear automáticamente al cargar.
// Si el navegador se ejecuta con --autoplay-policy=no-user-gesture-required,
// el audio funciona inmediatamente sin ninguna interacción.
// ============================================================
let _audioUnlocked = false;

/**
 * Verifica si el audio esta desbloqueado.
 */
export const isAudioUnlocked = (): boolean => _audioUnlocked;

/**
 * Fuerza el desbloqueo manual (util para botones "Activar audio").
 */
export const forceUnlockAudio = (): void => {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  logger.debug("Audio desbloqueado manualmente");
  _drainQueueAfterUnlock();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tts-unlocked"));
  }
};

/**
 * Handler de interaccion del usuario. Se ejecuta UNA vez al primer
 * click, keydown o touchstart en el documento.
 */
const _handleUserInteraction = (): void => {
  if (_audioUnlocked) return;
  _audioUnlocked = true;

  // Remover listeners ya que solo necesitamos la primera interaccion
  document.removeEventListener("click", _handleUserInteraction, true);
  document.removeEventListener("keydown", _handleUserInteraction, true);
  document.removeEventListener("touchstart", _handleUserInteraction, true);

  logger.debug("Audio desbloqueado por interaccion del usuario");
  _drainQueueAfterUnlock();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tts-unlocked"));
  }
};

/**
 * Despues del desbloqueo, procesar mensajes encolados.
 */
const _drainQueueAfterUnlock = (): void => {
  if (audioQueue.length > 0) {
    logger.debug("Procesando mensajes encolados tras desbloqueo", {
      count: audioQueue.length,
    });
    processQueue();
  }
};

/**
 * AUTO-DESBLOQUEO para modo videowall/kiosk.
 * Intenta reproducir un audio silencioso para desbloquear el autoplay.
 * Funciona automáticamente si Chrome se ejecuta con:
 * --autoplay-policy=no-user-gesture-required
 */
const _attemptAutoUnlock = async (): Promise<void> => {
  if (_audioUnlocked) return;

  try {
    // Intentar con AudioContext (funciona en Chrome con flag de autoplay)
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      await ctx.resume();

      // Reproducir un oscilador silencioso para desbloquear
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0; // Silencio total
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(0);
      oscillator.stop(0.05);
    }

    // Intentar con HTML5 Audio (audio silencioso en base64)
    const silentAudio = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA",
    );
    await silentAudio.play();

    // Si llegamos aquí, el audio está desbloqueado
    _audioUnlocked = true;
    audioInitialized = true;
    logger.info("Audio auto-desbloqueado al cargar (modo videowall)");
    window.dispatchEvent(new CustomEvent("tts-unlocked"));
  } catch (e) {
    logger.warn(
      "Auto-desbloqueo falló — ejecutar Chrome con --autoplay-policy=no-user-gesture-required",
    );
  }
};

// Registrar listeners de interaccion al cargar el modulo
if (typeof window !== "undefined") {
  document.addEventListener("click", _handleUserInteraction, {
    capture: true,
    once: false,
  });
  document.addEventListener("keydown", _handleUserInteraction, {
    capture: true,
    once: false,
  });
  document.addEventListener("touchstart", _handleUserInteraction, {
    capture: true,
    once: false,
  });

  // Intentar auto-desbloquear al cargar la página (para videowall/kiosk)
  // Se ejecuta después de que el DOM esté listo
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(_attemptAutoUnlock, 500);
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(_attemptAutoUnlock, 500);
    });
  }
}

/**
 * Configurar la voz y parámetros de TTS
 */
export const configureTTS = (config: Partial<TTSConfig>) => {
  currentConfig = { ...currentConfig, ...config };
  if (config.voice) {
    currentConfig.voice = ensureArgentineVoice(config.voice);
  }
  localStorage.setItem("tts_config", JSON.stringify(currentConfig));
  logger.debug("TTS configurado", { ...currentConfig });
};

/**
 * Obtener configuración actual
 */
export const getTTSConfig = (): TTSConfig => currentConfig;

/**
 * Limpiar y formatear texto para TTS argentino
 */
const cleanTextForTTS = (text: string): string => {
  if (!text) return "";
  return (
    text
      // Remover emojis
      .replace(/🚨|⚠️|⛈️|⛔|📌|🚗💥|💥|🚦|🔴|🟡|🟢|🚧|🔻|🔺/g, "")
      // Remover información de clasificación AI (no debe leerse)
      .replace(/\[AI:\s*[^\]]+\]/gi, "")
      .replace(/\[Ruido\]/gi, "")
      .replace(/\[Accionable\]/gi, "")
      .replace(/\[Conf:\s*\d+%?\]/gi, "")
      // Normalización fonética para Argentina
      .replace(/\bRN\s*(\d+)/gi, "Ruta Nacional $1")
      .replace(/\bRP\s*([A-Z]?\d+)/gi, "Ruta Provincial $1")
      .replace(/\bAU\s*(\d+)/gi, "Autopista $1")
      .replace(/\bAv\.\s*/gi, "Avenida ")
      .replace(/\bAv\s+/gi, "Avenida ")
      .replace(/\bInt\.\s*/gi, "Intendente ")
      .replace(/\bGral\.\s*/gi, "General ")
      .replace(/\bKM\s*(\d+)/gi, "kilómetro $1")
      .replace(/\bE(\d+)\b/gi, "E $1")
      .replace(/\bT(\d+)\b/gi, "tramo $1")
      .replace(/\s+/g, " ")
      .replace(/Adiecinueve/gi, "cerodiecinueve") // Regla fonética global para RAC
      .trim()
  );
};

/**
 * Construir mensaje natural para operador
 */
const buildNaturalMessage = (title: string, message: string): string => {
  const cleanTitle = cleanTextForTTS(title);
  const cleanMessage = cleanTextForTTS(message);

  const lowerTitle = cleanTitle.toLowerCase();
  // Si el título ya empieza con "atención", "atencion" o "alerta", no agregarlo de nuevo
  const hasPrefix = lowerTitle.startsWith("atención") || 
                    lowerTitle.startsWith("atención,") || 
                    lowerTitle.startsWith("atencion") || 
                    lowerTitle.startsWith("alerta");

  let baseMessage = "";

  if (hasPrefix) {
    // El mensaje ya tiene el prefijo, usar directamente
    if (cleanMessage && cleanMessage !== cleanTitle) {
      baseMessage = `${cleanTitle} ${cleanMessage}`;
    } else {
      baseMessage = cleanTitle;
    }
  } else {
    // Agregar prefijo si no lo tiene
    if (cleanMessage && cleanMessage !== cleanTitle) {
      baseMessage = `Atención operadores. ${cleanTitle}. ${cleanMessage}`;
    } else {
      baseMessage = `Atención operadores. ${cleanTitle}`;
    }
  }

  // Limpiar punto final repetido si existiera para que la pausa no sea anormal
  const cleanedBase = baseMessage.trim().replace(/\.+$/, "") + ".";

  // Repetir el mensaje para mayor claridad en sala de operaciones
  return `${cleanedBase} Repito. ${cleanedBase}`;
};

/**
 * Reproducir audio desde el backend TTS
 */
const playBackendTTS = async (text: string): Promise<void> => {
  // URL del TTS: si baseUrl es relativo (/api), usar tal cual para que pase por el proxy de Vite
  // y funcione tanto en localhost como al acceder por IP de red
  const apiBase = API_CONFIG.baseUrl;
  const ttsUrl = apiBase.startsWith("/")
    ? `${apiBase.replace(/\/?$/, "")}/tts/speak`
    : `${apiBase.replace(/\/api\/?$/, "")}/api/tts/speak`;
  logger.debug("TTS backend request", { ttsUrl });

  const response = await fetch(ttsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: currentConfig.voice,
      rate: currentConfig.rate,
      pitch: currentConfig.pitch,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("TTS backend error", { status: response.status, errorText });
    throw new Error(`Error en TTS backend: ${response.status}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  return new Promise((resolve, reject) => {
    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      resolve();
    };

    currentAudio.onerror = (e) => {
      logger.error("Error en elemento Audio", { error: e });
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      reject(new Error("Error reproduciendo audio"));
    };

    currentAudio.play().catch((err) => {
      logger.error("play() rechazado (posible bloqueo de autoplay)", {
        error: err,
      });
      reject(err);
    });
  });
};

/**
 * Fallback a Web Speech API si el backend no está disponible.
 * Solo usa voces latinoamericanas (es-AR, es-MX). Excluye es-ES.
 */
const playWebSpeechFallback = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Web Speech API no soportada"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    let voices = window.speechSynthesis.getVoices();

    // En Chrome, getVoices() puede devolver [] hasta voiceschanged
    if (voices.length === 0) {
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null;
        _pickAndSpeak(
          window.speechSynthesis.getVoices(),
          utterance,
          resolve,
          reject,
        );
      };
      window.speechSynthesis.onvoiceschanged = handler;
      return;
    }

    _pickAndSpeak(voices, utterance, resolve, reject);
  });
};

function _pickAndSpeak(
  voices: SpeechSynthesisVoice[],
  utterance: SpeechSynthesisUtterance,
  resolve: () => void,
  reject: (e: any) => void,
) {
  // Prioridad: es-AR > es-MX > otra latina > es-ES (último recurso)
  const arVoices = voices.filter(
    (v) => v.lang === "es-AR" || v.lang.startsWith("es-AR-"),
  );
  const mxVoices = voices.filter(
    (v) => v.lang === "es-MX" || v.lang.startsWith("es-MX-"),
  );
  const latamVoices = voices.filter(
    (v) =>
      v.lang.startsWith("es-") &&
      !v.lang.startsWith("es-ES") &&
      !v.lang.startsWith("es-AR") &&
      !v.lang.startsWith("es-MX"),
  );
  const esEsVoices = voices.filter(
    (v) => v.lang === "es-ES" || v.lang.startsWith("es-ES-"),
  );

  const targetVoice =
    arVoices[0] || mxVoices[0] || latamVoices[0] || esEsVoices[0];

  if (!targetVoice) {
    reject(
      new Error(
        "No hay voces en español disponibles en este navegador. " +
          "El backend TTS (Edge TTS es-AR) debe estar activo.",
      ),
    );
    return;
  }

  utterance.voice = targetVoice;
  utterance.lang = "es-AR";
  utterance.pitch = 0.95;
  utterance.rate = 0.88;

  utterance.onend = () => resolve();
  utterance.onerror = (e) => reject(e);

  window.speechSynthesis.speak(utterance);
}

/**
 * Procesar cola de mensajes (evita solapamiento).
 * Si el audio aun no esta desbloqueado, los mensajes permanecen en cola
 * y se procesaran automaticamente al primer click/tecla del usuario.
 */
const processQueue = async () => {
  if (isPlaying) return;
  if (audioQueue.length === 0) return;

  // MODO VIDEOWALL: Siempre intentar reproducir.
  // Si el audio está bloqueado, intentamos de todas formas —
  // play() lanzará un error que capturamos gracefully.
  // Esto es necesario para videowalls donde nadie hace click.
  if (!_audioUnlocked) {
    logger.debug("Audio no desbloqueado, intentando reproducir", {
      queueLength: audioQueue.length,
    });
  }

  isPlaying = true;
  const text = audioQueue.shift()!;

  try {
    await playBackendTTS(text);
    logger.debug("TTS reproducido via backend (es-AR Edge TTS)");
    if (!_audioUnlocked) {
      _audioUnlocked = true;
      logger.info("Audio desbloqueado exitosamente tras reproducción");
      window.dispatchEvent(new CustomEvent("tts-unlocked"));
    }
  } catch (error) {
    logger.warn("Backend TTS (es-AR) falló, usando Web Speech fallback", {
      error,
    });
    try {
      await playWebSpeechFallback(text);
      if (!_audioUnlocked) {
        _audioUnlocked = true;
        logger.info("Audio desbloqueado via fallback");
        window.dispatchEvent(new CustomEvent("tts-unlocked"));
      }
    } catch (fallbackError) {
      logger.error("Todos los métodos TTS fallaron", { error, fallbackError });
      const isAutoplayError =
        String(fallbackError).toLowerCase().includes("user") ||
        String(fallbackError).toLowerCase().includes("interact") ||
        String(fallbackError).toLowerCase().includes("gesture") ||
        String(error).toLowerCase().includes("user") ||
        String(error).toLowerCase().includes("interact");
      if (isAutoplayError && !_audioUnlocked) {
        audioQueue.unshift(text);
        logger.warn("Bloqueado por autoplay policy", {
          pending: audioQueue.length,
        });
      }
    }
  }

  isPlaying = false;
  // Continuar con el siguiente en cola
  if (audioQueue.length > 0) {
    processQueue();
  }
};

/**
 * Función principal: Reproducir notificación con voz.
 * Si el audio esta bloqueado, el mensaje se encola y se reproducira
 * automaticamente cuando el usuario interactue con la pagina.
 */
export const speakNotification = async (
  title: string,
  message: string,
): Promise<void> => {
  if (_muted) {
    logger.debug("TTS silenciado — mensaje descartado");
    return;
  }

  const text = buildNaturalMessage(title, message);

  // Agregar a la cola
  audioQueue.push(text);

  // MODO VIDEOWALL: Siempre intentar procesar la cola.
  // processQueue() manejará el caso de autoplay bloqueado internamente.
  processQueue();
};

export type SpeakUsingIncidentVoiceOptions = {
  /**
   * Si es true (p. ej. zona roja), el mensaje pasa al frente de la cola y se reproduce
   * en cuanto termine el TTS en curso; el resto de mensajes conserva su orden detrás.
   */
  priority?: boolean;
};

/**
 * Misma vía de audio que las notificaciones de incidentes: cola → Edge TTS
 * (`currentConfig.voice` / rate / pitch) y, si falla el backend, `playWebSpeechFallback`
 * con la misma selección de voz (`_pickAndSpeak`).
 * No aplica la plantilla ni el "Repito" de `buildNaturalMessage`.
 */
export const speakUsingIncidentVoice = (
  text: string,
  options?: SpeakUsingIncidentVoiceOptions,
): void => {
  if (_muted) {
    logger.debug("TTS silenciado — mensaje descartado (voz incidentes)");
    return;
  }
  const cleaned = cleanTextForTTS(text);
  if (options?.priority) {
    audioQueue.unshift(cleaned);
  } else {
    audioQueue.push(cleaned);
  }
  processQueue();
};

/**
 * Detener toda reproducción
 */
export const stopSpeaking = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  audioQueue = [];
  isPlaying = false;
};

/**
 * Consultar cola TTS local: cuántas lecturas quedan pendientes y si está reproduciendo.
 */
export const getTTSQueueStatus = (): {
  pendingCount: number;
  isPlaying: boolean;
  totalPending: number;
} => {
  const pendingCount = audioQueue.length;
  const totalPending = isPlaying ? pendingCount + 1 : pendingCount;
  return { pendingCount, isPlaying, totalPending };
};

/**
 * Probar la voz configurada
 */
export const testVoice = async (): Promise<void> => {
  const testText =
    "Atención operador. Alerta de tráfico en Ruta Nacional 9, tramo 3. Vehículo detenido en banquina.";

  try {
    await playBackendTTS(testText);
  } catch (error) {
    logger.warn("Backend TTS falló en test, probando fallback");
    await playWebSpeechFallback(testText);
  }
};

/**
 * Obtener voces disponibles del backend
 */
export const getAvailableVoices = async (): Promise<
  Array<{ id: string; name: string; gender: string; description: string }>
> => {
  try {
    const apiBase = API_CONFIG.baseUrl;
    const voicesUrl = apiBase.startsWith("/")
      ? `${apiBase.replace(/\/?$/, "")}/tts/voices`
      : `${apiBase.replace(/\/api\/?$/, "")}/api/tts/voices`;
    const response = await fetch(voicesUrl);
    if (!response.ok) throw new Error("Error obteniendo voces");
    const data = await response.json();
    return data.voices;
  } catch (error) {
    logger.error("Error obteniendo voces", { error });
    // Devolver voces por defecto
    return [
      {
        id: "es-AR-ElenaNeural",
        name: "Elena",
        gender: "female",
        description: "Femenina argentina",
      },
      {
        id: "es-AR-TomasNeural",
        name: "Tomás",
        gender: "male",
        description: "Masculina argentina",
      },
    ];
  }
};

// Voces válidas (solo argentinas y mexicanas)
const VALID_VOICE_IDS = new Set(Object.values(EDGE_TTS_VOICES));

/**
 * Valida que una voz sea es-AR o es-MX. Si no, fuerza es-AR-ElenaNeural.
 */
function ensureArgentineVoice(voiceId: string): string {
  if (VALID_VOICE_IDS.has(voiceId as any)) return voiceId;
  logger.warn(
    `Voz "${voiceId}" no es argentina/latina, forzando es-AR-ElenaNeural`,
  );
  return EDGE_TTS_VOICES.ELENA_AR;
}

// Cargar configuración de localStorage al iniciar
if (typeof window !== "undefined") {
  const savedConfig = localStorage.getItem("tts_config");
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig);
      currentConfig = { ...DEFAULT_CONFIG, ...parsed };
      currentConfig.voice = ensureArgentineVoice(currentConfig.voice);
      localStorage.setItem("tts_config", JSON.stringify(currentConfig));
    } catch (e) {
      logger.error("Error cargando config TTS", { error: e });
      currentConfig = { ...DEFAULT_CONFIG };
    }
  }
}

// Compatibilidad hacia atrás con ElevenLabs (ahora no usado)
export const configureElevenLabs = (_apiKey: string, _voiceId?: string) => {
  logger.debug("ElevenLabs deshabilitado — usando Edge TTS gratuito");
};
export const isElevenLabsConfigured = () => false;
export const saveElevenLabsConfig = (_apiKey: string, _voiceId?: string) => {};
export const getElevenLabsConfig = () => null;
export const ELEVENLABS_VOICES = {}; // Vacío para compatibilidad

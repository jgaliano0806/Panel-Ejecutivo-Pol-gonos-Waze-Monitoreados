/**
 * Servicio de TTS profesional para sala de control
 * Usa Edge TTS (voces neuronales de Microsoft) via backend - 100% GRATUITO
 */

import { API_CONFIG } from "../config/constants";

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

/**
 * Configurar la voz y parámetros de TTS
 */
export const configureTTS = (config: Partial<TTSConfig>) => {
  currentConfig = { ...currentConfig, ...config };
  localStorage.setItem("tts_config", JSON.stringify(currentConfig));
  console.log("🔊 TTS configurado:", currentConfig);
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
      .trim()
  );
};

/**
 * Construir mensaje natural para operador
 */
const buildNaturalMessage = (title: string, message: string): string => {
  const cleanTitle = cleanTextForTTS(title);
  const cleanMessage = cleanTextForTTS(message);

  // Si el título ya tiene "Atención operador", no agregarlo de nuevo
  const hasPrefix = cleanTitle.toLowerCase().startsWith("atención operador");

  if (hasPrefix) {
    // El mensaje ya tiene el prefijo, usar directamente
    if (cleanMessage && cleanMessage !== cleanTitle) {
      return `${cleanTitle}. ${cleanMessage}.`;
    }
    return `${cleanTitle}.`;
  }

  // Agregar prefijo si no lo tiene
  if (cleanMessage && cleanMessage !== cleanTitle) {
    return `Atención operador. ${cleanTitle}. ${cleanMessage}.`;
  }
  return `Atención operador. ${cleanTitle}.`;
};

/**
 * Reproducir audio desde el backend TTS
 */
const playBackendTTS = async (text: string): Promise<void> => {
  // Construir URL absoluta del backend TTS
  // VITE_API_URL ya incluye /api, así que lo removemos y lo agregamos de nuevo
  let apiBase = API_CONFIG.baseUrl;
  if (apiBase.startsWith("/")) {
    // Si es relativo, usar URL absoluta del backend
    apiBase = "http://127.0.0.1:3002";
  } else {
    // Remover /api del final si existe
    apiBase = apiBase.replace(/\/api\/?$/, "");
  }

  const ttsUrl = `${apiBase}/api/tts/speak`;
  console.log(`🔊 TTS: Llamando a ${ttsUrl}`);

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
    console.error(
      `❌ TTS backend respondió con error: ${response.status}`,
      errorText,
    );
    throw new Error(`Error en TTS backend: ${response.status}`);
  }

  console.log("✅ TTS: Backend respondió OK, obteniendo audio blob...");
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  console.log(`🔊 TTS: Audio URL creado: ${audioUrl}`);

  return new Promise((resolve, reject) => {
    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      console.log("✅ TTS: Audio terminó de reproducirse");
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      resolve();
    };

    currentAudio.onerror = (e) => {
      console.error("❌ TTS: Error en elemento Audio:", e);
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      reject(new Error("Error reproduciendo audio"));
    };

    console.log("🔊 TTS: Intentando reproducir audio...");
    currentAudio.play().catch((err) => {
      console.error(
        "❌ TTS: play() rechazado (posible bloqueo de autoplay):",
        err,
      );
      reject(err);
    });
  });
};

/**
 * Fallback a Web Speech API si el backend no está disponible
 */
const playWebSpeechFallback = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Web Speech API no soportada"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Buscar mejor voz disponible
    const targetVoice =
      voices.find((v) => v.lang === "es-AR") ||
      voices.find((v) => v.lang === "es-MX") ||
      voices.find((v) => v.lang.startsWith("es"));

    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    } else {
      utterance.lang = "es-AR";
    }

    utterance.pitch = 0.95;
    utterance.rate = 0.88;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Procesar cola de mensajes (evita solapamiento)
 */
const processQueue = async () => {
  if (isPlaying) {
    console.log("🔊 TTS: Ya reproduciendo, esperando...");
    return;
  }
  if (audioQueue.length === 0) {
    console.log("🔊 TTS: Cola vacía");
    return;
  }

  isPlaying = true;
  const text = audioQueue.shift()!;
  console.log(`🔊 TTS: Procesando mensaje: "${text.substring(0, 50)}..."`);

  try {
    console.log("🔊 TTS: Intentando backend TTS...");
    await playBackendTTS(text);
    console.log("✅ TTS: Audio reproducido exitosamente");
  } catch (error) {
    console.warn("⚠️ Backend TTS falló, usando fallback:", error);
    try {
      await playWebSpeechFallback(text);
      console.log("✅ TTS: Fallback reproducido exitosamente");
    } catch (fallbackError) {
      console.error("❌ Fallback TTS también falló:", fallbackError);
    }
  }

  isPlaying = false;
  processQueue();
};

/**
 * Función principal: Reproducir notificación con voz
 */
export const speakNotification = async (
  title: string,
  message: string,
): Promise<void> => {
  const text = buildNaturalMessage(title, message);
  console.log(`🔊 TTS speakNotification llamado: "${text}"`);
  console.log(
    `🔊 Cola actual: ${audioQueue.length} mensajes, isPlaying: ${isPlaying}`,
  );

  // Agregar a la cola
  audioQueue.push(text);
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
 * Probar la voz configurada
 */
export const testVoice = async (): Promise<void> => {
  const testText =
    "Atención operador. Alerta de tráfico en Ruta Nacional 9, tramo 3. Vehículo detenido en banquina.";

  try {
    await playBackendTTS(testText);
  } catch (error) {
    console.warn("⚠️ Probando con fallback...");
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
    let apiBase = API_CONFIG.baseUrl;
    if (apiBase.startsWith("/")) {
      apiBase = "http://127.0.0.1:3002";
    } else {
      apiBase = apiBase.replace(/\/api\/?$/, "");
    }
    const response = await fetch(`${apiBase}/api/tts/voices`);
    if (!response.ok) throw new Error("Error obteniendo voces");
    const data = await response.json();
    return data.voices;
  } catch (error) {
    console.error("Error obteniendo voces:", error);
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

// Cargar configuración de localStorage al iniciar
if (typeof window !== "undefined") {
  const savedConfig = localStorage.getItem("tts_config");
  if (savedConfig) {
    try {
      currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
    } catch (e) {
      console.error("Error cargando config TTS:", e);
    }
  }
}

// Compatibilidad hacia atrás con ElevenLabs (ahora no usado)
export const configureElevenLabs = (_apiKey: string, _voiceId?: string) => {
  console.log("ℹ️ ElevenLabs deshabilitado - usando Edge TTS gratuito");
};
export const isElevenLabsConfigured = () => false;
export const saveElevenLabsConfig = (_apiKey: string, _voiceId?: string) => {};
export const getElevenLabsConfig = () => null;
export const ELEVENLABS_VOICES = {}; // Vacío para compatibilidad

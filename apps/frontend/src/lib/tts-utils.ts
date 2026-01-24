/**
 * Utilidad para síntesis de voz (TTS) enfocada en gestión vial.
 */
export const speakNotification = (title: string, message: string) => {
  if (!("speechSynthesis" in window)) return;

  // 1. Limpiar y formatear el texto fonéticamente para Argentina
  const cleanText = (text: string) => {
    if (!text) return "";
    return (
      text
        .replace(/🚨|⚠️|⛈️|⛔|📌|🚗💥|💥|🚦/g, "")
        // Normalización fonética para Argentina
        .replace(/\bRN\b/gi, "Ruta Nacional")
        .replace(/\bRP\b/gi, "Ruta Provincial")
        .replace(/\bAv\.\b/gi, "Avenida")
        .replace(/\bAv\b/gi, "Avenida")
        .replace(/\bColectora\b/gi, "Colectora")
        .replace(/\bKM\b/gi, "Kilómetro")
        .replace(/\bE(\d+)\b/gi, "E $1") // E73 -> E setenta y tres (espacio ayuda a la vocalización)
        .trim()
    );
  };

  const formattedTitle = cleanText(title);
  const formattedMessage = cleanText(message);

  // Frase con cadencia más natural de operador
  const textToSpeak = `Atención: ${formattedTitle}. Detalle: ${formattedMessage}.`;

  const utterance = new SpeechSynthesisUtterance(textToSpeak);

  // 2. Selección de voz premium (Argentina o Latino)
  const voices = window.speechSynthesis.getVoices();

  /**
   * Orden de preferencia estricto:
   * 1. Argentina (es-AR) - Google o Microsoft Elena
   * 2. México/Latino (es-MX / es-419) - Suelen ser las voces estándar para "Español Latino"
   * 3. Otros países de LATAM (es-CO, es-CL, etc.)
   * 4. Español genérico
   */
  const targetVoice =
    // Prioridad 1: Argentina
    voices.find((v) => v.lang === "es-AR" && v.name.includes("Google")) ||
    voices.find((v) => v.lang === "es-AR" && v.name.includes("Elena")) ||
    voices.find((v) => v.lang === "es-AR") ||
    // Prioridad 2: Latino (México es el estándar de Google/Microsoft para esto)
    voices.find((v) => v.lang === "es-MX" && v.name.includes("Google")) ||
    voices.find((v) => v.lang === "es-MX") ||
    voices.find((v) => v.lang === "es-419") ||
    // Prioridad 3: Cualquier otro latino
    voices.find((v) => v.lang.startsWith("es-") && !v.lang.includes("ES")) ||
    // Último recurso: Español genérico o España (si no hay nada más)
    voices.find((v) => v.lang.startsWith("es"));

  if (targetVoice) {
    utterance.voice = targetVoice;
    // Forzamos el lang de la utterance al del target para evitar conflictos
    utterance.lang = targetVoice.lang;
  } else {
    utterance.lang = "es-AR";
  }

  // Ajustes finales de naturalidad
  utterance.pitch = 0.98;
  utterance.rate = 0.9;

  // 3. Ejecutar
  window.speechSynthesis.speak(utterance);
};

// Listener para asegurar que las voces estén cargadas antes de usar
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    console.log("🔊 Voces TTS cargadas/actualizadas");
  };
}

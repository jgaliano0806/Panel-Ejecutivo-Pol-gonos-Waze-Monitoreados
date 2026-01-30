/**
 * Re-exporta el servicio de TTS unificado
 * Mantiene compatibilidad con código existente
 */
export {
  speakNotification,
  stopSpeaking,
  getTTSQueueStatus,
  testVoice,
  configureElevenLabs,
  isElevenLabsConfigured,
  saveElevenLabsConfig,
  getElevenLabsConfig,
  ELEVENLABS_VOICES,
} from "./tts-service";

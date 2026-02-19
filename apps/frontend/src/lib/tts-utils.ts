/**
 * Re-exporta el servicio de TTS unificado
 * Mantiene compatibilidad con código existente
 */
export {
  speakNotification,
  stopSpeaking,
  getTTSQueueStatus,
  testVoice,
  isAudioUnlocked,
  forceUnlockAudio,
  initializeAudio,
  isTTSMuted,
  setTTSMuted,
  toggleTTSMuted,
  configureElevenLabs,
  isElevenLabsConfigured,
  saveElevenLabsConfig,
  getElevenLabsConfig,
  ELEVENLABS_VOICES,
} from "./tts-service";

/**
 * Re-exporta el servicio de TTS unificado
 * Mantiene compatibilidad con código existente
 */
export type { SpeakUsingIncidentVoiceOptions } from "./tts-service";
export {
  speakNotification,
  speakUsingIncidentVoice,
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

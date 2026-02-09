/**
 * Servicio TTS profesional para sala de control - Angular
 * Equivalente a: apps/frontend/src/lib/tts-service.ts
 * Usa Edge TTS (voces neuronales de Microsoft) via backend - 100% GRATUITO
 */
import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';

// Voces disponibles (argentinas y mexicanas)
export const EDGE_TTS_VOICES = {
  ELENA_AR: 'es-AR-ElenaNeural', // Femenina argentina - RECOMENDADA
  TOMAS_AR: 'es-AR-TomasNeural', // Masculina argentina
  DALIA_MX: 'es-MX-DaliaNeural', // Femenina mexicana
  JORGE_MX: 'es-MX-JorgeNeural', // Masculina mexicana
} as const;

export interface TTSConfig {
  voice: string;
  rate: string; // ej: "-5%", "+10%"
  pitch: string; // ej: "+0Hz", "-2Hz"
}

const DEFAULT_CONFIG: TTSConfig = {
  voice: EDGE_TTS_VOICES.ELENA_AR,
  rate: '-5%',
  pitch: '+0Hz',
};

@Injectable({ providedIn: 'root' })
export class TTSService {
  // Estado con Signals
  private _config = signal<TTSConfig>({ ...DEFAULT_CONFIG });
  private _queue = signal<string[]>([]);
  private _isPlaying = signal(false);
  private currentAudio: HTMLAudioElement | null = null;

  // Protección contra duplicados
  private recentMessages = new Map<string, number>();
  private readonly DUPLICATE_THRESHOLD_MS = 10000; // 10 segundos para evitar duplicados por demoras de red

  // Computed públicos
  readonly config = computed(() => this._config());
  readonly queueLength = computed(() => this._queue().length);
  readonly isPlaying = computed(() => this._isPlaying());
  readonly totalPending = computed(() =>
    this._isPlaying() ? this._queue().length + 1 : this._queue().length,
  );

  constructor() {
    this.loadConfigFromStorage();
  }

  /**
   * Configurar la voz y parámetros de TTS
   */
  configure(config: Partial<TTSConfig>): void {
    this._config.update((c) => ({ ...c, ...config }));
    localStorage.setItem('tts_config', JSON.stringify(this._config()));
    console.log('🔊 TTS configurado:', this._config());
  }

  /**
   * Limpiar y formatear texto para TTS argentino
   */
  private cleanTextForTTS(text: string): string {
    if (!text) return '';
    return text
      .replace(/🚨|⚠️|⛈️|⛔|📌|🚗💥|💥|🚦|🔴|🟡|🟢|🚧|🔻|🔺/g, '')
      .replace(/\[AI:\s*[^\]]+\]/gi, '')
      .replace(/\[Ruido\]/gi, '')
      .replace(/\[Accionable\]/gi, '')
      .replace(/\[Conf:\s*\d+%?\]/gi, '')
      .replace(/RN\s*A019/gi, 'Autovía A-019')
      .replace(/\bRN\s*(\d+)/gi, 'Ruta Nacional $1')
      .replace(/\bRP\s*([A-Z]?\d+)/gi, 'Ruta Provincial $1')
      .replace(/\bAU\s*(\d+)/gi, 'Autopista $1')
      .replace(/\bAv\.\s*/gi, 'Avenida ')
      .replace(/\bAv\s+/gi, 'Avenida ')
      .replace(/\bInt\.\s*/gi, 'Intendente ')
      .replace(/\bGral\.\s*/gi, 'General ')
      .replace(/\bKM\s*(\d+)/gi, 'kilómetro $1')
      .replace(/\bE(\d+)\b/gi, 'E $1')
      .replace(/\bT(\d+)\b/gi, 'tramo $1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Construir mensaje natural para operador
   */
  private buildNaturalMessage(title: string, message: string): string {
    const cleanTitle = this.cleanTextForTTS(title);
    const cleanMessage = this.cleanTextForTTS(message);
    const hasPrefix = cleanTitle.toLowerCase().startsWith('atención operador');

    if (hasPrefix) {
      if (cleanMessage && cleanMessage !== cleanTitle) {
        return `${cleanTitle}. ${cleanMessage}.`;
      }
      return `${cleanTitle}.`;
    }

    if (cleanMessage && cleanMessage !== cleanTitle) {
      return `Atención operador. ${cleanTitle}. ${cleanMessage}.`;
    }
    return `Atención operador. ${cleanTitle}.`;
  }

  /**
   * Reproducir audio desde el backend TTS
   */
  private async playBackendTTS(text: string): Promise<void> {
    let apiBase = environment.apiUrl;
    if (apiBase.startsWith('/')) {
      apiBase = 'http://127.0.0.1:3002';
    } else {
      apiBase = apiBase.replace(/\/api\/?$/, '');
    }

    const ttsUrl = `${apiBase}/api/tts/speak`;
    console.log(`🔊 TTS: Llamando a ${ttsUrl}`);

    const config = this._config();
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: config.voice,
        rate: config.rate,
        pitch: config.pitch,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ TTS backend respondió con error: ${response.status}`, errorText);
      throw new Error(`Error en TTS backend: ${response.status}`);
    }

    console.log('✅ TTS: Backend respondió OK, obteniendo audio blob...');
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(audioUrl);

      this.currentAudio.onended = () => {
        console.log('✅ TTS: Audio terminó de reproducirse');
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      this.currentAudio.onerror = (e) => {
        console.error('❌ TTS: Error en elemento Audio:', e);
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(new Error('Error reproduciendo audio'));
      };

      console.log('🔊 TTS: Intentando reproducir audio...');
      this.currentAudio.play().catch((err) => {
        console.error('❌ TTS: play() rechazado:', err);
        reject(err);
      });
    });
  }

  /**
   * Fallback a Web Speech API
   */
  private playWebSpeechFallback(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API no soportada'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const targetVoice =
        voices.find((v) => v.lang === 'es-AR') ||
        voices.find((v) => v.lang === 'es-MX') ||
        voices.find((v) => v.lang.startsWith('es'));

      if (targetVoice) {
        utterance.voice = targetVoice;
        utterance.lang = targetVoice.lang;
      } else {
        utterance.lang = 'es-AR';
      }

      utterance.pitch = 0.95;
      utterance.rate = 0.88;
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Procesar cola de mensajes (evita solapamiento)
   */
  private async processQueue(): Promise<void> {
    if (this._isPlaying()) {
      console.log('🔊 TTS: Ya reproduciendo, esperando...');
      return;
    }

    const queue = this._queue();
    if (queue.length === 0) {
      console.log('🔊 TTS: Cola vacía');
      return;
    }

    this._isPlaying.set(true);
    const text = queue[0];
    this._queue.update((q) => q.slice(1));

    console.log(`🔊 TTS: Procesando mensaje: "${text.substring(0, 50)}..."`);

    try {
      await this.playBackendTTS(text);
      console.log('✅ TTS: Audio reproducido exitosamente');
    } catch (error) {
      console.warn('⚠️ Backend TTS falló, usando fallback:', error);
      try {
        await this.playWebSpeechFallback(text);
        console.log('✅ TTS: Fallback reproducido exitosamente');
      } catch (fallbackError) {
        console.error('❌ Fallback TTS también falló:', fallbackError);
      }
    }

    this._isPlaying.set(false);
    this.processQueue();
  }

  /**
   * Función principal: Reproducir notificación con voz
   */
  async speakNotification(title: string, message: string): Promise<void> {
    const text = this.buildNaturalMessage(title, message);

    // Protección contra duplicados: verificar si este mensaje fue reproducido recientemente
    const messageHash = this.hashMessage(text);
    const lastPlayed = this.recentMessages.get(messageHash);
    const now = Date.now();

    if (lastPlayed && (now - lastPlayed) < this.DUPLICATE_THRESHOLD_MS) {
      console.log(`⚠️ TTS: Mensaje duplicado ignorado (reproducido hace ${now - lastPlayed}ms): "${text.substring(0, 50)}..."`);
      return;
    }

    // Registrar este mensaje
    this.recentMessages.set(messageHash, now);

    // Limpiar mensajes antiguos del cache
    this.cleanOldMessages();

    console.log(`🔊 TTS speakNotification llamado: "${text}"`);
    console.log(
      `🔊 Cola actual: ${this._queue().length} mensajes, isPlaying: ${this._isPlaying()}`,
    );

    this._queue.update((q) => [...q, text]);
    this.processQueue();
  }

  /**
   * Generar hash simple para el mensaje
   */
  private hashMessage(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Limpiar mensajes antiguos del cache
   */
  private cleanOldMessages(): void {
    const now = Date.now();
    const threshold = now - (this.DUPLICATE_THRESHOLD_MS * 2);

    for (const [hash, timestamp] of this.recentMessages.entries()) {
      if (timestamp < threshold) {
        this.recentMessages.delete(hash);
      }
    }
  }

  /**
   * Detener toda reproducción
   */
  stopSpeaking(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this._queue.set([]);
    this._isPlaying.set(false);
  }

  /**
   * Probar la voz configurada
   */
  async testVoice(): Promise<void> {
    const testText =
      'Atención operador. Alerta de tráfico en Ruta Nacional 9, tramo 3. Vehículo detenido en banquina.';
    try {
      await this.playBackendTTS(testText);
    } catch (error) {
      console.warn('⚠️ Probando con fallback...');
      await this.playWebSpeechFallback(testText);
    }
  }

  /**
   * Cargar configuración de localStorage
   */
  private loadConfigFromStorage(): void {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('tts_config');
      if (savedConfig) {
        try {
          this._config.set({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) });
        } catch (e) {
          console.error('Error cargando config TTS:', e);
        }
      }
    }
  }
}

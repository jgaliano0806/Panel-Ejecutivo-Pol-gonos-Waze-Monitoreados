/**
 * Síntesis TTS (Edge) con cola serie, reintentos y cache.
 *
 * Edge TTS falla con pedidos simultáneos (en ráfagas de alertas ~75% daban 500).
 * Cuando el backend falla, el navegador usa su propia voz (a veces es-ES).
 * Con cola de a uno + reintentos + cache, las alertas repetidas son instantáneas
 * y las ráfagas no se pisan.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export type SynthFn = (text: string, voice: string) => Promise<Buffer>;

export interface SynthesizerOptions {
  synth: SynthFn;
  /** Reintentos tras el primer intento fallido. */
  maxRetries?: number;
  /** Espera base entre reintentos (se multiplica por el nº de intento). */
  retryDelayMs?: number;
  /** Pausa mínima entre síntesis reales, para no disparar el 429 de Edge. */
  minIntervalMs?: number;
  /** Máximo de audios en cache (LRU). */
  cacheMax?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createSynthesizer(opts: SynthesizerOptions): SynthFn {
  const {
    synth,
    maxRetries = 3,
    retryDelayMs = 1000,
    minIntervalMs = 600,
    cacheMax = 200,
    sleep = defaultSleep,
  } = opts;
  const cache = new Map<string, Buffer>();
  const inflight = new Map<string, Promise<Buffer>>();
  let tail: Promise<unknown> = Promise.resolve();

  async function runWithRetries(text: string, voice: string): Promise<Buffer> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await synth(text, voice);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) await sleep(retryDelayMs * (attempt + 1));
      }
    }
    throw lastError;
  }

  return (text, voice) => {
    const key = `${voice}\n${text}`;

    const cached = cache.get(key);
    if (cached) {
      cache.delete(key);
      cache.set(key, cached); // LRU: pasa a ser el más reciente
      return Promise.resolve(cached);
    }

    const pending = inflight.get(key);
    if (pending) return pending;

    const job = tail.then(() => runWithRetries(text, voice));
    tail = job.catch(() => undefined).then(() => sleep(minIntervalMs));

    const result = job
      .then((audio) => {
        cache.set(key, audio);
        if (cache.size > cacheMax) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        return audio;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, result);
    return result;
  };
}

/**
 * Una conexión reutilizable por voz: abrir un websocket por pedido dispara el
 * límite de frecuencia (429) de Edge. msedge-tts reconecta solo si se cae.
 */
const clients = new Map<string, MsEdgeTTS>();

async function getClient(voice: string): Promise<MsEdgeTTS> {
  let tts = clients.get(voice);
  if (!tts) {
    tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    clients.set(voice, tts);
  }
  return tts;
}

/** Síntesis real contra Edge TTS. Las llamadas llegan serializadas por la cola. */
export const synthEdge: SynthFn = async (text, voice) => {
  let tts: MsEdgeTTS | undefined;
  try {
    tts = await getClient(voice);
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audio = Buffer.concat(chunks);
    if (audio.length === 0) throw new Error("Edge TTS devolvió audio vacío");
    return audio;
  } catch (error) {
    // Descarta la conexión para que el reintento arranque limpio
    clients.delete(voice);
    try {
      tts?.close();
    } catch {
      /* conexión ya cerrada */
    }
    throw error;
  }
};

export const synthesizeSpeech: SynthFn = createSynthesizer({ synth: synthEdge });

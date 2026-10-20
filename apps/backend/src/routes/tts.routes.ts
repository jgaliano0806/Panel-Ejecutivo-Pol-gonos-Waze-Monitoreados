/**
 * Rutas para Text-to-Speech local (Edge TTS)
 * Voces neuronales gratuitas de Microsoft
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { synthesizeSpeech } from "../services/ttsSynth";

// Voces argentinas disponibles (neuronales, alta calidad)
const VOICES: Record<string, { name: string; gender: string; description: string }> = {
  // Voces argentinas
  "es-AR-ElenaNeural": {
    name: "Elena",
    gender: "female",
    description: "Femenina argentina, clara y profesional",
  },
  "es-AR-TomasNeural": {
    name: "Tomás",
    gender: "male",
    description: "Masculina argentina, profesional",
  },
  // Voces mexicanas (alternativa latina)
  "es-MX-DaliaNeural": {
    name: "Dalia",
    gender: "female",
    description: "Femenina mexicana, natural",
  },
  "es-MX-JorgeNeural": {
    name: "Jorge",
    gender: "male",
    description: "Masculina mexicana, clara",
  },
};

interface SpeakBody {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
}

export default async function ttsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /voices
   * Lista las voces disponibles
   */
  fastify.get("/voices", async (_request: FastifyRequest, reply: FastifyReply) => {
    const voiceList = Object.entries(VOICES).map(([id, info]) => ({
      id,
      ...info,
    }));
    return reply.send({ voices: voiceList });
  });

  /**
   * POST /speak
   * Genera audio TTS y lo devuelve como stream
   * Body: { text: string, voice?: string, rate?: string, pitch?: string }
   */
  fastify.post<{ Body: SpeakBody }>(
    "/speak",
    async (request: FastifyRequest<{ Body: SpeakBody }>, reply: FastifyReply) => {
      try {
        const {
          text,
          voice = "es-AR-ElenaNeural",
          rate = "-5%",
          pitch = "+0Hz",
        } = request.body;

        if (!text || typeof text !== "string") {
          return reply.status(400).send({ error: "Se requiere el campo 'text'" });
        }

        if (text.length > 2000) {
          return reply.status(400).send({ error: "Texto demasiado largo (máx 2000 caracteres)" });
        }

        // Validar voz
        if (!Object.keys(VOICES).includes(voice)) {
          return reply.status(400).send({
            error: `Voz no válida. Opciones: ${Object.keys(VOICES).join(", ")}`,
          });
        }

        console.log(
          `🔊 TTS: Generando audio con voz ${voice} para: "${text.substring(0, 50)}..."`
        );

        // Cola serie + reintentos + cache (Edge TTS falla con pedidos simultáneos)
        const audioBuffer = await synthesizeSpeech(text, voice);

        // Enviar como audio/mpeg
        return reply
          .header("Content-Type", "audio/mpeg")
          .header("Content-Length", audioBuffer.length)
          .header("Cache-Control", "no-cache")
          .send(audioBuffer);
      } catch (error) {
        console.error("❌ Error en TTS:", error);
        return reply.status(500).send({
          error: "Error generando audio",
          details: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }
  );

  /**
   * GET /test
   * Endpoint de prueba que genera un audio de demostración
   */
  fastify.get("/test", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const testText =
        "Atención operador. Alerta de tráfico en Ruta Nacional 9, tramo 3. Vehículo detenido en banquina.";

      const audioBuffer = await synthesizeSpeech(testText, "es-AR-ElenaNeural");

      return reply
        .header("Content-Type", "audio/mpeg")
        .header("Content-Length", audioBuffer.length)
        .send(audioBuffer);
    } catch (error) {
      console.error("❌ Error en TTS test:", error);
      return reply.status(500).send({ error: "Error en prueba TTS" });
    }
  });
}

/**
 * Ruta para Proxy de Iconos de Waze
 * Maneja la obtención y caché de iconos desde Waze Partner Hub
 */
import { FastifyInstance } from "fastify";
import axios from "axios";
import { createServiceLogger } from "../utils/logger";

const log = createServiceLogger("IconProxyRoute");

// SVG por defecto para fallback
const DEFAULT_ICON_SVG = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="12" fill="#E0E0E0"/>
  <path d="M12 6V14" stroke="#757575" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="17" r="1.5" fill="#757575"/>
</svg>
`;

export async function iconProxyRoutes(server: FastifyInstance) {
  server.get("/api/icons/:iconName", async (request, reply) => {
    const { iconName } = request.params as { iconName: string };
    const wazeIconBase =
      "https://web-assets.waze.com/webapps/partnerhub-web/1.1.1333/assets/icons/alerts";

    try {
      // Construir URL del icono
      const iconUrl = `${wazeIconBase}/${iconName}.svg`;

      // Intentar obtener el icono con autenticación si está configurada
      const axiosConfig: any = {
        responseType: "arraybuffer",
        timeout: 5000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      };

      // Si tenemos token de Waze feed configurado, intentar usarlo (aunque usualmente son públicos)
      if (process.env.WAZE_FEED_TOKEN) {
        // En algunos casos los assets pueden requerir auth básica o cookies
      }

      log.debug(`Solicitando icono: ${iconUrl}`);
      const response = await axios.get(iconUrl, axiosConfig);

      // Configurar caché del navegador (1 semana)
      reply.header("Cache-Control", "public, max-age=604800");
      reply.header("Content-Type", "image/svg+xml");
      reply.header("Access-Control-Allow-Origin", "*");

      log.debug(
        `✅ Icono ${iconName} obtenido exitosamente (${response.data.length} bytes)`,
      );
      return Buffer.from(response.data);
    } catch (error: any) {
      log.warn(
        { error: error.message },
        `⚠️ Error obteniendo icono ${iconName}`,
      );

      // Intentar con iconos locales como fallback
      try {
        // Si el icono falla, intentar obtener hazard.svg como fallback genérico de Waze o devolver el inline
        // Por ahora devolvemos el inline simple para no depender de FS local si no es necesario
        reply.header("Content-Type", "image/svg+xml");
        return Buffer.from(DEFAULT_ICON_SVG);
      } catch (fallbackError) {
        log.error(
          { error: (fallbackError as any)?.message },
          `❌ Fallback también falló para ${iconName}`,
        );

        // Último recurso
        reply.code(404).send("Icon not found");
      }
    }
  });
}

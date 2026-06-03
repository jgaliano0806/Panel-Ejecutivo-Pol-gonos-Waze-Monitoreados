/**
 * Proxy de tiles para MapLibre/Leaflet
 *
 * Estrategia:
 *  A. Rotación entre subdominios CARTO (a/b/c/d) por hash determinístico del tile
 *     → reparte la carga y minimiza rate-limits (429) en `a.basemaps.cartocdn.com`.
 *  B. Fallback DARK / LIGHT a ESRI World Gray Canvas (gratuito, sin API key)
 *     → si CARTO falla, el tile sigue siendo del color correcto y NO se mezclan
 *     tiles claros sobre el mapa dark (ni viceversa).
 *
 * En producción (serve) no hay proxy de Vite, así que el backend hace proxy
 * a CARTO/ESRI/OSM.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";

const CARTO_SUBDOMAINS = ["a", "b", "c", "d"] as const;
const OSM_BASE = "https://tile.openstreetmap.org";
// ESRI: orden de path es {z}/{y}/{x} (NO {z}/{x}/{y})
// World_Dark_Gray_Base / World_Light_Gray_Base → estilos minimalistas grises
const ESRI_DARK_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile";
const ESRI_LIGHT_BASE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile";

const TILE_HEADERS = {
  "User-Agent": "PanelWaze-CASISA/1.0 (Map Tiles Proxy)",
  Accept: "image/png,image/*,*/*",
};

/**
 * Selecciona subdominio CARTO a/b/c/d de forma determinística por tile.
 * Mismo tile → mismo subdominio → caches HTTP/proxy funcionan correctamente.
 */
function pickCartoSubdomain(z: string, x: string, y: string): string {
  const idx =
    (parseInt(z, 10) + parseInt(x, 10) + parseInt(y, 10)) %
    CARTO_SUBDOMAINS.length;
  return CARTO_SUBDOMAINS[idx];
}

async function fetchTile(url: string): Promise<Buffer> {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 8000,
    headers: TILE_HEADERS,
    validateStatus: (s) => s === 200,
  });
  return Buffer.from(res.data);
}

async function tileProxyRoutes(app: FastifyInstance) {
  const tileRouteOpts = { config: { rateLimit: false as const } };

  // CARTO Dark: a|b|c|d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png
  // Fallback: ESRI World Dark Gray Canvas (mantiene look oscuro).
  app.get(
    "/tiles/carto-dark/:z/:x/:y.png",
    tileRouteOpts,
    async (
      req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>,
      reply: FastifyReply,
    ) => {
      const { z, x, y } = req.params;
      const sub = pickCartoSubdomain(z, x, y);
      const cartoUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/${z}/${x}/${y}.png`;
      const esriUrl = `${ESRI_DARK_BASE}/${z}/${y}/${x}`;
      try {
        let buf: Buffer;
        try {
          buf = await fetchTile(cartoUrl);
        } catch {
          app.log.warn({ cartoUrl }, "CARTO dark fallback to ESRI Dark Gray");
          buf = await fetchTile(esriUrl);
        }
        reply
          .header("Content-Type", "image/png")
          .header("Cache-Control", "public, max-age=604800")
          .send(buf);
      } catch (err) {
        app.log.warn({ cartoUrl, esriUrl, err }, "Tile proxy error (dark)");
        reply.status(502).send();
      }
    },
  );

  // CARTO Light: a|b|c|d.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png
  // Fallback: ESRI World Light Gray Canvas (mantiene look claro).
  app.get(
    "/tiles/carto-light/:z/:x/:y.png",
    tileRouteOpts,
    async (
      req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>,
      reply: FastifyReply,
    ) => {
      const { z, x, y } = req.params;
      const sub = pickCartoSubdomain(z, x, y);
      const cartoUrl = `https://${sub}.basemaps.cartocdn.com/rastertiles/light_all/${z}/${x}/${y}.png`;
      const esriUrl = `${ESRI_LIGHT_BASE}/${z}/${y}/${x}`;
      try {
        let buf: Buffer;
        try {
          buf = await fetchTile(cartoUrl);
        } catch {
          app.log.warn({ cartoUrl }, "CARTO light fallback to ESRI Light Gray");
          buf = await fetchTile(esriUrl);
        }
        reply
          .header("Content-Type", "image/png")
          .header("Cache-Control", "public, max-age=604800")
          .send(buf);
      } catch (err) {
        app.log.warn({ cartoUrl, esriUrl, err }, "Tile proxy error (light)");
        reply.status(502).send();
      }
    },
  );

  // OSM: /tiles/osm/{z}/{x}/{y}.png — sin cambios (no se usa para basemap principal).
  app.get(
    "/tiles/osm/:z/:x/:y.png",
    tileRouteOpts,
    async (
      req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>,
      reply: FastifyReply,
    ) => {
      const { z, x, y } = req.params;
      const url = `${OSM_BASE}/${z}/${x}/${y}.png`;
      try {
        const buf = await fetchTile(url);
        reply
          .header("Content-Type", "image/png")
          .header("Cache-Control", "public, max-age=604800")
          .send(buf);
      } catch (err) {
        app.log.warn({ url, err }, "Tile proxy error");
        reply.status(502).send();
      }
    },
  );
}

export default tileProxyRoutes;

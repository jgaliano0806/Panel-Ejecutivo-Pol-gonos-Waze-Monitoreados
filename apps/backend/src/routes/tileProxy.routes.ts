/**
 * Proxy de tiles para MapLibre/Leaflet
 * En producción (serve) no hay proxy de Vite, así que el backend hace proxy a CARTO/OSM
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";

// CARTO usa subdominios a,b,c,d y path /rastertiles/{style}/{z}/{x}/{y}.png
const CARTO_BASE = "https://a.basemaps.cartocdn.com/rastertiles";
const OSM_BASE = "https://tile.openstreetmap.org";

const TILE_HEADERS = {
  "User-Agent": "PanelWaze-CASISA/1.0 (Map Tiles Proxy)",
  "Accept": "image/png,image/*,*/*",
};

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

  // CARTO Dark: /tiles/carto-dark/{z}/{x}/{y}.png → dark_all (fallback OSM)
  app.get("/tiles/carto-dark/:z/:x/:y.png", tileRouteOpts, async (req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>, reply: FastifyReply) => {
    const { z, x, y } = req.params;
    const cartoUrl = `${CARTO_BASE}/dark_all/${z}/${x}/${y}.png`;
    const osmUrl = `${OSM_BASE}/${z}/${x}/${y}.png`;
    try {
      let buf: Buffer;
      try {
        buf = await fetchTile(cartoUrl);
      } catch {
        app.log.warn({ cartoUrl }, "CARTO dark fallback to OSM");
        buf = await fetchTile(osmUrl);
      }
      reply.header("Content-Type", "image/png").header("Cache-Control", "public, max-age=604800").send(buf);
    } catch (err) {
      app.log.warn({ cartoUrl, osmUrl, err }, "Tile proxy error");
      reply.status(502).send();
    }
  });

  // CARTO Light: /tiles/carto-light/{z}/{x}/{y}.png → light_all (fallback OSM)
  app.get("/tiles/carto-light/:z/:x/:y.png", tileRouteOpts, async (req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>, reply: FastifyReply) => {
    const { z, x, y } = req.params;
    const cartoUrl = `${CARTO_BASE}/light_all/${z}/${x}/${y}.png`;
    const osmUrl = `${OSM_BASE}/${z}/${x}/${y}.png`;
    try {
      let buf: Buffer;
      try {
        buf = await fetchTile(cartoUrl);
      } catch {
        app.log.warn({ cartoUrl }, "CARTO light fallback to OSM");
        buf = await fetchTile(osmUrl);
      }
      reply.header("Content-Type", "image/png").header("Cache-Control", "public, max-age=604800").send(buf);
    } catch (err) {
      app.log.warn({ cartoUrl, osmUrl, err }, "Tile proxy error");
      reply.status(502).send();
    }
  });

  // OSM: /tiles/osm/{z}/{x}/{y}.png
  app.get("/tiles/osm/:z/:x/:y.png", tileRouteOpts, async (req: FastifyRequest<{ Params: { z: string; x: string; y: string } }>, reply: FastifyReply) => {
    const { z, x, y } = req.params;
    const url = `${OSM_BASE}/${z}/${x}/${y}.png`;
    try {
      const buf = await fetchTile(url);
      reply.header("Content-Type", "image/png").header("Cache-Control", "public, max-age=604800").send(buf);
    } catch (err) {
      app.log.warn({ url, err }, "Tile proxy error");
      reply.status(502).send();
    }
  });
}

export default tileProxyRoutes;

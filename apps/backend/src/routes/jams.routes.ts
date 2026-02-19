import { FastifyInstance } from "fastify";
import { dbService } from "../database/dbService";

export default async function jamsRoutes(fastify: FastifyInstance) {
  // GET /api/jams/all
  fastify.get("/all", async (request, reply) => {
    try {
      // Consulta simple para obtener jams activos
      // Ajustar campos según tabla waze_jams real
      const query = `
        SELECT
            uuid as id,
            polygon_id as "polygonId",
            level,
            speed_kmh as speed,
            length_meters as length,
            delay_seconds as delay,
            street,
            polyline as line,
            pub_millis
        FROM waze_jams
        WHERE is_active = true
        ORDER BY level DESC, delay_seconds DESC NULLS LAST
        LIMIT 1000
      `;

      const result = await dbService.query(query);
      return result.rows;
    } catch (error: unknown) {
      fastify.log.error(error);
      const msg = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({
        error: "Database error retrieving jams",
        details: msg,
      });
    }
  });

  // GET /api/jams/metrics (Anteriormente TVT)
  fastify.get("/metrics", async (request, reply) => {
    const mockMetrics = [
      {
        polygonId: "mock-poly-1",
        wazersCount: 150,
        jamLevels: { low: 10, medium: 5, high: 2 },
        updateTime: new Date().toISOString(),
      },
    ];
    return mockMetrics;
  });
}

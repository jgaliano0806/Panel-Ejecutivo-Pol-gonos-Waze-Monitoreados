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
            level,
            speed_kmh as speed,
            length_meters as length,
            delay_seconds as delay,
            street,
            polyline as line,
            pub_millis,
            blocking_alert_uuid as "blockingAlertUuid"
        FROM waze_jams
        WHERE is_active = true
        LIMIT 500
      `;

      const result = await dbService.query(query);
      return result.rows;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Database error retrieving jams" });
    }
  });
}

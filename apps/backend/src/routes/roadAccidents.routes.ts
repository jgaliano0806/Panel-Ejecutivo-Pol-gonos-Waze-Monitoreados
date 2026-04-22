import { FastifyInstance } from "fastify";
import { dbService } from "../database/dbService";
import { serializeObject } from "../utils/serialization";

export default async function roadAccidentRoutes(server: FastifyInstance) {
  server.get("/map", async (request, reply) => {
    try {
      const { startDate, endDate, polygonId } = request.query as {
        startDate?: string;
        endDate?: string;
        polygonId?: string;
      };

      if (!startDate || !endDate) {
        reply.code(400).send({
          error: "startDate and endDate are required",
          message: "Please provide both startDate and endDate in ISO format",
        });
        return;
      }

      let query = `
        SELECT
          id, location_lat, location_lng, severity, occurred_at,
          description, media_urls, polygon_id, created_at
        FROM road_accidents
        WHERE occurred_at BETWEEN $1 AND $2
          AND location_lat IS NOT NULL
          AND location_lng IS NOT NULL
      `;

      const params: any[] = [startDate, endDate];

      if (polygonId) {
        query += ` AND polygon_id = $3`;
        params.push(polygonId);
      }

      query += ` ORDER BY occurred_at DESC LIMIT 500`;

      const result = await dbService.query(query, params);

      const accidents = result.rows.map((row) => ({
        id: row.id,
        lat: parseFloat(row.location_lat),
        lng: parseFloat(row.location_lng),
        severity: row.severity,
        occurredAt: row.occurred_at,
        description: row.description,
        mediaUrls: row.media_urls || [],
        polygonId: row.polygon_id,
        createdAt: row.created_at,
      }));

      reply.send(serializeObject(accidents));
      server.log.info(`📍 Accidentes RAC obtenidos: ${accidents.length} (${startDate} - ${endDate})`);
    } catch (error) {
      server.log.error(
        {
          error,
          url: request.url,
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Error obteniendo accidentes RAC para mapa"
      );
      reply.code(500).send({
        error: "Failed to get road accidents for map",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

import { FastifyInstance } from "fastify";
// Simular importe de DB service, ajustar a la realidad del proyecto
import { dbService } from "../database/dbService";

export default async function incidentsRoutes(fastify: FastifyInstance) {
  // Endpoint Histórico: /api/incidents/history
  fastify.get("/history", async (request, reply) => {
    try {
      // TODO: Implementar filtros reales (from, to, type)
      // Consulta base para recuperar incidentes con coordenadas
      const query = `
            SELECT
                uuid as incident_id,
                type,
                subtype,
                street,
                latitude,
                longitude,
                created_at as first_seen_at,
                reliability,
                confidence,
                poly_name as polygon_name
            FROM waze_alerts
            LIMIT 100
        `;

      const result = await dbService.query(query);

      // Transformar para asegurar compatibilidad con frontend
      const mapped = result.rows.map((row: any) => ({
        ...row,
        latitude: Number(row.latitude), // Force number from DB
        longitude: Number(row.longitude),
      }));

      return mapped;
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Database error retrieving incidents history" });
    }
  });

  // Endpoint REAL para /all (Live Incidents)
  fastify.get("/all", async (request, reply) => {
    try {
      const query = `
        SELECT
            uuid as id,
            type,
            subtype,
            street,
            latitude,
            longitude,
            pub_millis,
            report_description as description,
            report_by as "reportBy",
            confidence,
            reliability,
            n_thumbs_up as "nThumbsUp",
            polygon_id as "polygonId"
        FROM waze_alerts
        WHERE is_active = true
        LIMIT 2000
      `;

      const result = await dbService.query(query);

      // Transformar para el frontend
      return result.rows.map((row) => ({
        ...row,
        // Convert string coords to numbers (Critical for MapLibre)
        location: {
          lat: Number(row.latitude),
          lng: Number(row.longitude),
        },
        timestamp: new Date(Number(row.pub_millis)),
      }));
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: "Database error retrieving incidents" });
    }
  });
}

import { FastifyInstance } from "fastify";
import { historicalService } from "../services/historicalService";
import { serializeObject } from "../utils/serialization";

export default async function historicalRoutes(server: FastifyInstance) {
  server.get("/global", async (request, reply) => {
    try {
      const hours = parseInt((request.query as { hours?: string })?.hours || "24");
      const snapshots = await historicalService.getGlobalSnapshots(hours);
      return serializeObject(snapshots || []);
    } catch (error) {
      server.log.error({ error, url: request.url }, "Error en /api/historical/global");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get historical data",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });

  server.get("/polygon/:polygonId", async (request, reply) => {
    try {
      const { polygonId } = request.params as { polygonId: string };
      const hours = parseInt((request.query as { hours?: string })?.hours || "24");
      const snapshots = await historicalService.getPolygonSnapshots(polygonId, hours);
      return snapshots;
    } catch (_error) {
      reply.code(500).send({ error: "Failed to get polygon historical data" });
    }
  });

  server.get("/trends", async (request, reply) => {
    try {
      const [totalJams, avgSpeed, criticalKm, avgDelay] = await Promise.all([
        historicalService.calculateTrends("totalJams"),
        historicalService.calculateTrends("avgSpeed"),
        historicalService.calculateTrends("criticalKm"),
        historicalService.calculateTrends("avgDelay"),
      ]);
      return serializeObject({
        totalJams: totalJams || { current: 0, trend: "stable", percentChange: 0 },
        avgSpeed: avgSpeed || { current: 0, trend: "stable", percentChange: 0 },
        criticalKm: criticalKm || { current: 0, trend: "stable", percentChange: 0 },
        avgDelay: avgDelay || { current: 0, trend: "stable", percentChange: 0 },
      });
    } catch (error) {
      server.log.error({ error, url: request.url }, "Error en /api/historical/trends");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get trends",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });

  server.get("/availability", async (request, reply) => {
    try {
      return await historicalService.getDataAvailability();
    } catch (error) {
      reply.code(500).send({ error: "Failed to get data availability" });
    }
  });
}

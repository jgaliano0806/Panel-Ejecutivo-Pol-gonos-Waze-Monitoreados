import { FastifyInstance } from "fastify";
import { wazePollingService } from "../services/wazePollingService";

export default async function tvtRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    try {
      const metrics = await wazePollingService.getAllLatestTvtMetrics();
      return metrics;
    } catch (error) {
      server.log.error({ error }, "Error en /api/tvt-metrics");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get TVT metrics",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });

  server.get("/:polygonId", async (request, reply) => {
    try {
      const { polygonId } = request.params as { polygonId: string };
      const metrics = await wazePollingService.getLatestTvtMetrics(polygonId);
      if (!metrics) {
        reply.code(404).send({ error: "No TVT metrics for polygon" });
        return;
      }
      return metrics;
    } catch (error) {
      server.log.error({ error }, "Error en /api/tvt-metrics/:polygonId");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get TVT metrics for polygon",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });
}

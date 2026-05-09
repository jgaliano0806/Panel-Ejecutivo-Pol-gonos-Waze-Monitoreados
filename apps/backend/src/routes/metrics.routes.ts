import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { apiService } from "../services/apiService";
import { serializeObject } from "../utils/serialization";
import { repositories } from "../repositories";
import { aggregationService } from "../services/aggregationService";

export default async function metricsRoutes(server: FastifyInstance) {
  server.get("/traffic-metrics", async (request, reply) => {
    try {
      const metrics = await apiService.getAllTrafficMetrics();
      return serializeObject(metrics);
    } catch (error) {
      server.log.error({ error, url: request.url }, "Error en /api/traffic-metrics");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get traffic metrics",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });

  server.get("/traffic-metrics/:polygonId", async (request, reply) => {
    try {
      const { polygonId } = request.params as { polygonId: string };
      const metrics = await apiService.getTrafficMetricsByPolygon(polygonId);
      if (!metrics) {
        reply.code(404).send({ error: "Polygon not found" });
        return;
      }
      return metrics;
    } catch (error) {
      server.log.error({ error, url: request.url }, "Error en /api/traffic-metrics/:polygonId");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get polygon traffic metrics",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });

  server.get("/metrics/global", async (request, reply) => {
    try {
      const jams = await repositories().wazeJams.findAllActive();
      const alerts = await repositories().wazeAlerts.findAllActive();
      const trafficMetrics = await apiService.getAllTrafficMetrics();
      const globalMetrics = aggregationService.calculateGlobalMetrics(jams, alerts, trafficMetrics);
      return globalMetrics;
    } catch (error) {
      reply.code(500).send({ error: "Failed to get global metrics" });
    }
  });

  server.get("/metrics/top-critical", async (request, reply) => {
    try {
      const limit = parseInt((request.query as { limit?: string })?.limit || "10");
      const jams = await repositories().wazeJams.findAllActive();
      const alerts = await repositories().wazeAlerts.findAllActive();
      const topCritical = aggregationService.getTopCriticalPolygons(jams, alerts, limit);
      return topCritical;
    } catch (error) {
      reply.code(500).send({ error: "Failed to get top critical polygons" });
    }
  });

  server.get("/kpis/global", async (request, reply) => {
    try {
      const kpis = await apiService.getGlobalKPIs();
      return serializeObject(kpis);
    } catch (error) {
      server.log.error({ error, url: request.url }, "Error en /api/kpis/global");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get global KPIs",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });
}

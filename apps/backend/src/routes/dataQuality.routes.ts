import { FastifyInstance } from "fastify";
import { dataQualityService } from "../services/dataQualityService";
import { repositories } from "../repositories";
import { toLegacyAlert, toLegacyJam } from "../utils";

// Tipos inline equivalentes a los que existían en server.ts
type ThresholdsUpdate = Record<string, { minConfidence?: number; minReliability?: number; minCombined?: number }>;

export default async function dataQualityRoutes(server: FastifyInstance) {
  server.get("/report", async (request, reply) => {
    try {
      const alerts = await repositories().wazeAlerts.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const report = dataQualityService.generateQualityReport(incidents);

      return {
        timestamp: report.timestamp,
        metrics: report.metrics,
        byPolygon: Object.fromEntries(report.byPolygon),
        lowQualityIncidents: report.lowQualityIncidents,
      };
    } catch (error) {
      reply.code(500).send({ error: "Failed to generate quality report" });
    }
  });

  server.get("/metrics", async (request, reply) => {
    try {
      const alerts = await repositories().wazeAlerts.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const metrics = dataQualityService.calculateQualityMetrics(incidents);
      return metrics;
    } catch (error) {
      reply.code(500).send({ error: "Failed to get quality metrics" });
    }
  });

  server.get("/incidents/high-quality", async (request, reply) => {
    try {
      const alerts = await repositories().wazeAlerts.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const highQuality = dataQualityService.getHighQualityIncidents(incidents);
      return highQuality;
    } catch (error) {
      reply.code(500).send({ error: "Failed to get high quality incidents" });
    }
  });

  server.get("/incidents/prioritized", async (request, reply) => {
    try {
      const alerts = await repositories().wazeAlerts.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const prioritized = dataQualityService.prioritizeIncidents(incidents);
      return prioritized;
    } catch (error) {
      reply.code(500).send({ error: "Failed to prioritize incidents" });
    }
  });

  server.get("/incidents/stale", async (request, reply) => {
    try {
      const maxAge = parseInt((request.query as { maxAge?: string })?.maxAge || "30");
      const alerts = await repositories().wazeAlerts.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const stale = dataQualityService.detectStaleIncidents(incidents, maxAge);
      return stale;
    } catch (_error) {
      reply.code(500).send({ error: "Failed to detect stale incidents" });
    }
  });

  server.get("/feed-status", async (request, reply) => {
    try {
      const alerts = await repositories().wazeAlerts.findAllActive();
      const jamsData = await repositories().wazeJams.findAllActive();
      const incidents = alerts.map(toLegacyAlert);
      const jams = jamsData.map(toLegacyJam);
      const status = dataQualityService.checkFeedLimit(incidents, jams);
      return status;
    } catch (error) {
      reply.code(500).send({ error: "Failed to check feed status" });
    }
  });

  server.get("/thresholds", async (request, reply) => {
    try {
      return dataQualityService.getThresholds();
    } catch (error) {
      reply.code(500).send({ error: "Failed to get thresholds" });
    }
  });

  server.post<{ Body: ThresholdsUpdate }>("/thresholds", async (request, reply) => {
    try {
      const updates = request.body;
      dataQualityService.updateThresholds(updates);
      return {
        success: true,
        message: "Thresholds updated",
        current: dataQualityService.getThresholds(),
      };
    } catch (error) {
      reply.code(500).send({ error: "Failed to update thresholds" });
    }
  });
}

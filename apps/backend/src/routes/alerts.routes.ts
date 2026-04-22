import { FastifyInstance } from "fastify";
import { alertService } from "../services/alertService";
import { serializeObject } from "../utils/serialization";

export default async function alertsRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    try {
      const alerts = alertService.getActiveAlerts();
      return serializeObject(alerts || []);
    } catch (error) {
      server.log.error({ error, url: request.url }, "Error en /api/alerts");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get alerts",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });

  server.get("/stats", async (request, reply) => {
    try {
      const stats = alertService.getAlertStats();
      return serializeObject(stats);
    } catch (error) {
      server.log.error({ error, url: request.url }, "Error en /api/alerts/stats");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      reply.code(500).send({
        error: "Failed to get alert stats",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }
  });

  server.get("/severity/:severity", async (request, reply) => {
    try {
      const { severity } = request.params as { severity: string };
      return alertService.getAlertsBySeverity(severity as "critical" | "high" | "medium" | "low");
    } catch (_error) {
      reply.code(500).send({ error: "Failed to get alerts by severity" });
    }
  });

  server.get("/polygon/:polygonId", async (request, reply) => {
    try {
      const { polygonId } = request.params as { polygonId: string };
      return alertService.getAlertsByPolygon(polygonId);
    } catch (_error) {
      reply.code(500).send({ error: "Failed to get alerts by polygon" });
    }
  });

  server.post("/:alertId/acknowledge", async (request, reply) => {
    try {
      const { alertId } = request.params as { alertId: string };
      const body = request.body as { acknowledgedBy?: string };

      const success = alertService.acknowledgeAlert(alertId, body.acknowledgedBy);

      if (!success) {
        reply.code(404).send({ error: "Alert not found" });
        return;
      }

      return { success: true, message: "Alert acknowledged" };
    } catch (error) {
      reply.code(500).send({ error: "Failed to acknowledge alert" });
    }
  });
}

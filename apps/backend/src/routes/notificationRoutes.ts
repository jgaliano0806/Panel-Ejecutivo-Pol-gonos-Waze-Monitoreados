import { FastifyInstance } from "fastify";
import { notificationService } from "../services/notificationService";
import { websocketService } from "../services/websocketService";
import { geoReferenceService } from "../services/geoReferenceService";

export async function notificationRoutes(server: FastifyInstance) {
  server.get("/", async (request, reply) => {
    try {
      const { limit } = request.query as { limit?: string };
      const notifications = await notificationService.getRecent(
        parseInt(limit || "50"),
      );
      return notifications;
    } catch (error) {
      server.log.error({ error }, "Error fetching notifications");
      reply.code(500).send({ error: "Failed to fetch notifications" });
    }
  });

  server.patch("/:id/read", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const success = await notificationService.markAsRead(id);
      return { success };
    } catch (error) {
      server.log.error({ error }, "Error marking notification as read");
      reply.code(500).send({ error: "Failed to update notification" });
    }
  });

  server.post("/read-all", async (request, reply) => {
    try {
      await notificationService.markAllAsRead();
      return { success: true };
    } catch (error) {
      server.log.error({ error }, "Error marking all as read");
      reply.code(500).send({ error: "Failed to update notifications" });
    }
  });

  // Endpoint de prueba para emitir notificación por WebSocket
  server.post("/test", async (request, reply) => {
    try {
      const io = websocketService.getIO();
      if (!io) {
        return reply.code(500).send({ error: "Socket.IO not initialized" });
      }

      // Ubicación real: un hito al azar con un desvío de ~30 m, igual que una alerta de Waze
      await geoReferenceService.ensureLoaded();
      const marker = geoReferenceService.getRandomMarker();
      const latitude = marker ? marker.latitude + (Math.random() - 0.5) * 0.0006 : undefined;
      const longitude = marker ? marker.longitude + (Math.random() - 0.5) * 0.0006 : undefined;
      const nearest =
        latitude !== undefined && longitude !== undefined
          ? geoReferenceService.findNearestMarker(latitude, longitude)
          : null;
      const street = `Autopista Prueba ${Math.floor(Math.random() * 1000)}`;
      const ttsText = geoReferenceService.generateTTSText(
        "ACCIDENT",
        "ACCIDENT_MAJOR",
        nearest,
        street,
      );

      const testNotification = {
        id: crypto.randomUUID(),
        title: "💥 ACCIDENTE GRAVE DETECTADO",
        message: "Atención: Colisión múltiple reportada en su área de monitoreo.",
        type: "ACCIDENT",
        timestamp: new Date().toISOString(),
        is_read: false,
        created_at: new Date().toISOString(),
        data: {
          polygonId: "test-polygon",
          alertId: `test-${Date.now()}`,
          incidentType: "ACCIDENT",
          subtype: "ACCIDENT_MAJOR",
          street,
          city: "Córdoba",
          polygonName: "Zona de Prueba",
          latitude,
          longitude,
          nearestKmName: nearest?.name || null,
          nearestKmRoute: nearest?.route_name || null,
          nearestKmDistance: nearest ? Math.round(nearest.distance) : null,
          ttsText,
        },
      };

      io.emit("notification:new", testNotification);
      server.log.info("🔔 Test notification emitted via WebSocket");

      return { success: true, notification: testNotification };
    } catch (error) {
      server.log.error({ error }, "Error emitting test notification");
      reply.code(500).send({ error: "Failed to emit test notification" });
    }
  });
}

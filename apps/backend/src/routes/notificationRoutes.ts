import { FastifyInstance } from "fastify";
import { notificationService } from "../services/notificationService";

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
}

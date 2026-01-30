import { eventBus, SystemEvents, WazePollCompletePayload } from "../events";
import { Server } from "socket.io";
import { logger } from "../utils/logger";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "ACCIDENT" | "HAZARD" | "SYSTEM";
  timestamp: string;
  is_read: boolean;
  created_at: string;
  data?: {
    polygonId?: string;
    alertId?: string;
    location?: { x: number; y: number };
    incidentType?: string;
    subtype?: string;
    street?: string;
    city?: string;
    polygonName?: string;
  };
}

export class NotificationListener {
  private io: Server;
  private processedAlertIds: Set<string> = new Set();
  // Limpiar caché de IDs procesados cada hora para evitar memoria infinita
  private cleanupInterval: NodeJS.Timeout;

  constructor(io: Server) {
    this.io = io;
    this.setupListeners();

    this.cleanupInterval = setInterval(() => {
      this.processedAlertIds.clear();
    }, 3600 * 1000); // 1 hora

    logger.info("🔔 NotificationListener initialized");
  }

  private setupListeners(): void {
    eventBus.on(
      SystemEvents.WAZE_POLL_COMPLETE,
      this.handleWazePollComplete.bind(this),
    );
  }

  private handleWazePollComplete(payload: WazePollCompletePayload): void {
    try {
      const { polygonId, alerts } = payload;

      // Debug: Log alertas recibidas
      const importantAlerts = alerts.filter(
        (a) => a.type === "ACCIDENT" || a.type === "HAZARD",
      );
      if (importantAlerts.length > 0) {
        logger.debug(
          `📥 ${polygonId}: ${importantAlerts.length} alertas importantes recibidas, ${this.processedAlertIds.size} ya procesadas`,
        );
      }

      // Filtrar alertas nuevas y relevantes (ej: accidentes o jams críticos)
      const newHighPriorityAlerts = alerts.filter((alert) => {
        const isNew = !this.processedAlertIds.has(alert.uuid);
        const isImportant =
          alert.type === "ACCIDENT" ||
          alert.type === "HAZARD" ||
          alert.subtype === "ACCIDENT_MAJOR";

        if (isImportant && !isNew) {
          logger.debug(`⏭️ Alerta ${alert.uuid?.slice(0, 8)} ya procesada`);
        }

        return isNew && isImportant;
      });

      newHighPriorityAlerts.forEach((alert) => {
        this.processedAlertIds.add(alert.uuid);

        // Construir mensaje más descriptivo
        let message = alert.reportDescription || "";

        if (!message) {
          const street = alert.street;
          const city = alert.city;
          const subtypeInfo = alert.subtype
            ? `(${alert.subtype.replace(/_/g, " ")})`
            : "";

          if (street && city) {
            message = `${street}, ${city} ${subtypeInfo}`;
          } else if (street) {
            message = `${street} ${subtypeInfo}`;
          } else if (city) {
            message = `Cerca de ${city} ${subtypeInfo}`;
          } else {
            message = `Ubicación no especificada ${subtypeInfo}`;
          }
        }

        const notification: AppNotification = {
          id: crypto.randomUUID(),
          title: this.getNotificationTitle(alert.type, alert.subtype),
          message,
          type: alert.type === "ACCIDENT" ? "ACCIDENT" : "HAZARD",
          timestamp: new Date().toISOString(),
          is_read: false,
          created_at: new Date().toISOString(),
          data: {
            polygonId,
            alertId: alert.uuid,
            location: alert.location,
            incidentType: alert.type,
            subtype: alert.subtype,
            street: alert.street,
            city: alert.city,
            polygonName: polygonId, // Se podría enriquecer con el nombre real
          },
        };

        // NOTA: La emisión de notificaciones se ha centralizado en wazePollingService -> NotificationService
        // NotificationService emite 'notification:new' al EventBus, y SocketSubscriber lo retransmite al frontend.
        // Esto evita duplicados y garantiza persistencia.
        // this.io.emit("notification:new", notification);
        // logger.info(`🔔 Notification emitted: ${notification.title}`);
      });
    } catch (error) {
      logger.error(`Error in NotificationListener: ${error}`);
    }
  }

  private getNotificationTitle(type: string, subtype?: string): string {
    if (subtype === "ACCIDENT_MAJOR") return "Accidente Mayor Reportado";
    if (type === "ACCIDENT") return "Accidente Reportado";
    if (type === "HAZARD") return "Peligro en la Vía";
    return "Alerta de Tráfico";
  }
}

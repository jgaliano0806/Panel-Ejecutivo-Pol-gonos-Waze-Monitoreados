import { useEffect } from "react";
import { useBlockingAnalysis } from "./useWazeData";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { translateWazeType } from "@/lib/waze-translator";

/**
 * Hook para sincronizar los eventos del Blocking Analysis con el Centro de Notificaciones
 * Esto asegura que las notificaciones coincidan con los eventos mostrados en el Events Dashboard
 */
export const useSyncMapNotifications = () => {
  const { data: blockingData } = useBlockingAnalysis();
  const syncNotifications = useNotificationStore(
    (state) => state.syncNotifications,
  );

  // Función para obtener el título según el tipo
  const getTitle = (t: string) => {
    const normalized = t.toUpperCase();
    if (normalized === "ACCIDENT") return "🔴 Accidente Reportado";
    if (normalized === "HAZARD") return "⚠️ Peligro en la Vía";
    if (normalized === "WEATHERHAZARD") return "⛈️ Riesgo Climático";
    if (normalized === "ROADCLOSED" || normalized === "ROAD_CLOSED")
      return "⛔ Calle Cerrada";
    return "📌 Alerta de Tráfico";
  };

  // Función para obtener el tipo de notificación
  const getNotificationType = (t: string): "ACCIDENT" | "HAZARD" | "SYSTEM" => {
    const normalized = t.toUpperCase();
    if (normalized === "ACCIDENT") return "ACCIDENT";
    if (normalized === "HAZARD" || normalized === "WEATHERHAZARD")
      return "HAZARD";
    return "HAZARD";
  };

  useEffect(() => {
    if (!blockingData?.analyses || blockingData.analyses.length === 0) return;

    const notifications: Notification[] = blockingData.analyses.map(
      (analysis) => {
        const incident = analysis.incident;

        // Construir mensaje traducido
        let messageBody = translateWazeType(
          String(incident.type),
          incident.subtype || "",
        );

        if (incident.street) messageBody += ` en ${incident.street}`;
        if (analysis.delay?.totalDelayMinutes > 0) {
          messageBody += ` (demora: ${analysis.delay.totalDelayMinutes} min)`;
        }
        if (analysis.polygonName) {
          messageBody += ` - ${analysis.polygonName}`;
        }

        return {
          id: incident.id,
          type: getNotificationType(incident.type),
          title: getTitle(incident.type),
          message: messageBody,
          data: {
            id: incident.id,
            type: incident.type,
            subtype: incident.subtype,
            street: incident.street,
            city: incident.city,
            latitude: incident.location?.lat,
            longitude: incident.location?.lng,
            polygonId: incident.polygonId,
            impactScore: analysis.impactScore,
          },
          is_read: true, // Marcar como leídas para no saturar el badge
          created_at:
            incident.timestamp instanceof Date
              ? incident.timestamp.toISOString()
              : String(incident.timestamp),
        };
      },
    );

    if (notifications.length > 0) {
      syncNotifications(notifications);
    }
  }, [blockingData, syncNotifications]);
};

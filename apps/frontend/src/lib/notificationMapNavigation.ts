import type { NavigateFunction } from "react-router-dom";
import type { Notification } from "../stores/useNotificationStore";
import { extractIncidentCoords } from "../components/map/mapUtils";

/**
 * Normaliza notification.data → incidente listo para popup/mapa (sin refetch).
 */
export function buildForcedIncidentFromNotification(
  data: Record<string, any> | null | undefined,
) {
  if (!data) return null;

  const coords = extractIncidentCoords(data);
  const lat = coords.lat;
  const lng = coords.lng;
  const uuid = data.uuid ?? data.alertId ?? data.id;

  return {
    id: uuid,
    uuid,
    type: (data.type || data.incidentType || "HAZARD").toLowerCase(),
    subtype: (data.subtype || "").toLowerCase(),
    street: data.street,
    city: data.city,
    description:
      data.description ||
      data.reportDescription ||
      data.message ||
      "Sin descripción",
    reportDescription: data.reportDescription,
    pubMillis: data.pubMillis,
    timestamp:
      data.timestamp ||
      (data.pubMillis
        ? new Date(data.pubMillis).toISOString()
        : new Date().toISOString()),
    reportBy: data.reportBy,
    nThumbsUp: data.nThumbsUp ?? data.thumbsUp ?? 0,
    confidence: data.confidence,
    reliability: data.reliability,
    magvar: data.magvar,
    location:
      lat != null && lng != null ? { lat, lng, x: lng, y: lat } : data.location,
    latitude: lat ?? data.latitude,
    longitude: lng ?? data.longitude,
    polygonId: data.polygonId,
    polygonName: data.polygonName,
    nearestKmName: data.nearestKmName,
    nearestKmRoute: data.nearestKmRoute,
    ttsText: data.ttsText,
    isDangerZone: data.isDangerZone,
    isRedZone: data.isRedZone,
  };
}

/**
 * Lleva al mapa con datos completos en state (popup inmediato, sin esperar feed).
 */
export function openNotificationOnMap(
  navigate: NavigateFunction,
  notification: Notification,
) {
  const data = notification.data;
  const forcedIncident = buildForcedIncidentFromNotification(data);
  const highlightRaw = data?.uuid ?? data?.alertId ?? notification.id;
  const coords = extractIncidentCoords(forcedIncident ?? data);

  const state = {
    focusEventId: highlightRaw,
    forcedIncident,
  };

  if (coords.lat != null && coords.lng != null) {
    navigate(
      `/mapa?lat=${coords.lat}&lng=${coords.lng}&zoom=16&highlight=${encodeURIComponent(String(highlightRaw))}`,
      { state },
    );
    return;
  }

  if (data?.polygonId) {
    navigate("/mapa", {
      state: {
        ...state,
        selectedPolygonId: data.polygonId,
      },
    });
    return;
  }

  navigate("/mapa", { state });
}

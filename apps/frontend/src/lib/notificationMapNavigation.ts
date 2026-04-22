import type { NavigateFunction } from "react-router-dom";
import type { Notification } from "../stores/useNotificationStore";

/**
 * Lleva al mapa a la ubicación de la notificación: coordenadas si existen,
 * o foco por polígono como fallback (comportamiento previo).
 */
export function openNotificationOnMap(
  navigate: NavigateFunction,
  notification: Notification,
) {
  const data = notification.data;
  const highlightRaw = data?.uuid ?? data?.alertId ?? notification.id;
  const highlightId = encodeURIComponent(String(highlightRaw));

  let lat: number | undefined;
  let lng: number | undefined;

  if (data?.latitude != null && data?.longitude != null) {
    lat = Number(data.latitude);
    lng = Number(data.longitude);
  } else if (data?.location) {
    lng = Number(data.location.x);
    lat = Number(data.location.y);
  }

  if (
    lat != null &&
    lng != null &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    navigate(
      `/mapa?lat=${lat}&lng=${lng}&zoom=16&highlight=${highlightId}`,
    );
    return;
  }

  if (data?.polygonId) {
    navigate("/mapa", {
      state: {
        selectedPolygonId: data.polygonId,
        focusEventId: notification.id,
        forcedIncident: data,
      },
    });
    return;
  }

  navigate("/mapa");
}

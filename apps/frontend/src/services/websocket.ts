import { io, Socket } from "socket.io-client";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { translateWazeType, translateWazeMessage } from "@/lib/waze-translator";
import { speakNotification, isAudioUnlocked } from "@/lib/tts-utils";
import { shouldShowTTSAndSnackbar } from "@/config/notificationFilters";
import { logger } from "@/lib/logger";
import { getNearestKilometer } from "@/utils/geoUtils";
import { useKilometerStore } from "@/stores/useKilometerStore";
import { useRedZoneCriticalStore } from "@/stores/useRedZoneCriticalStore";
import {
  playCriticalAlert,
  type RedZoneIncidentAudioData,
} from "@/utils/audioAlerts";

/**
 * WebSocket client singleton para conexión con el backend
 *
 * IMPORTANTE: Este módulo usa técnicas para evitar problemas con Vite HMR:
 * - Socket singleton almacenado en window para sobrevivir recargas de módulo
 * - Limpieza de handlers antes de registrar nuevos
 * - Set de dedup para evitar TTS duplicado por el mismo incidente
 */

// Si VITE_API_URL no está definido, usar el mismo origen (pasa por proxy de Vite en dev)
// así funciona tanto en localhost como al acceder por IP de red
const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const SOCKET_URL =
  !envApiUrl || envApiUrl.startsWith("/")
    ? typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5180"
    : envApiUrl.replace(/\/api\/?$/, "");

// ═══════════════════════════════════════════════════════════════
// SINGLETON RESISTENTE A HMR: Guardar socket en window para que
// no se cree uno nuevo cada vez que Vite recarga el módulo
// ═══════════════════════════════════════════════════════════════
const SOCKET_KEY = "__waze_panel_socket__";
const DEDUP_KEY = "__waze_panel_tts_dedup__";

// Reusar socket existente o crear uno nuevo
// Si la URL del socket cambió (por HMR o cambio de config), recrear
const existingSocket: Socket | undefined = (window as any)[SOCKET_KEY];
if (!existingSocket || (existingSocket as any).io?.uri !== SOCKET_URL) {
  if (existingSocket) {
    existingSocket.disconnect();
    logger.debug("Socket anterior desconectado (URL cambió)");
  }
  logger.info("Socket conectando", { url: SOCKET_URL });
  (window as any)[SOCKET_KEY] = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    // WebSocket primero: evita el conflicto donde Fastify intercepta las peticiones
    // HTTP de polling (/socket.io?transport=polling) antes de que engine.io pueda
    // manejarlas. El upgrade a WebSocket usa el evento 'upgrade' del servidor HTTP,
    // que Fastify no toca.
    // websocket primero; polling como fallback si ws falla (proxy/firewall)
    transports: ["websocket", "polling"],
    timeout: 20000,
    path: "/socket.io/",
  });
  logger.debug("Socket creado");
}

// Reusar Set de dedup existente o crear uno nuevo
if (!(window as any)[DEDUP_KEY]) {
  (window as any)[DEDUP_KEY] = new Set<string>();
}

// Clave para dedup por contenido CON TTL (mismo incidente en diferentes polígonos con diferente UUID)
// Usa Map<hash, timestamp> para poder expirar entradas después de 10 minutos
const CONTENT_DEDUP_KEY = "__waze_panel_tts_content_dedup_map__";
if (!(window as any)[CONTENT_DEDUP_KEY]) {
  (window as any)[CONTENT_DEDUP_KEY] = new Map<string, number>();
}

export const socket: Socket = (window as any)[SOCKET_KEY];
const processedNotificationIds: Set<string> = (window as any)[DEDUP_KEY];
const processedContentHashes: Map<string, number> = (window as any)[
  CONTENT_DEDUP_KEY
];

// TTL para dedup de contenido: 10 minutos
const CONTENT_DEDUP_TTL_MS = 10 * 60 * 1000;

/**
 * Limpia entradas expiradas del Map de dedup de contenido.
 */
const cleanExpiredContentHashes = (): void => {
  const now = Date.now();
  for (const [hash, timestamp] of processedContentHashes) {
    if (now - timestamp > CONTENT_DEDUP_TTL_MS) {
      processedContentHashes.delete(hash);
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// LIMPIEZA DE HANDLERS PREVIOS (crucial para HMR)
// Remover TODOS los listeners anteriores antes de registrar nuevos
// ═══════════════════════════════════════════════════════════════
socket.removeAllListeners("notification:new");
socket.removeAllListeners("waze:data_updated");
socket.removeAllListeners("play_audio_alert");
socket.removeAllListeners("red_zone_critical_alert");
socket.removeAllListeners("connect");
socket.removeAllListeners("disconnect");
socket.removeAllListeners("connect_error");
socket.removeAllListeners("reconnect");
socket.removeAllListeners("reconnect_attempt");
socket.offAny();

// Event handlers para debugging
socket.on("connect", () => {
  logger.info("WebSocket connected", { socketId: socket.id });
});

// Debug: escuchar todos los eventos (excepto los muy frecuentes)
socket.onAny((event, ...args) => {
  if (event !== "waze:update" && event !== "risk:update") {
    logger.debug("WS event received", { event, args });
  }
});

// ═══════════════════════════════════════════════════════════════
// EVENTO GLOBAL: waze:data_updated
// El backend emite esto al terminar CADA ciclo de ingesta.
// Dispara un CustomEvent en window que el hook useWazeRealtime
// usa para invalidar TODAS las queries de React Query.
// ═══════════════════════════════════════════════════════════════
socket.on("waze:data_updated", (summary: any) => {
  logger.info("📡 waze:data_updated recibido", summary);
  window.dispatchEvent(
    new CustomEvent("waze:data_updated", { detail: summary }),
  );
});

// ═══════════════════════════════════════════════════════════════
// EVENTO GLOBAL: play_audio_alert
// El backend emite esto cuando detecta alertas críticas nuevas,
// pero NO aplica los filtros de notificationFilters del frontend.
// El sonido de alerta ya se reproduce individualmente en el handler
// de notification:new (beep + TTS) para las que pasan los filtros.
// Por tanto, este evento se loguea pero NO reproduce sonido extra
// para evitar alertas falsas por tipos filtrados (ej: CONSTRUCTION).
// ═══════════════════════════════════════════════════════════════
socket.on("play_audio_alert", (data: { count: number; timestamp: string }) => {
  logger.debug(
    "play_audio_alert recibido (sonido delegado a notification:new)",
    data,
  );
});

const RED_ZONE_DEDUP = "__waze_red_zone_uuid_ts__";
/** UUIDs ya anunciados por `red_zone_critical_alert` (sirena + TTS prioridad) — no repetir lectura en `notification:new`. */
const RED_ZONE_SKIP_INCIDENT_TTS_UUIDS =
  "__waze_red_zone_skip_incident_tts_uuids__";

function rememberRedZoneAnnouncedUuid(uuid: string | undefined): void {
  if (!uuid) return;
  const s = ((window as any)[RED_ZONE_SKIP_INCIDENT_TTS_UUIDS] ??=
    new Set<string>()) as Set<string>;
  s.add(uuid);
  if (s.size > 400) {
    const toDrop = [...s].slice(0, 200);
    toDrop.forEach((u) => s.delete(u));
  }
}

function shouldSkipIncidentTtsForRedZone(
  notification: Notification,
  alertUuid: string | undefined,
): boolean {
  const flagged =
    !!notification.data?.isRedZone || !!notification.data?.isDangerZone;
  const set = (window as any)[RED_ZONE_SKIP_INCIDENT_TTS_UUIDS] as
    | Set<string>
    | undefined;
  const fromSocket =
    typeof alertUuid === "string" && !!set?.has(alertUuid);
  return flagged || fromSocket;
}

function shouldProcessRedZoneAlert(uuid: string | undefined): boolean {
  if (!uuid) return true;
  const m = ((window as any)[RED_ZONE_DEDUP] ??= new Map<string, number>());
  const last = m.get(uuid) ?? 0;
  const now = Date.now();
  if (now - last < 45_000) return false;
  m.set(uuid, now);
  return true;
}

socket.on("red_zone_critical_alert", (payload: Record<string, unknown>) => {
  const uuid = payload.uuid as string | undefined;
  if (!shouldProcessRedZoneAlert(uuid)) {
    logger.debug("red_zone_critical_alert deduplicado", { uuid });
    return;
  }

  // Aplicar los mismos filtros de tipo/subtipo que usa el TTS de incidentes normales.
  // Solo disparar sirena+TTS si el tipo de incidente está habilitado en notificationFilters.
  const incidentType =
    (payload.type as string | undefined) ||
    ((payload.incident as any)?.type as string | undefined);
  const incidentSubtype =
    (payload.subtype as string | undefined) ||
    ((payload.incident as any)?.subtype as string | undefined);

  if (!shouldShowTTSAndSnackbar(incidentType, incidentSubtype)) {
    logger.debug("red_zone_critical_alert ignorado — tipo no notificable", {
      uuid,
      incidentType,
      incidentSubtype,
    });
    return;
  }

  logger.info("🚨 red_zone_critical_alert", {
    uuid,
    zona: payload.redZonaNombre,
    incidentType,
    incidentSubtype,
  });
  rememberRedZoneAnnouncedUuid(uuid);
  useRedZoneCriticalStore.getState().push(payload);

  const incidentFromPayload = payload.incident as RedZoneIncidentAudioData | undefined;
  const incident: RedZoneIncidentAudioData =
    incidentFromPayload ??
    ({
      type: incidentType,
      subtype: incidentSubtype,
    } satisfies RedZoneIncidentAudioData);
  const zoneName =
    (payload.zoneName as string | undefined) ||
    (payload.redZonaNombre as string | undefined) ||
    "Zona de riesgo";

  void playCriticalAlert(incident, zoneName).catch((e) =>
    logger.warn("playCriticalAlert rechazada", { e }),
  );
});

/**
 * Genera beep de alerta.
 * Solo funciona despues de interaccion del usuario (autoplay policy).
 */
const playAlertBeep = (isCritical = false): void => {
  if (!isAudioUnlocked()) return; // No intentar si audio bloqueado

  try {
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();

    const playTone = (
      frequency: number,
      startTime: number,
      duration: number,
    ) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    
    if (isCritical) {
      // Tono de Sirena más agresivo para Zonas Rojas
      playTone(880, now, 0.15); 
      playTone(1108.73, now + 0.2, 0.15); 
      playTone(880, now + 0.4, 0.15);
      playTone(1108.73, now + 0.6, 0.15);
    } else {
      // Tono normal
      playTone(523.25, now, 0.15);
      playTone(659.25, now + 0.15, 0.2);
    }
    logger.debug("Beep reproducido", { isCritical });
  } catch (error) {
    logger.warn("Error en beep", { error });
  }
};

/**
 * Genera un mensaje descriptivo para TTS basado en la plantilla formal solicitada:
 * "Atención, operadores. Nuevo incidente ingresado en el sistema. Reporte: [Tipo y Subtipo]. Localización: [Ubicación Vial], a la altura del kilómetro [Número]."
 */
const buildTTSMessage = (notification: Notification): string => {
  const subtype = notification.data?.subtype || "";
  const type = notification.type || notification.data?.incidentType || "";
  const polygonGroup = notification.data?.polygonGroup || "";
  const polygonName = notification.data?.polygonName || "";

  // 1. Obtener traducción de Tipo y Subtipo
  const reporte = translateWazeType(type as string, subtype as string);

  // 2. Construir Ubicación Vial
  // Preferimos polygonGroup si existe (ej: "Ruta Nacional 9"), si no polygonName (ej: "A-019-5")
  let via = polygonGroup || polygonName || notification.data?.street || "vía no especificada";

  // REGLA ESPECIAL: En Circunvalación cambiar "Adiecinueve" por "cerodiecinueve"
  const esCircunvalacion = 
    via.toLowerCase().includes("circunvalacion") || 
    via.toLowerCase().includes("a-019") || 
    polygonGroup.toLowerCase().includes("circunvalacion");

  if (esCircunvalacion) {
    via = via.replace(/adiecinueve/gi, "cerodiecinueve");
    via = via.replace(/A-0?19/gi, "Ruta Nacional cerodiecinueve");
    // Si el nombre es solo el tramo, asegurar que se mencione la vía
    if (!via.toLowerCase().includes("circunvalacion")) {
      via = `Circunvalación ${via}`;
    }
  }

  // 3. Obtener Hito Kilométrico
  let localizacionExtra = "";
  const lat = notification.data?.location?.y ?? notification.data?.latitude;
  const lng = notification.data?.location?.x ?? notification.data?.longitude;
  
  if (lat != null && lng != null) {
    const kmMarkers = useKilometerStore.getState().markers;
    const nearest = getNearestKilometer(
      { latitude: lat, longitude: lng },
      kmMarkers,
    );
    if (nearest) {
      // Intentar extraer solo el número del nombre del hito (ej: "Km 710" -> "setecientos diez")
      // pero por ahora usamos el nombre tal cual para seguridad
      localizacionExtra = `, a la altura del ${nearest.name.toLowerCase()}`;
    }
  }

  // 4. Armar Mensaje Final siguiendo la plantilla
  let prefix = "Atención, operadores. Nuevo incidente ingresado en el sistema.";
  if (notification.data?.isDangerZone) {
    prefix = `¡ALERTA CRÍTICA! Incidente reportado dentro de zona peligrosa en ${notification.data?.dangerZoneName || 'área protegida'}. Repito, alerta en zona peligrosa.`;
  }
  
  const mensajeFinal = `${prefix} Reporte: ${reporte}. Localización: ${via}${localizacionExtra}.`;

  return mensajeFinal;
};

/**
 * Genera un hash de contenido para detectar notificaciones del mismo incidente físico
 * que llegan desde diferentes polígonos con diferentes UUIDs.
 * Usa: tipo + subtipo + calle + coordenadas redondeadas (±200m)
 */
const buildContentHash = (notification: Notification): string | null => {
  const type = notification.type || notification.data?.incidentType || "";
  const subtype = notification.data?.subtype || "";
  const street = (notification.data?.street || "").toLowerCase().trim();
  const lat =
    notification.data?.location?.y ?? notification.data?.latitude ?? 0;
  const lng =
    notification.data?.location?.x ?? notification.data?.longitude ?? 0;

  if (!type && !street) return null;

  // Redondear coords a ~500m de precisión (0.005 grados ≈ 550m)
  // Un mismo accidente puede reportarse desde polígonos vecinos con coords ligeramente distintas
  const roundedLat = Math.round(lat * 200) / 200;
  const roundedLng = Math.round(lng * 200) / 200;

  return `${type}|${subtype}|${street}|${roundedLat}|${roundedLng}`;
};

/**
 * Handler GLOBAL para notification:new
 * Procesa TTS directamente aquí porque los hooks tienen problemas con React StrictMode
 *
 * Protecciones contra TTS duplicado:
 * 1. Set de dedup por notification.id (sobrevive HMR)
 * 2. Set de dedup por alertId/UUID de Waze (mismo incidente, diferente notificación)
 * 3. Set de dedup por CONTENIDO (mismo tipo+subtipo+calle+coords ≈ mismo incidente físico)
 * 4. Handler único (los anteriores se limpian arriba con removeAllListeners)
 */
socket.on("notification:new", async (notification: Notification) => {
  // ═══ AUTH GUARD: Solo procesar notificaciones si el usuario está logueado ═══
  const authState = useAuthStore.getState();
  if (!authState.isAuthenticated) {
    logger.debug("Notificación ignorada — usuario no autenticado");
    return;
  }

  // ═══ DEDUP GUARD: Evitar procesar la misma notificación múltiples veces ═══
  const notifId = notification.id;
  const alertUuid = notification.data?.alertId || notification.data?.uuid;

  if (processedNotificationIds.has(notifId)) {
    logger.debug("Notificación ya procesada (dedup por ID)", { notifId });
    return;
  }

  // También dedup por alertId/UUID de Waze (el backend puede enviar IDs distintos para el mismo incidente)
  const alertKey = alertUuid ? `alert:${alertUuid}` : null;
  if (alertKey && processedNotificationIds.has(alertKey)) {
    logger.debug("Alerta ya procesada (dedup por UUID Waze)", { alertUuid });
    useNotificationStore.getState().markTTSPlayed(notifId);
    return;
  }

  // DEDUP POR CONTENIDO con TTL: El mismo incidente físico puede aparecer en múltiples
  // feeds de polígonos con UUIDs diferentes. Detectamos esto creando un hash
  // basado en tipo + subtipo + calle + coordenadas redondeadas.
  // Las entradas expiran después de 10 minutos para permitir incidentes nuevos similares.
  cleanExpiredContentHashes();
  const contentHash = buildContentHash(notification);
  if (contentHash && processedContentHashes.has(contentHash)) {
    const age = Date.now() - (processedContentHashes.get(contentHash) || 0);
    logger.debug("Contenido duplicado detectado (evitando doble notificación)", {
      contentHash,
      ageSeconds: Math.round(age / 1000),
    });
    // NO agregamos al store para evitar duplicados en UI (Toast) e Historia
    processedNotificationIds.add(notifId);
    if (alertKey) processedNotificationIds.add(alertKey);
    return;
  }

  // Registrar como procesada
  processedNotificationIds.add(notifId);
  if (alertKey) processedNotificationIds.add(alertKey);
  if (contentHash) processedContentHashes.set(contentHash, Date.now());

  // Limpiar entradas antiguas del Set de IDs para no consumir memoria infinita (máx 500 entradas)
  if (processedNotificationIds.size > 500) {
    const entries = Array.from(processedNotificationIds);
    entries
      .slice(0, entries.length - 200)
      .forEach((e) => processedNotificationIds.delete(e));
  }

  // Evento amplio: un solo log con todo el contexto de la notificación
  const incidentType = notification.type || notification.data?.incidentType;
  const subtype = notification.data?.subtype;
  const shouldNotify = shouldShowTTSAndSnackbar(incidentType, subtype);

  logger.info("Notificación recibida", {
    id: notification.id,
    type: incidentType,
    subtype,
    street: notification.data?.street,
    alertUuid: alertUuid || "N/A",
    shouldNotify,
  });

  // Traducir mensaje
  const translatedMessage = translateWazeMessage(notification.message);
  const updatedNotification: Notification = {
    ...notification,
    message: translatedMessage,
    tts_played: false,
  };

  // Agregar al store
  useNotificationStore.getState().addNotification(updatedNotification);

  if (!shouldNotify) {
    useNotificationStore.getState().markTTSPlayed(notification.id);
    return;
  }

  if (shouldSkipIncidentTtsForRedZone(notification, alertUuid)) {
    logger.info(
      "TTS de incidente omitido: zona roja (audio vía red_zone_critical_alert o flags isRedZone/isDangerZone)",
      { notifId: notification.id, alertUuid: alertUuid || "N/A" },
    );
    useNotificationStore.getState().markTTSPlayed(notification.id);
    return;
  }

  // Usar texto TTS del backend si está disponible; si no, construir localmente
  const backendTTS = notification.data?.ttsText;
  const ttsMessage = backendTTS || buildTTSMessage(notification);
  logger.debug("TTS mensaje generado", {
    message: ttsMessage.substring(0, 80),
    source: backendTTS ? "backend" : "frontend",
  });

  if (isAudioUnlocked()) {
    useNotificationStore.getState().markTTSPlayed(notification.id);
    playAlertBeep(!!notification.data?.isDangerZone);
    await new Promise((resolve) => setTimeout(resolve, notification.data?.isDangerZone ? 800 : 400));

    try {
      await speakNotification(ttsMessage, "");
    } catch (error) {
      logger.error("Error en TTS", { error, notifId: notification.id });
      const { notifications } = useNotificationStore.getState();
      const updated = notifications.map((n) =>
        n.id === notification.id ? { ...n, tts_played: false } : n,
      );
      useNotificationStore.getState().setNotifications(updated);
    }
  } else {
    logger.debug("Audio bloqueado — mensaje encolado en TTS service");
    await speakNotification(ttsMessage, "");
    useNotificationStore.getState().markTTSPlayed(notification.id);
  }
});

socket.on("disconnect", (reason) => {
  logger.warn("WebSocket disconnected", { reason });
});

// Evitar spam de logs cuando el backend no está disponible
let lastConnectErrorLog = 0;
const CONNECT_ERROR_LOG_INTERVAL_MS = 15000; // Log como mucho cada 15 s

socket.on("connect_error", (error) => {
  const now = Date.now();
  if (now - lastConnectErrorLog >= CONNECT_ERROR_LOG_INTERVAL_MS) {
    lastConnectErrorLog = now;
    logger.warn("WebSocket connect error", { message: error.message });
  }
});

socket.on("reconnect", (attemptNumber) => {
  logger.info("WebSocket reconectado", { attemptNumber });
});

socket.on("reconnect_attempt", () => {
  // No loguear cada intento para evitar spam
});

/**
 * Suscribirse a updates de un polígono específico
 */
export function subscribeToPolygon(polygonId: string): void {
  socket.emit("subscribe:polygon", polygonId);
  logger.debug("Subscribed to polygon", { polygonId });
}

/**
 * Desuscribirse de un polígono
 */
export function unsubscribeFromPolygon(polygonId: string): void {
  socket.emit("unsubscribe:polygon", polygonId);
  logger.debug("Unsubscribed from polygon", { polygonId });
}

/**
 * Suscribirse a updates globales
 */
export function subscribeToGlobal(): void {
  socket.emit("subscribe:global");
  logger.debug("Subscribed to global updates");
}

/**
 * Estado de conexión
 */
export function isConnected(): boolean {
  return socket.connected;
}

/**
 * Reconectar manualmente
 */
export function reconnect(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Desconectar
 */
export function disconnect(): void {
  socket.disconnect();
}

export default socket;

// ═══════════════════════════════════════════════════════════════
// VITE HMR CLEANUP: Cuando Vite recarga este módulo, los handlers
// se limpiarán automáticamente en la próxima ejecución del módulo
// (ver removeAllListeners arriba). Esto previene acumulación de handlers.
// ═══════════════════════════════════════════════════════════════
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    logger.debug("HMR: Limpiando handlers de websocket.ts");
    socket.removeAllListeners("notification:new");
    socket.removeAllListeners("waze:data_updated");
    socket.removeAllListeners("play_audio_alert");
    socket.removeAllListeners("red_zone_critical_alert");
    socket.removeAllListeners("connect");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("connect_error");
    socket.removeAllListeners("reconnect");
    socket.removeAllListeners("reconnect_attempt");
    socket.offAny();
  });
}

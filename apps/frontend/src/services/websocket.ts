import { io, Socket } from "socket.io-client";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { translateWazeMessage } from "@/lib/waze-translator";
import { speakNotification, isAudioUnlocked } from "@/lib/tts-utils";
import { shouldShowTTSAndSnackbar } from "@/config/notificationFilters";
import { logger } from "@/lib/logger";

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
  logger.debug("play_audio_alert recibido (sonido delegado a notification:new)", data);
});

/**
 * Genera beep de alerta.
 * Solo funciona despues de interaccion del usuario (autoplay policy).
 */
const playAlertBeep = (): void => {
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
    playTone(523.25, now, 0.15);
    playTone(659.25, now + 0.15, 0.2);
    logger.debug("Beep reproducido");
  } catch (error) {
    logger.warn("Error en beep", { error });
  }
};

/**
 * Genera mensaje descriptivo para TTS basado en tipo, subtipo y ubicación
 */
const buildTTSMessage = (notification: Notification): string => {
  const subtype = notification.data?.subtype || "";
  const street = notification.data?.street || "";
  const city = notification.data?.city || "";
  const type = notification.type || notification.data?.incidentType || "";
  const polygonGroup = notification.data?.polygonGroup || "";
  const polygonName = notification.data?.polygonName || "";

  // Limpiar street de Waze (puede venir con KM, altura, abreviaturas)
  const streetClean = street
    ? street
        .replace(/\bRN\s*/gi, "Ruta Nacional ")
        .replace(/\bRP\s*/gi, "Ruta Provincial ")
        .replace(/\bAU\s*/gi, "Autopista ")
        .replace(/\bAv\.?\s*/gi, "Avenida ")
        .replace(/\bKM\s*\d+/gi, "")
        .replace(/\baltura\s*\d*/gi, "")
        .replace(/\//g, ", ")
        .replace(/\s*,\s*,/g, ",")
        .replace(/^\s*,\s*|\s*,\s*$/g, "")
        .trim()
    : "";

  // Construir ubicación:
  // 1. polygonGroup + polygonName (vía y tramo controlados, ej: "Autopista A-019, tramo A-019-1")
  // 2. streetClean de Waze — si no hay grupo
  // 3. city — último recurso
  let ubicacion = "";
  if (polygonGroup) {
    ubicacion = polygonGroup;
    if (polygonName && polygonName !== polygonGroup) {
      ubicacion += `, tramo ${polygonName}`;
    }
  } else if (streetClean) {
    ubicacion = streetClean;
  } else if (city) {
    ubicacion = city;
  }

  // Mensajes específicos por subtipo
  const subtypeMessages: Record<string, string> = {
    // Vehículo detenido
    HAZARD_ON_SHOULDER_CAR_STOPPED: "Vehículo detenido en banquina.",
    HAZARD_ON_ROAD_CAR_STOPPED:
      "Vehículo detenido en carril. Reducir velocidad.",

    // Accidentes
    ACCIDENT_MAJOR:
      "Accidente grave reportado. Posibles demoras significativas.",
    ACCIDENT_MINOR: "Accidente menor reportado.",

    // Obstáculos
    HAZARD_ON_ROAD_OBJECT: "Obstáculo en la calzada. Circular con precaución.",
    HAZARD_ON_ROAD_POT_HOLE: "Bache peligroso en la vía.",
    HAZARD_ON_ROAD_CONSTRUCTION: "Zona de construcción activa.",
    HAZARD_ON_ROAD_LANE_CLOSED: "Carril cerrado. Espere demoras.",
    HAZARD_ON_ROAD_ICE: "Hielo en la calzada. Máxima precaución.",
    HAZARD_ON_ROAD_OIL: "Derrame de aceite en la vía.",
    HAZARD_ON_ROAD_ROAD_KILL: "Animal atropellado en la vía.",
    HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: "Semáforo fuera de servicio.",

    // Animales
    HAZARD_ON_SHOULDER_ANIMALS:
      "Animales sueltos cerca de la vía. Máxima precaución.",

    // Clima
    HAZARD_WEATHER_FLOOD: "Inundación en la vía. Buscar ruta alternativa.",
    HAZARD_WEATHER_FOG: "Niebla densa. Reducir velocidad y usar luces.",
    HAZARD_WEATHER_HEAVY_RAIN: "Lluvia intensa. Precaución al conducir.",
    HAZARD_WEATHER_HAIL: "Granizo reportado en la zona.",

    // Otros peligros
    HAZARD_ON_SHOULDER: "Peligro en la banquina.",
    HAZARD_ON_SHOULDER_MISSING_SIGN: "Señalización faltante o dañada.",
  };

  // Obtener mensaje del subtipo, o generar uno genérico
  let mensaje = subtypeMessages[subtype];

  if (!mensaje) {
    // Mensaje genérico basado en tipo principal (cast to string for comparison)
    const typeStr = String(type);
    if (typeStr === "ACCIDENT") {
      mensaje = "Accidente reportado en la vía.";
    } else if (typeStr === "HAZARD") {
      mensaje = "Peligro reportado en la vía.";
    } else if (typeStr === "WEATHERHAZARD") {
      mensaje = "Alerta climática en la zona.";
    } else {
      mensaje = "Incidente reportado.";
    }
  }

  // Construir mensaje completo
  let mensajeCompleto = `Atención operador. ${mensaje}`;

  if (ubicacion) {
    mensajeCompleto += ` Ubicación: ${ubicacion}.`;
  }

  return mensajeCompleto;
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
    logger.debug("Contenido duplicado detectado", {
      contentHash,
      ageSeconds: Math.round(age / 1000),
    });
    const translatedMsg = translateWazeMessage(notification.message);
    useNotificationStore.getState().addNotification({
      ...notification,
      message: translatedMsg,
      tts_played: true,
    });
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

  // Generar mensaje descriptivo
  const ttsMessage = buildTTSMessage(notification);
  logger.debug("TTS mensaje generado", {
    message: ttsMessage.substring(0, 80),
  });

  if (isAudioUnlocked()) {
    useNotificationStore.getState().markTTSPlayed(notification.id);
    playAlertBeep();
    await new Promise((resolve) => setTimeout(resolve, 400));

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
    socket.removeAllListeners("connect");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("connect_error");
    socket.removeAllListeners("reconnect");
    socket.removeAllListeners("reconnect_attempt");
    socket.offAny();
  });
}

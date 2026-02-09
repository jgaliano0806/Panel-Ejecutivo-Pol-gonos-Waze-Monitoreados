import { io, Socket } from "socket.io-client";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { translateWazeMessage } from "@/lib/waze-translator";
import { speakNotification } from "@/lib/tts-utils";
import { shouldShowTTSAndSnackbar } from "@/config/notificationFilters";

/**
 * WebSocket client singleton para conexión con el backend
 *
 * IMPORTANTE: Este módulo usa técnicas para evitar problemas con Vite HMR:
 * - Socket singleton almacenado en window para sobrevivir recargas de módulo
 * - Limpieza de handlers antes de registrar nuevos
 * - Set de dedup para evitar TTS duplicado por el mismo incidente
 */

const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3002";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

// ═══════════════════════════════════════════════════════════════
// SINGLETON RESISTENTE A HMR: Guardar socket en window para que
// no se cree uno nuevo cada vez que Vite recarga el módulo
// ═══════════════════════════════════════════════════════════════
const SOCKET_KEY = "__waze_panel_socket__";
const DEDUP_KEY = "__waze_panel_tts_dedup__";

// Reusar socket existente o crear uno nuevo
if (!(window as any)[SOCKET_KEY]) {
  (window as any)[SOCKET_KEY] = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    transports: ["websocket", "polling"],
  });
  console.log("🔌 Socket creado (primera vez)");
}

// Reusar Set de dedup existente o crear uno nuevo
if (!(window as any)[DEDUP_KEY]) {
  (window as any)[DEDUP_KEY] = new Set<string>();
}

// Clave para dedup por contenido (mismo incidente en diferentes polígonos con diferente UUID)
const CONTENT_DEDUP_KEY = "__waze_panel_tts_content_dedup__";
if (!(window as any)[CONTENT_DEDUP_KEY]) {
  (window as any)[CONTENT_DEDUP_KEY] = new Set<string>();
}

export const socket: Socket = (window as any)[SOCKET_KEY];
const processedNotificationIds: Set<string> = (window as any)[DEDUP_KEY];
const processedContentHashes: Set<string> = (window as any)[CONTENT_DEDUP_KEY];

// ═══════════════════════════════════════════════════════════════
// LIMPIEZA DE HANDLERS PREVIOS (crucial para HMR)
// Remover TODOS los listeners anteriores antes de registrar nuevos
// ═══════════════════════════════════════════════════════════════
socket.removeAllListeners("notification:new");
socket.removeAllListeners("connect");
socket.removeAllListeners("disconnect");
socket.removeAllListeners("connect_error");
socket.removeAllListeners("reconnect");
socket.removeAllListeners("reconnect_attempt");
// Nota: onAny se limpia por separado
socket.offAny();

// Event handlers para debugging
socket.on("connect", () => {
  console.log("🟢 WebSocket connected:", socket.id);
});

// Debug: escuchar todos los eventos (excepto los muy frecuentes)
socket.onAny((event, ...args) => {
  if (event !== "waze:update" && event !== "risk:update") {
    console.log(`📡 WS event received: ${event}`, args);
  }
});

/**
 * Genera beep de alerta
 */
const playAlertBeep = (): void => {
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
    console.log("🔔 Beep reproducido");
  } catch (error) {
    console.warn("⚠️ Error en beep:", error);
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
  const location = notification.data?.location;

  // Verificar si la calle tiene numeración de dirección (número al final o "al X")
  // No contar números de ruta (RN 36, RP 5, etc.) como numeración de calle
  const streetWithoutRouteNumbers = street
    .replace(/\b(RN|RP|AU|Ruta|A)\s*\d+/gi, "") // Remover números de ruta
    .replace(/\bKM\s*\d+/gi, ""); // Remover kilómetros existentes
  const hasStreetNumber = /\d+/.test(streetWithoutRouteNumbers);

  // Construir ubicación
  let ubicacion = "";
  if (street) {
    // Limpiar y formatear nombre de calle
    ubicacion = street
      .replace(/\bRN\s*/gi, "Ruta Nacional ")
      .replace(/\bRP\s*/gi, "Ruta Provincial ")
      .replace(/\bAU\s*/gi, "Autopista ")
      .replace(/\bAv\.?\s*/gi, "Avenida ")
      .replace(/\bKM\s*(\d+)/gi, "kilómetro $1")
      .replace(/\//g, ", ");

    // Si no tiene numeración y tenemos coordenadas, estimar kilómetro basado en latitud
    console.log("📍 Debug ubicación:", {
      street,
      streetWithoutRouteNumbers,
      hasStreetNumber,
      hasLocation: !!location,
      locationY: location?.y,
    });

    if (!hasStreetNumber && location && location.y) {
      const lat = location.y;
      // Usar decimales de latitud como referencia aproximada de kilómetro
      // Esto es una aproximación: cada 0.009 grados ≈ 1 km
      const kmEstimate = Math.abs((lat % 1) * 111).toFixed(0);
      console.log("📍 Km estimado:", kmEstimate);
      if (kmEstimate && parseInt(kmEstimate) > 0) {
        ubicacion += `, aproximadamente kilómetro ${kmEstimate}`;
      }
    }
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
  const street = notification.data?.street || "";
  const lat = notification.data?.location?.y ?? notification.data?.latitude ?? 0;
  const lng = notification.data?.location?.x ?? notification.data?.longitude ?? 0;

  if (!type && !street) return null;

  // Redondear coords a ~200m de precisión (0.002 grados ≈ 220m)
  const roundedLat = Math.round(lat * 500) / 500;
  const roundedLng = Math.round(lng * 500) / 500;

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
  // ═══ DEDUP GUARD: Evitar procesar la misma notificación múltiples veces ═══
  const notifId = notification.id;
  const alertUuid = notification.data?.alertId || notification.data?.uuid;

  if (processedNotificationIds.has(notifId)) {
    console.log(`⏭️ Notificación ${notifId} ya procesada, ignorando (dedup por ID)`);
    return;
  }

  // También dedup por alertId/UUID de Waze (el backend puede enviar IDs distintos para el mismo incidente)
  const alertKey = alertUuid ? `alert:${alertUuid}` : null;
  if (alertKey && processedNotificationIds.has(alertKey)) {
    console.log(`⏭️ Alerta ${alertUuid} ya procesada, ignorando (dedup por UUID Waze)`);
    useNotificationStore.getState().markTTSPlayed(notifId);
    return;
  }

  // DEDUP POR CONTENIDO: El mismo incidente físico puede aparecer en múltiples
  // feeds de polígonos con UUIDs diferentes. Detectamos esto creando un hash
  // basado en tipo + subtipo + calle + coordenadas redondeadas.
  const contentHash = buildContentHash(notification);
  if (contentHash && processedContentHashes.has(contentHash)) {
    console.log(`⏭️ Contenido duplicado detectado (${contentHash}), ignorando TTS`);
    // Aún así agregar al store (para que se muestre la notificación) pero marcar TTS como reproducido
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
  if (contentHash) processedContentHashes.add(contentHash);

  // Limpiar entradas antiguas de los Sets para no consumir memoria infinita (máx 500 entradas)
  if (processedNotificationIds.size > 500) {
    const entries = Array.from(processedNotificationIds);
    entries.slice(0, entries.length - 200).forEach((e) => processedNotificationIds.delete(e));
  }
  if (processedContentHashes.size > 300) {
    const entries = Array.from(processedContentHashes);
    entries.slice(0, entries.length - 100).forEach((e) => processedContentHashes.delete(e));
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔔 NOTIFICACIÓN RECIBIDA (websocket.ts)");
  console.log("   ID:", notification.id);
  console.log("   Type:", notification.type);
  console.log("   Title:", notification.title);
  console.log("   Subtype:", notification.data?.subtype);
  console.log("   Street:", notification.data?.street);
  console.log("   AlertUUID:", alertUuid || "N/A");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Traducir mensaje
  const translatedMessage = translateWazeMessage(notification.message);
  const updatedNotification: Notification = {
    ...notification,
    message: translatedMessage,
    tts_played: false,
  };

  // Agregar al store
  useNotificationStore.getState().addNotification(updatedNotification);
  console.log("✅ Agregada al store");

  // Evaluar filtros TTS
  const incidentType = notification.type || notification.data?.incidentType;
  const subtype = notification.data?.subtype;

  console.log("🔍 Evaluando filtros TTS:");
  console.log("   - Tipo:", incidentType);
  console.log("   - Subtipo:", subtype);

  const shouldNotify = shouldShowTTSAndSnackbar(incidentType, subtype);
  console.log("   - ¿Debe notificar?:", shouldNotify);

  if (!shouldNotify) {
    console.log("🔕 Filtrado - NO reproducir TTS");
    useNotificationStore.getState().markTTSPlayed(notification.id);
    return;
  }

  console.log("✅ Pasó filtros - Reproduciendo TTS...");

  // ⚡ Marcar TTS como "en progreso" ANTES de iniciar la reproducción
  // Esto evita que el retry periódico (useRealtimeNotifications) lo detecte
  // como pendiente y lo reproduzca una segunda vez
  useNotificationStore.getState().markTTSPlayed(notification.id);

  // Reproducir beep
  playAlertBeep();

  // Delay para que beep no se solape
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Generar mensaje descriptivo
  const ttsMessage = buildTTSMessage(notification);
  console.log("🎤 Mensaje TTS:", ttsMessage);

  // Ejecutar TTS con mensaje descriptivo
  try {
    await speakNotification(ttsMessage, "");
    console.log("✅ TTS completado");
  } catch (error) {
    console.error("❌ Error en TTS:", error);
    // Si falla, desmarcar para que el retry lo intente más adelante
    const { notifications } = useNotificationStore.getState();
    const updated = notifications.map((n) =>
      n.id === notification.id ? { ...n, tts_played: false } : n,
    );
    useNotificationStore.getState().setNotifications(updated);
    console.log("🔓 TTS desmarcado - se reintentará en el próximo ciclo");
  }
});

socket.on("disconnect", (reason) => {
  console.log("🔴 WebSocket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("❌ WebSocket connection error:", error.message);
});

socket.on("reconnect", (attemptNumber) => {
  console.log("🔄 WebSocket reconnected after", attemptNumber, "attempts");
});

socket.on("reconnect_attempt", (attemptNumber) => {
  console.log("🔄 WebSocket reconnection attempt:", attemptNumber);
});

/**
 * Suscribirse a updates de un polígono específico
 */
export function subscribeToPolygon(polygonId: string): void {
  socket.emit("subscribe:polygon", polygonId);
  console.log(`📍 Subscribed to polygon: ${polygonId}`);
}

/**
 * Desuscribirse de un polígono
 */
export function unsubscribeFromPolygon(polygonId: string): void {
  socket.emit("unsubscribe:polygon", polygonId);
  console.log(`📍 Unsubscribed from polygon: ${polygonId}`);
}

/**
 * Suscribirse a updates globales
 */
export function subscribeToGlobal(): void {
  socket.emit("subscribe:global");
  console.log("🌍 Subscribed to global updates");
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
    console.log("🔄 HMR: Limpiando handlers de websocket.ts");
    socket.removeAllListeners("notification:new");
    socket.removeAllListeners("connect");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("connect_error");
    socket.removeAllListeners("reconnect");
    socket.removeAllListeners("reconnect_attempt");
    socket.offAny();
  });
}

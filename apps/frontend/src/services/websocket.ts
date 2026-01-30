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
 */

const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3002";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

// Crear instancia del socket
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
});

// Event handlers para debugging
socket.on("connect", () => {
  console.log("🟢 WebSocket connected:", socket.id);
});

// Debug: escuchar todos los eventos
socket.onAny((event, ...args) => {
  console.log(`📡 WS event received: ${event}`, args);
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
 * Handler GLOBAL para notification:new
 * Procesa TTS directamente aquí porque los hooks tienen problemas con React StrictMode
 */
socket.on("notification:new", async (notification: Notification) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔔 NOTIFICACIÓN RECIBIDA (websocket.ts)");
  console.log("   ID:", notification.id);
  console.log("   Type:", notification.type);
  console.log("   Title:", notification.title);
  console.log("   Subtype:", notification.data?.subtype);
  console.log("   Street:", notification.data?.street);
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

  // Reproducir beep
  playAlertBeep();

  // Delay para que beep no se solape
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Generar mensaje descriptivo
  const ttsMessage = buildTTSMessage(notification);
  console.log("🎤 Mensaje TTS:", ttsMessage);

  // Ejecutar TTS con mensaje descriptivo
  try {
    // speakNotification espera (title, message) pero nosotros queremos enviar un mensaje completo
    // Enviamos el mensaje completo como "title" y vacío como "message" para evitar duplicación
    await speakNotification(ttsMessage, "");
    useNotificationStore.getState().markTTSPlayed(notification.id);
    console.log("✅ TTS completado");
  } catch (error) {
    console.error("❌ Error en TTS:", error);
    useNotificationStore.getState().markTTSPlayed(notification.id);
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

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  AlertTriangle,
  AlertOctagon,
  Info,
  MapPin,
  Tag,
} from "lucide-react";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";
import { getSubtypeTranslation } from "@/utils/wazeTranslations";
import { shouldShowTTSAndSnackbar } from "@/config/notificationFilters";

/**
 * Formatea la hora de la notificación de forma segura.
 * Maneja diferentes formatos de fecha y evita "Invalid Date".
 */
const formatNotificationTime = (dateInput: string | Date | number): string => {
  if (!dateInput) return "Ahora";

  let date: Date;

  // Si es número (timestamp), convertir
  if (typeof dateInput === "number") {
    date = new Date(dateInput);
  }
  // Si es string, intentar parsear
  else if (typeof dateInput === "string") {
    // Intentar parseo directo
    date = new Date(dateInput);

    // Si falló, podría ser timestamp string
    if (isNaN(date.getTime()) && /^\d+$/.test(dateInput)) {
      date = new Date(parseInt(dateInput, 10));
    }
  }
  // Si ya es Date, usarla directamente
  else {
    date = dateInput;
  }

  // Verificar si la fecha es válida
  if (isNaN(date.getTime())) {
    return "Ahora";
  }

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

interface GlobalNotificationsProps {
  className?: string;
}

/**
 * Componente principal para mostrar notificaciones flotantes globales
 * Gestiona el sonido y la visualización de alertas activas
 */
// TTS se maneja centralizadamente en useRealtimeNotifications.ts

export const GlobalNotifications: React.FC<GlobalNotificationsProps> = ({
  className,
}) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  // NOTA: El TTS se maneja centralizadamente en useRealtimeNotifications.ts
  // para evitar reproducción duplicada de audio

  // IDs cuya toast expiró tras 1 min (solo se ocultan del mapa, NO se marcan como leídas)
  const [toastDismissedIds, setToastDismissedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const onToastTimeout = useCallback((id: string) => {
    setToastDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const activeNotifications = notifications
    .filter((n) => {
      if (n.is_read) return false;
      if (toastDismissedIds.has(n.id)) return false; // Toast expirado → ocultar pero sigue no leída
      const incidentType = n.type || n.data?.incidentType;
      const subtype = n.data?.subtype;
      return shouldShowTTSAndSnackbar(incidentType, subtype);
    })
    .slice(0, 3);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none",
        className,
      )}
    >
      <AnimatePresence>
        {activeNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={() => markAsRead(notification.id)}
            onToastTimeout={onToastTimeout}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
  onToastTimeout: (id: string) => void;
}

const TOAST_DURATION_MS = 60_000; // 1 minuto — solo oculta el toast; la notificación sigue no leída en el módulo

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  onToastTimeout,
}) => {
  const navigate = useNavigate();

  // Después de 1 min ocultar el toast SIN marcar como leída
  useEffect(() => {
    const timer = setTimeout(() => onToastTimeout(notification.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notification.id, onToastTimeout]);

  const handleNavigate = () => {
    onDismiss(); // Mark as read
    if (notification.data?.polygonId) {
      navigate("/mapa", {
        state: {
          selectedPolygonId: notification.data.polygonId,
          focusEventId: notification.id,
          forcedIncident: notification.data,
        },
      });
    }
  };

  // Icono basado en el tipo
  const getIcon = () => {
    switch (notification.type) {
      case "ACCIDENT":
        return <AlertOctagon className="h-6 w-6 text-red-500" />;
      case "HAZARD":
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case "ACCIDENT":
        return "border-l-red-500 bg-red-50/50 dark:bg-red-950/20";
      case "HAZARD":
        return "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20";
      default:
        return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20";
    }
  };

  const getTypeLabel = () => {
    switch (notification.type) {
      case "ACCIDENT":
        return "Accidente";
      case "HAZARD":
        return "Peligro";
      default:
        return "Alerta";
    }
  };

  // Extraer información del data o del mensaje
  const subtype = notification.data?.subtype;
  const incidentType =
    notification.data?.incidentType || notification.type || "HAZARD";
  const street = notification.data?.street;
  const city = notification.data?.city;
  const polygonName = notification.data?.polygonName;

  // Traducir el subtipo si existe (con validaciones defensivas)
  const subtypeText =
    subtype && incidentType
      ? getSubtypeTranslation(incidentType, subtype)
      : null;

  // Construir la ubicación
  const location = street
    ? city
      ? `${street}, ${city}`
      : street
    : city
      ? `Cerca de ${city}`
      : polygonName || null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "pointer-events-auto shadow-2xl rounded-xl p-4 flex items-start gap-3 border-l-4 backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-all duration-200",
        getBorderColor(),
      )}
      role="alert"
      onClick={handleNavigate}
    >
      {/* Icono con animación */}
      <div className="mt-0.5 flex-shrink-0">
        <div className="animate-pulse">{getIcon()}</div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Tipo de incidente */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
              notification.type === "ACCIDENT"
                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                : notification.type === "HAZARD"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
            )}
          >
            {getTypeLabel()}
          </span>
          <span className="text-xs text-gray-400">
            {formatNotificationTime(notification.created_at)}
          </span>
        </div>

        {/* Subtipo (si existe) */}
        {subtypeText && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {subtypeText}
            </span>
          </div>
        )}

        {/* Ubicación */}
        {location && (
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
              {location}
            </span>
          </div>
        )}

        {/* Mensaje original si no hay datos estructurados */}
        {!subtypeText && !location && notification.message && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
            {notification.message}
          </p>
        )}
      </div>

      {/* Botón de cerrar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white/80 dark:bg-slate-700/80 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-600 shadow-sm"
        aria-label="Marcar como leída"
      >
        <Check className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils"; // Asumiendo que existe

import { translateWazeType, translateWazeMessage } from "@/lib/waze-translator";

interface GlobalNotificationsProps {
  className?: string;
}

/**
 * Componente principal para mostrar notificaciones flotantes globales
 * Gestiona el sonido y la visualización de alertas activas
 */
export const GlobalNotifications: React.FC<GlobalNotificationsProps> = ({
  className,
}) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  // Filtramos solo las no leídas para mostrar en el "Snackbar"
  // Limitamos a 3 para no saturar la pantalla
  const activeNotifications = notifications
    .filter((n) => !n.is_read)
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
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    onDismiss(); // Mark as read
    if (notification.data?.polygonId) {
      navigate("/mapa", {
        state: {
          selectedPolygonId: notification.data.polygonId,
          focusEventId: notification.id,
          forcedIncident: notification.data, // Objeto completo para el popup
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
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case "ACCIDENT":
        return "border-l-red-500";
      case "HAZARD":
        return "border-l-yellow-500";
      default:
        return "border-l-blue-500";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "pointer-events-auto bg-white dark:bg-slate-800 shadow-2xl rounded-lg p-4 flex items-start gap-3 border-l-4 backdrop-blur-sm bg-opacity-95 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors",
        getBorderColor(),
      )}
      role="alert"
      onClick={handleNavigate}
    >
      <div className="mt-1 flex-shrink-0 animate-pulse">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none mb-1">
          {notification.title}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
          {translateWazeMessage(notification.message)}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          {new Date(notification.created_at).toLocaleTimeString()}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation(); // Just dismiss
          onDismiss();
        }}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-slate-700 p-1 rounded-full hover:bg-gray-200"
        aria-label="Marcar como leída"
      >
        <Check className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

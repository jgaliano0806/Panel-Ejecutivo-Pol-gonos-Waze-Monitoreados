import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotificationStore,
  Notification,
} from "@/stores/useNotificationStore";
import { translateWazeType, translateWazeMessage } from "@/lib/waze-translator";
import {
  Search,
  Filter,
  Trash2,
  CheckCircle,
  Clock,
  AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { speakNotification } from "@/lib/tts-utils";

export const NotificationsPage: React.FC = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearNotifications = useNotificationStore(
    (state) => state.clearNotifications,
  );
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredNotifications = notifications.filter((n) => {
    const matchesFilter =
      filter === "ALL" ? true : filter === "UNREAD" ? !n.is_read : n.is_read;

    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Centro de Notificaciones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Historial de alertas y eventos del sistema
          </p>
        </div>

        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Marcar todo leído
          </button>
          <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={clearNotifications}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar historial
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros Lateral */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            <div className="mt-4 space-y-1">
              <FilterButton
                active={filter === "ALL"}
                onClick={() => setFilter("ALL")}
                label="Todas"
                count={notifications.length}
              />
              <FilterButton
                active={filter === "UNREAD"}
                onClick={() => setFilter("UNREAD")}
                label="No leídas"
                count={notifications.filter((n) => !n.is_read).length}
              />
              <FilterButton
                active={filter === "READ"}
                onClick={() => setFilter("READ")}
                label="Leídas"
                count={notifications.filter((n) => n.is_read).length}
              />
            </div>
          </div>

          {/* Herramientas de Validación (Solo para testing) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Validación de Sistema
            </h3>
            <button
              onClick={() => {
                const tests: Notification[] = [
                  {
                    id: `test-1-${Date.now()}`,
                    type: "HAZARD",
                    title: "⚠️ Peligro en la Vía en RP E73",
                    message: "Vehículo detenido en banquina",
                    created_at: new Date().toISOString(),
                    is_read: false,
                  },
                  {
                    id: `test-2-${Date.now()}`,
                    type: "ACCIDENT",
                    title: "🚨 Accidente en RN 20",
                    message: "Colisión múltiple con demoras",
                    created_at: new Date().toISOString(),
                    is_read: false,
                  },
                  {
                    id: `test-3-${Date.now()}`,
                    type: "HAZARD",
                    title: "🚧 Corte total en Circunvalación",
                    message: "Obras preventivas por mantenimiento",
                    created_at: new Date().toISOString(),
                    is_read: false,
                  },
                ];

                tests.forEach((t, i) => {
                  setTimeout(() => {
                    console.log("🧪 Disparando notificación de prueba:", t.id);
                    addNotification(t);
                    speakNotification(t.title, t.message);
                  }, i * 2000);
                });
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors shadow-sm"
            >
              <AlertOctagon className="h-4 w-4" />
              Probar Demo (Voz + Vista)
            </button>
          </div>
        </div>

        {/* Lista de Notificaciones */}
        <div className="lg:col-span-3 space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Clock className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                No hay notificaciones
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No se encontraron alertas con los filtros actuales.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, label, count }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
      active
        ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-medium"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800",
    )}
  >
    <span>{label}</span>
    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
      {count}
    </span>
  </button>
);

const NotificationCard = ({ notification }: { notification: Notification }) => {
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const navigate = useNavigate();

  const handleClick = () => {
    markAsRead(notification.id);
    if (notification.data?.polygonId) {
      React.startTransition(() => {
        navigate("/mapa", {
          state: {
            selectedPolygonId: notification.data.polygonId,
            focusEventId: notification.id,
            forcedIncident: notification.data, // Pasamos el objeto completo para asegurar que el mapa pueda mostrarlo
          },
        });
      });
    }
  };

  return (
    <div
      className={cn(
        "relative bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:shadow-md cursor-pointer hover:border-gray-300 dark:hover:border-gray-600",
        !notification.is_read && "border-l-4 border-l-primary-500",
      )}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
              notification.type === "ACCIDENT"
                ? "bg-red-100 text-red-600"
                : notification.type === "HAZARD"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-blue-100 text-blue-600",
            )}
          >
            {notification.type === "ACCIDENT" ? (
              <AlertOctagon className="h-5 w-5" />
            ) : notification.type === "HAZARD" ? (
              <Filter className="h-5 w-5" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h4
              className={cn(
                "text-base font-semibold",
                !notification.is_read
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-gray-300",
              )}
            >
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {translateWazeMessage(notification.message)}
            </p>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        {!notification.is_read && (
          <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />
        )}
      </div>
    </div>
  );
};

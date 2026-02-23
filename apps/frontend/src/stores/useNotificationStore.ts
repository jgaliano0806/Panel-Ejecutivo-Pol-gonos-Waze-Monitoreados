import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NotificationData {
  polygonId?: string;
  alertId?: string;
  uuid?: string;
  location?: { x: number; y: number };
  latitude?: number;
  longitude?: number;
  incidentType?: string;
  subtype?: string;
  street?: string;
  city?: string;
  polygonName?: string;
}

export interface Notification {
  id: string;
  type: "ACCIDENT" | "HAZARD" | "SYSTEM";
  title: string;
  message: string;
  data?: NotificationData;
  is_read: boolean;
  created_at: string;
  /** Indica si el TTS fue reproducido exitosamente para esta notificación */
  tts_played?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  syncNotifications: (notifications: Notification[]) => void;
  fetchHistory: () => Promise<void>;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeDuplicates: () => void;
  /** Marca una notificación como TTS reproducido */
  markTTSPlayed: (id: string) => void;
  /** Obtiene notificaciones pendientes de TTS (no leídas y sin TTS reproducido) */
  getPendingTTSNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const { notifications } = get();

        // Evitar duplicados por ID de notificación
        if (notifications.some((n) => n.id === notification.id)) return;

        // Evitar duplicados por alertId (mismo evento de Waze en diferentes polígonos)
        // Solo verificamos si tiene alertId y ya existe una notificación con ese alertId
        if (notification.data?.alertId) {
          const existingAlert = notifications.find(
            (n) => n.data?.alertId === notification.data?.alertId,
          );
          if (existingAlert) {
            console.log(
              `⏭️ Notificación duplicada ignorada (alertId: ${notification.data.alertId})`,
            );
            return;
          }
        }

        const newNotifications = [notification, ...notifications];
        set({
          notifications: newNotifications,
          unreadCount: newNotifications.filter((n) => !n.is_read).length,
        });
      },

      syncNotifications: (newItems: Notification[]) => {
        const { notifications } = get();
        const existingIds = new Set(notifications.map((n) => n.id));
        const existingAlertIds = new Set(
          notifications
            .filter((n) => n.data?.alertId)
            .map((n) => n.data!.alertId),
        );

        // Filtrar: no duplicar por id ni por alertId
        const toAdd = newItems.filter((n) => {
          if (existingIds.has(n.id)) return false;
          if (n.data?.alertId && existingAlertIds.has(n.data.alertId))
            return false;
          return true;
        });

        if (toAdd.length === 0) return;

        const newNotifications = [...toAdd, ...notifications].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        set({
          notifications: newNotifications,
          unreadCount: newNotifications.filter((n) => !n.is_read).length,
        });
      },

      fetchHistory: async () => {
        try {
          // Igual que en otros módulos: VITE_API_URL debe incluir /api.
          // Fallback coherente con backend Fastify: http://localhost:3002/api
          const API_URL = import.meta.env.VITE_API_URL || "/api";
          const response = await fetch(`${API_URL}/notifications?limit=50`);
          if (response.ok) {
            const data = await response.json();
            get().syncNotifications(data);
          }
        } catch (error) {
          console.error("Failed to fetch notification history:", error);
        }
      },

      setNotifications: (notifications) => {
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.is_read).length,
        });
      },

      markAsRead: (id) => {
        const { notifications } = get();
        const updated = notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        );
        set({
          notifications: updated,
          unreadCount: updated.filter((n) => !n.is_read).length,
        });
      },

      markAllAsRead: () => {
        const { notifications } = get();
        const updated = notifications.map((n) => ({ ...n, is_read: true }));
        set({
          notifications: updated,
          unreadCount: 0,
        });
      },

      clearNotifications: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      removeDuplicates: () => {
        const { notifications } = get();
        const seenAlertIds = new Set<string>();
        const uniqueNotifications: Notification[] = [];

        // Mantener solo la primera notificación de cada alertId
        for (const notification of notifications) {
          const alertId = notification.data?.alertId;

          if (alertId) {
            if (seenAlertIds.has(alertId)) {
              console.log(`🗑️ Removiendo duplicado: ${alertId}`);
              continue;
            }
            seenAlertIds.add(alertId);
          }

          uniqueNotifications.push(notification);
        }

        const removedCount = notifications.length - uniqueNotifications.length;
        if (removedCount > 0) {
          console.log(`✅ Removidos ${removedCount} duplicados`);
          set({
            notifications: uniqueNotifications,
            unreadCount: uniqueNotifications.filter((n) => !n.is_read).length,
          });
        }
      },

      markTTSPlayed: (id: string) => {
        const { notifications } = get();
        const updated = notifications.map((n) =>
          n.id === id ? { ...n, tts_played: true } : n,
        );
        set({ notifications: updated });
        console.log(`🔊 TTS marcado como reproducido para notificación: ${id}`);
      },

      getPendingTTSNotifications: () => {
        const { notifications } = get();
        // Notificaciones de los últimos 10 minutos que no tienen TTS reproducido
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        return notifications.filter((n) => {
          // Solo ACCIDENT y HAZARD
          if (n.type !== "ACCIDENT" && n.type !== "HAZARD") return false;
          // Ya reproducido → skip
          if (n.tts_played) return false;
          // Ya leídas (sincronizadas desde blocking analysis) → no necesitan TTS
          if (n.is_read) return false;
          // Creada en los últimos 10 minutos
          const createdAt = new Date(n.created_at).getTime();
          if (createdAt < tenMinutesAgo) return false;
          return true;
        });
      },
    }),
    {
      name: "notification-storage",
    },
  ),
);

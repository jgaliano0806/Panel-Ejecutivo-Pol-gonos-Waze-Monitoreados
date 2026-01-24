import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Notification {
  id: string;
  type: "ACCIDENT" | "HAZARD" | "SYSTEM";
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
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
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const { notifications } = get();
        // Evitar duplicados (por si socket y fetch se solapan)
        if (notifications.some((n) => n.id === notification.id)) return;

        const newNotifications = [notification, ...notifications];
        set({
          notifications: newNotifications,
          unreadCount: newNotifications.filter((n) => !n.is_read).length,
        });
      },

      syncNotifications: (newItems: Notification[]) => {
        const { notifications } = get();
        const startIds = new Set(notifications.map((n) => n.id));
        const toAdd = newItems.filter((n) => !startIds.has(n.id));

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
          const API_URL =
            import.meta.env.VITE_API_URL || "http://localhost:3002";
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
    }),
    {
      name: "notification-storage",
    },
  ),
);

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
  polygonGroup?: string;
  nearestKmName?: string | null;
  nearestKmRoute?: string | null;
  nearestKmDistance?: number | null;
  ttsText?: string | null;
  /** Incidente dentro de zona peligrosa RAC (mismo ciclo que `red_zone_critical_alert`). */
  isRedZone?: boolean;
  isDangerZone?: boolean;
  dangerZoneName?: string;
}

export interface Notification {
  id: string;
  type: "ACCIDENT" | "HAZARD" | "SYSTEM";
  title: string;
  message: string;
  data?: NotificationData;
  is_read: boolean;
  created_at: string;
  tts_played?: boolean;
}

// ────────────────────────────────────────────────────
// Helpers para clearedAt por usuario (fuera del store
// de Zustand para no compartir entre usuarios).
// Key: `notification_cleared_at:<email>`
// ────────────────────────────────────────────────────
const CLEARED_AT_PREFIX = "notification_cleared_at:";

function getCurrentUserEmail(): string | null {
  try {
    const raw = localStorage.getItem("panel_waze_auth_token");
    if (!raw) return null;
    const payload = JSON.parse(atob(raw.split(".")[1]));
    return payload?.email ?? payload?.sub ?? null;
  } catch {
    return null;
  }
}

function getClearedAt(): number {
  const email = getCurrentUserEmail();
  if (!email) return 0;
  const val = localStorage.getItem(`${CLEARED_AT_PREFIX}${email}`);
  return val ? parseInt(val, 10) : 0;
}

function setClearedAt(ts: number): void {
  const email = getCurrentUserEmail();
  if (!email) return;
  localStorage.setItem(`${CLEARED_AT_PREFIX}${email}`, String(ts));
}

// ────────────────────────────────────────────────────
// Set persistido de IDs cuyo TTS ya fue reproducido
// en esta sesión de navegador (sobrevive recargas).
// ────────────────────────────────────────────────────
const TTS_PLAYED_KEY = "notification_tts_played_ids";

function getTTSPlayedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(TTS_PLAYED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistTTSPlayedId(id: string): void {
  const ids = getTTSPlayedIds();
  ids.add(id);
  // Limitar a 1000 entradas para no consumir localStorage infinitamente
  const arr = Array.from(ids);
  if (arr.length > 1000) arr.splice(0, arr.length - 500);
  localStorage.setItem(TTS_PLAYED_KEY, JSON.stringify(arr));
}

// ────────────────────────────────────────────────────

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
  markTTSPlayed: (id: string) => void;
  getPendingTTSNotifications: () => Notification[];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const { notifications } = get();

        // No agregar si fue creada antes del clearedAt de este usuario
        const clearedAt = getClearedAt();
        if (
          clearedAt &&
          new Date(notification.created_at).getTime() <= clearedAt
        ) {
          return;
        }

        if (notifications.some((n) => n.id === notification.id)) return;

        if (notification.data?.alertId) {
          const exists = notifications.find(
            (n) => n.data?.alertId === notification.data?.alertId,
          );
          if (exists) return;
        }

        // Respetar tts_played persistido
        const ttsPlayed = getTTSPlayedIds();
        const enriched = ttsPlayed.has(notification.id)
          ? { ...notification, tts_played: true }
          : notification;

        const newNotifications = [enriched, ...notifications];
        set({
          notifications: newNotifications,
          unreadCount: newNotifications.filter((n) => !n.is_read).length,
        });
      },

      syncNotifications: (newItems: Notification[]) => {
        const { notifications } = get();
        const clearedAt = getClearedAt();
        const ttsPlayed = getTTSPlayedIds();

        const existingIds = new Set(notifications.map((n) => n.id));
        const existingAlertIds = new Set(
          notifications
            .filter((n) => n.data?.alertId)
            .map((n) => n.data!.alertId),
        );
        const existingContentHashes = new Set(
          notifications.map((n) => {
            const type = n.type || n.data?.incidentType || "";
            const subtype = n.data?.subtype || "";
            const street = (n.data?.street || "").toLowerCase().trim();
            const lat = n.data?.location?.y ?? n.data?.latitude ?? 0;
            const lng = n.data?.location?.x ?? n.data?.longitude ?? 0;
            if (!type && !street) return null;
            return `${type}|${subtype}|${street}|${Math.round(lat * 200) / 200}|${Math.round(lng * 200) / 200}`;
          }).filter(Boolean) as string[]
        );

        const toAdd = newItems.filter((n) => {
          // Filtrar por clearedAt del usuario actual
          if (
            clearedAt &&
            new Date(n.created_at).getTime() <= clearedAt
          ) {
            return false;
          }
          if (existingIds.has(n.id)) return false;
          if (n.data?.alertId && existingAlertIds.has(n.data.alertId))
            return false;
          
          const type = n.type || n.data?.incidentType || "";
          const subtype = n.data?.subtype || "";
          const street = (n.data?.street || "").toLowerCase().trim();
          const lat = n.data?.location?.y ?? n.data?.latitude ?? 0;
          const lng = n.data?.location?.x ?? n.data?.longitude ?? 0;
          
          if (type || street) {
            const hash = `${type}|${subtype}|${street}|${Math.round(lat * 200) / 200}|${Math.round(lng * 200) / 200}`;
            if (existingContentHashes.has(hash)) return false;
            existingContentHashes.add(hash);
          }
          
          return true;
        });

        if (toAdd.length === 0) return;

        // Marcar tts_played para las que ya se reprodujeron en esta sesión
        const enriched = toAdd.map((n) =>
          ttsPlayed.has(n.id) ? { ...n, tts_played: true } : n,
        );

        const merged = [...enriched, ...notifications].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        );

        set({
          notifications: merged,
          unreadCount: merged.filter((n) => !n.is_read).length,
        });
      },

      fetchHistory: async () => {
        try {
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

        // Marcar en backend (fire-and-forget)
        const API_URL = import.meta.env.VITE_API_URL || "/api";
        fetch(`${API_URL}/notifications/${id}/read`, {
          method: "PATCH",
        }).catch(() => {});
      },

      markAllAsRead: () => {
        const { notifications } = get();
        const updated = notifications.map((n) => ({ ...n, is_read: true }));
        set({ notifications: updated, unreadCount: 0 });

        // Marcar en backend (fire-and-forget)
        const API_URL = import.meta.env.VITE_API_URL || "/api";
        fetch(`${API_URL}/notifications/read-all`, {
          method: "POST",
        }).catch(() => {});
      },

      clearNotifications: () => {
        // Guardar timestamp de "clear" POR USUARIO en localStorage.
        // fetchHistory y addNotification filtrarán notificaciones
        // anteriores a este timestamp para ESTE usuario únicamente.
        // Otros usuarios en la misma máquina o en otras máquinas
        // no se ven afectados.
        setClearedAt(Date.now());
        set({ notifications: [], unreadCount: 0 });
      },

      removeDuplicates: () => {
        const { notifications } = get();
        const seenAlertIds = new Set<string>();
        const seenContentHashes = new Set<string>();
        const unique: Notification[] = [];

        for (const n of notifications) {
          const alertId = n.data?.alertId;
          if (alertId) {
            if (seenAlertIds.has(alertId)) continue;
            seenAlertIds.add(alertId);
          }
          
          const type = n.type || n.data?.incidentType || "";
          const subtype = n.data?.subtype || "";
          const street = (n.data?.street || "").toLowerCase().trim();
          const lat = n.data?.location?.y ?? n.data?.latitude ?? 0;
          const lng = n.data?.location?.x ?? n.data?.longitude ?? 0;
          
          if (type || street) {
            const roundedLat = Math.round(lat * 200) / 200;
            const roundedLng = Math.round(lng * 200) / 200;
            const contentHash = `${type}|${subtype}|${street}|${roundedLat}|${roundedLng}`;
            
            if (seenContentHashes.has(contentHash)) continue;
            seenContentHashes.add(contentHash);
          }
          
          unique.push(n);
        }

        if (unique.length < notifications.length) {
          set({
            notifications: unique,
            unreadCount: unique.filter((n) => !n.is_read).length,
          });
        }
      },

      markTTSPlayed: (id: string) => {
        const { notifications } = get();
        const updated = notifications.map((n) =>
          n.id === id ? { ...n, tts_played: true } : n,
        );
        set({ notifications: updated });

        // Persistir para que no se re-reproduzca tras navegar
        persistTTSPlayedId(id);
      },

      getPendingTTSNotifications: () => {
        const { notifications } = get();
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        return notifications.filter((n) => {
          if (n.type !== "ACCIDENT" && n.type !== "HAZARD") return false;
          if (n.tts_played) return false;
          if (n.is_read) return false;
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

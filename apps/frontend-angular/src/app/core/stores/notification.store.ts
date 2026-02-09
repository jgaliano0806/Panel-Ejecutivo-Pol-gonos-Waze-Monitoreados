/**
 * Notification Store - Estado de notificaciones
 * Equivalente a: apps/frontend/src/stores/useNotificationStore.ts
 */
import { Injectable, signal, computed } from '@angular/core';

export interface NotificationData {
  incidentType?: string;
  subtype?: string;
  street?: string;
  city?: string;
  polygonId?: string;
  polygonName?: string;
  latitude?: number;
  longitude?: number;
  location?: { lat: number; lng: number };
}

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  type: string; // ACCIDENT, HAZARD, JAM, etc
  timestamp: Date;
  created_at: Date;
  read: boolean;
  is_read: boolean;
  polygonId?: string;
  location?: string;
  data?: NotificationData;
}

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private _notifications = signal<StoredNotification[]>(this.loadFromStorage());

  readonly notifications = computed(() => this._notifications());
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.is_read).length);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  constructor() {
    // Efecto simple para persistir cambios (workaround simple sin effect() injection context issues)
    // En una app real usaríamos effect() en constructor con inyección correcta,
    // o un método privado save() llamado en cada update.
  }

  private loadFromStorage(): StoredNotification[] {
    try {
      const stored = localStorage.getItem('waze_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restaurar fechas
        return parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          created_at: new Date(n.created_at),
        }));
      }
    } catch (e) {
      console.error('Error loading notifications from storage', e);
    }
    return [];
  }

  private saveToStorage(notifications: StoredNotification[]): void {
    try {
      localStorage.setItem('waze_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error('Error saving notifications to storage', e);
    }
  }

  addNotification(
    notification: Omit<StoredNotification, 'id' | 'timestamp' | 'created_at' | 'read' | 'is_read'>,
  ): void {
    const now = new Date();
    const newNotification: StoredNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: now,
      created_at: now,
      read: false,
      is_read: false,
    };

    this._notifications.update((list) => {
      const newList = [newNotification, ...list].slice(0, 100);
      this.saveToStorage(newList);
      return newList;
    });
  }

  markAsRead(id: string): void {
    this._notifications.update((list) => {
      const newList = list.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n));
      this.saveToStorage(newList);
      return newList;
    });
  }

  markAllAsRead(): void {
    this._notifications.update((list) => {
      const newList = list.map((n) => ({ ...n, read: true, is_read: true }));
      this.saveToStorage(newList);
      return newList;
    });
  }

  removeNotification(id: string): void {
    this._notifications.update((list) => {
      const newList = list.filter((n) => n.id !== id);
      this.saveToStorage(newList);
      return newList;
    });
  }

  clearAll(): void {
    this._notifications.set([]);
    this.saveToStorage([]);
  }
}

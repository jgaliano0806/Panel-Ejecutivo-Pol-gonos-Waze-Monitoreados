/**
 * Notification Store - Estado de notificaciones
 * Equivalente a: apps/frontend/src/stores/useNotificationStore.ts
 */
import { Injectable, signal, computed } from '@angular/core';

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
  polygonId?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private _notifications = signal<StoredNotification[]>([]);

  readonly notifications = computed(() => this._notifications());
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  addNotification(notification: Omit<StoredNotification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: StoredNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    this._notifications.update((list) => [newNotification, ...list].slice(0, 100));
  }

  markAsRead(id: string): void {
    this._notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllAsRead(): void {
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  removeNotification(id: string): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  clearAll(): void {
    this._notifications.set([]);
  }
}

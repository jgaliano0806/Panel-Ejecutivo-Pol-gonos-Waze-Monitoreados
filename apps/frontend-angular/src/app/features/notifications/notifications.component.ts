import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { WebSocketService } from '../../core/services';
import { map, scan, startWith } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold">Notificaciones</h2>
        <button
          (click)="clearNotifications()"
          class="px-4 py-2 bg-red-500 text-white rounded hover:opacity-90"
        >
          Limpiar todo
        </button>
      </div>

      <!-- Lista de notificaciones -->
      <div class="space-y-3">
        @if (notifications$ | async; as notifications) {
          @if (notifications.length === 0) {
            <div class="bg-[var(--card)] p-8 rounded-lg border border-[var(--border)] text-center">
              <div class="text-4xl mb-4">🔔</div>
              <p class="text-[var(--secondary)]">No hay notificaciones recientes</p>
              <p class="text-sm text-[var(--secondary)] mt-2">
                Las nuevas alertas aparecerán aquí en tiempo real
              </p>
            </div>
          } @else {
            @for (notification of notifications; track notification.id) {
              <div
                class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] shadow-sm"
                [class.border-l-4]="true"
                [class.border-l-red-500]="notification.severity === 'critical'"
                [class.border-l-orange-500]="notification.severity === 'warning'"
                [class.border-l-blue-500]="notification.severity === 'info'"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-semibold">{{ notification.title }}</h4>
                    <p class="text-sm text-[var(--secondary)] mt-1">{{ notification.message }}</p>
                    @if (notification.data?.street) {
                      <p class="text-xs text-[var(--secondary)] mt-2">
                        📍 {{ notification.data.street }}
                      </p>
                    }
                  </div>
                  <span class="text-xs text-[var(--secondary)]">
                    {{ notification.timestamp | date: 'HH:mm:ss' }}
                  </span>
                </div>
              </div>
            }
          }
        }
      </div>
    </div>
  `,
})
export class NotificationsComponent {
  private wsService = inject(WebSocketService);

  // Acumular notificaciones del WebSocket
  readonly notifications$ = this.wsService.notifications$.pipe(
    scan((acc, notification) => [notification, ...acc].slice(0, 50), [] as any[]),
    startWith([]),
  );

  clearNotifications(): void {
    // En una implementación real, esto limpiaría el store
    console.log('Clearing notifications...');
  }
}

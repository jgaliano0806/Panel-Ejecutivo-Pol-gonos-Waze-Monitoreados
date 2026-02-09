/**
 * GlobalNotificationsComponent - Notificaciones flotantes estilo snackbar
 * Equivalente a: apps/frontend/src/components/notifications/GlobalNotifications.tsx
 */
import { Component, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { NotificationStore, StoredNotification } from '../../../core/stores';
import { MapStateService } from '../../../core/services/state/map-state.service';
import { getSubtypeTranslation, getMainTypeTranslation } from '../../utils/waze-translations';

@Component({
  selector: 'app-global-notifications',
  standalone: true,
  imports: [CommonModule, NgIcon],
  template: `
    <div
      class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
    >
      @for (notification of activeNotifications(); track notification.id) {
        <div
          class="pointer-events-auto shadow-2xl rounded-xl p-4 flex items-start gap-3 border-l-4 backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-all duration-200 animate-slide-in"
          [class]="getBorderClass(notification.type)"
          (click)="handleClick(notification)"
        >
          <!-- Icono con animación -->
          <div class="mt-0.5 flex-shrink-0">
            <div class="animate-pulse">
              @switch (notification.type) {
                @case ('ACCIDENT') {
                  <ng-icon name="lucideOctagon" class="text-red-500" size="24" />
                }
                @case ('HAZARD') {
                  <ng-icon name="lucideAlertTriangle" class="text-amber-500" size="24" />
                }
                @default {
                  <ng-icon name="lucideInfo" class="text-blue-500" size="24" />
                }
              }
            </div>
          </div>

          <!-- Contenido principal -->
          <div class="flex-1 min-w-0 space-y-1.5">
            <!-- Tipo de incidente y hora -->
            <div class="flex items-center gap-2">
              <span
                class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                [class]="getTypeBadgeClass(notification.type)"
              >
                {{ getTypeLabel(notification.type) }}
              </span>
              <span class="text-xs text-gray-400">
                {{ formatTime(notification.created_at) }}
              </span>
            </div>

            <!-- Subtipo traducido -->
            @if (getSubtypeText(notification)) {
              <div class="flex items-center gap-1.5">
                <ng-icon name="lucideTag" class="text-gray-400" size="14" />
                <span class="text-sm font-semibold text-gray-100">
                  {{ getSubtypeText(notification) }}
                </span>
              </div>
            }

            <!-- Ubicación -->
            @if (getLocation(notification)) {
              <div class="flex items-start gap-1.5">
                <ng-icon name="lucideMapPin" class="text-gray-400 mt-0.5 flex-shrink-0" size="14" />
                <span class="text-sm text-gray-300 leading-snug">
                  {{ getLocation(notification) }}
                </span>
              </div>
            }

            <!-- Mensaje original si no hay datos estructurados -->
            @if (
              !getSubtypeText(notification) && !getLocation(notification) && notification.message
            ) {
              <p class="text-sm text-gray-300 leading-snug">
                {{ notification.message }}
              </p>
            }
          </div>

          <!-- Botón de cerrar -->
          <button
            (click)="dismiss($event, notification)"
            class="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors bg-slate-700/80 p-1.5 rounded-full hover:bg-slate-600 shadow-sm"
          >
            <ng-icon name="lucideCheck" size="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      .animate-slide-in {
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    `,
  ],
})
export class GlobalNotificationsComponent implements OnDestroy {
  private router = inject(Router);
  private notificationStore = inject(NotificationStore);
  private mapState = inject(MapStateService);

  // Solo mostrar notificaciones no leídas de tipos ACCIDENT o HAZARD, máximo 3
  readonly activeNotifications = computed(() => {
    const notifications = this.notificationStore.notifications();
    return notifications
      .filter((n) => {
        if (n.is_read) return false;
        // Solo ACCIDENT y HAZARD para snackbar
        return n.type === 'ACCIDENT' || n.type === 'HAZARD';
      })
      .slice(0, 3);
  });

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  handleClick(notification: StoredNotification): void {
    this.notificationStore.markAsRead(notification.id);

    // Navegar al mapa con el incidente seleccionado
    if (notification.data?.polygonId) {
      // 1. Navegación por ruta (si estamos en otra página)
      this.router.navigate(['/mapa'], {
        state: {
          selectedPolygonId: notification.data.polygonId,
          focusEventId: notification.id,
          forcedIncident: notification.data,
        },
      });

      // 2. Navegación imperativa directa (si ya estamos en /mapa)
      // Esto asegura que el mapa reaccione aunque el router no dispare cambios
      this.mapState.focusIncident(notification.data);
    }
  }

  dismiss(event: Event, notification: StoredNotification): void {
    event.stopPropagation();
    this.notificationStore.markAsRead(notification.id);
  }

  getBorderClass(type: string): string {
    switch (type) {
      case 'ACCIDENT':
        return 'border-l-red-500 bg-red-950/90';
      case 'HAZARD':
        return 'border-l-amber-500 bg-amber-950/90';
      default:
        return 'border-l-blue-500 bg-blue-950/90';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'ACCIDENT':
        return 'bg-red-900/50 text-red-300';
      case 'HAZARD':
        return 'bg-amber-900/50 text-amber-300';
      default:
        return 'bg-blue-900/50 text-blue-300';
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'ACCIDENT':
        return 'Accidente';
      case 'HAZARD':
        return 'Peligro';
      default:
        return 'Alerta';
    }
  }

  getSubtypeText(notification: StoredNotification): string | null {
    const subtype = notification.data?.subtype;
    const incidentType = notification.data?.incidentType || notification.type || 'HAZARD';

    if (subtype && incidentType) {
      return getSubtypeTranslation(incidentType, subtype);
    }
    return null;
  }

  getLocation(notification: StoredNotification): string | null {
    const street = notification.data?.street;
    const city = notification.data?.city;
    const polygonName = notification.data?.polygonName;

    if (street) {
      return city ? `${street}, ${city}` : street;
    }
    if (city) {
      return `Cerca de ${city}`;
    }
    return polygonName || null;
  }

  formatTime(dateInput: string | Date | number): string {
    if (!dateInput) return 'Ahora';

    let date: Date;

    if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
      if (isNaN(date.getTime()) && /^\d+$/.test(dateInput)) {
        date = new Date(parseInt(dateInput, 10));
      }
    } else {
      date = dateInput;
    }

    if (isNaN(date.getTime())) {
      return 'Ahora';
    }

    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}

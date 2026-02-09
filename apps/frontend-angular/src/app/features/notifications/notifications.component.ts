import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { NotificationStore, StoredNotification } from '../../core/stores';
import { TTSService } from '../../core/services';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';

type FilterType = 'ALL' | 'UNREAD' | 'READ';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, ModernHeaderComponent],
  template: `
    <div class="min-h-screen bg-veltrix-bg">
      <!-- Header -->
      <app-modern-header />

      <!-- Main Content -->
      <div class="max-w-[1600px] mx-auto p-6 space-y-6">
        <!-- Page Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-veltrix-text">Centro de Notificaciones</h1>
            <p class="text-sm text-veltrix-muted">Historial de alertas y eventos del sistema</p>
          </div>
          <div class="flex bg-veltrix-card p-1 rounded-lg border border-veltrix-border">
            <button
              (click)="markAllAsRead()"
              class="flex items-center gap-2 px-4 py-2 text-veltrix-muted hover:text-veltrix-text hover:bg-veltrix-bg rounded-lg transition-colors text-sm"
            >
              <ng-icon name="lucideCheckCircle" size="16" />
              <span>Marcar todo leído</span>
            </button>
            <div class="w-px bg-veltrix-border mx-1"></div>
            <button
              (click)="clearAll()"
              class="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
            >
              <ng-icon name="lucideTrash2" size="16" />
              <span>Limpiar historial</span>
            </button>
          </div>
        </div>

        <!-- Main Grid: 4 columns -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <!-- Left Sidebar: Filters + System Validation -->
          <div class="space-y-4">
            <!-- Search & Filters -->
            <div class="bg-veltrix-card rounded-xl shadow-sm border border-veltrix-border p-4">
              <!-- Search -->
              <div class="relative mb-4">
                <ng-icon
                  name="lucideSearch"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-veltrix-muted"
                  size="16"
                />
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  placeholder="Buscar notificación..."
                  class="w-full pl-9 pr-4 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm placeholder-veltrix-muted/50 focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                />
              </div>

              <!-- Filter Buttons -->
              <div class="space-y-1">
                @for (filterOpt of filterOptions; track filterOpt.value) {
                  <button
                    (click)="filter.set(filterOpt.value)"
                    class="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors"
                    [class]="
                      filter() === filterOpt.value
                        ? 'bg-veltrix-primary/10 text-veltrix-primary font-medium'
                        : 'text-veltrix-muted hover:bg-veltrix-bg'
                    "
                  >
                    <span>{{ filterOpt.label }}</span>
                    <span class="bg-veltrix-bg px-2 py-0.5 rounded-full text-xs">
                      {{ getFilterCount(filterOpt.value) }}
                    </span>
                  </button>
                }
              </div>
            </div>

            <!-- System Validation -->
            <div class="bg-veltrix-card rounded-xl shadow-sm border border-veltrix-border p-4">
              <div class="text-xs font-bold text-veltrix-muted uppercase tracking-wider mb-3">
                VALIDACIÓN DE SISTEMA
              </div>
              <button
                (click)="testTTS()"
                class="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm font-bold"
              >
                <ng-icon name="lucideAlertTriangle" size="16" />
                <span>Probar Demo (Voz + Vista)</span>
              </button>
              <p class="text-xs text-veltrix-muted mt-2">
                Genera notificaciones de prueba con TTS para validar el sistema.
              </p>
            </div>

            <!-- TTS Status -->
            <div class="bg-veltrix-card rounded-xl shadow-sm border border-veltrix-border p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="text-xs font-bold text-veltrix-muted uppercase tracking-wider">
                  ESTADO TTS
                </div>
                <span
                  class="flex items-center gap-1 text-xs"
                  [class]="ttsService.isPlaying() ? 'text-veltrix-success' : 'text-veltrix-muted'"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    [class]="
                      ttsService.isPlaying()
                        ? 'bg-veltrix-success animate-pulse'
                        : 'bg-veltrix-muted'
                    "
                  ></span>
                  {{ ttsService.isPlaying() ? 'Reproduciendo' : 'En espera' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-veltrix-muted">Cola de mensajes:</span>
                <span class="font-mono text-veltrix-text">{{ ttsService.queueLength() }}</span>
              </div>
            </div>
          </div>

          <!-- Right Content: Notification List -->
          <div class="lg:col-span-3 space-y-4">
            @if (filteredNotifications().length === 0) {
              <!-- Empty State -->
              <div
                class="text-center py-12 bg-veltrix-card rounded-xl border border-dashed border-veltrix-border"
              >
                <ng-icon
                  name="lucideClock"
                  size="48"
                  class="mx-auto mb-3 text-veltrix-muted opacity-50"
                />
                <h3 class="text-lg font-medium text-veltrix-text">No hay notificaciones</h3>
                <p class="text-sm text-veltrix-muted mt-1">
                  No se encontraron alertas con los filtros actuales.
                </p>
              </div>
            } @else {
              @for (notification of filteredNotifications(); track notification.id) {
                <div
                  (click)="handleNotificationClick(notification)"
                  class="bg-veltrix-card rounded-xl p-5 border shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-veltrix-border"
                  [class.border-l-4]="!notification.read"
                  [class.border-l-veltrix-primary]="!notification.read"
                  [class.border-veltrix-border]="notification.read"
                >
                  <div class="flex justify-between items-start">
                    <div class="flex gap-3">
                      <!-- Icon -->
                      <div
                        class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                        [class]="getNotificationIconClass(notification.type)"
                      >
                        <ng-icon [name]="getNotificationIcon(notification.type)" size="20" />
                      </div>

                      <!-- Content -->
                      <div class="flex-1 min-w-0">
                        <h4
                          class="text-base font-semibold"
                          [class]="notification.read ? 'text-veltrix-muted' : 'text-veltrix-text'"
                        >
                          {{ getNotificationEmoji(notification.type) }} {{ notification.title }}
                        </h4>
                        <p class="text-sm text-veltrix-muted mt-1">{{ notification.message }}</p>
                        <p class="text-xs text-veltrix-muted/60 mt-2 flex items-center gap-1">
                          <ng-icon name="lucideClock" size="12" />
                          {{ formatTime(notification.timestamp) }}
                        </p>
                      </div>
                    </div>

                    <!-- Unread Indicator -->
                    @if (!notification.read) {
                      <div class="h-2 w-2 rounded-full bg-veltrix-primary flex-shrink-0"></div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3 mt-6">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span
            >© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por
            <strong>GED</strong></span
          >
          <div class="flex items-center gap-6">
            <span class="flex items-center gap-1"
              ><span class="w-2 h-2 rounded-full bg-red-500"></span> Crítico</span
            >
            <span class="flex items-center gap-1"
              ><span class="w-2 h-2 rounded-full bg-yellow-500"></span> Advertencia</span
            >
            <span class="flex items-center gap-1"
              ><span class="w-2 h-2 rounded-full bg-blue-500"></span> Info</span
            >
          </div>
          <span class="flex items-center gap-2">
            <span>● Edge TTS</span>
            <span class="text-veltrix-primary">• Voz es-AR-ElenaNeural</span>
          </span>
        </div>
      </footer>
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  readonly notificationStore = inject(NotificationStore);
  readonly ttsService = inject(TTSService);
  private router = inject(Router);

  // State
  searchTerm = '';
  readonly filter = signal<FilterType>('ALL');

  readonly filterOptions = [
    { value: 'ALL' as FilterType, label: 'Todas' },
    { value: 'UNREAD' as FilterType, label: 'No leídas' },
    { value: 'READ' as FilterType, label: 'Leídas' },
  ];

  ngOnInit(): void {
    // Initialize
  }

  readonly filteredNotifications = computed(() => {
    let notifications = this.notificationStore.notifications();

    // Filter by read status
    if (this.filter() === 'UNREAD') {
      notifications = notifications.filter((n) => !n.read);
    } else if (this.filter() === 'READ') {
      notifications = notifications.filter((n) => n.read);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      notifications = notifications.filter(
        (n) => n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term),
      );
    }

    return notifications;
  });

  getFilterCount(filterValue: FilterType): number {
    const all = this.notificationStore.notifications();
    if (filterValue === 'ALL') return all.length;
    if (filterValue === 'UNREAD') return all.filter((n) => !n.read).length;
    return all.filter((n) => n.read).length;
  }

  handleNotificationClick(notification: StoredNotification): void {
    // Mark as read
    this.notificationStore.markAsRead(notification.id);

    // Preparar datos del incidente para el mapa
    const incidentData = {
      ...notification.data,
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
    };

    // Navigate to map with incident data
    this.router.navigate(['/mapa'], {
      state: {
        selectedPolygonId: notification.polygonId || notification.data?.polygonId,
        focusEventId: notification.id,
        forcedIncident: incidentData,
      },
    });
  }

  markAllAsRead(): void {
    this.notificationStore.markAllAsRead();
  }

  clearAll(): void {
    this.notificationStore.clearAll();
  }

  testTTS(): void {
    // Generate test notifications
    const testNotifications = [
      {
        title: 'Peligro en la Vía',
        message: 'Vehículo detenido en banquina, RP E73 km 15',
        type: 'HAZARD',
      },
      {
        title: 'Accidente Reportado',
        message: 'Colisión múltiple con demoras, RN 20 cerca de Villa Carlos Paz',
        type: 'ACCIDENT',
      },
      {
        title: 'Obras en la Vía',
        message: 'Obras preventivas por mantenimiento en Autovía A-019',
        type: 'HAZARD',
      },
    ];

    testNotifications.forEach((t, index) => {
      setTimeout(() => {
        this.notificationStore.addNotification({
          title: t.title,
          message: t.message,
          type: t.type === 'ACCIDENT' ? 'critical' : 'warning',
        });
        this.ttsService.speakNotification(t.title, t.message);
      }, index * 2000);
    });
  }

  formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      ACCIDENT: 'lucideCar',
      HAZARD: 'lucideAlertTriangle',
      critical: 'lucideAlertCircle',
      warning: 'lucideAlertTriangle',
      info: 'lucideInfo',
      success: 'lucideCheckCircle',
    };
    return icons[type] || 'lucideBell';
  }

  getNotificationIconClass(type: string): string {
    const classes: Record<string, string> = {
      ACCIDENT: 'bg-red-100 dark:bg-red-900/20 text-red-600',
      HAZARD: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600',
      critical: 'bg-red-100 dark:bg-red-900/20 text-red-600',
      warning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600',
      info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600',
      success: 'bg-green-100 dark:bg-green-900/20 text-green-600',
    };
    return classes[type] || 'bg-blue-100 dark:bg-blue-900/20 text-blue-600';
  }

  getNotificationEmoji(type: string): string {
    const emojis: Record<string, string> = {
      ACCIDENT: '🔴',
      HAZARD: '🟠',
      critical: '🔴',
      warning: '🟠',
      info: '🔵',
      success: '🟢',
    };
    return emojis[type] || '🔵';
  }
}


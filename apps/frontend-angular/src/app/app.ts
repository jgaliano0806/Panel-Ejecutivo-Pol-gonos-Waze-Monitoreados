import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { GlobalNotificationsComponent } from './shared/components/global-notifications/global-notifications.component';
import { WebSocketService, TTSService, AuthService } from './core/services';
import { NotificationStore } from './core/stores';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, GlobalNotificationsComponent],
  template: `
    @if (authService.isAuthenticated()) {
      <div class="flex h-screen bg-veltrix-bg overflow-hidden">
        <!-- Sidebar -->
        <app-sidebar />

        <!-- Main content area (cada página tiene su propio header/footer) -->
        <main class="flex-1 overflow-auto bg-veltrix-bg">
          <router-outlet />
        </main>
      </div>

      <!-- Notificaciones Snackbar flotantes (estilo React) -->
      <app-global-notifications />
    } @else {
      <!-- Login page (no sidebar) -->
      <router-outlet />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }
    `,
  ],
})
export class App implements OnInit {
  readonly authService = inject(AuthService);
  private wsService = inject(WebSocketService);
  private ttsService = inject(TTSService);
  private notificationStore = inject(NotificationStore);

  readonly wsConnected = this.wsService.connected;

  ngOnInit(): void {
    // Aplicar tema guardado
    this.applyStoredTheme();

    // Solo inicializar WebSocket si está autenticado
    if (!this.authService.isAuthenticated()) {
      return;
    }

    // Suscribirse a updates globales al iniciar
    this.wsService.subscribeToGlobal();

    // Escuchar notificaciones WebSocket y agregarlas al store
    // La deduplicación se maneja en múltiples capas:
    // 1. WebSocketService: processedNotificationIds evita procesar el mismo ID
    // 2. TTSService: recentMessages con hash y threshold de 10 segundos
    // 3. Aquí: verificamos tts_played flag
    this.wsService.notifications$.subscribe((notification) => {
      console.log('📥 App: Procesando notificación WebSocket:', notification.id, notification.type);

      // El backend envía 'type' (ACCIDENT, HAZARD, SYSTEM), mapeamos a severity
      const severity = this.mapTypeToSeverity(notification.type);

      // Agregar al store de notificaciones con datos completos para snackbar
      this.notificationStore.addNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type, // ACCIDENT, HAZARD, etc (tipo original para snackbar)
        polygonId: notification.data?.polygonId,
        data: {
          incidentType: notification.type,
          subtype: notification.data?.subtype,
          street: notification.data?.street,
          city: notification.data?.city,
          polygonId: notification.data?.polygonId,
          polygonName: (notification.data as any)?.polygonName,
          // Coordenadas para navegación al mapa
          latitude: (notification.data as any)?.latitude,
          longitude: (notification.data as any)?.longitude,
          location: (notification.data as any)?.location,
        },
      });

      // Reproducir TTS para notificaciones importantes (ACCIDENT o HAZARD)
      // Solo si no ha sido reproducido antes (tts_played flag)
      const shouldPlayTTS =
        (notification.type === 'ACCIDENT' || notification.type === 'HAZARD') &&
        !notification.tts_played;

      if (shouldPlayTTS) {
        console.log(
          '🔊 App: Enviando a TTS (type:',
          notification.type,
          ', tts_played:',
          notification.tts_played,
          ')',
        );
        this.ttsService.speakNotification(notification.title, notification.message);
      } else if (notification.tts_played) {
        console.log('⏭️ App: TTS ya reproducido para esta notificación:', notification.id);
      }
    });
  }

  private applyStoredTheme(): void {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  }

  /**
   * Mapear el tipo de notificación del backend a severity del frontend
   */
  private mapTypeToSeverity(type: string): 'critical' | 'warning' | 'info' {
    switch (type) {
      case 'ACCIDENT':
        return 'critical';
      case 'HAZARD':
        return 'warning';
      default:
        return 'info';
    }
  }
}

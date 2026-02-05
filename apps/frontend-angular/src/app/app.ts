import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { WebSocketService, TTSService } from './core/services';
import { NotificationStore } from './core/stores';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, HeaderComponent],
  template: `
    <div class="flex h-screen bg-[var(--background)]">
      <!-- Sidebar -->
      <app-sidebar />

      <!-- Main content area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <app-header />

        <!-- Content -->
        <main class="flex-1 overflow-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
    `,
  ],
})
export class App implements OnInit {
  private wsService = inject(WebSocketService);
  private ttsService = inject(TTSService);
  private notificationStore = inject(NotificationStore);

  ngOnInit(): void {
    // Suscribirse a updates globales al iniciar
    this.wsService.subscribeToGlobal();

    // Escuchar notificaciones WebSocket y agregarlas al store
    this.wsService.notifications$.subscribe((notification) => {
      this.notificationStore.addNotification({
        title: notification.title,
        message: notification.message,
        type:
          notification.severity === 'critical'
            ? 'critical'
            : notification.severity === 'warning'
              ? 'warning'
              : 'info',
        polygonId: notification.data?.polygonId,
      });

      // Reproducir TTS para notificaciones importantes
      if (notification.severity === 'critical' || notification.severity === 'warning') {
        this.ttsService.speakNotification(notification.title, notification.message);
      }
    });
  }
}

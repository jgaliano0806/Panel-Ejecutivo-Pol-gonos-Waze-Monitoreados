/**
 * HeaderComponent - Barra superior de la aplicación
 * Equivalente a: apps/frontend/src/components/layout/Header.tsx
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService, TTSService } from '../../../core/services';
import { NotificationStore } from '../../../core/stores';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header
      class="h-16 bg-[var(--card)] border-b border-[var(--border)] shadow-sm flex items-center justify-between px-4"
    >
      <!-- Título -->
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-[var(--primary)]">🚦 Panel Waze Monitoreados</h1>
        <span
          class="px-2 py-1 rounded-full text-xs font-medium"
          [class]="
            wsService.connected() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          "
        >
          {{ wsService.connected() ? '🟢 Conectado' : '🔴 Desconectado' }}
        </span>
      </div>

      <!-- Acciones -->
      <div class="flex items-center gap-4">
        <!-- TTS Status -->
        <div class="flex items-center gap-2 text-sm">
          <span class="text-[var(--secondary)]">TTS:</span>
          <span [class]="ttsService.isPlaying() ? 'text-orange-500' : 'text-green-500'">
            {{ ttsService.isPlaying() ? '🔊 Reproduciendo' : '✓ Listo' }}
          </span>
          @if (ttsService.queueLength() > 0) {
            <span class="text-[var(--secondary)]">({{ ttsService.queueLength() }} en cola)</span>
          }
        </div>

        <!-- Notificaciones -->
        <button
          class="relative p-2 hover:bg-[var(--muted)] rounded-lg transition-colors"
          aria-label="Ver notificaciones"
        >
          <span class="text-xl">🔔</span>
          @if (notificationStore.unreadCount() > 0) {
            <span
              class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
            >
              {{ notificationStore.unreadCount() > 9 ? '9+' : notificationStore.unreadCount() }}
            </span>
          }
        </button>

        <!-- Test TTS -->
        <button
          (click)="testTTS()"
          class="px-3 py-1 text-sm bg-[var(--muted)] rounded hover:opacity-80 transition-opacity"
          title="Probar TTS"
        >
          🔊 Test
        </button>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  readonly wsService = inject(WebSocketService);
  readonly ttsService = inject(TTSService);
  readonly notificationStore = inject(NotificationStore);

  testTTS(): void {
    this.ttsService.testVoice();
  }
}

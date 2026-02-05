import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebSocketService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <!-- Header -->
      <header class="sticky top-0 z-50 bg-[var(--card)] border-b border-[var(--border)] shadow-sm">
        <div class="container mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-bold text-[var(--primary)]">🚦 Panel Waze Monitoreados</h1>
            <span
              class="px-2 py-1 rounded-full text-xs font-medium"
              [class]="wsConnected() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ wsConnected() ? '🟢 Conectado' : '🔴 Desconectado' }}
            </span>
          </div>

          <nav class="flex gap-4">
            <a
              routerLink="/"
              routerLinkActive="text-[var(--primary)] font-semibold"
              [routerLinkActiveOptions]="{ exact: true }"
              class="px-3 py-2 rounded-md hover:bg-[var(--muted)] transition-colors"
            >
              Dashboard
            </a>
            <a
              routerLink="/mapa"
              routerLinkActive="text-[var(--primary)] font-semibold"
              class="px-3 py-2 rounded-md hover:bg-[var(--muted)] transition-colors"
            >
              Mapa
            </a>
            <a
              routerLink="/admin"
              routerLinkActive="text-[var(--primary)] font-semibold"
              class="px-3 py-2 rounded-md hover:bg-[var(--muted)] transition-colors"
            >
              Admin
            </a>
            <a
              routerLink="/notificaciones"
              routerLinkActive="text-[var(--primary)] font-semibold"
              class="px-3 py-2 rounded-md hover:bg-[var(--muted)] transition-colors"
            >
              Notificaciones
            </a>
          </nav>
        </div>
      </header>

      <!-- Main content -->
      <main class="container mx-auto px-4 py-6">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [],
})
export class App implements OnInit {
  private wsService = inject(WebSocketService);

  readonly wsConnected = this.wsService.connected;

  ngOnInit(): void {
    // Suscribirse a updates globales al iniciar
    this.wsService.subscribeToGlobal();
  }
}

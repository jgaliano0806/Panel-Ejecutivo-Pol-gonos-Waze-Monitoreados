import { Component, inject, signal, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { WebSocketService, TTSService, ApiService } from '../../../core/services';
import { NotificationStore } from '../../../core/stores';

@Component({
  selector: 'app-modern-header',
  standalone: true,
  imports: [CommonModule, NgIcon],
  template: `
    <header class="sticky top-0 z-40 bg-veltrix-card border-b-4 border-yellow-400 shadow-lg">
      <div class="flex items-center justify-between px-6 py-3">
        <!-- Left: Logo & Title -->
        <div class="flex items-center gap-4">
          <!-- Logo -->
          <div class="relative w-16 h-12 bg-gradient-to-br from-green-400 to-yellow-400 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
            <svg viewBox="0 0 100 60" class="w-full h-full p-1">
              <path d="M10 50 L30 20 L50 35 L70 15 L90 40" fill="none" stroke="currentColor" stroke-width="6" class="text-veltrix-bg" />
              <circle cx="30" cy="20" r="4" class="fill-veltrix-bg" />
              <circle cx="50" cy="35" r="4" class="fill-veltrix-bg" />
              <circle cx="70" cy="15" r="4" class="fill-veltrix-bg" />
            </svg>
          </div>
          
          <!-- Title -->
          <div>
            <h1 class="text-xl font-bold text-veltrix-text flex items-center gap-2">
              Panel Ejecutivo
            </h1>
            <p class="text-xs text-veltrix-muted flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-veltrix-success animate-pulse"></span>
              Monitoreo de Tráfico en Tiempo Real
            </p>
          </div>
        </div>

        <!-- Center: Quick Actions -->
        <div class="hidden md:flex items-center gap-4">
          <button class="p-2 rounded-lg bg-veltrix-bg hover:bg-veltrix-border transition-colors" title="Modo oscuro">
            <ng-icon name="lucideMoon" class="text-veltrix-muted" size="18" />
          </button>
          <button class="p-2 rounded-lg bg-veltrix-bg hover:bg-veltrix-border transition-colors" title="Notificaciones">
            <ng-icon name="lucideBell" class="text-veltrix-muted" size="18" />
          </button>
        </div>

        <!-- Right: Status & Time -->
        <div class="flex items-center gap-4">
          <!-- Time -->
          <div class="hidden lg:flex items-center gap-3 px-4 py-2 bg-veltrix-bg rounded-xl">
            <ng-icon name="lucideClock" class="text-veltrix-muted" size="18" />
            <div class="text-right">
              <div class="text-sm font-bold text-veltrix-text">HORA ACTUAL</div>
              <div class="text-lg font-mono font-bold text-veltrix-text">{{ currentTime() }}</div>
            </div>
          </div>

          <!-- Last Update -->
          <div class="hidden lg:flex items-center gap-3 px-4 py-2 bg-veltrix-bg rounded-xl">
            <ng-icon name="lucideRefreshCw" class="text-veltrix-success" size="18" />
            <div class="text-right">
              <div class="text-sm font-bold text-veltrix-text">ÚLTIMA ACTUALIZACIÓN</div>
              <div class="text-sm text-veltrix-success font-medium">Ahora mismo</div>
            </div>
          </div>

          <!-- Refresh Button -->
          <button 
            (click)="onRefresh()"
            class="flex items-center gap-2 px-4 py-2 bg-veltrix-primary text-white rounded-xl hover:brightness-110 transition-all"
          >
            <ng-icon name="lucideRefreshCw" size="16" [class.animate-spin]="isRefreshing()" />
            <span class="font-medium">Actualizar</span>
          </button>

          <!-- Live Badge -->
          <div class="px-4 py-2 bg-veltrix-success text-white rounded-xl font-bold text-sm flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            EN VIVO
          </div>
        </div>
      </div>
    </header>
  `,
})
export class ModernHeaderComponent implements OnInit, OnDestroy {
  @Output() refresh = new EventEmitter<void>();
  
  private wsService = inject(WebSocketService);
  private apiService = inject(ApiService);
  readonly notificationStore = inject(NotificationStore);

  readonly wsConnected = this.wsService.connected;
  readonly currentTime = signal('--:--:--');
  readonly isRefreshing = signal(false);

  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }

  onRefresh(): void {
    this.isRefreshing.set(true);
    this.apiService.refreshAll();
    this.refresh.emit();
    setTimeout(() => this.isRefreshing.set(false), 1000);
  }
}

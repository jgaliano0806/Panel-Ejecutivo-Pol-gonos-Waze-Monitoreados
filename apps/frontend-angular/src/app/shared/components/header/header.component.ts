import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { WebSocketService, TTSService } from '../../../core/services';
import { NotificationStore } from '../../../core/stores';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgIcon],
  template: `
    <header class="h-16 bg-veltrix-card border-b border-veltrix-border px-6 flex items-center justify-between shadow-sm">
      <!-- Left: Title & Breadcrumb -->
      <div class="flex items-center gap-4">
        <div>
          <h1 class="text-lg font-bold text-veltrix-text">
            Panel Ejecutivo Waze
          </h1>
          <p class="text-xs text-veltrix-muted">
            Caminos de las Sierras • Córdoba
          </p>
        </div>
      </div>

      <!-- Center: Clock -->
      <div class="hidden md:flex items-center gap-3 px-4 py-2 bg-veltrix-bg rounded-xl">
        <ng-icon name="lucideClock" class="text-veltrix-primary" size="20" />
        <div class="text-right">
          <div class="text-lg font-mono font-bold text-veltrix-text">
            {{ currentTime() }}
          </div>
          <div class="text-xs text-veltrix-muted">
            {{ currentDate() }}
          </div>
        </div>
      </div>

      <!-- Right: Status & Actions -->
      <div class="flex items-center gap-3">
        <!-- Connection Status -->
        <div class="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl" 
             [class]="wsConnected() ? 'bg-veltrix-success/20' : 'bg-veltrix-danger/20'">
          <ng-icon 
            [name]="wsConnected() ? 'lucideWifi' : 'lucideWifiOff'" 
            [class]="wsConnected() ? 'text-veltrix-success' : 'text-veltrix-danger'"
            size="18" 
          />
          <span class="text-sm font-medium" [class]="wsConnected() ? 'text-veltrix-success' : 'text-veltrix-danger'">
            {{ wsConnected() ? 'En línea' : 'Desconectado' }}
          </span>
        </div>

        <!-- TTS Status -->
        <div class="hidden lg:flex items-center gap-2 px-3 py-2 bg-veltrix-bg rounded-xl">
          <ng-icon 
            [name]="ttsPlaying() ? 'lucideVolume2' : 'lucideVolumeX'" 
            class="text-veltrix-muted"
            [class.animate-pulse]="ttsPlaying()"
            size="18" 
          />
          <span class="text-sm font-medium text-veltrix-muted">
            {{ ttsQueue() > 0 ? ttsQueue() + ' pendientes' : 'Listo' }}
          </span>
        </div>

        <!-- Notifications -->
        <button class="relative p-2 rounded-xl bg-veltrix-bg hover:bg-veltrix-border transition-colors">
          <ng-icon name="lucideBell" class="text-veltrix-muted" size="20" />
          @if (notificationStore.unreadCount() > 0) {
            <span class="absolute -top-1 -right-1 bg-veltrix-danger text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {{ notificationStore.unreadCount() > 9 ? '9+' : notificationStore.unreadCount() }}
            </span>
          }
        </button>

        <!-- Theme Toggle -->
        <button 
          (click)="toggleTheme()"
          class="p-2 rounded-xl bg-veltrix-bg hover:bg-veltrix-border transition-colors"
        >
          <ng-icon [name]="isDarkMode() ? 'lucideSun' : 'lucideMoon'" class="text-veltrix-muted" size="20" />
        </button>

        <!-- User Avatar -->
        <div class="hidden sm:flex items-center gap-3 pl-3 border-l border-veltrix-border">
          <div class="text-right">
            <div class="text-sm font-medium text-veltrix-text">Operador</div>
            <div class="text-xs text-veltrix-muted">Sala de Control</div>
          </div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-veltrix-success to-green-700 flex items-center justify-center text-white font-bold">
            OP
          </div>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);
  private ttsService = inject(TTSService);
  readonly notificationStore = inject(NotificationStore);

  readonly wsConnected = this.wsService.connected;
  readonly ttsQueue = this.ttsService.queueLength;
  readonly ttsPlaying = this.ttsService.isPlaying;

  readonly currentTime = signal('--:--:--');
  readonly currentDate = signal('--/--/----');
  readonly isDarkMode = signal(false);

  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.checkDarkMode();
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
    this.currentDate.set(
      now.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    );
  }

  private checkDarkMode(): void {
    const isDark = document.documentElement.classList.contains('dark');
    this.isDarkMode.set(isDark);
  }

  toggleTheme(): void {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      this.isDarkMode.set(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      this.isDarkMode.set(true);
    }
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ApiService, WebSocketService, TTSService } from '../../core/services';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">Dashboard Principal</h2>

      <!-- KPIs Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        @if (globalKPIs$ | async; as kpis) {
          <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] shadow-sm">
            <div class="text-sm text-[var(--secondary)]">Alertas Totales</div>
            <div class="text-3xl font-bold text-[var(--primary)]">{{ kpis.totalAlerts }}</div>
          </div>

          <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] shadow-sm">
            <div class="text-sm text-[var(--secondary)]">Atascos</div>
            <div class="text-3xl font-bold text-orange-500">{{ kpis.totalJams }}</div>
          </div>

          <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] shadow-sm">
            <div class="text-sm text-[var(--secondary)]">Velocidad Promedio</div>
            <div class="text-3xl font-bold text-green-500">
              {{ kpis.avgSpeed | number: '1.0-0' }} km/h
            </div>
          </div>

          <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)] shadow-sm">
            <div class="text-sm text-[var(--secondary)]">Críticos</div>
            <div class="text-3xl font-bold text-red-500">{{ kpis.criticalCount }}</div>
          </div>
        } @else {
          <div class="col-span-4 text-center py-8 text-[var(--secondary)]">Cargando KPIs...</div>
        }
      </div>

      <!-- Estado de servicios -->
      <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
        <h3 class="text-lg font-semibold mb-4">Estado del Sistema</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-[var(--secondary)]">WebSocket:</span>
            <span [class]="wsConnected() ? 'text-green-500' : 'text-red-500'">
              {{ wsConnected() ? 'Conectado' : 'Desconectado' }}
            </span>
          </div>
          <div>
            <span class="text-[var(--secondary)]">TTS Cola:</span>
            <span class="text-[var(--foreground)]">{{ ttsQueue() }} pendientes</span>
          </div>
          <div>
            <span class="text-[var(--secondary)]">TTS Estado:</span>
            <span [class]="ttsPlaying() ? 'text-orange-500' : 'text-green-500'">
              {{ ttsPlaying() ? 'Reproduciendo' : 'Libre' }}
            </span>
          </div>
          <div>
            <button
              (click)="testTTS()"
              class="px-3 py-1 bg-[var(--primary)] text-white rounded hover:opacity-90 transition-opacity"
            >
              🔊 Test TTS
            </button>
          </div>
        </div>
      </div>

      <!-- Polígonos -->
      <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
        <h3 class="text-lg font-semibold mb-4">Polígonos Monitoreados</h3>
        @if (polygons$ | async; as polygons) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (polygon of polygons; track polygon.id) {
              <div class="p-3 rounded-lg border" [class]="getPolygonStateClass(polygon.state)">
                <div class="font-medium">{{ polygon.name }}</div>
                <div class="text-sm text-[var(--secondary)]">{{ polygon.group }}</div>
                <div class="text-xs mt-1">
                  Alertas: {{ polygon.metrics?.alertCount || 0 }} | Atascos:
                  {{ polygon.metrics?.jamCount || 0 }}
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="text-center py-8 text-[var(--secondary)]">Cargando polígonos...</div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent {
  private apiService = inject(ApiService);
  private wsService = inject(WebSocketService);
  private ttsService = inject(TTSService);

  readonly globalKPIs$ = this.apiService.globalKPIs$;
  readonly polygons$ = this.apiService.polygons$;

  readonly wsConnected = this.wsService.connected;
  readonly ttsQueue = this.ttsService.queueLength;
  readonly ttsPlaying = this.ttsService.isPlaying;

  getPolygonStateClass(state: string): string {
    switch (state) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-orange-500 bg-orange-50';
      default:
        return 'border-green-500 bg-green-50';
    }
  }

  testTTS(): void {
    this.ttsService.testVoice();
  }
}

/**
 * AlertsDashboardComponent - Panel de alertas y eventos
 * Equivalente a: apps/frontend/src/components/alerts/EventsDashboard.tsx
 */
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Incident, TrafficJam } from '../../core/services';
import { Subscription } from 'rxjs';

type AlertType = 'all' | 'ACCIDENT' | 'JAM' | 'HAZARD' | 'ROAD_CLOSED' | 'WEATHERHAZARD';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

interface AlertStats {
  totalAlerts: number;
  accidents: number;
  jams: number;
  hazards: number;
  roadClosed: number;
}

@Component({
  selector: 'app-alerts-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header con stats -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold">Alertas y Eventos</h2>
          <p class="text-[var(--secondary)]">Monitoreo en tiempo real de incidentes Waze</p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-sm text-[var(--secondary)]">Última actualización:</span>
          <span class="text-sm font-medium">{{ lastUpdate() | date: 'HH:mm:ss' }}</span>
          <button
            (click)="refreshData()"
            class="ml-2 p-2 hover:bg-[var(--muted)] rounded"
            title="Actualizar"
          >
            🔄
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
          <div class="text-3xl font-bold text-blue-500">{{ stats().totalAlerts }}</div>
          <div class="text-sm text-[var(--secondary)]">Total Alertas</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
          <div class="text-3xl font-bold text-red-500">{{ stats().accidents }}</div>
          <div class="text-sm text-[var(--secondary)]">🚗 Accidentes</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
          <div class="text-3xl font-bold text-orange-500">{{ stats().jams }}</div>
          <div class="text-sm text-[var(--secondary)]">🚦 Atascos</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
          <div class="text-3xl font-bold text-yellow-500">{{ stats().hazards }}</div>
          <div class="text-sm text-[var(--secondary)]">⚠️ Peligros</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
          <div class="text-3xl font-bold text-purple-500">{{ stats().roadClosed }}</div>
          <div class="text-sm text-[var(--secondary)]">🚧 Cierres</div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
        <div class="flex flex-wrap gap-4">
          <div>
            <label for="type-filter" class="block text-sm font-medium mb-1">Tipo de alerta</label>
            <select
              id="type-filter"
              [(ngModel)]="typeFilter"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border rounded bg-[var(--background)]"
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todos los tipos</option>
              <option value="ACCIDENT">🚗 Accidentes</option>
              <option value="JAM">🚦 Atascos</option>
              <option value="HAZARD">⚠️ Peligros</option>
              <option value="ROAD_CLOSED">🚧 Cierres</option>
              <option value="WEATHERHAZARD">🌧️ Clima</option>
            </select>
          </div>

          <div>
            <label for="severity-filter" class="block text-sm font-medium mb-1">Severidad</label>
            <select
              id="severity-filter"
              [(ngModel)]="severityFilter"
              (ngModelChange)="applyFilters()"
              class="px-3 py-2 border rounded bg-[var(--background)]"
              aria-label="Filtrar por severidad"
            >
              <option value="all">Todas</option>
              <option value="critical">🔴 Crítica</option>
              <option value="high">🟠 Alta</option>
              <option value="medium">🟡 Media</option>
              <option value="low">🟢 Baja</option>
            </select>
          </div>

          <div>
            <label for="search" class="block text-sm font-medium mb-1">Buscar</label>
            <input
              type="text"
              id="search"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyFilters()"
              placeholder="Buscar por calle..."
              class="px-3 py-2 border rounded bg-[var(--background)] w-64"
            />
          </div>
        </div>
      </div>

      <!-- Lista de alertas -->
      <div class="bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden">
        <div class="p-4 border-b border-[var(--border)] font-semibold">
          Alertas ({{ filteredIncidents().length }})
        </div>

        <div class="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto">
          @for (incident of filteredIncidents(); track incident.id) {
            <div class="p-4 hover:bg-[var(--muted)] transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{{ getTypeIcon(incident.type) }}</span>
                  <div>
                    <div class="font-medium">{{ incident.type }}</div>
                    @if (incident.subtype) {
                      <div class="text-sm text-[var(--secondary)]">{{ incident.subtype }}</div>
                    }
                    @if (incident.street) {
                      <div class="text-sm text-[var(--secondary)]">📍 {{ incident.street }}</div>
                    }
                    @if (incident.description) {
                      <div class="text-sm mt-1">{{ incident.description }}</div>
                    }
                  </div>
                </div>
                <div class="text-right text-sm text-[var(--secondary)]">
                  <div>{{ incident.polygonId }}</div>
                  <div class="text-xs">{{ formatTime(incident.pubMillis) }}</div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="p-8 text-center text-[var(--secondary)]">
              No hay alertas que coincidan con los filtros
            </div>
          }
        </div>
      </div>

      <!-- Atascos de tráfico -->
      <div class="bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden">
        <div class="p-4 border-b border-[var(--border)] font-semibold">
          Atascos de Tráfico ({{ jams().length }})
        </div>

        <div class="divide-y divide-[var(--border)] max-h-[300px] overflow-y-auto">
          @for (jam of jams(); track jam.id) {
            <div class="p-4 hover:bg-[var(--muted)] transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="w-3 h-3 rounded-full"
                    [style.backgroundColor]="getJamColor(jam.level)"
                  ></div>
                  <div>
                    <div class="font-medium">{{ jam.street || 'Calle desconocida' }}</div>
                    <div class="text-sm text-[var(--secondary)]">
                      Nivel {{ jam.level }} • {{ jam.speed }} km/h • {{ jam.length }}m
                    </div>
                  </div>
                </div>
                <div class="text-sm text-[var(--secondary)]">Retraso: {{ jam.delay }}s</div>
              </div>
            </div>
          } @empty {
            <div class="p-8 text-center text-[var(--secondary)]">No hay atascos reportados</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AlertsDashboardComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private subscription = new Subscription();

  // Datos
  private incidents = signal<Incident[]>([]);
  readonly jams = signal<TrafficJam[]>([]);
  readonly lastUpdate = signal<Date>(new Date());

  // Filtros
  typeFilter: AlertType = 'all';
  severityFilter: SeverityFilter = 'all';
  searchQuery = '';

  // Stats computados
  readonly stats = computed<AlertStats>(() => {
    const inc = this.incidents();
    return {
      totalAlerts: inc.length,
      accidents: inc.filter((i) => i.type === 'ACCIDENT').length,
      jams: this.jams().length,
      hazards: inc.filter((i) => i.type === 'HAZARD' || i.type === 'WEATHERHAZARD').length,
      roadClosed: inc.filter((i) => i.type === 'ROAD_CLOSED').length,
    };
  });

  // Incidentes filtrados
  readonly filteredIncidents = computed(() => {
    let result = this.incidents();

    if (this.typeFilter !== 'all') {
      result = result.filter((i) => i.type === this.typeFilter);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.street?.toLowerCase().includes(query) || i.description?.toLowerCase().includes(query),
      );
    }

    return result;
  });

  ngOnInit(): void {
    // Suscribirse a incidentes
    const incSub = this.apiService.incidents$.subscribe((data) => {
      this.incidents.set(data);
      this.lastUpdate.set(new Date());
    });

    // Suscribirse a jams
    const jamSub = this.apiService.jams$.subscribe((data) => {
      this.jams.set(data);
    });

    this.subscription.add(incSub);
    this.subscription.add(jamSub);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }

  applyFilters(): void {
    // Los filtros son reactivos, no necesitan acción adicional
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'ACCIDENT':
        return '🚗';
      case 'JAM':
        return '🚦';
      case 'HAZARD':
        return '⚠️';
      case 'ROAD_CLOSED':
        return '🚧';
      case 'WEATHERHAZARD':
        return '🌧️';
      default:
        return '📍';
    }
  }

  getJamColor(level: number): string {
    const colors: Record<number, string> = {
      0: '#22c55e',
      1: '#84cc16',
      2: '#eab308',
      3: '#f97316',
      4: '#ef4444',
      5: '#991b1b',
    };
    return colors[level] || colors[3];
  }

  formatTime(millis: number | undefined): string {
    if (!millis) return '';
    return new Date(millis).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

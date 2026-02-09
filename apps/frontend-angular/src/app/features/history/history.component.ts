import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ApiService, Incident, Polygon } from '../../core/services';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardContentComponent,
} from '../../shared/components';

interface Hotspot {
  id: string;
  street: string;
  city?: string;
  count: number;
  avgReliability: number;
  lastIncident: Date;
}

interface IncidentStats {
  byType: { type: string; count: number; percentage: number }[];
  byPolygon: { polygonId: string; name: string; count: number }[];
  total: number;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    ModernHeaderComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
  ],
  template: `
    <div class="min-h-screen bg-veltrix-bg">
      <!-- Header -->
      <app-modern-header (refresh)="refreshData()" />

      <!-- Main Content -->
      <div class="max-w-[1600px] mx-auto p-6 space-y-6">
        <!-- Page Title -->
        <div>
          <h1 class="text-2xl font-bold text-veltrix-text">Historial de Incidentes</h1>
          <p class="text-sm text-veltrix-muted">Análisis histórico de eventos en la red vial</p>
        </div>

        <!-- Filters -->
        <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-4">
          <div class="flex items-center gap-3 mb-4">
            <ng-icon name="lucideFilter" class="text-veltrix-muted" size="18" />
            <span class="font-medium text-veltrix-text">Filtros</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Polygon Filter -->
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Polígono</label>
              <select
                [(ngModel)]="selectedPolygon"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              >
                <option value="">Todos los polígonos</option>
                @for (polygon of polygons(); track polygon.id) {
                  <option [value]="polygon.id">{{ polygon.name }}</option>
                }
              </select>
            </div>

            <!-- Type Filter -->
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Tipo de Incidente</label>
              <select
                [(ngModel)]="selectedType"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              >
                <option value="">Todos los tipos</option>
                <option value="ACCIDENT">Accidentes</option>
                <option value="JAM">Atascos</option>
                <option value="HAZARD">Peligros</option>
                <option value="ROAD_CLOSED">Cierres</option>
                <option value="WEATHERHAZARD">Clima</option>
              </select>
            </div>

            <!-- Date From -->
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Desde</label>
              <input
                type="date"
                [(ngModel)]="dateFrom"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              />
            </div>

            <!-- Date To -->
            <div>
              <label class="text-xs text-veltrix-muted mb-1 block">Hasta</label>
              <input
                type="date"
                [(ngModel)]="dateTo"
                class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              />
            </div>

            <!-- Clear Button -->
            <div class="flex items-end">
              <button
                (click)="clearFilters()"
                class="w-full px-4 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-muted hover:text-veltrix-text hover:bg-veltrix-bg/80 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <ng-icon name="lucideX" size="14" />
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Hotspots -->
          <ui-card>
            <ui-card-header>
              <div class="flex items-center gap-2">
                <ng-icon name="lucideMapPin" class="text-red-500" size="18" />
                <ui-card-title>Puntos Negros (Hotspots)</ui-card-title>
              </div>
              <p class="text-xs text-veltrix-muted mt-1">Zonas con mayor concentración de incidentes</p>
            </ui-card-header>
            <ui-card-content>
              @if (hotspots().length > 0) {
                <div class="space-y-3">
                  @for (hotspot of hotspots(); track hotspot.id; let i = $index) {
                    <div class="flex items-center gap-3 p-3 bg-veltrix-bg rounded-lg">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                           [class]="i < 3 ? 'bg-red-500 text-white' : 'bg-veltrix-card text-veltrix-muted'">
                        {{ i + 1 }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-veltrix-text truncate">{{ hotspot.street }}</div>
                        <div class="text-xs text-veltrix-muted">{{ hotspot.city || 'Sin ciudad' }}</div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-veltrix-text">{{ hotspot.count }}</div>
                        <div class="text-xs text-veltrix-muted">incidentes</div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-8 text-veltrix-muted">
                  <ng-icon name="lucideCheckCircle" size="48" class="mx-auto mb-3 text-veltrix-success opacity-50" />
                  <p>No se encontraron puntos negros</p>
                </div>
              }
            </ui-card-content>
          </ui-card>

          <!-- Statistics -->
          <ui-card>
            <ui-card-header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <ng-icon name="lucideBarChart3" class="text-blue-500" size="18" />
                  <ui-card-title>Estadísticas</ui-card-title>
                </div>
                <select
                  [(ngModel)]="statsGroupBy"
                  class="px-3 py-1 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-xs focus:outline-none"
                >
                  <option value="type">Por Tipo</option>
                  <option value="polygon">Por Polígono</option>
                </select>
              </div>
            </ui-card-header>
            <ui-card-content>
              @if (statsGroupBy === 'type') {
                <div class="space-y-3">
                  @for (stat of stats().byType; track stat.type) {
                    <div class="flex items-center gap-3">
                      <div class="w-24 text-sm text-veltrix-muted">{{ getTypeLabel(stat.type) }}</div>
                      <div class="flex-1 h-4 bg-veltrix-bg rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all"
                          [class]="getTypeBarClass(stat.type)"
                          [style.width.%]="stat.percentage"
                        ></div>
                      </div>
                      <div class="w-12 text-right font-mono text-sm text-veltrix-text">{{ stat.count }}</div>
                    </div>
                  }
                </div>
              } @else {
                <div class="space-y-3">
                  @for (stat of stats().byPolygon | slice:0:8; track stat.polygonId) {
                    <div class="flex items-center gap-3">
                      <div class="w-32 text-sm text-veltrix-muted truncate">{{ stat.name }}</div>
                      <div class="flex-1 h-4 bg-veltrix-bg rounded-full overflow-hidden">
                        <div
                          class="h-full bg-blue-500 rounded-full transition-all"
                          [style.width.%]="(stat.count / stats().total) * 100"
                        ></div>
                      </div>
                      <div class="w-12 text-right font-mono text-sm text-veltrix-text">{{ stat.count }}</div>
                    </div>
                  }
                </div>
              }

              <div class="mt-4 pt-4 border-t border-veltrix-border flex items-center justify-between text-sm">
                <span class="text-veltrix-muted">Total de incidentes</span>
                <span class="font-bold text-veltrix-text">{{ stats().total }}</span>
              </div>
            </ui-card-content>
          </ui-card>
        </div>

        <!-- Incidents Table -->
        <ui-card>
          <ui-card-header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideList" class="text-veltrix-muted" size="18" />
                <ui-card-title>Incidentes Históricos</ui-card-title>
                <span class="text-xs bg-veltrix-primary/20 text-veltrix-primary px-2 py-0.5 rounded-full">
                  {{ filteredIncidents().length }}
                </span>
              </div>
            </div>
          </ui-card-header>
          <ui-card-content>
            <div class="overflow-x-auto">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Ubicación</th>
                    <th>Polígono</th>
                    <th>Fecha</th>
                    <th class="text-center">Confianza</th>
                    <th class="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (incident of filteredIncidents() | slice:0:50; track incident.id) {
                    <tr class="hover:bg-veltrix-bg/50 transition-colors">
                      <td>
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-full flex items-center justify-center"
                               [style.background-color]="getTypeColor(incident.type)">
                            <ng-icon [name]="getTypeIcon(incident.type)" class="text-white" size="14" />
                          </div>
                          <span class="text-veltrix-text">{{ getTypeLabel(incident.type) }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="text-veltrix-text truncate max-w-xs">{{ incident.street || 'Sin ubicación' }}</div>
                        @if (incident.city) {
                          <div class="text-xs text-veltrix-muted">{{ incident.city }}</div>
                        }
                      </td>
                      <td class="text-veltrix-muted">{{ getPolygonName(incident.polygonId) }}</td>
                      <td class="text-veltrix-muted">{{ formatDate(incident.timestamp) }}</td>
                      <td class="text-center">
                        <div class="flex items-center justify-center gap-2">
                          <div class="w-16 h-2 bg-veltrix-bg rounded-full overflow-hidden">
                            <div
                              class="h-full bg-blue-500 rounded-full"
                              [style.width.%]="(incident.reliability || 0) * 10"
                            ></div>
                          </div>
                          <span class="text-xs text-veltrix-muted">{{ incident.reliability || 0 }}</span>
                        </div>
                      </td>
                      <td class="text-center">
                        <span class="px-2 py-1 text-xs rounded-full"
                              [class]="incident.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'">
                          {{ incident.isActive ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="text-center py-12">
                        <ng-icon name="lucideCalendar" size="48" class="mx-auto mb-3 text-veltrix-muted opacity-50" />
                        <p class="text-veltrix-muted">No hay incidentes en el período seleccionado</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </ui-card-content>
        </ui-card>
      </div>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3 mt-6">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span>© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por <strong>GED</strong></span>
          <div class="flex items-center gap-6">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span> Accidentes</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> Atascos</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-500"></span> Peligros</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> Clima</span>
          </div>
          <span class="flex items-center gap-2">
            <span>● Waze for Cities</span>
            <span class="text-veltrix-primary">• Historical Module</span>
          </span>
        </div>
      </footer>
    </div>
  `,
})
export class HistoryComponent implements OnInit {
  private apiService = inject(ApiService);

  // Filters
  selectedPolygon = '';
  selectedType = '';
  dateFrom = '';
  dateTo = '';
  statsGroupBy = 'type';

  // Data
  private incidents = signal<Incident[]>([]);
  readonly polygons = signal<Polygon[]>([]);

  ngOnInit(): void {
    // Set default dates (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.dateTo = now.toISOString().split('T')[0];
    this.dateFrom = sevenDaysAgo.toISOString().split('T')[0];

    this.apiService.incidents$.subscribe(data => this.incidents.set(data || []));
    this.apiService.polygons$.subscribe(data => this.polygons.set(data || []));
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }

  clearFilters(): void {
    this.selectedPolygon = '';
    this.selectedType = '';
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.dateTo = now.toISOString().split('T')[0];
    this.dateFrom = sevenDaysAgo.toISOString().split('T')[0];
  }

  readonly filteredIncidents = computed(() => {
    let result = this.incidents();

    if (this.selectedPolygon) {
      result = result.filter(i => i.polygonId === this.selectedPolygon);
    }

    if (this.selectedType) {
      result = result.filter(i => i.type === this.selectedType);
    }

    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      result = result.filter(i => new Date(i.timestamp) >= from);
    }

    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(i => new Date(i.timestamp) <= to);
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  readonly hotspots = computed((): Hotspot[] => {
    const incidents = this.filteredIncidents();
    const streetMap = new Map<string, { count: number; reliability: number[]; lastIncident: Date; city?: string }>();

    incidents.forEach(i => {
      const street = i.street || 'Desconocido';
      if (!streetMap.has(street)) {
        streetMap.set(street, { count: 0, reliability: [], lastIncident: new Date(0), city: i.city });
      }
      const entry = streetMap.get(street)!;
      entry.count++;
      entry.reliability.push(i.reliability || 0);
      const incidentDate = new Date(i.timestamp);
      if (incidentDate > entry.lastIncident) {
        entry.lastIncident = incidentDate;
      }
    });

    return Array.from(streetMap.entries())
      .map(([street, data]) => ({
        id: street,
        street,
        city: data.city,
        count: data.count,
        avgReliability: data.reliability.length > 0
          ? data.reliability.reduce((a, b) => a + b, 0) / data.reliability.length
          : 0,
        lastIncident: data.lastIncident,
      }))
      .filter(h => h.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  readonly stats = computed((): IncidentStats => {
    const incidents = this.filteredIncidents();
    const total = incidents.length;

    // By Type
    const typeCounts: Record<string, number> = {};
    incidents.forEach(i => {
      typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
    });

    const byType = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By Polygon
    const polygonCounts: Record<string, { count: number; name: string }> = {};
    incidents.forEach(i => {
      const polygonId = i.polygonId || 'unknown';
      if (!polygonCounts[polygonId]) {
        const polygon = this.polygons().find(p => p.id === polygonId);
        polygonCounts[polygonId] = { count: 0, name: polygon?.name || polygonId };
      }
      polygonCounts[polygonId].count++;
    });

    const byPolygon = Object.entries(polygonCounts)
      .map(([polygonId, data]) => ({
        polygonId,
        name: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);

    return { byType, byPolygon, total };
  });

  getPolygonName(polygonId?: string): string {
    if (!polygonId) return '-';
    const polygon = this.polygons().find(p => p.id === polygonId);
    return polygon?.name || polygonId;
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ACCIDENT: 'Accidente',
      JAM: 'Atasco',
      HAZARD: 'Peligro',
      ROAD_CLOSED: 'Cierre',
      WEATHERHAZARD: 'Clima',
    };
    return labels[type] || type;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      ACCIDENT: 'lucideCar',
      JAM: 'lucideConstruction',
      HAZARD: 'lucideAlertTriangle',
      ROAD_CLOSED: 'lucideCircle',
      WEATHERHAZARD: 'lucideCloudRain',
    };
    return icons[type] || 'lucideAlertTriangle';
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      ACCIDENT: '#ef4444',
      JAM: '#f97316',
      HAZARD: '#eab308',
      ROAD_CLOSED: '#8b5cf6',
      WEATHERHAZARD: '#06b6d4',
    };
    return colors[type] || '#6b7280';
  }

  getTypeBarClass(type: string): string {
    const classes: Record<string, string> = {
      ACCIDENT: 'bg-red-500',
      JAM: 'bg-orange-500',
      HAZARD: 'bg-yellow-500',
      ROAD_CLOSED: 'bg-purple-500',
      WEATHERHAZARD: 'bg-cyan-500',
    };
    return classes[type] || 'bg-gray-500';
  }

  formatDate(timestamp: Date | string): string {
    return new Date(timestamp).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ApiService, Incident } from '../../core/services';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardContentComponent,
} from '../../shared/components';

type DataSource = 'current' | 'historical' | 'all';
type ViewMode = 'cards' | 'table';

@Component({
  selector: 'app-alerts-dashboard',
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
          <h1 class="text-2xl font-bold text-veltrix-text">Panel de Inteligencia de Eventos</h1>
          <p class="text-sm text-veltrix-muted">Monitoreo y análisis de impacto en tiempo real</p>
        </div>

        <!-- Search & View Controls -->
        <div class="flex items-center justify-between gap-4">
          <!-- Search -->
          <div class="relative flex-1 max-w-xs">
            <ng-icon name="lucideSearch" class="absolute left-3 top-1/2 -translate-y-1/2 text-veltrix-muted" size="18" />
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar evento o calle..."
              class="w-full pl-10 pr-4 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text placeholder-veltrix-muted/50 focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
            />
          </div>

          <!-- View Toggle & Refresh -->
          <div class="flex items-center gap-2">
            <div class="flex bg-veltrix-card rounded-lg border border-veltrix-border p-1">
              <button
                (click)="viewMode.set('cards')"
                class="p-2 rounded transition-colors"
                [class]="viewMode() === 'cards' ? 'bg-veltrix-primary text-white' : 'text-veltrix-muted hover:text-veltrix-text'"
              >
                <ng-icon name="lucideLayoutGrid" size="18" />
              </button>
              <button
                (click)="viewMode.set('table')"
                class="p-2 rounded transition-colors"
                [class]="viewMode() === 'table' ? 'bg-veltrix-primary text-white' : 'text-veltrix-muted hover:text-veltrix-text'"
              >
                <ng-icon name="lucideList" size="18" />
              </button>
            </div>
            <button 
              (click)="refreshData()"
              class="p-2 bg-veltrix-primary text-white rounded-lg hover:brightness-110 transition-all"
            >
              <ng-icon name="lucideRefreshCw" size="18" />
            </button>
          </div>
        </div>

        <!-- Filters Panel -->
        <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-4">
          <div class="flex flex-wrap items-center gap-4">
            <!-- Data Source Toggle -->
            <div class="flex bg-veltrix-bg rounded-lg p-1">
              <button
                (click)="dataSource.set('current')"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                [class]="dataSource() === 'current' ? 'bg-blue-500 text-white' : 'text-veltrix-muted hover:text-veltrix-text'"
              >
                Actuales
              </button>
              <button
                (click)="dataSource.set('historical')"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                [class]="dataSource() === 'historical' ? 'bg-purple-500 text-white' : 'text-veltrix-muted hover:text-veltrix-text'"
              >
                Históricos
              </button>
              <button
                (click)="dataSource.set('all')"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                [class]="dataSource() === 'all' ? 'bg-green-500 text-white' : 'text-veltrix-muted hover:text-veltrix-text'"
              >
                Todos
              </button>
            </div>

            <div class="h-8 w-px bg-veltrix-border"></div>

            <!-- Date Range -->
            <div class="flex items-center gap-2">
              <ng-icon name="lucideCalendar" class="text-veltrix-muted" size="16" />
              <span class="text-xs text-veltrix-muted">Desde:</span>
              <input
                type="date"
                [(ngModel)]="dateFrom"
                class="px-3 py-1.5 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none"
              />
              <span class="text-veltrix-muted">-</span>
              <input
                type="date"
                [(ngModel)]="dateTo"
                class="px-3 py-1.5 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none"
              />
            </div>

            <div class="h-8 w-px bg-veltrix-border"></div>

            <!-- Status Filter -->
            <div class="flex items-center gap-2">
              <ng-icon name="lucideActivity" class="text-veltrix-muted" size="16" />
              <span class="text-xs text-veltrix-muted">Estado:</span>
              <select
                [(ngModel)]="statusFilter"
                class="px-3 py-1.5 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none"
              >
                <option value="all">Solo Activos</option>
                <option value="inactive">Solo Inactivos</option>
                <option value="both">Todos</option>
              </select>
            </div>
          </div>
        </div>

        <!-- KPIs Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Incidentes Activos -->
          <div class="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <div class="flex items-center gap-3">
              <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ng-icon name="lucideActivity" class="text-blue-500" size="24" />
              </div>
              <div class="flex-1">
                <div class="text-xs text-blue-600 dark:text-blue-400 font-medium">INCIDENTES ACTIVOS</div>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-bold text-blue-700 dark:text-blue-300">{{ kpis().totalActive }}</span>
                  <ng-icon name="lucideTrendingUp" class="text-blue-500" size="16" />
                </div>
                <div class="text-xs text-blue-500">Feed Waze Real</div>
              </div>
            </div>
          </div>

          <!-- Usuarios Waze -->
          <div class="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
            <div class="flex items-center gap-3">
              <div class="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <ng-icon name="lucideUser" class="text-indigo-500" size="24" />
              </div>
              <div class="flex-1">
                <div class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">USUARIOS WAZE (TVT)</div>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{{ kpis().totalWazers }}</span>
                  <ng-icon name="lucideTrendingUp" class="text-indigo-500" size="16" />
                </div>
                <div class="text-xs text-indigo-500">{{ kpis().totalWazers > 0 ? 'En rutas monitoreadas' : 'Sin datos TVT' }}</div>
              </div>
            </div>
          </div>

          <!-- Demora Acumulada -->
          <div class="bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
            <div class="flex items-center gap-3">
              <div class="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <ng-icon name="lucideClock" class="text-orange-500" size="24" />
              </div>
              <div class="flex-1">
                <div class="text-xs text-orange-600 dark:text-orange-400 font-medium">DEMORA ACUMULADA</div>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-bold text-orange-700 dark:text-orange-300">{{ kpis().totalDelay }} min</span>
                </div>
                <div class="text-xs text-orange-500">Estimado por Jams</div>
              </div>
            </div>
          </div>

          <!-- Impacto Promedio -->
          <div class="bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
            <div class="flex items-center gap-3">
              <div class="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ng-icon name="lucideTrendingUp" class="text-purple-500" size="24" />
              </div>
              <div class="flex-1">
                <div class="text-xs text-purple-600 dark:text-purple-400 font-medium">IMPACTO PROMEDIO</div>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl font-bold text-purple-700 dark:text-purple-300">{{ kpis().avgImpact }}</span>
                </div>
                <div class="text-xs text-purple-500">Escala 0-100</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Historical Trend Chart -->
        <ui-card>
          <ui-card-header>
            <div class="flex items-center gap-2">
              <ng-icon name="lucideClock" class="text-veltrix-muted" size="18" />
              <ui-card-title>Tendencia Histórica (24h)</ui-card-title>
            </div>
            <p class="text-xs text-veltrix-muted mt-1">Evolución de carga en la red vía monitoreada</p>
          </ui-card-header>
          <ui-card-content>
            <div class="h-56 flex items-center justify-center bg-veltrix-bg/50 rounded-xl">
              <div class="text-center text-veltrix-muted">
                <ng-icon name="lucideTrendingUp" size="48" class="mx-auto mb-3 opacity-30" />
                <p>No hay datos históricos disponibles</p>
                <p class="text-xs mt-1">Los datos se irán acumulando con el tiempo</p>
              </div>
            </div>
          </ui-card-content>
        </ui-card>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Distribution by Type -->
          <ui-card>
            <ui-card-header>
              <div class="flex items-center gap-2">
                <div class="w-1 h-6 bg-blue-500 rounded-full"></div>
                <ui-card-title>Distribución por Tipo</ui-card-title>
              </div>
            </ui-card-header>
            <ui-card-content>
              <div class="h-72 flex items-center justify-center">
                @if (typeDistribution().length > 0) {
                  <div class="w-full max-w-xs">
                    <!-- Simple pie visualization -->
                    <div class="relative w-48 h-48 mx-auto mb-4">
                      <svg viewBox="0 0 100 100" class="transform -rotate-90">
                        @for (slice of pieSlices(); track slice.type; let i = $index) {
                          <circle
                            cx="50" cy="50" r="40"
                            fill="transparent"
                            [attr.stroke]="slice.color"
                            stroke-width="20"
                            [attr.stroke-dasharray]="slice.dashArray"
                            [attr.stroke-dashoffset]="slice.offset"
                            class="transition-all duration-500"
                          />
                        }
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <div class="text-center">
                          <div class="text-3xl font-bold text-veltrix-text">{{ filteredIncidents().length }}</div>
                          <div class="text-xs text-veltrix-muted">total</div>
                        </div>
                      </div>
                    </div>
                    <!-- Legend -->
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      @for (item of typeDistribution(); track item.type) {
                        <div class="flex items-center gap-2">
                          <span class="w-3 h-3 rounded-full" [style.background-color]="item.color"></span>
                          <span class="text-veltrix-muted truncate">{{ item.label }}</span>
                          <span class="text-veltrix-text font-medium ml-auto">{{ item.count }}</span>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="text-center text-veltrix-muted">
                    <ng-icon name="lucideBarChart3" size="48" class="mx-auto mb-3 opacity-30" />
                    <p>Sin datos de distribución</p>
                  </div>
                }
              </div>
            </ui-card-content>
          </ui-card>

          <!-- Most Affected Sections -->
          <ui-card>
            <ui-card-header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  <ui-card-title>Tramos más afectados</ui-card-title>
                </div>
                <button class="text-xs text-veltrix-primary hover:underline">
                  Ver todos ({{ affectedSections().length }})
                </button>
              </div>
            </ui-card-header>
            <ui-card-content>
              <div class="space-y-2">
                @for (section of affectedSections() | slice:0:10; track section.name) {
                  <div class="flex items-center gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-veltrix-text truncate">{{ section.name }}</div>
                    </div>
                    <div class="w-32 h-2 bg-veltrix-bg rounded-full overflow-hidden">
                      <div 
                        class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        [style.width.%]="section.percentage"
                      ></div>
                    </div>
                    <span class="text-xs font-medium text-veltrix-text w-8 text-right">{{ section.count }}</span>
                  </div>
                } @empty {
                  <div class="text-center py-8 text-veltrix-muted">
                    <p>Sin datos de secciones</p>
                  </div>
                }
              </div>
            </ui-card-content>
          </ui-card>
        </div>

        <!-- Events List -->
        <ui-card>
          <ui-card-header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideList" class="text-veltrix-muted" size="18" />
                <ui-card-title>Listado de Eventos</ui-card-title>
                <span class="text-xs bg-veltrix-primary/20 text-veltrix-primary px-2 py-0.5 rounded-full">
                  {{ filteredIncidents().length }}
                </span>
              </div>
            </div>
          </ui-card-header>
          <ui-card-content>
            @if (viewMode() === 'table') {
              <!-- Table View -->
              <div class="overflow-x-auto">
                <table class="data-table w-full">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Ubicación</th>
                      <th>Tiempo</th>
                      <th class="text-right">Demora</th>
                      <th class="text-right">Impacto</th>
                      <th class="text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (incident of filteredIncidents() | slice:0:20; track incident.id) {
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
                          <div class="flex items-center gap-1 text-veltrix-muted">
                            <ng-icon name="lucideMapPin" size="12" />
                            <span class="truncate max-w-xs">{{ incident.street || 'Sin ubicación' }}</span>
                          </div>
                        </td>
                        <td class="text-veltrix-muted">{{ formatTime(incident.timestamp) }}</td>
                        <td class="text-right">
                          <span [class]="getDelayClass(incident)">
                            {{ getDelay(incident) }} min
                          </span>
                        </td>
                        <td class="text-right">
                          <span class="px-2 py-1 text-xs font-medium rounded-full"
                                [class]="getImpactClass(incident)">
                            {{ getImpact(incident) }}
                          </span>
                        </td>
                        <td class="text-center">
                          <button class="p-2 hover:bg-veltrix-bg rounded-lg transition-colors">
                            <ng-icon name="lucideExternalLink" class="text-veltrix-muted" size="16" />
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="text-center py-12">
                          <ng-icon name="lucideCheckCircle" size="48" class="mx-auto mb-3 text-veltrix-success opacity-50" />
                          <p class="text-veltrix-muted">No Hay Incidentes Activos</p>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <!-- Cards View -->
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                @for (incident of filteredIncidents() | slice:0:12; track incident.id) {
                  <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border hover:border-veltrix-primary/50 transition-all">
                    <!-- Header -->
                    <div class="flex items-start gap-3 mb-3">
                      <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                           [style.background-color]="getTypeColor(incident.type)">
                        <ng-icon [name]="getTypeIcon(incident.type)" class="text-white" size="24" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-veltrix-text truncate">{{ incident.street || 'Sin ubicación' }}</div>
                        <div class="text-xs text-veltrix-muted">{{ getTypeLabel(incident.type) }}</div>
                      </div>
                      <span class="px-2 py-1 text-xs font-bold rounded-full flex-shrink-0"
                            [class]="getImpactClass(incident)">
                        {{ getImpact(incident) }}
                      </span>
                    </div>

                    <!-- Location -->
                    @if (incident.city) {
                      <div class="flex items-center gap-1 text-xs text-veltrix-muted mb-3">
                        <ng-icon name="lucideMapPin" size="12" />
                        {{ incident.city }}
                      </div>
                    }

                    <!-- Time -->
                    <div class="flex items-center gap-1 text-xs text-veltrix-muted mb-3">
                      <ng-icon name="lucideClock" size="12" />
                      Activo hace {{ getTimeAgo(incident.timestamp) }}
                    </div>

                    <!-- Metrics -->
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      <div class="bg-red-500/10 rounded-lg p-2">
                        <div class="text-red-400">Demora Estimada</div>
                        <div class="font-bold text-red-500">{{ getDelay(incident) }} min</div>
                      </div>
                      <div class="bg-blue-500/10 rounded-lg p-2">
                        <div class="text-blue-400">Precisión</div>
                        <div class="font-bold text-blue-500">{{ (incident.reliability || 0) }}%</div>
                      </div>
                    </div>

                    <!-- Action -->
                    <button class="w-full mt-3 px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-sm text-veltrix-text hover:bg-veltrix-primary hover:text-white hover:border-veltrix-primary transition-all flex items-center justify-center gap-2">
                      <ng-icon name="lucideMap" size="14" />
                      Ver mapa
                    </button>
                  </div>
                } @empty {
                  <div class="col-span-full text-center py-12">
                    <ng-icon name="lucideCheckCircle" size="48" class="mx-auto mb-3 text-veltrix-success opacity-50" />
                    <p class="text-veltrix-muted">No Hay Incidentes Activos</p>
                  </div>
                }
              </div>
            }
          </ui-card-content>
        </ui-card>
      </div>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3 mt-6">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span>© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por <strong>GED</strong></span>
          <div class="flex items-center gap-6">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-success"></span> Fluido</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-warning"></span> Moderado</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-danger"></span> Crítico</span>
          </div>
          <span class="flex items-center gap-2">
            <span>● Waze for Cities</span>
            <span class="text-veltrix-primary">• Actualización cada 60s</span>
          </span>
        </div>
      </footer>
    </div>
  `,
})
export class AlertsDashboardComponent implements OnInit {
  private apiService = inject(ApiService);

  // Filters
  searchTerm = '';
  dateFrom = '';
  dateTo = '';
  statusFilter = 'all';
  readonly dataSource = signal<DataSource>('current');
  readonly viewMode = signal<ViewMode>('cards');

  // Data
  private incidents = signal<Incident[]>([]);

  ngOnInit(): void {
    this.apiService.incidents$.subscribe(data => this.incidents.set(data || []));
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }

  readonly filteredIncidents = computed(() => {
    let result = this.incidents();

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(i =>
        i.street?.toLowerCase().includes(term) ||
        i.city?.toLowerCase().includes(term) ||
        i.type?.toLowerCase().includes(term)
      );
    }

    return result;
  });

  readonly kpis = computed(() => {
    const incidents = this.filteredIncidents();
    const totalActive = incidents.length;
    const totalWazers = 0; // TVT data not available
    const totalDelay = Math.round(incidents.reduce((sum, i) => sum + (i.severity || 0) * 2, 0));
    const avgImpact = totalActive > 0
      ? (incidents.reduce((sum, i) => sum + (i.severity || 0) * 10, 0) / totalActive).toFixed(1)
      : '0.0';

    return { totalActive, totalWazers, totalDelay, avgImpact };
  });

  readonly typeDistribution = computed(() => {
    const incidents = this.filteredIncidents();
    const counts: Record<string, number> = {};

    incidents.forEach(i => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });

    const colors: Record<string, string> = {
      ACCIDENT: '#ef4444',
      JAM: '#f97316',
      HAZARD: '#eab308',
      ROAD_CLOSED: '#8b5cf6',
      WEATHERHAZARD: '#06b6d4',
    };

    const labels: Record<string, string> = {
      ACCIDENT: 'Accidentes',
      JAM: 'Atascos',
      HAZARD: 'Peligros',
      ROAD_CLOSED: 'Cierres',
      WEATHERHAZARD: 'Clima',
    };

    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      color: colors[type] || '#6b7280',
      label: labels[type] || type,
    }));
  });

  readonly pieSlices = computed(() => {
    const dist = this.typeDistribution();
    const total = dist.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) return [];

    const circumference = 2 * Math.PI * 40;
    let currentOffset = 0;

    return dist.map(d => {
      const percentage = d.count / total;
      const dashArray = `${percentage * circumference} ${circumference}`;
      const offset = -currentOffset;
      currentOffset += percentage * circumference;

      return {
        ...d,
        dashArray,
        offset,
      };
    });
  });

  readonly affectedSections = computed(() => {
    const incidents = this.filteredIncidents();
    const counts: Record<string, number> = {};

    incidents.forEach(i => {
      const section = i.street || 'Desconocido';
      counts[section] = (counts[section] || 0) + 1;
    });

    const max = Math.max(...Object.values(counts), 1);

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / max) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  });

  // Helper methods
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

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ACCIDENT: 'Accidente',
      JAM: 'Atasco',
      HAZARD: 'Peligro',
      ROAD_CLOSED: 'Cierre',
      WEATHERHAZARD: 'Alerta Climática',
    };
    return labels[type] || type;
  }

  formatTime(timestamp: Date | string): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  getDelay(incident: Incident): number {
    return (incident.severity || 0) * 3;
  }

  getDelayClass(incident: Incident): string {
    const delay = this.getDelay(incident);
    return delay > 15 ? 'text-red-500 font-bold' : 'text-veltrix-muted';
  }

  getImpact(incident: Incident): number {
    return (incident.severity || 0) * 10;
  }

  getImpactClass(incident: Incident): string {
    const impact = this.getImpact(incident);
    if (impact >= 50) return 'bg-red-500/20 text-red-500';
    if (impact >= 30) return 'bg-orange-500/20 text-orange-500';
    if (impact >= 15) return 'bg-yellow-500/20 text-yellow-500';
    return 'bg-green-500/20 text-green-500';
  }

  getTimeAgo(timestamp: Date | string): string {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
}

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ApiService, Incident } from '../../core/services';
import {
  CardComponent,
  CardContentComponent,
  BadgeComponent,
} from '../../shared/components';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    CardComponent,
    CardContentComponent,
    BadgeComponent,
    ModernHeaderComponent,
  ],
  template: `
    <div class="min-h-screen bg-veltrix-bg">
      <!-- Header -->
      <app-modern-header (refresh)="refreshData()" />

      <!-- Main Content -->
      <div class="p-6">
        <!-- Page Title -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-veltrix-text">Módulo de Incidentes</h1>
            <p class="text-sm text-veltrix-muted">Gestión y análisis de incidentes de Waze</p>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="refreshData()" class="flex items-center gap-2 px-4 py-2 bg-veltrix-bg border border-veltrix-border rounded-xl text-veltrix-text hover:bg-veltrix-card transition-colors">
              <ng-icon name="lucideRefreshCw" size="16" />
              Actualizar
            </button>
            <button class="flex items-center gap-2 px-4 py-2 bg-veltrix-success text-white rounded-xl hover:brightness-110 transition-all">
              <ng-icon name="lucideExternalLink" size="16" />
              Exportar
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        @if (stats(); as stats) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <!-- Total Incidentes -->
            <div class="bg-veltrix-card rounded-xl p-4 border border-veltrix-border">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-veltrix-warning/20 rounded-lg">
                  <ng-icon name="lucideAlertTriangle" class="text-veltrix-warning" size="24" />
                </div>
                <div>
                  <div class="text-2xl font-bold text-veltrix-text">{{ stats.total | number }}</div>
                  <div class="text-xs text-veltrix-muted">Total de incidentes</div>
                </div>
              </div>
            </div>

            <!-- Activos Ahora -->
            <div class="bg-veltrix-card rounded-xl p-4 border border-veltrix-border">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-veltrix-success/20 rounded-lg">
                  <ng-icon name="lucideCheckCircle" class="text-veltrix-success" size="24" />
                </div>
                <div>
                  <div class="text-2xl font-bold text-veltrix-text">{{ stats.active }}</div>
                  <div class="text-xs text-veltrix-muted">Activos ahora</div>
                </div>
              </div>
            </div>

            <!-- Resultados Filtrados -->
            <div class="bg-veltrix-card rounded-xl p-4 border border-veltrix-border">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-veltrix-primary/20 rounded-lg">
                  <ng-icon name="lucideTrendingUp" class="text-veltrix-primary" size="24" />
                </div>
                <div>
                  <div class="text-2xl font-bold text-veltrix-text">{{ filteredIncidents().length | number }}</div>
                  <div class="text-xs text-veltrix-muted">Resultados filtrados</div>
                </div>
              </div>
            </div>

            <!-- Último Incidente -->
            <div class="bg-veltrix-card rounded-xl p-4 border border-veltrix-border">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-veltrix-danger/20 rounded-lg">
                  <ng-icon name="lucideCalendar" class="text-veltrix-danger" size="24" />
                </div>
                <div>
                  <div class="text-lg font-bold text-veltrix-text">{{ stats.lastDate }}</div>
                  <div class="text-xs text-veltrix-muted">Último incidente</div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Filters Section -->
        <ui-card class="mb-6">
          <ui-card-content>
            <div class="flex items-center gap-2 mb-4">
              <ng-icon name="lucideFilter" class="text-veltrix-muted" size="16" />
              <span class="text-sm font-medium text-veltrix-text">Filtros</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <!-- Search -->
              <div class="lg:col-span-2">
                <label class="text-xs text-veltrix-muted mb-1 block">Buscar</label>
                <div class="relative">
                  <ng-icon name="lucideSearch" class="absolute left-3 top-1/2 -translate-y-1/2 text-veltrix-muted" size="16" />
                  <input
                    type="text"
                    [(ngModel)]="searchQuery"
                    placeholder="Calle, ciudad o descripción..."
                    class="w-full pl-10 pr-4 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text placeholder-veltrix-muted/50 focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                  />
                </div>
              </div>

              <!-- Type Filter -->
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Tipo</label>
                <select
                  [(ngModel)]="selectedType"
                  class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                >
                  <option value="">Todos</option>
                  <option value="ACCIDENT">Accidente</option>
                  <option value="JAM">Atasco</option>
                  <option value="HAZARD">Peligro</option>
                  <option value="ROAD_CLOSED">Cierre</option>
                </select>
              </div>

              <!-- Subtype Filter -->
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Subtipo</label>
                <select
                  [(ngModel)]="selectedSubtype"
                  class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                >
                  <option value="">Todos</option>
                  <option value="JAM_HEAVY_TRAFFIC">Tráfico denso</option>
                  <option value="HAZARD_ON_ROAD_OBJECT">Objeto en vía</option>
                  <option value="HAZARD_ON_SHOULDER">En banquina</option>
                </select>
              </div>

              <!-- Date From -->
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Desde</label>
                <input
                  type="date"
                  [(ngModel)]="dateFrom"
                  class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                />
              </div>

              <!-- Date To -->
              <div>
                <label class="text-xs text-veltrix-muted mb-1 block">Hasta</label>
                <input
                  type="date"
                  [(ngModel)]="dateTo"
                  class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                />
              </div>
            </div>

            <!-- Status Filter Row -->
            <div class="flex items-center gap-4 mt-4 pt-4 border-t border-veltrix-border">
              <label class="text-xs text-veltrix-muted">Estado</label>
              <select
                [(ngModel)]="selectedStatus"
                class="px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              >
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <button (click)="clearFilters()" class="ml-auto text-sm text-veltrix-muted hover:text-veltrix-text">
                Limpiar filtros
              </button>
            </div>
          </ui-card-content>
        </ui-card>

        <!-- Incidents Table -->
        <ui-card>
          <ui-card-content>
            <div class="overflow-x-auto">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th class="text-left">TIPO</th>
                    <th class="text-left">SUBTIPO</th>
                    <th class="text-left">UBICACIÓN</th>
                    <th class="text-left">FECHA</th>
                    <th class="text-left">ESTADO</th>
                    <th class="text-left">CONFIANZA</th>
                    <th class="text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  @for (incident of paginatedIncidents(); track incident.id) {
                    <tr class="hover:bg-veltrix-bg/50 transition-colors">
                      <td>
                        <div class="flex items-center gap-2">
                          <span class="px-2 py-1 text-xs font-medium rounded-full"
                                [class]="getTypeBadgeClass(incident.type)">
                            {{ getTypeLabel(incident.type) }}
                          </span>
                        </div>
                      </td>
                      <td class="text-veltrix-text">{{ formatSubtype(incident.subtype) }}</td>
                      <td>
                        <div class="max-w-xs truncate text-veltrix-text">{{ incident.street || 'Sin ubicación' }}</div>
                        <div class="text-xs text-veltrix-muted">{{ incident.city || '' }}</div>
                      </td>
                      <td class="text-veltrix-muted text-sm">{{ formatDate(incident.timestamp) }}</td>
                      <td>
                        <ui-badge [variant]="incident.isActive ? 'success' : 'secondary'" size="sm">
                          {{ incident.isActive ? 'Activo' : 'Inactivo' }}
                        </ui-badge>
                      </td>
                      <td>
                        <div class="flex items-center gap-2">
                          <div class="w-16 h-2 bg-veltrix-bg rounded-full overflow-hidden">
                            <div class="h-full bg-veltrix-primary rounded-full" [style.width.%]="incident.reliability || 0"></div>
                          </div>
                          <span class="text-xs text-veltrix-muted">{{ (incident.reliability || 0) / 10 }}</span>
                        </div>
                      </td>
                      <td class="text-right">
                        <button class="p-2 hover:bg-veltrix-bg rounded-lg transition-colors" title="Ver en mapa">
                          <ng-icon name="lucideMapPin" class="text-veltrix-muted" size="16" />
                        </button>
                        <button class="p-2 hover:bg-veltrix-bg rounded-lg transition-colors" title="Ver detalles">
                          <ng-icon name="lucideEye" class="text-veltrix-muted" size="16" />
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="text-center py-12 text-veltrix-muted">
                        <ng-icon name="lucideSearch" size="48" class="mx-auto mb-3 opacity-30" />
                        <p>No hay incidentes para los filtros seleccionados</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (totalPages() > 1) {
              <div class="flex items-center justify-between mt-4 pt-4 border-t border-veltrix-border">
                <span class="text-sm text-veltrix-muted">
                  Mostrando {{ (currentPage() - 1) * pageSize() + 1 }} - {{ Math.min(currentPage() * pageSize(), filteredIncidents().length) }} de {{ filteredIncidents().length }}
                </span>
                <div class="flex items-center gap-2">
                  <button
                    (click)="prevPage()"
                    [disabled]="currentPage() === 1"
                    class="px-3 py-1 bg-veltrix-bg border border-veltrix-border rounded text-veltrix-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-veltrix-card transition-colors"
                  >
                    Anterior
                  </button>
                  <span class="px-3 py-1 text-veltrix-text">{{ currentPage() }} / {{ totalPages() }}</span>
                  <button
                    (click)="nextPage()"
                    [disabled]="currentPage() >= totalPages()"
                    class="px-3 py-1 bg-veltrix-bg border border-veltrix-border rounded text-veltrix-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-veltrix-card transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
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
export class IncidentsComponent implements OnInit {
  readonly Math = Math;
  private apiService = inject(ApiService);

  // Filter state
  searchQuery = '';
  selectedType = '';
  selectedSubtype = '';
  selectedStatus = '';
  dateFrom = '';
  dateTo = '';

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(15);

  // Data
  private incidents = signal<Incident[]>([]);

  ngOnInit(): void {
    this.loadIncidents();
  }

  private loadIncidents(): void {
    this.apiService.incidents$.subscribe(incidents => {
      this.incidents.set(incidents || []);
    });
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }

  readonly stats = computed(() => {
    const all = this.incidents();
    const active = all.filter(i => i.isActive).length;
    const last = all[0]?.timestamp;
    return {
      total: all.length,
      active,
      lastDate: last ? this.formatDate(last) : 'N/A',
    };
  });

  readonly filteredIncidents = computed(() => {
    let result = this.incidents();

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(i =>
        i.street?.toLowerCase().includes(query) ||
        i.city?.toLowerCase().includes(query) ||
        i.subtype?.toLowerCase().includes(query)
      );
    }

    if (this.selectedType) {
      result = result.filter(i => i.type === this.selectedType);
    }

    if (this.selectedSubtype) {
      result = result.filter(i => i.subtype === this.selectedSubtype);
    }

    if (this.selectedStatus === 'active') {
      result = result.filter(i => i.isActive);
    } else if (this.selectedStatus === 'inactive') {
      result = result.filter(i => !i.isActive);
    }

    return result;
  });

  readonly totalPages = computed(() => Math.ceil(this.filteredIncidents().length / this.pageSize()));

  readonly paginatedIncidents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredIncidents().slice(start, start + this.pageSize());
  });

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedType = '';
    this.selectedSubtype = '';
    this.selectedStatus = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage.set(1);
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatSubtype(subtype: string | undefined): string {
    if (!subtype) return '-';
    return subtype.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ACCIDENT: 'Accidente',
      JAM: 'Congestión',
      HAZARD: 'Peligro',
      ROAD_CLOSED: 'Cierre',
      WEATHERHAZARD: 'Clima',
    };
    return labels[type] || type;
  }

  getTypeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      ACCIDENT: 'bg-veltrix-danger/20 text-veltrix-danger',
      JAM: 'bg-veltrix-warning/20 text-veltrix-warning',
      HAZARD: 'bg-orange-500/20 text-orange-500',
      ROAD_CLOSED: 'bg-veltrix-muted/20 text-veltrix-muted',
      WEATHERHAZARD: 'bg-blue-500/20 text-blue-500',
    };
    return classes[type] || 'bg-veltrix-muted/20 text-veltrix-muted';
  }
}

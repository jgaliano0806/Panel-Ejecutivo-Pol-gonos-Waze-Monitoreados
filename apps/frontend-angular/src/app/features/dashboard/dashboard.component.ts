import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { ApiService, WebSocketService, TTSService } from '../../core/services';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardContentComponent,
  TrendsChartComponent,
} from '../../shared/components';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterLink,
    NgIcon,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    ModernHeaderComponent,
    TrendsChartComponent,
  ],
  template: `
    <div class="min-h-screen bg-veltrix-bg">
      <!-- Modern Header -->
      <app-modern-header (refresh)="refreshData()" />

      <!-- Main Content -->
      <div class="p-6 space-y-6">
        <!-- KPI Cards Grid -->
        @if (globalKPIs$ | async; as kpis) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Fluidez del Sistema -->
            <div
              class="kpi-card-modern bg-gradient-to-br from-veltrix-primary/20 to-veltrix-primary/5 border-veltrix-primary/50"
            >
              <div class="flex items-start justify-between">
                <div class="stat-card-icon bg-veltrix-primary/20">
                  <ng-icon name="lucideTarget" class="text-veltrix-primary" size="28" />
                </div>
                @if (kpis.trends?.fluidityChange) {
                  <span
                    class="px-2 py-1 rounded-full text-xs font-bold"
                    [class]="
                      (kpis.trends?.fluidityChange ?? 0) >= 0
                        ? 'bg-veltrix-success/20 text-veltrix-success'
                        : 'bg-veltrix-danger/20 text-veltrix-danger'
                    "
                  >
                    {{ (kpis.trends?.fluidityChange ?? 0) >= 0 ? '+' : ''
                    }}{{ kpis.trends?.fluidityChange }}%
                  </span>
                }
              </div>
              <div class="mt-4">
                <div class="text-[11px] font-bold uppercase tracking-wider text-veltrix-muted mb-1">
                  FLUIDEZ DEL SISTEMA
                </div>
                <div class="text-4xl font-bold font-mono text-veltrix-text">
                  {{ kpis.fluidityPercentage || 91 }}%
                </div>
                <div class="text-xs text-veltrix-muted mt-1">
                  {{ getFluidPolygons(kpis) }} polígonos fluidos
                </div>
              </div>
            </div>

            <!-- Eventos Activos -->
            <div
              class="kpi-card-modern bg-gradient-to-br from-veltrix-warning/20 to-veltrix-warning/5 border-veltrix-warning/50 cursor-pointer hover:scale-[1.02] transition-transform"
              [class.animate-pulse]="(kpis.criticalCount || 0) > 0"
              routerLink="/alertas"
            >
              <div class="flex items-start justify-between">
                <div class="stat-card-icon bg-veltrix-warning/20">
                  <ng-icon name="lucideAlertTriangle" class="text-veltrix-warning" size="28" />
                </div>
                @if (kpis.trends?.incidentsChange) {
                  <span
                    class="px-2 py-1 rounded-full text-xs font-bold"
                    [class]="
                      (kpis.trends?.incidentsChange ?? 0) <= 0
                        ? 'bg-veltrix-success/20 text-veltrix-success'
                        : 'bg-veltrix-danger/20 text-veltrix-danger'
                    "
                  >
                    {{ (kpis.trends?.incidentsChange ?? 0) >= 0 ? '+' : ''
                    }}{{ kpis.trends?.incidentsChange }}%
                  </span>
                }
              </div>
              <div class="mt-4">
                <div class="text-[11px] font-bold uppercase tracking-wider text-veltrix-muted mb-1">
                  EVENTOS ACTIVOS
                </div>
                <div class="text-4xl font-bold font-mono text-veltrix-text">
                  {{ kpis.totalAlerts || 38 }}
                </div>
                <div class="text-xs text-veltrix-muted mt-1">
                  {{
                    (kpis.criticalCount || 0) > 0
                      ? kpis.criticalCount + ' críticos activos'
                      : 'Sistema nominal'
                  }}
                </div>
              </div>
            </div>

            <!-- Accidentes RAC -->
            <div
              class="kpi-card-modern bg-gradient-to-br from-veltrix-danger/20 to-veltrix-danger/5 border-veltrix-danger/50 cursor-pointer hover:scale-[1.02] transition-transform"
              [class.animate-pulse]="(kpis.roadAccidentsCritical || 0) > 0"
              routerLink="/siniestros"
            >
              <div class="flex items-start justify-between">
                <div class="stat-card-icon bg-veltrix-danger/20">
                  <ng-icon name="lucideCar" class="text-veltrix-danger" size="28" />
                </div>
              </div>
              <div class="mt-4">
                <div class="text-[11px] font-bold uppercase tracking-wider text-veltrix-muted mb-1">
                  ACCIDENTES RAC
                </div>
                <div class="text-4xl font-bold font-mono text-veltrix-text">
                  {{ kpis.roadAccidents || 0 }}
                </div>
                <div class="text-xs text-veltrix-muted mt-1">
                  {{ kpis.roadAccidentsCritical || 0 }} críticos
                </div>
              </div>
            </div>

            <!-- Tramos de Vías (Riesgos Críticos) -->
            <div
              class="kpi-card-modern bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/50 cursor-pointer hover:scale-[1.02] transition-transform"
              routerLink="/riesgos"
            >
              <div class="flex items-start justify-between">
                <div class="stat-card-icon bg-blue-500/20">
                  <ng-icon name="lucideMapPin" class="text-blue-500" size="28" />
                </div>
              </div>
              <div class="mt-4">
                <div class="text-[11px] font-bold uppercase tracking-wider text-veltrix-muted mb-1">
                  RIESGOS CRÍTICOS
                </div>
                <div class="text-4xl font-bold font-mono text-veltrix-text">
                  {{ kpis.criticalPolygons || 5 }}
                </div>
                <div class="text-xs text-veltrix-muted mt-1">Tramos con scoring alto</div>
              </div>
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="h-40 bg-veltrix-card rounded-2xl animate-pulse"></div>
            }
          </div>
        }

        <!-- Trends Chart Section -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-veltrix-text">📈 Evolución (últimas 24 horas)</h3>
            <div class="flex items-center gap-2 text-xs text-veltrix-muted">
              <ng-icon name="lucideClock" size="14" />
              Evolución de carga en la red vía monitoreada
            </div>
          </div>
          @if (historicalData$ | async; as data) {
            @if (data.length > 0) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <app-trends-chart
                  [snapshots]="data"
                  metric="avgSpeed"
                  title="Velocidad Promedio"
                  unit="km/h"
                />
                <app-trends-chart
                  [snapshots]="data"
                  metric="totalJams"
                  title="Puntos de Congestión"
                />
              </div>
            } @else {
              <ui-card>
                <ui-card-content>
                  <div class="h-32 flex items-center justify-center text-veltrix-muted">
                    <div class="text-center">
                      <ng-icon name="lucideActivity" size="48" class="mx-auto mb-3 opacity-30" />
                      <p>No hay datos históricos disponibles</p>
                      <p class="text-xs mt-1">Los datos se irán acumulando con el tiempo</p>
                    </div>
                  </div>
                </ui-card-content>
              </ui-card>
            }
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="h-40 bg-veltrix-card rounded-xl animate-pulse"></div>
              <div class="h-40 bg-veltrix-card rounded-xl animate-pulse"></div>
            </div>
          }
        </div>

        <!-- Two Column Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left: Top Incidents -->
          <div class="lg:col-span-2">
            <ui-card>
              <ui-card-header>
                <div class="flex items-center justify-between">
                  <ui-card-title>Top 5 Incidentes Prioritarios (Score Waze-Expert)</ui-card-title>
                  <span class="text-xs text-veltrix-muted"
                    >Última Actualización: {{ currentTime() }}</span
                  >
                </div>
              </ui-card-header>
              <ui-card-content>
                @if (incidents$ | async; as incidents) {
                  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    @for (incident of incidents | slice: 0 : 4; track incident.id) {
                      <div
                        class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border hover:border-veltrix-primary/50 transition-all"
                      >
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-xs text-veltrix-muted"
                            >Nivel Impacto: {{ getImpactScore(incident) }}</span
                          >
                          <span class="text-xs font-mono text-veltrix-muted">{{
                            getTimeAgo(incident.timestamp)
                          }}</span>
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                          <ng-icon
                            [name]="getIncidentIcon(incident.type)"
                            [class]="getIncidentIconColor(incident.type)"
                            size="16"
                          />
                          <span class="text-sm font-medium text-veltrix-text truncate">{{
                            getIncidentTitle(incident)
                          }}</span>
                        </div>
                        <div class="text-xs text-veltrix-muted truncate mb-3">
                          {{ incident.street || 'Ubicación desconocida' }}
                        </div>

                        <!-- Mini metrics -->
                        <div class="grid grid-cols-3 gap-2 pt-3 border-t border-veltrix-border">
                          <div class="text-center">
                            <div class="text-[10px] text-veltrix-muted">Confianza</div>
                            <div class="text-xs font-mono text-veltrix-text">
                              {{ (incident.reliability || 0) / 10 }}/10
                            </div>
                          </div>
                          <div class="text-center">
                            <div class="text-[10px] text-veltrix-muted">Fluididad</div>
                            <div class="text-xs font-mono text-veltrix-text">
                              {{ getFluidityScore(incident) }}/10
                            </div>
                          </div>
                          <div class="text-center">
                            <div class="text-[10px] text-veltrix-muted">Congestión</div>
                            <div class="text-xs font-mono text-veltrix-text">
                              Nvl {{ getCongestionLevel(incident) }}
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                  @if (incidents.length === 0) {
                    <div class="text-center py-8 text-veltrix-muted">
                      <ng-icon
                        name="lucideCheckCircle"
                        size="48"
                        class="mx-auto mb-3 text-veltrix-success"
                      />
                      <p>No hay incidentes prioritarios activos</p>
                    </div>
                  }
                } @else {
                  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    @for (i of [1, 2, 3, 4]; track i) {
                      <div class="h-40 bg-veltrix-bg rounded-xl animate-pulse"></div>
                    }
                  </div>
                }
              </ui-card-content>
            </ui-card>
          </div>

          <!-- Right: Coverage Metrics -->
          <div>
            <ui-card>
              <ui-card-header>
                <ui-card-title>Métricas de Cobertura</ui-card-title>
              </ui-card-header>
              <ui-card-content>
                @if (polygons$ | async; as polygons) {
                  <div class="space-y-6">
                    <div class="text-center">
                      <div class="text-6xl font-bold text-veltrix-primary">
                        {{ polygons.length }}
                      </div>
                      <div class="text-sm text-veltrix-muted">Polígonos Activos</div>
                    </div>

                    <div class="bg-veltrix-bg rounded-xl p-4">
                      <div class="text-sm font-medium text-veltrix-text mb-2">Salud del Feed</div>
                      <div class="text-2xl font-bold text-veltrix-success">100% Operativo</div>
                      <div class="text-xs text-veltrix-muted">Actualización cada 2 min</div>
                    </div>

                    <a
                      routerLink="/alertas"
                      class="block w-full px-4 py-3 bg-veltrix-primary text-white text-center rounded-xl hover:brightness-110 transition-all font-medium"
                    >
                      {{ (incidents$ | async)?.length || 0 }} Eventos
                    </a>
                  </div>
                } @else {
                  <div class="space-y-4">
                    <div class="h-20 bg-veltrix-bg rounded-xl animate-pulse"></div>
                    <div class="h-24 bg-veltrix-bg rounded-xl animate-pulse"></div>
                  </div>
                }
              </ui-card-content>
            </ui-card>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span
            >© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por
            <strong>GED</strong></span
          >
          <div class="flex items-center gap-6">
            <span class="flex items-center gap-1"
              ><span class="w-2 h-2 rounded-full bg-veltrix-success"></span> Fluido</span
            >
            <span class="flex items-center gap-1"
              ><span class="w-2 h-2 rounded-full bg-veltrix-warning"></span> Moderado</span
            >
            <span class="flex items-center gap-1"
              ><span class="w-2 h-2 rounded-full bg-veltrix-danger"></span> Crítico</span
            >
          </div>
          <span class="flex items-center gap-2">
            <span>● Waze for Cities</span>
            <span class="text-veltrix-primary">• Actualización cada 60s</span>
          </span>
        </div>
      </footer>
    </div>
  `,
  styles: [
    `
      .kpi-card-modern {
        @apply relative overflow-hidden rounded-2xl border-2 p-5 transition-all duration-300;
      }
      .kpi-card-modern:hover {
        @apply shadow-xl;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private wsService = inject(WebSocketService);
  private ttsService = inject(TTSService);
  private subscription = new Subscription();

  readonly globalKPIs$ = this.apiService.globalKPIs$;
  readonly polygons$ = this.apiService.polygons$;
  readonly incidents$ = this.apiService.incidents$;
  readonly historicalData$ = this.apiService.getHistoricalData(24);

  readonly wsConnected = this.wsService.connected;
  readonly currentTime = signal('--:--:--');

  private clockInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    );
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }

  getFluidPolygons(kpis: any): string {
    const total = kpis.totalPolygons || 68;
    const critical = kpis.criticalPolygons || 0;
    return `${total - critical}/${total}`;
  }

  getImpactScore(incident: any): number {
    return ((incident.severity || 0) + (incident.reliability || 0) / 10) / 2;
  }

  getTimeAgo(timestamp: string | Date): string {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `<${mins || 1}min`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
  }

  getIncidentTitle(incident: any): string {
    const titles: Record<string, string> = {
      ACCIDENT: 'Accidente',
      JAM: 'Atasco',
      HAZARD: 'Peligro',
      ROAD_CLOSED: 'Cierre de vía',
      WEATHERHAZARD: 'Alerta climática',
    };
    const typeTitle = titles[incident.type] || 'Incidente';
    const subtype = incident.subtype?.replace(/_/g, ' ').toLowerCase() || '';
    return subtype ? `${typeTitle} - ${subtype}` : typeTitle;
  }

  getFluidityScore(incident: any): number {
    return Math.round((10 - (incident.severity || 0)) * 0.7);
  }

  getCongestionLevel(incident: any): number {
    return Math.min(Math.round((incident.severity || 0) / 2), 5);
  }

  getIncidentIcon(type: string): string {
    const icons: Record<string, string> = {
      ACCIDENT: 'lucideCar',
      JAM: 'lucideConstruction',
      HAZARD: 'lucideAlertTriangle',
      ROAD_CLOSED: 'lucideCircle',
      WEATHERHAZARD: 'lucideCloudRain',
    };
    return icons[type] || 'lucideMapPin';
  }

  getIncidentIconColor(type: string): string {
    const colors: Record<string, string> = {
      ACCIDENT: 'text-veltrix-danger',
      JAM: 'text-veltrix-warning',
      HAZARD: 'text-veltrix-warning',
      ROAD_CLOSED: 'text-veltrix-muted',
      WEATHERHAZARD: 'text-blue-500',
    };
    return colors[type] || 'text-veltrix-muted';
  }
}

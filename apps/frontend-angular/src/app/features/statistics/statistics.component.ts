import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { ApiService, Polygon, Incident, TrafficJam } from '../../core/services';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardContentComponent,
} from '../../shared/components';

type TabType = 'live' | 'historical';
type PeriodType = 'daily' | 'weekly' | 'monthly';

interface StatsData {
  avgFluidity: number;
  avgSpeed: number;
  totalIncidents: number;
  criticalIncidents: number;
  totalJams: number;
  avgJamDuration: number;
}

interface OperationalAlert {
  id: string;
  type: string;
  message: string;
  polygon: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface PotholeCluster {
  id: string;
  street: string;
  city: string;
  count: number;
  avgConfidence: number;
}

@Component({
  selector: 'app-statistics',
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
    BaseChartDirective,
  ],
  template: `
    <div class="min-h-screen bg-veltrix-bg">
      <!-- Header -->
      <app-modern-header (refresh)="refreshData()" />

      <!-- Main Content -->
      <div class="max-w-[1600px] mx-auto p-6 space-y-6">
        <!-- Page Title + Tabs -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-veltrix-text">Estadísticas y Análisis</h1>
            <p class="text-sm text-veltrix-muted">Métricas operativas y análisis histórico</p>
          </div>

          <!-- Tab Selector -->
          <div class="flex space-x-1 bg-veltrix-card p-1 rounded-lg border border-veltrix-border">
            <button
              (click)="activeTab.set('live')"
              class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              [class]="activeTab() === 'live'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-veltrix-muted hover:bg-veltrix-bg'"
            >
              <ng-icon name="lucideActivity" size="16" />
              <span>Operativo en Vivo</span>
            </button>
            <button
              (click)="activeTab.set('historical')"
              class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              [class]="activeTab() === 'historical'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-veltrix-muted hover:bg-veltrix-bg'"
            >
              <ng-icon name="lucideHistory" size="16" />
              <span>Histórico</span>
            </button>
          </div>
        </div>

        <!-- Live Operations Tab -->
        @if (activeTab() === 'live') {
          <div class="space-y-6 animate-in fade-in duration-300">
            <!-- Header & Stats Bar -->
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-3 bg-white/20 rounded-xl">
                    <ng-icon name="lucideRadio" size="24" />
                  </div>
                  <div>
                    <h2 class="text-xl font-bold">Centro de Control Operativo</h2>
                    <p class="text-white/70 text-sm">Monitoreo Inteligente de Waze v2.0</p>
                  </div>
                </div>
                <div class="flex items-center gap-6">
                  <div class="text-right">
                    <div class="text-white/70 text-xs">Última actualización</div>
                    <div class="font-mono text-sm">{{ lastUpdate | date:'HH:mm:ss' }}</div>
                  </div>
                  <div class="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                    <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    {{ totalActiveEvents() }} eventos activos
                  </div>
                  <button (click)="refreshData()" class="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                    <ng-icon name="lucideRefreshCw" size="18" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Critical Alerts -->
            @if (operationalAlerts().length > 0) {
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-red-500">
                  <ng-icon name="lucideAlertCircle" size="18" />
                  <span class="font-medium">Alertas Críticas</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (alert of operationalAlerts(); track alert.id) {
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div class="flex items-start gap-3">
                        <div class="p-2 bg-red-500/20 rounded-lg">
                          <ng-icon name="lucideAlertTriangle" class="text-red-500" size="16" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">CRÍTICO</span>
                            <span class="text-xs text-red-600 dark:text-red-400">{{ alert.polygon }}</span>
                          </div>
                          <p class="text-sm text-red-700 dark:text-red-300 mt-1 truncate">{{ alert.message }}</p>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Top Critical Incidents -->
            <ui-card>
              <ui-card-header>
                <div class="flex items-center gap-2">
                  <ng-icon name="lucideZap" class="text-amber-500" size="18" />
                  <ui-card-title>Top Incidentes Críticos</ui-card-title>
                </div>
              </ui-card-header>
              <ui-card-content>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  @for (incident of topCriticalIncidents(); track incident.id) {
                    <div class="bg-veltrix-bg rounded-xl p-4 border border-veltrix-border">
                      <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-0.5 text-xs font-bold rounded"
                              [class]="getScoreClass(incident.score || 0)">
                          {{ incident.score || 0 }}
                        </span>
                        <span class="text-[10px] text-veltrix-muted font-mono uppercase">
                          {{ (incident.id || '').substring(0, 8) }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2 mb-2">
                        <ng-icon name="lucideAlertTriangle" [class]="getScoreTextClass(incident.score || 0)" size="14" />
                        <span class="text-xs text-veltrix-muted truncate">{{ incident.description || 'Sin descripción' }}</span>
                      </div>
                      <div class="text-sm font-medium text-veltrix-text truncate">{{ incident.street || 'Sin ubicación' }}</div>
                      <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-veltrix-border">
                        <div class="text-center">
                          <div class="text-[10px] text-veltrix-muted">Conf.</div>
                          <div class="text-xs font-mono text-blue-500">{{ incident.confidence || 0 }}</div>
                        </div>
                        <div class="text-center">
                          <div class="text-[10px] text-veltrix-muted">Fiab.</div>
                          <div class="text-xs font-mono text-green-500">{{ incident.reliability || 0 }}</div>
                        </div>
                        <div class="text-center">
                          <div class="text-[10px] text-veltrix-muted">Cong.</div>
                          <div class="text-xs font-mono text-orange-500">{{ getRandomLevel() }}</div>
                        </div>
                      </div>
                    </div>
                  } @empty {
                    <div class="col-span-full text-center py-8 text-veltrix-muted">
                      <ng-icon name="lucideCheckCircle" size="32" class="mx-auto mb-2 text-green-500" />
                      <p>No hay incidentes críticos</p>
                    </div>
                  }
                </div>
              </ui-card-content>
            </ui-card>

            <!-- Pothole Planning Table -->
            <ui-card>
              <ui-card-header>
                <div class="flex items-center gap-2">
                  <ng-icon name="lucideCircleDot" class="text-orange-500" size="18" />
                  <ui-card-title>Planificación de Bacheo (Clusters)</ui-card-title>
                </div>
              </ui-card-header>
              <ui-card-content>
                <div class="overflow-x-auto">
                  <table class="data-table w-full">
                    <thead>
                      <tr>
                        <th>Calle / Zona</th>
                        <th>Ciudad</th>
                        <th class="text-center">Cant. Reportes</th>
                        <th>Confianza Prom.</th>
                        <th>Acción Sugerida</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (cluster of potholeClusters(); track cluster.id) {
                        <tr>
                          <td class="font-medium text-veltrix-text">{{ cluster.street }}</td>
                          <td class="text-veltrix-muted">{{ cluster.city }}</td>
                          <td class="text-center">
                            <span class="px-2 py-1 bg-veltrix-bg rounded-full text-xs font-medium text-veltrix-text">
                              {{ cluster.count }}
                            </span>
                          </td>
                          <td>
                            <div class="flex items-center gap-2">
                              <div class="w-16 h-2 bg-veltrix-bg rounded-full overflow-hidden">
                                <div class="h-full bg-blue-500 rounded-full" [style.width.%]="cluster.avgConfidence * 10"></div>
                              </div>
                              <span class="text-xs text-veltrix-muted">{{ cluster.avgConfidence.toFixed(1) }}</span>
                            </div>
                          </td>
                          <td>
                            <span class="px-2 py-1 text-xs rounded font-medium"
                                  [class]="cluster.count >= 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'">
                              {{ cluster.count >= 5 ? 'Prioridad Alta' : 'Programar' }}
                            </span>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="5" class="text-center py-8 text-veltrix-muted">
                            No hay zonas de bacheo críticas identificadas
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </ui-card-content>
            </ui-card>

            <!-- Coverage Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div class="flex items-center gap-3">
                  <div class="p-3 bg-blue-500/20 rounded-xl">
                    <ng-icon name="lucideMap" class="text-blue-500" size="24" />
                  </div>
                  <div>
                    <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">{{ polygons().length }}</div>
                    <div class="text-sm text-blue-600 dark:text-blue-400">Polígonos Activos</div>
                  </div>
                </div>
              </div>
              <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div class="flex items-center gap-3">
                  <div class="p-3 bg-green-500/20 rounded-xl">
                    <ng-icon name="lucideWifi" class="text-green-500" size="24" />
                  </div>
                  <div>
                    <div class="text-2xl font-bold text-green-700 dark:text-green-300">100%</div>
                    <div class="text-sm text-green-600 dark:text-green-400">Feed Health Operativo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Historical Tab -->
        @if (activeTab() === 'historical') {
          <div class="space-y-6 animate-in fade-in duration-300">
            <!-- Controls: Period + Date Range -->
            <div class="flex items-center gap-4">
              <select
                [(ngModel)]="period"
                (ngModelChange)="updateChartData()"
                class="px-4 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
              <input
                type="date"
                [(ngModel)]="dateFrom"
                (ngModelChange)="updateChartData()"
                class="px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              />
              <span class="text-veltrix-muted">a</span>
              <input
                type="date"
                [(ngModel)]="dateTo"
                (ngModelChange)="updateChartData()"
                class="px-3 py-2 bg-veltrix-card border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
              />
            </div>

            <!-- KPI Cards with Trends -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <!-- Fluidity -->
              <div class="bg-veltrix-card rounded-lg shadow-sm p-4 border border-veltrix-border">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-veltrix-muted">Fluidez Promedio</span>
                  <span class="flex items-center gap-1 text-xs text-green-500">
                    <ng-icon name="lucideTrendingUp" size="12" />
                    +2.5%
                  </span>
                </div>
                <div class="text-2xl font-bold text-veltrix-text">{{ currentStats().avgFluidity.toFixed(1) }}%</div>
              </div>

              <!-- Speed -->
              <div class="bg-veltrix-card rounded-lg shadow-sm p-4 border border-veltrix-border">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-veltrix-muted">Velocidad Promedio</span>
                  <span class="flex items-center gap-1 text-xs text-red-500">
                    <ng-icon name="lucideTrendingDown" size="12" />
                    -1.2%
                  </span>
                </div>
                <div class="text-2xl font-bold text-veltrix-text">{{ currentStats().avgSpeed.toFixed(0) }} km/h</div>
              </div>

              <!-- Incidents -->
              <div class="bg-veltrix-card rounded-lg shadow-sm p-4 border border-veltrix-border">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-veltrix-muted">Total Incidentes</span>
                </div>
                <div class="text-2xl font-bold text-veltrix-text">{{ currentStats().totalIncidents }}</div>
                <div class="text-xs text-veltrix-muted mt-1">{{ currentStats().criticalIncidents }} críticos</div>
              </div>

              <!-- Jams -->
              <div class="bg-veltrix-card rounded-lg shadow-sm p-4 border border-veltrix-border">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-veltrix-muted">Total Congestiones</span>
                </div>
                <div class="text-2xl font-bold text-veltrix-text">{{ currentStats().totalJams }}</div>
                <div class="text-xs text-veltrix-muted mt-1">{{ currentStats().avgJamDuration.toFixed(0) }} min promedio</div>
              </div>
            </div>

            <!-- Charts Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Fluidity Chart -->
              <ui-card>
                <ui-card-header>
                  <div class="flex items-center gap-2">
                    <ng-icon name="lucideBarChart3" class="text-blue-600" size="18" />
                    <ui-card-title>Tendencia de Fluidez</ui-card-title>
                  </div>
                </ui-card-header>
                <ui-card-content>
                  <div class="h-[300px]">
                    <canvas baseChart
                      [data]="fluidityChartData"
                      [options]="lineChartOptions"
                      [type]="'line'">
                    </canvas>
                  </div>
                </ui-card-content>
              </ui-card>

              <!-- Speed Chart -->
              <ui-card>
                <ui-card-header>
                  <div class="flex items-center gap-2">
                    <ng-icon name="lucideBarChart3" class="text-green-600" size="18" />
                    <ui-card-title>Velocidad Promedio</ui-card-title>
                  </div>
                </ui-card-header>
                <ui-card-content>
                  <div class="h-[300px]">
                    <canvas baseChart
                      [data]="speedChartData"
                      [options]="lineChartOptions"
                      [type]="'line'">
                    </canvas>
                  </div>
                </ui-card-content>
              </ui-card>

              <!-- Incidents & Jams Chart (full width) -->
              <ui-card class="lg:col-span-2">
                <ui-card-header>
                  <div class="flex items-center gap-2">
                    <ng-icon name="lucideCalendar" class="text-red-600" size="18" />
                    <ui-card-title>Incidentes y Congestiones</ui-card-title>
                  </div>
                </ui-card-header>
                <ui-card-content>
                  <div class="h-[300px]">
                    <canvas baseChart
                      [data]="incidentsJamsChartData"
                      [options]="barChartOptions"
                      [type]="'bar'">
                    </canvas>
                  </div>
                </ui-card-content>
              </ui-card>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3 mt-6">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span>© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por <strong>GED</strong></span>
          <div class="flex items-center gap-6">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> Fluidez</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span> Velocidad</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span> Incidentes</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> Congestiones</span>
          </div>
          <span class="flex items-center gap-2">
            <span>● Waze for Cities</span>
            <span class="text-veltrix-primary">• Stats Module</span>
          </span>
        </div>
      </footer>
    </div>
  `,
})
export class StatisticsComponent implements OnInit {
  private apiService = inject(ApiService);

  // Tab state
  readonly activeTab = signal<TabType>('live');

  // Historical controls
  period: PeriodType = 'daily';
  dateFrom = '';
  dateTo = '';

  // Data
  readonly polygons = signal<Polygon[]>([]);
  readonly incidents = signal<Incident[]>([]);
  readonly jams = signal<TrafficJam[]>([]);
  lastUpdate = new Date();

  // Chart configurations
  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: { size: 11 }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: '#9ca3af', font: { size: 10 } }
      },
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: '#9ca3af', font: { size: 10 } }
      }
    }
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: { size: 11 }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: '#9ca3af', font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: '#9ca3af', font: { size: 10 } }
      }
    }
  };

  // Chart data
  fluidityChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Fluidez %',
      data: [],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  speedChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Velocidad km/h',
      data: [],
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  incidentsJamsChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        label: 'Incidentes',
        data: [],
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      },
      {
        label: 'Congestiones',
        data: [],
        backgroundColor: 'rgba(251, 146, 60, 0.7)',
        borderColor: 'rgb(251, 146, 60)',
        borderWidth: 1
      }
    ]
  };

  ngOnInit(): void {
    // Set default dates
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.dateTo = now.toISOString().split('T')[0];
    this.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

    // Subscribe to data
    this.apiService.polygons$.subscribe(data => this.polygons.set(data || []));
    this.apiService.incidents$.subscribe(data => {
      this.incidents.set(data || []);
      this.lastUpdate = new Date();
      this.updateChartData();
    });
    this.apiService.jams$.subscribe(data => {
      this.jams.set(data || []);
      this.updateChartData();
    });

    // Initial chart data
    this.updateChartData();
  }

  refreshData(): void {
    this.apiService.refreshAll();
    this.lastUpdate = new Date();
  }

  updateChartData(): void {
    // Generate labels based on period
    const labels = this.generateLabels();

    // Generate mock data for charts (in real app, this would come from API)
    const fluidityData = this.generateMockData(labels.length, 70, 90);
    const speedData = this.generateMockData(labels.length, 50, 75);
    const incidentsData = this.generateMockIntData(labels.length, 5, 25);
    const jamsData = this.generateMockIntData(labels.length, 10, 40);

    // Update fluidity chart
    this.fluidityChartData = {
      ...this.fluidityChartData,
      labels,
      datasets: [{
        ...this.fluidityChartData.datasets[0],
        data: fluidityData
      }]
    };

    // Update speed chart
    this.speedChartData = {
      ...this.speedChartData,
      labels,
      datasets: [{
        ...this.speedChartData.datasets[0],
        data: speedData
      }]
    };

    // Update incidents/jams chart
    this.incidentsJamsChartData = {
      ...this.incidentsJamsChartData,
      labels,
      datasets: [
        { ...this.incidentsJamsChartData.datasets[0], data: incidentsData },
        { ...this.incidentsJamsChartData.datasets[1], data: jamsData }
      ]
    };
  }

  private generateLabels(): string[] {
    const labels: string[] = [];
    const now = new Date();

    if (this.period === 'daily') {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        labels.push(date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }));
      }
    } else if (this.period === 'weekly') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        labels.push(`Sem ${52 - i}`);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(date.toLocaleDateString('es-AR', { month: 'short' }));
      }
    }

    return labels;
  }

  private generateMockData(length: number, min: number, max: number): number[] {
    return Array.from({ length }, () =>
      Math.round((min + Math.random() * (max - min)) * 10) / 10
    );
  }

  private generateMockIntData(length: number, min: number, max: number): number[] {
    return Array.from({ length }, () =>
      Math.floor(min + Math.random() * (max - min))
    );
  }

  readonly totalActiveEvents = computed(() => {
    return this.incidents().length + this.jams().length;
  });

  readonly operationalAlerts = signal<OperationalAlert[]>([]);

  readonly topCriticalIncidents = () => {
    return this.incidents()
      .filter(i => i.type === 'ACCIDENT' || (i.severity && i.severity >= 3))
      .slice(0, 10)
      .map(i => ({
        ...i,
        score: Math.floor(60 + Math.random() * 40),
        confidence: i.confidence || Math.floor(5 + Math.random() * 5),
      }));
  };

  readonly potholeClusters = signal<PotholeCluster[]>([
    { id: '1', street: 'Av. Circunvalación', city: 'Córdoba', count: 8, avgConfidence: 7.5 },
    { id: '2', street: 'RN 20 km 15', city: 'Villa Carlos Paz', count: 5, avgConfidence: 6.2 },
    { id: '3', street: 'RP E73', city: 'Unquillo', count: 3, avgConfidence: 8.1 },
  ]);

  readonly currentStats = signal<StatsData>({
    avgFluidity: 78.5,
    avgSpeed: 62,
    totalIncidents: 145,
    criticalIncidents: 12,
    totalJams: 89,
    avgJamDuration: 4.5,
  });

  getScoreClass(score: number): string {
    if (score >= 80) return 'bg-red-500 text-white';
    if (score >= 60) return 'bg-orange-500 text-white';
    if (score >= 40) return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  }

  getScoreTextClass(score: number): string {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-orange-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  }

  getRandomLevel(): number {
    return Math.floor(Math.random() * 5);
  }
}

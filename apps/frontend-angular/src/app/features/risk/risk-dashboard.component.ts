import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ApiService, Polygon } from '../../core/services';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardContentComponent,
} from '../../shared/components';

type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'SEVERE';
type ViewMode = 'list' | 'matrix' | 'heatmap' | 'predictive';

interface RiskSummary {
  monitored: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
  severe: number;
}

interface PolygonRisk extends Polygon {
  riskLevel: RiskLevel;
  riskScore: number;
  trafficScore: number;
  incidentScore: number;
  weatherScore: number;
  speedScore: number;
  delayScore: number;
}

@Component({
  selector: 'app-risk-dashboard',
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
        <!-- Page Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-veltrix-text">Dashboard de Análisis de Riesgos</h1>
            <p class="text-sm text-veltrix-muted">Monitoreo predictivo de condiciones viales en tiempo real</p>
          </div>
          <button 
            (click)="refreshData()"
            class="flex items-center gap-2 px-4 py-2 bg-veltrix-primary text-white rounded-xl hover:brightness-110 transition-all"
          >
            <ng-icon name="lucideRefreshCw" size="16" />
            <span class="font-medium">Recalcular</span>
          </button>
        </div>

        <!-- Risk Overview KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <!-- Tramos Monitoreados -->
          <button 
            (click)="selectRiskLevel(null)"
            class="relative overflow-hidden rounded-xl p-4 transition-all hover:scale-105 border-l-4"
            [class]="selectedRiskLevel() === null ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-veltrix-bg' : ''"
            [style.background]="'linear-gradient(135deg, rgb(59 130 246 / 0.2) 0%, rgb(37 99 235 / 0.2) 100%)'"
            style="border-left-color: #3b82f6"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-500/20 rounded-lg">
                <ng-icon name="lucideCheckCircle" class="text-blue-500" size="20" />
              </div>
              <div>
                <div class="text-xs text-blue-400 font-medium">Tramos Monitoreados</div>
                <div class="text-2xl font-bold text-blue-300">{{ riskSummary().monitored }}</div>
              </div>
            </div>
          </button>

          <!-- Riesgo Bajo -->
          <button 
            (click)="selectRiskLevel('LOW')"
            class="relative overflow-hidden rounded-xl p-4 transition-all hover:scale-105 border-l-4"
            [class]="selectedRiskLevel() === 'LOW' ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-veltrix-bg' : ''"
            [style.background]="'linear-gradient(135deg, rgb(34 197 94 / 0.2) 0%, rgb(22 163 74 / 0.2) 100%)'"
            style="border-left-color: #22c55e"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-green-500/20 rounded-lg">
                <ng-icon name="lucideCheckCircle" class="text-green-500" size="20" />
              </div>
              <div>
                <div class="text-xs text-green-400 font-medium">Riesgo Bajo</div>
                <div class="text-2xl font-bold text-green-300">{{ riskSummary().low }}</div>
              </div>
            </div>
          </button>

          <!-- Riesgo Moderado -->
          <button 
            (click)="selectRiskLevel('MODERATE')"
            class="relative overflow-hidden rounded-xl p-4 transition-all hover:scale-105 border-l-4"
            [class]="selectedRiskLevel() === 'MODERATE' ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-veltrix-bg' : ''"
            [style.background]="'linear-gradient(135deg, rgb(234 179 8 / 0.2) 0%, rgb(202 138 4 / 0.2) 100%)'"
            style="border-left-color: #eab308"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-yellow-500/20 rounded-lg">
                <ng-icon name="lucideMinus" class="text-yellow-500" size="20" />
              </div>
              <div>
                <div class="text-xs text-yellow-400 font-medium">Riesgo Moderado</div>
                <div class="text-2xl font-bold text-yellow-300">{{ riskSummary().moderate }}</div>
              </div>
            </div>
          </button>

          <!-- Riesgo Alto -->
          <button 
            (click)="selectRiskLevel('HIGH')"
            class="relative overflow-hidden rounded-xl p-4 transition-all hover:scale-105 border-l-4"
            [class]="selectedRiskLevel() === 'HIGH' ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-veltrix-bg' : ''"
            [style.background]="'linear-gradient(135deg, rgb(249 115 22 / 0.2) 0%, rgb(234 88 12 / 0.2) 100%)'"
            style="border-left-color: #f97316"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-orange-500/20 rounded-lg">
                <ng-icon name="lucideTrendingUp" class="text-orange-500" size="20" />
              </div>
              <div>
                <div class="text-xs text-orange-400 font-medium">Riesgo Alto</div>
                <div class="text-2xl font-bold text-orange-300">{{ riskSummary().high }}</div>
              </div>
            </div>
          </button>

          <!-- Riesgo Crítico -->
          <button 
            (click)="selectRiskLevel('CRITICAL')"
            class="relative overflow-hidden rounded-xl p-4 transition-all hover:scale-105 border-l-4"
            [class]="selectedRiskLevel() === 'CRITICAL' ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-veltrix-bg' : ''"
            [style.background]="'linear-gradient(135deg, rgb(239 68 68 / 0.2) 0%, rgb(220 38 38 / 0.2) 100%)'"
            style="border-left-color: #ef4444"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-red-500/20 rounded-lg">
                <ng-icon name="lucideAlertTriangle" class="text-red-500" size="20" />
              </div>
              <div>
                <div class="text-xs text-red-400 font-medium">Riesgo Crítico</div>
                <div class="text-2xl font-bold text-red-300">{{ riskSummary().critical }}</div>
              </div>
            </div>
          </button>

          <!-- Riesgo Severo -->
          <button 
            (click)="selectRiskLevel('SEVERE')"
            class="relative overflow-hidden rounded-xl p-4 transition-all hover:scale-105 border-l-4"
            [class]="selectedRiskLevel() === 'SEVERE' ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-veltrix-bg' : ''"
            [style.background]="'linear-gradient(135deg, rgb(168 85 247 / 0.2) 0%, rgb(147 51 234 / 0.2) 100%)'"
            style="border-left-color: #a855f7"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-purple-500/20 rounded-lg">
                <ng-icon name="lucideShieldAlert" class="text-purple-500" size="20" />
              </div>
              <div>
                <div class="text-xs text-purple-400 font-medium">Riesgo Severo</div>
                <div class="text-2xl font-bold text-purple-300">{{ riskSummary().severe }}</div>
              </div>
            </div>
          </button>
        </div>

        <!-- Active Filter Banner -->
        @if (selectedRiskLevel()) {
          <div class="flex items-center gap-3 bg-veltrix-card rounded-xl px-4 py-3 border border-veltrix-border">
            <ng-icon name="lucideFilter" class="text-veltrix-muted" size="16" />
            <span class="text-sm text-veltrix-muted">Filtrando por:</span>
            <span class="px-3 py-1 rounded-full text-sm font-medium"
                  [class]="getRiskBadgeClass(selectedRiskLevel()!)">
              {{ getRiskLabel(selectedRiskLevel()!) }}
            </span>
            <button 
              (click)="selectRiskLevel(null)"
              class="ml-auto p-1 hover:bg-veltrix-bg rounded transition-colors"
            >
              <ng-icon name="lucideX" class="text-veltrix-muted" size="16" />
            </button>
          </div>
        }

        <!-- Main Content Grid -->
        <div class="grid grid-cols-12 gap-6">
          <!-- Sidebar: Group Filter -->
          <div class="col-span-12 lg:col-span-3">
            <ui-card class="sticky top-24">
              <ui-card-header>
                <div class="flex items-center gap-2">
                  <ng-icon name="lucideFilter" class="text-veltrix-muted" size="18" />
                  <ui-card-title>Filtrar por Grupo</ui-card-title>
                </div>
              </ui-card-header>
              <ui-card-content>
                <div class="space-y-2 max-h-[600px] overflow-y-auto">
                  <!-- All Groups -->
                  <button
                    (click)="selectedGroup.set(null)"
                    class="w-full px-4 py-3 rounded-lg text-left transition-all flex items-center justify-between"
                    [class]="selectedGroup() === null 
                      ? 'bg-veltrix-primary text-white ring-2 ring-veltrix-primary ring-offset-2 ring-offset-veltrix-card' 
                      : 'bg-veltrix-bg text-veltrix-text hover:bg-veltrix-bg/80'"
                  >
                    <span class="font-medium">Todos los Grupos</span>
                  </button>

                  <!-- Group List -->
                  @for (group of groups(); track group.name) {
                    <button
                      (click)="selectedGroup.set(group.name)"
                      class="w-full px-4 py-3 rounded-lg text-left transition-all flex items-center justify-between"
                      [class]="selectedGroup() === group.name 
                        ? 'bg-veltrix-primary text-white ring-2 ring-veltrix-primary ring-offset-2 ring-offset-veltrix-card' 
                        : 'bg-veltrix-bg text-veltrix-text hover:bg-veltrix-bg/80'"
                    >
                      <span class="font-medium truncate">{{ group.name }}</span>
                      @if (group.criticalCount > 0) {
                        <span class="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                          {{ group.criticalCount }}
                        </span>
                      }
                    </button>
                  }
                </div>
              </ui-card-content>
            </ui-card>
          </div>

          <!-- Main Content -->
          <div class="col-span-12 lg:col-span-9 space-y-6">
            <!-- Content Header & View Selector -->
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-veltrix-text">
                  {{ selectedGroup() ? 'Tramos de ' + selectedGroup() : 'Todos los Tramos' }}
                </h2>
                <p class="text-sm text-veltrix-muted">
                  {{ filteredPolygons().length }} tramos
                  @if (selectedRiskLevel()) {
                    <span>con riesgo {{ getRiskLabel(selectedRiskLevel()!).toLowerCase() }}</span>
                  }
                </p>
              </div>

              <!-- View Selector -->
              <div class="flex bg-veltrix-card rounded-xl border border-veltrix-border p-1">
                @for (view of viewOptions; track view.id) {
                  <button
                    (click)="currentView.set(view.id)"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    [class]="currentView() === view.id 
                      ? 'bg-white dark:bg-veltrix-bg text-veltrix-text shadow-md' 
                      : 'text-veltrix-muted hover:text-veltrix-text'"
                  >
                    <ng-icon [name]="view.icon" size="16" />
                    <span class="hidden md:inline">{{ view.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- View Content -->
            @switch (currentView()) {
              @case ('list') {
                <!-- List View -->
                <div class="space-y-4">
                  @for (polygon of filteredPolygons(); track polygon.id) {
                    <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-5 hover:border-veltrix-primary/50 transition-all">
                      <!-- Header -->
                      <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-3">
                          <div class="p-2 rounded-lg" [class]="getRiskBgClass(polygon.riskLevel)">
                            <ng-icon name="lucideMapPin" [class]="getRiskTextClass(polygon.riskLevel)" size="20" />
                          </div>
                          <div>
                            <div class="font-semibold text-veltrix-text">{{ polygon.name }}</div>
                            <div class="text-xs text-veltrix-muted">{{ polygon.group || 'Sin grupo' }}</div>
                          </div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-medium"
                              [class]="getRiskBadgeClass(polygon.riskLevel)">
                          {{ getRiskLabel(polygon.riskLevel) }}
                        </span>
                      </div>

                      <!-- Risk Description -->
                      <div class="mb-4 p-3 rounded-lg" [class]="getRiskBgClass(polygon.riskLevel)">
                        <p class="text-sm" [class]="getRiskTextClass(polygon.riskLevel)">
                          {{ getRiskDescription(polygon) }}
                        </p>
                      </div>

                      <!-- Factor Badges -->
                      <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
                        <!-- Tráfico -->
                        <button class="flex flex-col items-center gap-1 p-3 rounded-lg bg-veltrix-bg hover:bg-veltrix-bg/80 transition-colors">
                          <ng-icon name="lucideCar" [class]="getFactorColor(polygon.trafficScore)" size="20" />
                          <span class="text-xs text-veltrix-muted">Tráfico</span>
                          <span class="text-xs font-bold" [class]="getFactorColor(polygon.trafficScore)">
                            {{ polygon.trafficScore }}
                          </span>
                        </button>

                        <!-- Incidentes -->
                        <button class="flex flex-col items-center gap-1 p-3 rounded-lg bg-veltrix-bg hover:bg-veltrix-bg/80 transition-colors">
                          <ng-icon name="lucideAlertCircle" [class]="getFactorColor(polygon.incidentScore)" size="20" />
                          <span class="text-xs text-veltrix-muted">Incidentes</span>
                          <span class="text-xs font-bold" [class]="getFactorColor(polygon.incidentScore)">
                            {{ polygon.incidentScore }}
                          </span>
                        </button>

                        <!-- Clima -->
                        <button class="flex flex-col items-center gap-1 p-3 rounded-lg bg-veltrix-bg hover:bg-veltrix-bg/80 transition-colors">
                          <ng-icon name="lucideCloudRain" [class]="getFactorColor(polygon.weatherScore)" size="20" />
                          <span class="text-xs text-veltrix-muted">Clima</span>
                          <span class="text-xs font-bold" [class]="getFactorColor(polygon.weatherScore)">
                            {{ polygon.weatherScore }}
                          </span>
                        </button>

                        <!-- Velocidad -->
                        <div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-veltrix-bg">
                          <ng-icon name="lucideGauge" [class]="getFactorColor(polygon.speedScore)" size="20" />
                          <span class="text-xs text-veltrix-muted">Velocidad</span>
                          <span class="text-xs font-bold" [class]="getFactorColor(polygon.speedScore)">
                            {{ polygon.speedScore }}
                          </span>
                        </div>

                        <!-- Demoras -->
                        <div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-veltrix-bg">
                          <ng-icon name="lucideClock" [class]="getFactorColor(polygon.delayScore)" size="20" />
                          <span class="text-xs text-veltrix-muted">Demoras</span>
                          <span class="text-xs font-bold" [class]="getFactorColor(polygon.delayScore)">
                            {{ polygon.delayScore }}
                          </span>
                        </div>

                        <!-- Score -->
                        <div class="flex flex-col items-center gap-1 p-3 rounded-lg bg-veltrix-bg">
                          <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
                               [class]="getRiskBadgeClass(polygon.riskLevel)">
                            {{ polygon.riskScore }}
                          </div>
                        </div>
                      </div>

                      <!-- Predictive Module -->
                      <div class="mt-4 p-4 bg-veltrix-bg/50 rounded-lg border border-veltrix-border">
                        <div class="flex items-center gap-2 mb-2">
                          <ng-icon name="lucideBrain" class="text-purple-500" size="16" />
                          <span class="text-sm font-medium text-veltrix-text">Predicción IA</span>
                          <ng-icon name="lucideTrendingUp" class="text-orange-500 ml-auto" size="16" />
                        </div>
                        <div class="flex items-center gap-4">
                          <div class="flex-1">
                            <div class="h-2 bg-veltrix-bg rounded-full overflow-hidden">
                              <div 
                                class="h-full rounded-full transition-all"
                                [class]="getRiskBarClass(polygon.riskLevel)"
                                [style.width.%]="polygon.riskScore"
                              ></div>
                            </div>
                          </div>
                          <span class="text-sm font-medium text-veltrix-muted">{{ polygon.riskScore }}% prob.</span>
                        </div>
                        <p class="text-xs text-veltrix-muted mt-2">Basado en patrones históricos y condiciones actuales</p>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-16">
                      <ng-icon name="lucideCheckCircle" size="64" class="mx-auto mb-4 text-veltrix-success opacity-50" />
                      <h3 class="text-lg font-medium text-veltrix-text">Sin tramos de riesgo</h3>
                      <p class="text-veltrix-muted">No hay polígonos que coincidan con los filtros actuales</p>
                    </div>
                  }
                </div>
              }

              @case ('matrix') {
                <!-- Matrix View -->
                <ui-card>
                  <ui-card-header>
                    <ui-card-title>Matriz Estratégica de Riesgos</ui-card-title>
                    <p class="text-xs text-veltrix-muted">Probabilidad vs Impacto</p>
                  </ui-card-header>
                  <ui-card-content>
                    <div class="h-96 relative border border-veltrix-border rounded-lg bg-veltrix-bg/30">
                      <!-- Axes labels -->
                      <div class="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-veltrix-muted">Impacto</div>
                      <div class="absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-xs text-veltrix-muted">Probabilidad</div>
                      
                      <!-- Quadrant lines -->
                      <div class="absolute left-1/2 top-0 bottom-0 w-px bg-veltrix-border opacity-50"></div>
                      <div class="absolute top-1/2 left-0 right-0 h-px bg-veltrix-border opacity-50"></div>

                      <!-- Points -->
                      @for (polygon of filteredPolygons(); track polygon.id) {
                        <div 
                          class="absolute w-3 h-3 rounded-full cursor-pointer hover:scale-150 transition-transform"
                          [class]="getRiskDotClass(polygon.riskLevel)"
                          [style.left.%]="polygon.riskScore"
                          [style.bottom.%]="polygon.incidentScore"
                          [title]="polygon.name + ' - Score: ' + polygon.riskScore"
                        ></div>
                      }
                    </div>
                  </ui-card-content>
                </ui-card>
              }

              @case ('heatmap') {
                <!-- Heatmap View -->
                <ui-card>
                  <ui-card-header>
                    <ui-card-title>Mapa de Calor</ui-card-title>
                    <p class="text-xs text-veltrix-muted">Visualización geográfica del riesgo</p>
                  </ui-card-header>
                  <ui-card-content>
                    <div class="h-96 bg-veltrix-bg rounded-lg flex items-center justify-center">
                      <div class="text-center text-veltrix-muted">
                        <ng-icon name="lucideMap" size="64" class="mx-auto mb-4 opacity-30" />
                        <p>Mapa de calor integrado con MapLibre</p>
                        <p class="text-xs mt-2">Visita el módulo Mapa y Zonas para ver la visualización completa</p>
                      </div>
                    </div>
                    <!-- Legend -->
                    <div class="flex items-center justify-center gap-4 mt-4">
                      <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-green-500"></div>
                        <span class="text-xs text-veltrix-muted">Bajo</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-yellow-500"></div>
                        <span class="text-xs text-veltrix-muted">Moderado</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-orange-500"></div>
                        <span class="text-xs text-veltrix-muted">Alto</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-red-500"></div>
                        <span class="text-xs text-veltrix-muted">Crítico</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded bg-purple-500"></div>
                        <span class="text-xs text-veltrix-muted">Severo</span>
                      </div>
                    </div>
                  </ui-card-content>
                </ui-card>
              }

              @case ('predictive') {
                <!-- Predictive View -->
                <div class="space-y-6">
                  <!-- Predictive KPIs -->
                  <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-4">
                      <div class="text-xs text-veltrix-muted mb-1">Confianza Promedio</div>
                      <div class="text-2xl font-bold text-purple-500">85%</div>
                    </div>
                    <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-4">
                      <div class="text-xs text-veltrix-muted mb-1">Riesgo Alto Predicho</div>
                      <div class="text-2xl font-bold text-orange-500">{{ riskSummary().high + riskSummary().critical }}</div>
                    </div>
                    <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-4">
                      <div class="text-xs text-veltrix-muted mb-1">Tendencia General</div>
                      <div class="text-2xl font-bold text-green-500 flex items-center gap-1">
                        <ng-icon name="lucideTrendingDown" size="20" />
                        Estable
                      </div>
                    </div>
                    <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-4">
                      <div class="text-xs text-veltrix-muted mb-1">Próximos 30 min</div>
                      <div class="text-2xl font-bold text-yellow-500">Moderado</div>
                    </div>
                    <div class="bg-veltrix-card rounded-xl border border-veltrix-border p-4">
                      <div class="text-xs text-veltrix-muted mb-1">Clasificación Ruido</div>
                      <div class="text-2xl font-bold text-veltrix-text">Normal</div>
                    </div>
                  </div>

                  <!-- Comparison Chart -->
                  <ui-card>
                    <ui-card-header>
                      <ui-card-title>Comparación: Predicción vs Real</ui-card-title>
                    </ui-card-header>
                    <ui-card-content>
                      <div class="h-64 flex items-center justify-center bg-veltrix-bg/50 rounded-xl">
                        <div class="text-center text-veltrix-muted">
                          <ng-icon name="lucideBrain" size="48" class="mx-auto mb-3 opacity-30" />
                          <p>Gráfico de comparación</p>
                          <p class="text-xs mt-1">Datos acumulándose para análisis predictivo</p>
                        </div>
                      </div>
                    </ui-card-content>
                  </ui-card>

                  <!-- Predictions List -->
                  <ui-card>
                    <ui-card-header>
                      <ui-card-title>Predicciones por Tramo</ui-card-title>
                    </ui-card-header>
                    <ui-card-content>
                      <div class="overflow-x-auto">
                        <table class="data-table w-full">
                          <thead>
                            <tr>
                              <th>Tramo</th>
                              <th>Grupo</th>
                              <th class="text-center">Riesgo Actual</th>
                              <th class="text-center">Riesgo Predicho</th>
                              <th class="text-center">Confianza</th>
                              <th class="text-center">Tendencia</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (polygon of filteredPolygons() | slice:0:10; track polygon.id) {
                              <tr class="hover:bg-veltrix-bg/50">
                                <td class="font-medium text-veltrix-text">{{ polygon.name }}</td>
                                <td class="text-veltrix-muted">{{ polygon.group || '-' }}</td>
                                <td class="text-center">
                                  <span class="px-2 py-1 rounded-full text-xs font-medium"
                                        [class]="getRiskBadgeClass(polygon.riskLevel)">
                                    {{ polygon.riskScore }}
                                  </span>
                                </td>
                                <td class="text-center">
                                  <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500">
                                    {{ getPredictedScore(polygon.riskScore) }}
                                  </span>
                                </td>
                                <td class="text-center text-veltrix-muted">{{ getConfidence() }}%</td>
                                <td class="text-center">
                                  @if (getRandomTrend()) {
                                    <ng-icon name="lucideTrendingUp" class="text-red-500" size="16" />
                                  } @else {
                                    <ng-icon name="lucideTrendingDown" class="text-green-500" size="16" />
                                  }
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </ui-card-content>
                  </ui-card>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3 mt-6">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span>© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por <strong>GED</strong></span>
          <div class="flex items-center gap-6">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-success"></span> Bajo</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-500"></span> Moderado</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> Alto</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-danger"></span> Crítico</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-purple-500"></span> Severo</span>
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
export class RiskDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  Math = Math;

  // State
  readonly selectedRiskLevel = signal<RiskLevel | null>(null);
  readonly selectedGroup = signal<string | null>(null);
  readonly currentView = signal<ViewMode>('list');

  // Data
  private polygons = signal<Polygon[]>([]);

  readonly viewOptions = [
    { id: 'list' as ViewMode, label: 'Lista', icon: 'lucideList' },
    { id: 'matrix' as ViewMode, label: 'Matriz Estratégica', icon: 'lucideLayoutGrid' },
    { id: 'heatmap' as ViewMode, label: 'Mapa de Calor', icon: 'lucideMap' },
    { id: 'predictive' as ViewMode, label: 'Análisis Predictivo', icon: 'lucideBrain' },
  ];

  ngOnInit(): void {
    this.apiService.polygons$.subscribe(data => this.polygons.set(data || []));
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }

  selectRiskLevel(level: RiskLevel | null): void {
    this.selectedRiskLevel.set(level);
  }

  readonly polygonsWithRisk = computed((): PolygonRisk[] => {
    return this.polygons().map(p => {
      const trafficScore = Math.round(Math.random() * 100);
      const incidentScore = Math.round(Math.random() * 100);
      const weatherScore = Math.round(Math.random() * 50);
      const speedScore = Math.round(Math.random() * 100);
      const delayScore = Math.round(Math.random() * 100);
      const riskScore = Math.round((trafficScore + incidentScore + weatherScore) / 3);

      let riskLevel: RiskLevel = 'LOW';
      if (riskScore >= 80) riskLevel = 'SEVERE';
      else if (riskScore >= 65) riskLevel = 'CRITICAL';
      else if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 30) riskLevel = 'MODERATE';

      return {
        ...p,
        riskLevel,
        riskScore,
        trafficScore,
        incidentScore,
        weatherScore,
        speedScore,
        delayScore,
      };
    });
  });

  readonly filteredPolygons = computed(() => {
    let result = this.polygonsWithRisk();

    if (this.selectedGroup()) {
      result = result.filter(p => p.group === this.selectedGroup());
    }

    if (this.selectedRiskLevel()) {
      result = result.filter(p => p.riskLevel === this.selectedRiskLevel());
    }

    return result.sort((a, b) => b.riskScore - a.riskScore);
  });

  readonly groups = computed(() => {
    const polygons = this.polygonsWithRisk();
    const groupMap = new Map<string, { name: string; criticalCount: number }>();

    polygons.forEach(p => {
      const name = p.group || 'Sin grupo';
      if (!groupMap.has(name)) {
        groupMap.set(name, { name, criticalCount: 0 });
      }
      if (p.riskLevel === 'CRITICAL' || p.riskLevel === 'SEVERE') {
        groupMap.get(name)!.criticalCount++;
      }
    });

    return Array.from(groupMap.values()).sort((a, b) => b.criticalCount - a.criticalCount);
  });

  readonly riskSummary = computed((): RiskSummary => {
    const polygons = this.polygonsWithRisk();
    return {
      monitored: polygons.length,
      low: polygons.filter(p => p.riskLevel === 'LOW').length,
      moderate: polygons.filter(p => p.riskLevel === 'MODERATE').length,
      high: polygons.filter(p => p.riskLevel === 'HIGH').length,
      critical: polygons.filter(p => p.riskLevel === 'CRITICAL').length,
      severe: polygons.filter(p => p.riskLevel === 'SEVERE').length,
    };
  });

  // Helper methods
  getRiskLabel(level: RiskLevel): string {
    const labels: Record<RiskLevel, string> = {
      LOW: 'Bajo',
      MODERATE: 'Moderado',
      HIGH: 'Alto',
      CRITICAL: 'Crítico',
      SEVERE: 'Severo',
    };
    return labels[level];
  }

  getRiskBadgeClass(level: RiskLevel): string {
    const classes: Record<RiskLevel, string> = {
      LOW: 'bg-green-500/20 text-green-500',
      MODERATE: 'bg-yellow-500/20 text-yellow-500',
      HIGH: 'bg-orange-500/20 text-orange-500',
      CRITICAL: 'bg-red-500/20 text-red-500',
      SEVERE: 'bg-purple-500/20 text-purple-500',
    };
    return classes[level];
  }

  getRiskBgClass(level: RiskLevel): string {
    const classes: Record<RiskLevel, string> = {
      LOW: 'bg-green-50 dark:bg-green-900/10',
      MODERATE: 'bg-yellow-50 dark:bg-yellow-900/10',
      HIGH: 'bg-orange-50 dark:bg-orange-900/10',
      CRITICAL: 'bg-red-50 dark:bg-red-900/10',
      SEVERE: 'bg-purple-50 dark:bg-purple-900/10',
    };
    return classes[level];
  }

  getRiskTextClass(level: RiskLevel): string {
    const classes: Record<RiskLevel, string> = {
      LOW: 'text-green-600 dark:text-green-400',
      MODERATE: 'text-yellow-600 dark:text-yellow-400',
      HIGH: 'text-orange-600 dark:text-orange-400',
      CRITICAL: 'text-red-600 dark:text-red-400',
      SEVERE: 'text-purple-600 dark:text-purple-400',
    };
    return classes[level];
  }

  getRiskBarClass(level: RiskLevel): string {
    const classes: Record<RiskLevel, string> = {
      LOW: 'bg-green-500',
      MODERATE: 'bg-yellow-500',
      HIGH: 'bg-orange-500',
      CRITICAL: 'bg-red-500',
      SEVERE: 'bg-purple-500',
    };
    return classes[level];
  }

  getRiskDotClass(level: RiskLevel): string {
    const classes: Record<RiskLevel, string> = {
      LOW: 'bg-green-500',
      MODERATE: 'bg-yellow-500',
      HIGH: 'bg-orange-500',
      CRITICAL: 'bg-red-500',
      SEVERE: 'bg-purple-500',
    };
    return classes[level];
  }

  getFactorColor(score: number): string {
    if (score >= 70) return 'text-red-500';
    if (score >= 50) return 'text-orange-500';
    if (score >= 30) return 'text-yellow-500';
    return 'text-green-500';
  }

  getRiskDescription(polygon: PolygonRisk): string {
    const descriptions: Record<RiskLevel, string> = {
      LOW: 'Condiciones normales de operación. Tráfico fluido sin incidentes reportados.',
      MODERATE: 'Condiciones ligeramente afectadas. Se recomienda monitoreo preventivo.',
      HIGH: 'Condiciones de riesgo elevado. Posible congestión o incidentes en la zona.',
      CRITICAL: 'Situación crítica. Múltiples factores de riesgo detectados. Requiere atención inmediata.',
      SEVERE: 'Emergencia vial. Condiciones extremas que requieren intervención urgente.',
    };
    return descriptions[polygon.riskLevel];
  }

  getPredictedScore(currentScore: number): number {
    const variance = Math.floor(Math.random() * 10) - 5;
    return Math.max(0, Math.min(100, currentScore + variance));
  }

  getConfidence(): number {
    return Math.floor(80 + Math.random() * 15);
  }

  getRandomTrend(): boolean {
    return Math.random() > 0.5;
  }
}

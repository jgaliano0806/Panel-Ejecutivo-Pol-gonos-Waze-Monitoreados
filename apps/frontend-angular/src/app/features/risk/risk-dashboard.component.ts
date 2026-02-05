/**
 * RiskDashboardComponent - Panel de análisis de riesgos multifactorial
 * Equivalente a: apps/frontend/src/pages/RiskDashboard.tsx
 */
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Polygon, Incident, TrafficJam } from '../../core/services';
import { Subscription } from 'rxjs';

interface RiskScore {
  polygonId: string;
  polygonName: string;
  overallScore: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'SEVERE';
  trafficScore: number;
  incidentScore: number;
  weatherScore: number;
  factors: {
    accidents: number;
    jams: number;
    avgSpeed: number;
    visibility: number;
  };
}

const RISK_LEVEL_LABELS: Record<string, string> = {
  LOW: 'Bajo',
  MODERATE: 'Moderado',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
  SEVERE: 'Severo',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  LOW: 'bg-green-500',
  MODERATE: 'bg-yellow-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
  SEVERE: 'bg-red-900',
};

@Component({
  selector: 'app-risk-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold">Análisis de Riesgos</h2>
          <p class="text-[var(--secondary)]">Panel de análisis predictivo de riesgos viales</p>
        </div>

        <div class="flex items-center gap-3">
          <button
            (click)="recalculate()"
            class="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            🔄 Recalcular
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
          <div class="text-3xl font-bold">{{ riskScores().length }}</div>
          <div class="text-sm text-[var(--secondary)]">Polígonos</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-red-300 dark:border-red-800">
          <div class="text-3xl font-bold text-red-500">{{ criticalCount() }}</div>
          <div class="text-sm text-[var(--secondary)]">Críticos</div>
        </div>
        <div
          class="bg-[var(--card)] p-4 rounded-lg border border-orange-300 dark:border-orange-800"
        >
          <div class="text-3xl font-bold text-orange-500">{{ highCount() }}</div>
          <div class="text-sm text-[var(--secondary)]">Alto Riesgo</div>
        </div>
        <div
          class="bg-[var(--card)] p-4 rounded-lg border border-yellow-300 dark:border-yellow-800"
        >
          <div class="text-3xl font-bold text-yellow-500">{{ moderateCount() }}</div>
          <div class="text-sm text-[var(--secondary)]">Moderado</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-green-300 dark:border-green-800">
          <div class="text-3xl font-bold text-green-500">{{ lowCount() }}</div>
          <div class="text-sm text-[var(--secondary)]">Bajo</div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
        <div class="flex flex-wrap gap-4">
          <div>
            <label for="group-filter" class="block text-sm font-medium mb-1">Grupo</label>
            <select
              id="group-filter"
              [(ngModel)]="groupFilter"
              class="px-3 py-2 border rounded bg-[var(--background)]"
              aria-label="Filtrar por grupo"
            >
              <option value="all">Todos los grupos</option>
              @for (group of groups(); track group) {
                <option [value]="group">{{ group }}</option>
              }
            </select>
          </div>

          <div>
            <label for="level-filter" class="block text-sm font-medium mb-1">Nivel de riesgo</label>
            <select
              id="level-filter"
              [(ngModel)]="levelFilter"
              class="px-3 py-2 border rounded bg-[var(--background)]"
              aria-label="Filtrar por nivel"
            >
              <option value="all">Todos los niveles</option>
              <option value="CRITICAL">🔴 Crítico</option>
              <option value="HIGH">🟠 Alto</option>
              <option value="MODERATE">🟡 Moderado</option>
              <option value="LOW">🟢 Bajo</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Score promedio -->
      <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-white">
        <div class="text-sm opacity-80">Score promedio de riesgo</div>
        <div class="text-5xl font-bold">{{ avgScore() }}</div>
        <div class="text-sm opacity-80 mt-2">Basado en {{ filteredScores().length }} polígonos</div>
        <div class="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            class="h-full transition-all duration-500"
            [style.width.%]="avgScore()"
            [class]="
              avgScore() > 70 ? 'bg-red-400' : avgScore() > 40 ? 'bg-yellow-400' : 'bg-green-400'
            "
          ></div>
        </div>
      </div>

      <!-- Lista de polígonos por riesgo -->
      <div class="bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden">
        <div
          class="p-4 border-b border-[var(--border)] font-semibold flex items-center justify-between"
        >
          <span>Polígonos por Nivel de Riesgo ({{ filteredScores().length }})</span>
          <span class="text-sm font-normal text-[var(--secondary)]"> Ordenados por score ↓ </span>
        </div>

        <div class="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto">
          @for (score of filteredScores(); track score.polygonId) {
            <div class="p-4 hover:bg-[var(--muted)] transition-colors">
              <div class="flex items-start gap-4">
                <!-- Score circular -->
                <div
                  class="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg"
                  [class]="getRiskBgColor(score.level)"
                >
                  {{ score.overallScore }}
                </div>

                <!-- Info -->
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold">{{ score.polygonName }}</span>
                    <span
                      class="px-2 py-0.5 rounded text-xs font-medium text-white"
                      [class]="getRiskBgColor(score.level)"
                    >
                      {{ getRiskLabel(score.level) }}
                    </span>
                  </div>

                  <!-- Factores -->
                  <div class="flex flex-wrap gap-4 mt-2 text-sm">
                    <div class="flex items-center gap-1" title="Tráfico">
                      <span>🚗</span>
                      <span>{{ score.trafficScore }}%</span>
                    </div>
                    <div class="flex items-center gap-1" title="Incidentes">
                      <span>⚠️</span>
                      <span>{{ score.incidentScore }}%</span>
                    </div>
                    <div class="flex items-center gap-1" title="Clima">
                      <span>🌧️</span>
                      <span>{{ score.weatherScore }}%</span>
                    </div>
                  </div>

                  <!-- Detalles -->
                  <div class="flex flex-wrap gap-4 mt-1 text-xs text-[var(--secondary)]">
                    <span>{{ score.factors.accidents }} accidentes</span>
                    <span>{{ score.factors.jams }} atascos</span>
                    <span>{{ score.factors.avgSpeed }} km/h prom</span>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="p-8 text-center text-[var(--secondary)]">
              No hay polígonos que coincidan con los filtros
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class RiskDashboardComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private subscription = new Subscription();

  // Datos
  private polygons = signal<Polygon[]>([]);
  private incidents = signal<Incident[]>([]);
  private jams = signal<TrafficJam[]>([]);

  // Filtros
  groupFilter = 'all';
  levelFilter = 'all';

  // Risk scores calculados
  readonly riskScores = computed<RiskScore[]>(() => {
    return this.polygons().map((polygon) => this.calculateRiskScore(polygon));
  });

  readonly filteredScores = computed(() => {
    let scores = this.riskScores();

    if (this.groupFilter !== 'all') {
      const polygonIds = this.polygons()
        .filter((p) => p.group === this.groupFilter)
        .map((p) => p.id);
      scores = scores.filter((s) => polygonIds.includes(s.polygonId));
    }

    if (this.levelFilter !== 'all') {
      scores = scores.filter((s) => s.level === this.levelFilter);
    }

    // Ordenar por score descendente
    return scores.sort((a, b) => b.overallScore - a.overallScore);
  });

  readonly groups = computed(() => {
    const groupSet = new Set(this.polygons().map((p) => p.group));
    return Array.from(groupSet);
  });

  readonly criticalCount = computed(
    () => this.riskScores().filter((s) => s.level === 'CRITICAL' || s.level === 'SEVERE').length,
  );

  readonly highCount = computed(() => this.riskScores().filter((s) => s.level === 'HIGH').length);

  readonly moderateCount = computed(
    () => this.riskScores().filter((s) => s.level === 'MODERATE').length,
  );

  readonly lowCount = computed(() => this.riskScores().filter((s) => s.level === 'LOW').length);

  readonly avgScore = computed(() => {
    const scores = this.filteredScores();
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, s) => acc + s.overallScore, 0);
    return Math.round(sum / scores.length);
  });

  ngOnInit(): void {
    const polSub = this.apiService.polygons$.subscribe((data) => {
      this.polygons.set(data);
    });

    const incSub = this.apiService.incidents$.subscribe((data) => {
      this.incidents.set(data);
    });

    const jamSub = this.apiService.jams$.subscribe((data) => {
      this.jams.set(data);
    });

    this.subscription.add(polSub);
    this.subscription.add(incSub);
    this.subscription.add(jamSub);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  recalculate(): void {
    this.apiService.refreshAll();
  }

  private calculateRiskScore(polygon: Polygon): RiskScore {
    const polygonIncidents = this.incidents().filter((i) => i.polygonId === polygon.id);
    const polygonJams = this.jams().filter((j) => j.polygonId === polygon.id);

    const accidents = polygonIncidents.filter((i) => i.type === 'ACCIDENT').length;
    const jamsCount = polygonJams.length;
    const avgSpeed = polygon.metrics?.avgSpeed || 0;

    // Calcular scores por factor (0-100)
    const trafficScore = Math.min(100, jamsCount * 10 + (60 - (avgSpeed || 60)) * 2);
    const incidentScore = Math.min(100, polygonIncidents.length * 15 + accidents * 30);
    const weatherScore = 20; // Placeholder - necesita datos de clima

    // Score general ponderado
    const overallScore = Math.round(
      trafficScore * 0.4 + incidentScore * 0.45 + weatherScore * 0.15,
    );

    // Determinar nivel
    let level: RiskScore['level'] = 'LOW';
    if (overallScore >= 80) level = 'SEVERE';
    else if (overallScore >= 65) level = 'CRITICAL';
    else if (overallScore >= 45) level = 'HIGH';
    else if (overallScore >= 25) level = 'MODERATE';

    return {
      polygonId: polygon.id,
      polygonName: polygon.name,
      overallScore,
      level,
      trafficScore: Math.round(trafficScore),
      incidentScore: Math.round(incidentScore),
      weatherScore: Math.round(weatherScore),
      factors: {
        accidents,
        jams: jamsCount,
        avgSpeed: Math.round(avgSpeed || 0),
        visibility: 1000, // Placeholder
      },
    };
  }

  getRiskLabel(level: string): string {
    return RISK_LEVEL_LABELS[level] || level;
  }

  getRiskBgColor(level: string): string {
    return RISK_LEVEL_COLORS[level] || 'bg-gray-500';
  }
}

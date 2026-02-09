/**
 * TrendsChart Component - Gráficos de tendencias SVG
 * Equivalente a: apps/frontend/src/components/dashboard/TrendsChart.tsx
 */
import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface HistoricalSnapshot {
  timestamp: Date;
  totalJams: number;
  avgSpeed: number;
  criticalKm: number;
  avgDelay: number;
}

interface ChartData {
  points: { x: number; y: number; value: number }[];
  pathData: string;
  max: number;
  min: number;
  current: number;
  change: number;
  percentChange: number;
  isImproving: boolean;
}

@Component({
  selector: 'app-trends-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-veltrix-card rounded-xl p-4 border border-veltrix-border">
      @if (chartData(); as data) {
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-sm font-semibold text-veltrix-text">{{ title }}</h3>
            <div class="mt-1">
              <span class="text-2xl font-black text-veltrix-text">{{ data.current }}</span>
              @if (unit) {
                <span class="text-sm text-veltrix-muted ml-1">{{ unit }}</span>
              }
            </div>
          </div>

          <div
            class="text-right px-2 py-1 rounded"
            [class.bg-veltrix-success/10]="data.isImproving"
            [class.bg-veltrix-danger/10]="!data.isImproving"
          >
            <div
              class="text-xs font-bold"
              [class.text-veltrix-success]="data.isImproving"
              [class.text-veltrix-danger]="!data.isImproving"
            >
              {{ data.change > 0 ? '▲' : data.change < 0 ? '▼' : '━' }}
              {{ Math.abs(data.percentChange).toFixed(1) }}%
            </div>
            <div class="text-xs text-veltrix-muted">últimas {{ snapshots.length }}h</div>
          </div>
        </div>

        <!-- Gráfico SVG -->
        <div class="relative h-[100px]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
            <!-- Área debajo de la línea -->
            <defs>
              <linearGradient [attr.id]="'gradient-' + metric" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" [attr.stop-color]="lineColor()" stop-opacity="0.3" />
                <stop offset="100%" [attr.stop-color]="lineColor()" stop-opacity="0.05" />
              </linearGradient>
            </defs>

            <path [attr.d]="areaPath()" [attr.fill]="'url(#gradient-' + metric + ')'" />

            <!-- Línea principal -->
            <path
              [attr.d]="data.pathData"
              fill="none"
              [attr.stroke]="lineColor()"
              stroke-width="2"
              vector-effect="non-scaling-stroke"
            />

            <!-- Puntos -->
            @for (point of data.points; track $index) {
              <circle
                [attr.cx]="point.x"
                [attr.cy]="point.y"
                r="1.5"
                [attr.fill]="lineColor()"
                vector-effect="non-scaling-stroke"
              />
            }
          </svg>
        </div>

        <!-- Rango -->
        <div class="flex justify-between text-xs text-veltrix-muted mt-2">
          <span>Mín: {{ data.min }}{{ unit }}</span>
          <span>Máx: {{ data.max }}{{ unit }}</span>
        </div>
      } @else {
        <h3 class="text-sm font-semibold text-veltrix-text mb-2">{{ title }}</h3>
        <div class="flex items-center justify-center h-32 text-veltrix-muted text-sm">
          Sin datos históricos
        </div>
      }
    </div>
  `,
})
export class TrendsChartComponent {
  @Input() snapshots: HistoricalSnapshot[] = [];
  @Input() metric: 'totalJams' | 'avgSpeed' | 'criticalKm' | 'avgDelay' = 'avgSpeed';
  @Input() title = '';
  @Input() unit = '';

  readonly Math = Math;

  readonly chartData = computed<ChartData | null>(() => {
    if (this.snapshots.length === 0) return null;

    const values = this.snapshots.map((s) => (s[this.metric] as number) || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    // Calcular puntos del gráfico (normalizado a 0-100%)
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return { x, y, value };
    });

    // Crear path SVG
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Calcular tendencia
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const percentChange = first !== 0 ? (change / first) * 100 : 0;

    return {
      points,
      pathData,
      max,
      min,
      current: last,
      change,
      percentChange,
      isImproving: this.metric === 'avgSpeed' ? change > 0 : change < 0,
    };
  });

  readonly lineColor = computed(() => {
    const data = this.chartData();
    return data?.isImproving ? '#10b981' : '#ef4444';
  });

  readonly areaPath = computed(() => {
    const data = this.chartData();
    if (!data) return '';
    return `${data.pathData} L 100 100 L 0 100 Z`;
  });
}

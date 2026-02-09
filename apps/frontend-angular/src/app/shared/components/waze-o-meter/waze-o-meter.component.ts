/**
 * WazeOMeterComponent - Estado de la Red Vial
 * Réplica exacta de: apps/frontend/src/components/dashboard/WazeOMeter.tsx
 */
import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TrafficJam {
  id: string;
  level: number;
  length: number;
  // ... otros campos
}

interface MeterData {
  levelPercentages: number[];
  totalKm: number;
  dominantLevel: number;
  status: string;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'darkred' | '';
  lengthByLevel: number[];
}

const TOTAL_NETWORK_KM = 350;

const LEVELS = [
  { level: 0, label: 'Sin Congestión', color: '#22c55e', emoji: '🟢' },
  { level: 1, label: 'Circulación Lenta', color: '#84cc16', emoji: '🟢' },
  { level: 2, label: 'Demoras Moderadas', color: '#facc15', emoji: '🟡' },
  { level: 3, label: 'Tráfico Intenso', color: '#f97316', emoji: '🟠' },
  { level: 4, label: 'Muy Congestionado', color: '#ef4444', emoji: '🔴' },
  { level: 5, label: 'Tráfico Detenido', color: '#991b1b', emoji: '🔴' },
];

@Component({
  selector: 'app-waze-o-meter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white dark:bg-veltrix-card border dark:border-veltrix-border shadow-lg rounded-2xl p-3 flex flex-col transition-colors duration-300"
    >
      <h2 class="text-sm font-bold text-gray-900 dark:text-veltrix-text mb-2">
        {{ title }}
      </h2>

      <!-- Estado Principal -->
      <div class="border-2 rounded-lg p-2 mb-2 transition-colors" [class]="getStatusColorClass()">
        <div class="text-center">
          <div class="text-2xl mb-1 filter drop-shadow-md">
            {{ getEmoji() }}
          </div>
          <div class="text-lg font-black">{{ meterData().status }}</div>
          <div class="text-xs font-medium mt-0.5 opacity-90">
            {{ meterData().totalKm }} km totales monitoreados
          </div>
        </div>
      </div>

      <!-- Barra de Distribución Visual -->
      <div class="mb-2">
        <div
          class="flex h-6 rounded-lg overflow-hidden border border-gray-300 dark:border-veltrix-border bg-gray-100 dark:bg-gray-800"
        >
          @for (level of getVisibleLevels(); track level.level) {
            <div
              class="flex items-center justify-center text-white text-[9px] font-bold shadow-inner"
              [style.width.%]="level.percentage"
              [style.backgroundColor]="level.color"
              [title]="level.label + ': ' + level.percentage.toFixed(1) + '%'"
            >
              {{ level.percentage > 10 ? level.percentage.toFixed(0) + '%' : '' }}
            </div>
          }
        </div>
      </div>

      <!-- Desglose por Nivel -->
      <div class="space-y-1.5 flex-1 pr-1">
        <h3 class="text-[10px] font-bold text-gray-600 dark:text-veltrix-muted uppercase mb-1">
          Distribución por Nivel
        </h3>

        @for (level of getVisibleLevelsWithKm(); track level.level) {
          <div
            class="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-veltrix-bg/50 transition-colors"
          >
            <div
              class="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
              [style.backgroundColor]="level.color"
            ></div>
            <div class="flex-1 flex items-center justify-between text-xs">
              <span class="font-medium text-gray-700 dark:text-veltrix-text text-[11px]">
                {{ level.label }}
              </span>
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900 dark:text-white text-[11px]">
                  {{ level.km }} km
                </span>
                <span
                  class="text-[10px] text-gray-500 dark:text-veltrix-muted font-mono bg-gray-100 dark:bg-veltrix-bg px-1 py-0.5 rounded"
                >
                  {{ level.percentage.toFixed(1) }}%
                </span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Leyenda -->
      <div class="mt-2 pt-2 border-t border-gray-200 dark:border-veltrix-border">
        <p
          class="text-[10px] text-gray-600 dark:text-veltrix-muted text-center flex items-center justify-center gap-1.5"
        >
          <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          Monitoreando {{ jamsCount() }} puntos en tiempo real
        </p>
      </div>
    </div>
  `,
})
export class WazeOMeterComponent {
  @Input() set jams(value: TrafficJam[]) {
    this._jams.set(value || []);
  }
  @Input() title = 'Estado de la Red Vial';

  private _jams = signal<TrafficJam[]>([]);

  readonly jamsCount = computed(() => this._jams().length);

  readonly meterData = computed<MeterData>(() => {
    const jams = this._jams();
    const lengthByLevel = [0, 0, 0, 0, 0, 0];

    for (const jam of jams) {
      let level = jam.level ?? 0;
      if (level < 0) level = 0;
      if (level > 5) level = 5;

      const jamLength = Number(jam.length) || 0;
      lengthByLevel[level] += jamLength;
    }

    const reportedKm = lengthByLevel.reduce((sum, len) => sum + len, 0) / 1000;
    const configuredTotalKm = TOTAL_NETWORK_KM;
    const totalKm = Math.max(configuredTotalKm, reportedKm);
    const freeFlowKm = Math.max(0, (totalKm - reportedKm) * 1000);
    lengthByLevel[0] += freeFlowKm;

    const levelPercentages = lengthByLevel.map((len) =>
      totalKm > 0 ? (len / (totalKm * 1000)) * 100 : 0,
    );

    const dominantLevel = lengthByLevel.indexOf(Math.max(...lengthByLevel));
    let status = '';
    let color: 'green' | 'yellow' | 'orange' | 'red' | 'darkred' | '' = '';

    const criticalPercentage = levelPercentages[4] + levelPercentages[5];
    const warningPercentage = levelPercentages[2] + levelPercentages[3];

    if (criticalPercentage > 5) {
      status = 'Red Comprometida';
      color = 'red';
    } else if (warningPercentage > 15) {
      status = 'Tránsito Pesado';
      color = 'orange';
    } else if (dominantLevel === 0 || dominantLevel === 1) {
      status = 'Red Operativa';
      color = 'green';
    } else if (dominantLevel === 2) {
      status = 'Tránsito Moderado';
      color = 'yellow';
    } else {
      status = 'Bloqueado';
      color = 'darkred';
    }

    return {
      levelPercentages,
      totalKm: Number(totalKm.toFixed(0)),
      dominantLevel,
      status,
      color,
      lengthByLevel: lengthByLevel.map((l) => Number((l / 1000).toFixed(2))),
    };
  });

  getEmoji(): string {
    const data = this.meterData();
    return LEVELS[data.dominantLevel]?.emoji || '🟢';
  }

  getStatusColorClass(): string {
    switch (this.meterData().color) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/20 border-green-400 dark:border-green-600/50 text-green-900 dark:text-green-400';
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600/50 text-yellow-900 dark:text-yellow-400';
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600/50 text-orange-900 dark:text-orange-400';
      case 'red':
        return 'bg-red-100 dark:bg-red-900/20 border-red-400 dark:border-red-600/50 text-red-900 dark:text-red-400';
      case 'darkred':
        return 'bg-red-200 dark:bg-red-950/40 border-red-600 dark:border-red-500/50 text-red-950 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-300';
    }
  }

  getVisibleLevels(): Array<{ level: number; label: string; color: string; percentage: number }> {
    const data = this.meterData();
    return LEVELS.map((level, index) => ({
      ...level,
      percentage: data.levelPercentages[index],
    })).filter((l) => l.percentage > 0);
  }

  getVisibleLevelsWithKm(): Array<{
    level: number;
    label: string;
    color: string;
    percentage: number;
    km: number;
  }> {
    const data = this.meterData();
    return LEVELS.map((level, index) => ({
      ...level,
      percentage: data.levelPercentages[index],
      km: data.lengthByLevel[index],
    })).filter((l) => l.km > 0);
  }
}

/**
 * MapKPIFooterComponent - Footer flotante con KPIs del mapa
 * Equivalente a: apps/frontend/src/components/map/MapKPIFooter.tsx
 */
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import type { Incident, GlobalKPIs, Polygon } from '../../../../core/services';

interface Metric {
  id: string;
  label: string;
  value: number | string;
  icon: string;
  status: 'primary' | 'critical' | 'warning';
}

@Component({
  selector: 'app-map-kpi-footer',
  standalone: true,
  imports: [CommonModule, NgIcon],
  template: `
    <div
      class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-auto max-w-[90%] px-4 pointer-events-none"
    >
      <div
        class="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 p-3 pointer-events-auto flex items-center justify-center gap-6 md:gap-10 overflow-x-auto"
      >
        @for (metric of metrics; track metric.id) {
          <button
            class="flex items-center gap-3 min-w-max cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded-lg transition-colors border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            (click)="onMetricClick(metric.id)"
            [title]="'Ver detalle de ' + metric.label"
            [attr.aria-label]="'Ver detalle de ' + metric.label + ': ' + metric.value"
          >
            <div class="p-2 rounded-xl" [class]="getColorClass(metric.status)">
              <ng-icon [name]="metric.icon" class="w-5 h-5" />
            </div>
            <div class="flex flex-col items-start">
              <span
                class="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider"
              >
                {{ metric.label }}
              </span>
              <span
                class="text-xl font-black font-mono leading-none text-gray-800 dark:text-gray-100"
              >
                {{ metric.value }}
              </span>
            </div>
          </button>
        }
      </div>
    </div>
  `,
})
export class MapKPIFooterComponent {
  private router = inject(Router);

  @Input() kpis!: GlobalKPIs;
  @Input() totalPolygons = 0;
  @Input() criticalPolygons = 0;
  @Input() incidents: Incident[] = [];
  @Input() polygons: Polygon[] = [];

  get totalEvents(): number {
    return this.incidents.length;
  }

  get criticalIncidents(): number {
    return this.incidents.filter((i) => (i.severity ?? 0) >= 4).length;
  }

  get metrics(): Metric[] {
    return [
      {
        id: 'fluidity',
        label: 'FLUIDEZ',
        value: `${this.kpis?.fluidityPercentage || 0}%`,
        icon: 'lucideTarget',
        status: 'primary',
      },
      {
        id: 'events',
        label: 'EVENTOS',
        value: this.totalEvents,
        icon: 'lucideAlertTriangle',
        status: this.criticalIncidents > 0 ? 'critical' : 'primary',
      },
      {
        id: 'incidents',
        label: 'ACCIDENTES',
        value: this.kpis?.roadAccidents || 0,
        icon: 'lucideCar',
        status: (this.kpis?.roadAccidentsCritical || 0) > 0 ? 'warning' : 'primary',
      },
      {
        id: 'critical',
        label: 'RIESGOS',
        value: this.criticalPolygons,
        icon: 'lucideMapPin',
        status: 'primary',
      },
    ];
  }

  getColorClass(status: 'primary' | 'critical' | 'warning'): string {
    switch (status) {
      case 'primary':
        return 'text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20';
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20';
      case 'warning':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/20';
      default:
        return 'text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20';
    }
  }

  onMetricClick(metricId: string): void {
    switch (metricId) {
      case 'events':
        this.router.navigate(['/alertas']);
        break;
      case 'incidents':
        this.router.navigate(['/siniestros']);
        break;
      case 'critical':
        this.router.navigate(['/riesgos']);
        break;
    }
  }
}

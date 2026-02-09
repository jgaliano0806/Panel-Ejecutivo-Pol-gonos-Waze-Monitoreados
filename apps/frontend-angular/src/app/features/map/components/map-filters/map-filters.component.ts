/**
 * MapFiltersComponent - Panel de filtros del mapa
 * Equivalente a: apps/frontend/src/components/map/MapFilters.tsx
 */
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MapFiltersState {
  showPolygons: boolean;
  showIncidents: boolean;
  showJams: boolean;
}

@Component({
  selector: 'app-map-filters',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-2xl border-3 border-gray-800 p-4 min-w-[280px]"
    >
      <h3
        class="text-sm font-black uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-2"
      >
        <span class="text-lg">🔍</span>
        Filtros del Mapa
      </h3>

      <div class="space-y-3">
        <!-- Filtro de Polígonos -->
        <div
          class="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-500 hover:shadow-lg transition-all"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">🗺️</span>
            <div>
              <p class="text-sm font-bold text-gray-900">Polígonos</p>
              <p class="text-xs text-gray-600">Áreas monitoreadas</p>
            </div>
          </div>
          <button
            (click)="toggleFilter('showPolygons')"
            class="relative w-14 h-7 rounded-full transition-colors duration-300"
            [class.bg-green-500]="filters.showPolygons"
            [class.bg-gray-300]="!filters.showPolygons"
            aria-label="Toggle polygons"
            title="Mostrar/Ocultar Polígonos"
          >
            <div
              class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300"
              [class.translate-x-7]="filters.showPolygons"
            ></div>
          </button>
        </div>

        <!-- Filtro de Incidentes -->
        <div
          class="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border-2 border-red-500 hover:shadow-lg transition-all"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <p class="text-sm font-bold text-gray-900">Incidentes</p>
              <p class="text-xs text-gray-600">Alertas y eventos</p>
            </div>
          </div>
          <button
            (click)="toggleFilter('showIncidents')"
            class="relative w-14 h-7 rounded-full transition-colors duration-300"
            [class.bg-green-500]="filters.showIncidents"
            [class.bg-gray-300]="!filters.showIncidents"
            aria-label="Toggle incidents"
            title="Mostrar/Ocultar Incidentes"
          >
            <div
              class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300"
              [class.translate-x-7]="filters.showIncidents"
            ></div>
          </button>
        </div>

        <!-- Filtro de Tráfico -->
        <div
          class="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-2 border-orange-500 hover:shadow-lg transition-all"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">🚦</span>
            <div>
              <p class="text-sm font-bold text-gray-900">Tráfico</p>
              <p class="text-xs text-gray-600">Congestión vial</p>
            </div>
          </div>
          <button
            (click)="toggleFilter('showJams')"
            class="relative w-14 h-7 rounded-full transition-colors duration-300"
            [class.bg-green-500]="filters.showJams"
            [class.bg-gray-300]="!filters.showJams"
            aria-label="Toggle traffic jams"
            title="Mostrar/Ocultar Tráfico"
          >
            <div
              class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300"
              [class.translate-x-7]="filters.showJams"
            ></div>
          </button>
        </div>
      </div>

      <!-- Contador de elementos visibles -->
      <div class="mt-4 pt-3 border-t-2 border-gray-200">
        <p class="text-xs text-gray-600 text-center font-medium">
          {{ visibleLayersCount }} de 3 capas visibles
        </p>
      </div>
    </div>
  `,
})
export class MapFiltersComponent {
  @Input() filters: MapFiltersState = {
    showPolygons: true,
    showIncidents: true,
    showJams: true,
  };

  @Output() filtersChange = new EventEmitter<MapFiltersState>();

  get visibleLayersCount(): number {
    return [this.filters.showPolygons, this.filters.showIncidents, this.filters.showJams].filter(
      Boolean,
    ).length;
  }

  toggleFilter(key: keyof MapFiltersState): void {
    const newFilters = {
      ...this.filters,
      [key]: !this.filters[key],
    };
    this.filtersChange.emit(newFilters);
  }
}

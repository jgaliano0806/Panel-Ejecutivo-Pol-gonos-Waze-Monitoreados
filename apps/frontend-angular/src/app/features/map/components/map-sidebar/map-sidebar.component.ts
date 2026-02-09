/**
 * MapSidebarComponent - Panel lateral del mapa con controles
 * Equivalente a: apps/frontend/src/components/map/MapSidebar.tsx
 */
import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import type { TrafficJam, Polygon } from '../../../../core/services';

@Component({
  selector: 'app-map-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  template: `
    <div
      class="h-auto bg-[#1E1E2E]/95 backdrop-blur-xl text-white flex flex-col z-10 shadow-2xl rounded-2xl overflow-hidden border border-white/5 transition-all duration-300"
      [style.width.px]="isExpanded() ? 300 : 72"
    >
      <!-- Header -->
      <div class="p-4 flex items-center justify-between">
        @if (isExpanded()) {
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg"
            >
              <ng-icon name="lucideLayers" class="text-white" size="18" />
            </div>
            <span class="font-bold text-lg tracking-tight">Controles</span>
          </div>
        }
        <button
          (click)="toggleExpanded()"
          class="p-2 hover:bg-white/10 rounded-xl transition-all duration-300 text-gray-400 hover:text-white"
          [attr.aria-label]="isExpanded() ? 'Colapsar panel' : 'Expandir panel'"
        >
          <ng-icon [name]="isExpanded() ? 'lucideChevronLeft' : 'lucideMenu'" size="20" />
        </button>
      </div>

      <!-- WazeOMeter - Solo expandido -->
      @if (isExpanded()) {
        <div class="px-4 pb-4">
          <!-- Estado de la Red Vial -->
          <div class="bg-white/5 rounded-xl p-3 mb-3">
            <h3 class="text-sm font-bold mb-2">Estado de la Red Vial</h3>

            <!-- Estado Principal -->
            <div class="border-2 rounded-lg p-2 mb-2" [class]="getNetworkStatusClass()">
              <div class="text-center">
                <div class="text-2xl mb-1">{{ getNetworkStatusEmoji() }}</div>
                <div class="text-lg font-black">{{ networkStatus().status }}</div>
                <div class="text-xs font-medium mt-0.5 opacity-90">
                  {{ totalNetworkKm }} km totales monitoreados
                </div>
              </div>
            </div>

            <!-- Barra de Distribución Visual -->
            <div class="mb-2">
              <div class="flex h-6 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                @for (level of jamLevels; track level.level) {
                  @if (getLevelPercentage(level.level) > 0) {
                    <div
                      class="flex items-center justify-center text-white text-[9px] font-bold"
                      [style.width.%]="getLevelPercentage(level.level)"
                      [style.background-color]="level.color"
                      [title]="
                        level.label + ': ' + getLevelPercentage(level.level).toFixed(1) + '%'
                      "
                    >
                      @if (getLevelPercentage(level.level) > 10) {
                        {{ getLevelPercentage(level.level).toFixed(0) }}%
                      }
                    </div>
                  }
                }
              </div>
            </div>

            <!-- Desglose por Nivel -->
            <div class="space-y-1">
              <h4 class="text-[10px] font-bold text-gray-400 uppercase mb-1">
                Distribución por Nivel
              </h4>
              @for (level of jamLevels; track level.level) {
                @if (getLevelKm(level.level) > 0) {
                  <div
                    class="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors"
                  >
                    <div
                      class="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                      [style.background-color]="level.color"
                    ></div>
                    <div class="flex-1 flex items-center justify-between text-xs">
                      <span class="font-medium text-gray-300 text-[11px]">{{ level.label }}</span>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white text-[11px]"
                          >{{ getLevelKm(level.level).toFixed(1) }} km</span
                        >
                        <span
                          class="text-[10px] text-gray-500 font-mono bg-black/20 px-1 py-0.5 rounded"
                        >
                          {{ getLevelPercentage(level.level).toFixed(1) }}%
                        </span>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Leyenda -->
            <div class="mt-2 pt-2 border-t border-white/10">
              <p
                class="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1.5"
              >
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Monitoreando {{ jams.length }} puntos en tiempo real
              </p>
            </div>
          </div>
        </div>

        <!-- Capas del Mapa -->
        <nav class="flex-1 overflow-y-auto px-3 py-2">
          <div class="mb-2">
            <button
              (click)="toggleMenu('layers')"
              class="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group"
              [class.bg-white/5]="expandedMenus.has('layers')"
              [class.text-white]="expandedMenus.has('layers')"
              [class.text-gray-400]="!expandedMenus.has('layers')"
            >
              @if (expandedMenus.has('layers')) {
                <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"
                ></div>
              }
              <ng-icon
                name="lucideLayers"
                size="20"
                [class.text-blue-400]="expandedMenus.has('layers')"
              />
              <span class="flex-1 text-left text-sm font-medium">Capas del Mapa</span>
              <ng-icon
                [name]="expandedMenus.has('layers') ? 'lucideChevronDown' : 'lucideChevronRight'"
                class="text-gray-500"
                size="16"
              />
            </button>

            @if (expandedMenus.has('layers')) {
              <div class="ml-4 pl-3 border-l border-white/5 mt-1 space-y-1">
                <button
                  (click)="onLayerToggle.emit({ layer: 'waze', enabled: !showWazeIncidents })"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-400 hover:text-white group"
                >
                  <ng-icon
                    name="lucideMap"
                    size="18"
                    class="group-hover:text-blue-400 transition-colors"
                  />
                  <span>Incidentes Waze</span>
                  <div
                    class="ml-auto w-8 h-4 rounded-full flex items-center transition-colors"
                    [class.bg-blue-500]="showWazeIncidents"
                    [class.justify-end]="showWazeIncidents"
                    [class.bg-gray-700]="!showWazeIncidents"
                    [class.justify-start]="!showWazeIncidents"
                  >
                    <div class="w-3 h-3 bg-white rounded-full mx-0.5"></div>
                  </div>
                </button>
              </div>
            }
          </div>

          <!-- Filtros de Polígonos -->
          @if (polygons.length > 0) {
            <div class="mt-4 pt-4 border-t border-white/10">
              <button
                (click)="toggleMenu('filters')"
                class="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group"
                [class.bg-white/5]="expandedMenus.has('filters')"
                [class.text-white]="expandedMenus.has('filters')"
                [class.text-gray-400]="!expandedMenus.has('filters')"
              >
                @if (expandedMenus.has('filters')) {
                  <div
                    class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"
                  ></div>
                }
                <ng-icon
                  name="lucideFilter"
                  size="20"
                  [class.text-blue-400]="expandedMenus.has('filters')"
                />
                <span class="flex-1 text-left text-sm font-medium">Filtros</span>
                @if (selectedPolygon || selectedGroup) {
                  <span class="w-2 h-2 bg-blue-500 rounded-full shadow-lg mr-2"></span>
                }
                <ng-icon
                  [name]="expandedMenus.has('filters') ? 'lucideChevronDown' : 'lucideChevronRight'"
                  class="text-gray-500"
                  size="16"
                />
              </button>

              @if (expandedMenus.has('filters')) {
                <div class="px-2 mt-2">
                  <div class="bg-black/20 rounded-xl p-3 space-y-3">
                    <!-- Grupo -->
                    <div>
                      <label
                        class="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 px-1"
                      >
                        Grupo
                      </label>
                      <select
                        [ngModel]="selectedGroup || ''"
                        (ngModelChange)="onGroupSelect($event)"
                        class="w-full px-3 py-2 bg-[#12121a] border border-white/10 text-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                        aria-label="Filtrar por Grupo"
                      >
                        <option value="">Todos</option>
                        @for (group of polygonGroups(); track group) {
                          <option [value]="group">{{ group }}</option>
                        }
                      </select>
                    </div>

                    <!-- Polígono -->
                    <div>
                      <label
                        class="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 px-1"
                      >
                        Tipo de incidente
                      </label>
                      <select
                        [ngModel]="selectedPolygon || ''"
                        (ngModelChange)="onPolygonSelect($event)"
                        class="w-full px-3 py-2 bg-[#12121a] border border-white/10 text-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                        aria-label="Filtrar por Polígono"
                      >
                        <option value="">Todos</option>
                        @for (polygon of filteredPolygons(); track polygon.id) {
                          <option [value]="polygon.id">{{ polygon.name }}</option>
                        }
                      </select>
                    </div>

                    <!-- Limpiar -->
                    @if (selectedPolygon || selectedGroup) {
                      <div class="flex justify-end pt-1">
                        <button
                          (click)="clearFilters()"
                          class="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium hover:underline"
                        >
                          Limpiar todo
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </nav>
      } @else {
        <!-- Collapsed Icons -->
        <div class="flex flex-col items-center gap-4 py-4 mt-2">
          <button
            class="p-3 rounded-xl transition-all duration-300 group relative text-gray-400 hover:bg-white/10 hover:text-white"
            title="Capas del Mapa"
          >
            <ng-icon name="lucideLayers" size="20" />
            @if (showWazeIncidents) {
              <span
                class="absolute top-2 right-2 w-1.5 h-1.5 bg-green-400 rounded-full border border-[#1E1E2E]"
              ></span>
            }
          </button>
          <button
            class="p-3 rounded-xl transition-all duration-300 group relative text-gray-400 hover:bg-white/10 hover:text-white"
            title="Filtros"
          >
            <ng-icon name="lucideFilter" size="20" />
            @if (selectedPolygon || selectedGroup) {
              <span
                class="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-400 rounded-full border border-[#1E1E2E]"
              ></span>
            }
          </button>
        </div>
      }
    </div>
  `,
})
export class MapSidebarComponent {
  @Input() jams: TrafficJam[] = [];
  @Input() polygons: Polygon[] = [];
  @Input() selectedPolygon: string | null = null;
  @Input() selectedGroup: string | null = null;
  @Input() showWazeIncidents = true;

  @Output() onLayerToggle = new EventEmitter<{ layer: string; enabled: boolean }>();
  @Output() onPolygonChange = new EventEmitter<string | null>();
  @Output() onGroupChange = new EventEmitter<string | null>();

  readonly isExpanded = signal(true);
  readonly expandedMenus = new Set(['layers', 'filters']);
  readonly totalNetworkKm = 350;

  readonly jamLevels = [
    { level: 0, label: 'Sin Congestión', color: '#22c55e', emoji: '🟢' },
    { level: 1, label: 'Circulación Lenta', color: '#84cc16', emoji: '🟢' },
    { level: 2, label: 'Demoras Moderadas', color: '#facc15', emoji: '🟡' },
    { level: 3, label: 'Tráfico Intenso', color: '#f97316', emoji: '🟠' },
    { level: 4, label: 'Muy Congestionado', color: '#ef4444', emoji: '🔴' },
    { level: 5, label: 'Tráfico Detenido', color: '#991b1b', emoji: '🔴' },
  ];

  readonly polygonGroups = computed(() => {
    const groups = new Set(this.polygons.map((p) => p.group));
    return Array.from(groups).sort();
  });

  readonly filteredPolygons = computed(() => {
    if (this.selectedGroup) {
      return this.polygons
        .filter((p) => p.group === this.selectedGroup)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return this.polygons.sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly networkStatus = computed(() => {
    const lengthByLevel = [0, 0, 0, 0, 0, 0];

    for (const jam of this.jams) {
      let level = jam.level ?? 0;
      if (level < 0) level = 0;
      if (level > 5) level = 5;
      const jamLength = Number(jam.length) || 0;
      lengthByLevel[level] += jamLength;
    }

    const reportedKm = lengthByLevel.reduce((sum, len) => sum + len, 0) / 1000;
    const totalKm = Math.max(this.totalNetworkKm, reportedKm);
    const freeFlowKm = Math.max(0, (totalKm - reportedKm) * 1000);
    lengthByLevel[0] += freeFlowKm;

    const levelPercentages = lengthByLevel.map((len) =>
      totalKm > 0 ? (len / (totalKm * 1000)) * 100 : 0,
    );

    const dominantLevel = lengthByLevel.indexOf(Math.max(...lengthByLevel));
    const criticalPercentage = levelPercentages[4] + levelPercentages[5];
    const warningPercentage = levelPercentages[2] + levelPercentages[3];

    let status = 'Red Operativa';
    let color = 'green';

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
      lengthByLevel: lengthByLevel.map((l) => l / 1000),
      dominantLevel,
      status,
      color,
    };
  });

  toggleExpanded(): void {
    this.isExpanded.update((v) => !v);
  }

  toggleMenu(menuId: string): void {
    if (this.expandedMenus.has(menuId)) {
      this.expandedMenus.delete(menuId);
    } else {
      this.expandedMenus.add(menuId);
    }
  }

  getNetworkStatusClass(): string {
    const color = this.networkStatus().color;
    switch (color) {
      case 'green':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'yellow':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'orange':
        return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'red':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'darkred':
        return 'bg-red-700/20 border-red-700/50 text-red-300';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  }

  getNetworkStatusEmoji(): string {
    const level = this.networkStatus().dominantLevel;
    return this.jamLevels[level]?.emoji || '🟢';
  }

  getLevelPercentage(level: number): number {
    return this.networkStatus().levelPercentages[level] || 0;
  }

  getLevelKm(level: number): number {
    return this.networkStatus().lengthByLevel[level] || 0;
  }

  onGroupSelect(value: string): void {
    this.onGroupChange.emit(value || null);
    this.onPolygonChange.emit(null);
  }

  onPolygonSelect(value: string): void {
    this.onPolygonChange.emit(value || null);
  }

  clearFilters(): void {
    this.onPolygonChange.emit(null);
    this.onGroupChange.emit(null);
  }
}

import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ApiService, Polygon, Incident, TrafficJam } from '../../core/services';
import { combineLatest, map } from 'rxjs';

// Nota: ngx-maplibre-gl se instalará después del npm install
// Este componente está preparado para integrarlo

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <div class="h-[calc(100vh-8rem)] relative">
      <!-- Mapa container -->
      <div
        #mapContainer
        class="absolute inset-0 rounded-lg overflow-hidden border border-[var(--border)]"
      >
        <!-- Placeholder hasta que se instale ngx-maplibre-gl -->
        <div
          class="h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800"
        >
          <div class="text-6xl mb-4">🗺️</div>
          <h3 class="text-xl font-semibold mb-2">MapLibre GL - Pendiente de instalación</h3>
          <p class="text-[var(--secondary)] mb-4">
            Ejecutar: <code class="bg-[var(--muted)] px-2 py-1 rounded">npm install</code> para
            habilitar el mapa
          </p>

          <!-- Stats mientras tanto -->
          <div class="grid grid-cols-3 gap-4 mt-4">
            @if (stats$ | async; as stats) {
              <div class="bg-[var(--card)] p-4 rounded-lg shadow">
                <div class="text-2xl font-bold text-blue-500">{{ stats.polygonCount }}</div>
                <div class="text-sm text-[var(--secondary)]">Polígonos</div>
              </div>
              <div class="bg-[var(--card)] p-4 rounded-lg shadow">
                <div class="text-2xl font-bold text-red-500">{{ stats.incidentCount }}</div>
                <div class="text-sm text-[var(--secondary)]">Incidentes</div>
              </div>
              <div class="bg-[var(--card)] p-4 rounded-lg shadow">
                <div class="text-2xl font-bold text-orange-500">{{ stats.jamCount }}</div>
                <div class="text-sm text-[var(--secondary)]">Atascos</div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Sidebar de filtros (overlay) -->
      <div
        class="absolute top-4 left-4 w-64 bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] p-4"
      >
        <h4 class="font-semibold mb-3">Capas</h4>
        <div class="space-y-2 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked class="rounded" />
            <span>Polígonos</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked class="rounded" />
            <span>Incidentes</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked class="rounded" />
            <span>Atascos</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" class="rounded" />
            <span>Flujo de tráfico</span>
          </label>
        </div>
      </div>

      <!-- Info de coordenadas -->
      <div
        class="absolute bottom-4 left-4 bg-[var(--card)]/90 backdrop-blur px-3 py-2 rounded text-sm text-[var(--secondary)]"
      >
        📍 Córdoba, Argentina (-31.42, -64.19)
      </div>
    </div>
  `,
})
export class MapComponent implements OnInit {
  private apiService = inject(ApiService);

  // Observable combinado con stats
  readonly stats$ = combineLatest([
    this.apiService.polygons$,
    this.apiService.incidents$,
    this.apiService.jams$,
  ]).pipe(
    map(([polygons, incidents, jams]) => ({
      polygonCount: polygons.length,
      incidentCount: incidents.length,
      jamCount: jams.length,
    })),
  );

  ngOnInit(): void {
    console.log('📍 MapComponent initialized - waiting for ngx-maplibre-gl installation');
  }
}

/**
 * MapComponent - Mapa interactivo con MapLibre GL JS
 * Implementación imperativa (sin wrapper Angular)
 * Equivalente a: apps/frontend/src/components/map/MapLibreMap.tsx
 */
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Polygon, Incident, TrafficJam } from '../../core/services';
import { combineLatest, map, Subscription, filter, take } from 'rxjs';
import maplibregl, { Map, Marker, Popup, NavigationControl, GeolocateControl } from 'maplibre-gl';
import { environment } from '../../../environments/environment';

// Centro de Córdoba, Argentina
const DEFAULT_CENTER: [number, number] = [-64.1888, -31.4135];
const DEFAULT_ZOOM = 11;

// Colores por nivel de jam
const JAM_COLORS: Record<number, string> = {
  0: '#22c55e', // green
  1: '#84cc16', // lime
  2: '#eab308', // yellow
  3: '#f97316', // orange
  4: '#ef4444', // red
  5: '#991b1b', // dark red
};

// Colores por tipo de incidente
const INCIDENT_COLORS: Record<string, string> = {
  ACCIDENT: '#ef4444',
  JAM: '#f97316',
  HAZARD: '#eab308',
  ROAD_CLOSED: '#8b5cf6',
  WEATHERHAZARD: '#06b6d4',
  DEFAULT: '#6b7280',
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-[calc(100vh-8rem)] relative">
      <!-- Mapa container -->
      <div
        #mapContainer
        class="absolute inset-0 rounded-lg overflow-hidden border border-[var(--border)]"
      ></div>

      <!-- Loading overlay -->
      @if (isLoading()) {
        <div
          class="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-10"
        >
          <div class="flex flex-col items-center gap-2">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"
            ></div>
            <span class="text-[var(--secondary)]">Cargando mapa...</span>
          </div>
        </div>
      }

      <!-- Sidebar de filtros (overlay) -->
      <div
        class="absolute top-4 left-4 w-64 bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] p-4 z-20"
      >
        <h4 class="font-semibold mb-3">Capas</h4>
        <div class="space-y-2 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              [checked]="showPolygons()"
              (change)="toggleLayer('polygons')"
              class="rounded"
            />
            <span>Polígonos ({{ stats().polygonCount }})</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              [checked]="showIncidents()"
              (change)="toggleLayer('incidents')"
              class="rounded"
            />
            <span>Incidentes ({{ stats().incidentCount }})</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              [checked]="showJams()"
              (change)="toggleLayer('jams')"
              class="rounded"
            />
            <span>Atascos ({{ stats().jamCount }})</span>
          </label>
        </div>

        <hr class="my-3 border-[var(--border)]" />

        <div class="flex gap-2">
          <button
            (click)="centerMap()"
            class="flex-1 px-3 py-2 text-sm bg-[var(--primary)] text-white rounded hover:opacity-90"
          >
            📍 Centrar
          </button>
          <button
            (click)="refreshData()"
            class="flex-1 px-3 py-2 text-sm bg-[var(--muted)] rounded hover:opacity-80"
          >
            🔄 Refrescar
          </button>
        </div>
      </div>

      <!-- Info de coordenadas -->
      <div
        class="absolute bottom-4 left-4 bg-[var(--card)]/90 backdrop-blur px-3 py-2 rounded text-sm text-[var(--secondary)] z-20"
      >
        📍 {{ cursorCoords() }}
      </div>

      <!-- Stats panel -->
      <div
        class="absolute bottom-4 right-4 bg-[var(--card)]/90 backdrop-blur px-4 py-3 rounded-lg text-sm z-20"
      >
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-xl font-bold text-blue-500">{{ stats().polygonCount }}</div>
            <div class="text-xs text-[var(--secondary)]">Polígonos</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-red-500">{{ stats().incidentCount }}</div>
            <div class="text-xs text-[var(--secondary)]">Incidentes</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-orange-500">{{ stats().jamCount }}</div>
            <div class="text-xs text-[var(--secondary)]">Atascos</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private apiService = inject(ApiService);
  private map!: Map;
  private markers: Marker[] = [];
  private subscription = new Subscription();

  // Signals de estado
  readonly isLoading = signal(true);
  readonly showPolygons = signal(true);
  readonly showIncidents = signal(true);
  readonly showJams = signal(true);
  readonly cursorCoords = signal('Córdoba, Argentina (-31.42, -64.19)');

  // Stats combinadas
  private _stats = signal({ polygonCount: 0, incidentCount: 0, jamCount: 0 });
  readonly stats = computed(() => this._stats());

  ngOnInit(): void {
    console.log('📍 MapComponent initialized');
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.clearMarkers();
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = new maplibregl.Map({
      container: this.mapContainer.nativeElement,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Estilo gratuito
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    // Agregar controles
    this.map.addControl(new NavigationControl(), 'top-right');
    this.map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right',
    );

    // Cuando el mapa esté listo
    this.map.on('load', () => {
      console.log('🗺️ MapLibre GL loaded');
      this.isLoading.set(false);
      this.setupMapSources();
      this.subscribeToData();
    });

    // Actualizar coordenadas del cursor
    this.map.on('mousemove', (e) => {
      const { lng, lat } = e.lngLat;
      this.cursorCoords.set(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
    });
  }

  private setupMapSources(): void {
    // Source para polígonos
    this.map.addSource('polygons', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Layer de relleno para polígonos
    this.map.addLayer({
      id: 'polygons-fill',
      type: 'fill',
      source: 'polygons',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.3,
      },
    });

    // Layer de borde para polígonos
    this.map.addLayer({
      id: 'polygons-border',
      type: 'line',
      source: 'polygons',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2,
      },
    });

    // Source para jams
    this.map.addSource('jams', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Layer de líneas para jams
    this.map.addLayer({
      id: 'jams-line',
      type: 'line',
      source: 'jams',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    // Popups para polígonos
    this.map.on('click', 'polygons-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const props = feature.properties as Record<string, unknown>;
        new Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div class="p-2">
              <h3 class="font-bold">${props['name']}</h3>
              <p class="text-sm text-gray-600">${props['group']}</p>
              <p class="text-xs">Alertas: ${props['alertCount']} | Atascos: ${props['jamCount']}</p>
            </div>
          `,
          )
          .addTo(this.map);
      }
    });

    // Cursor pointer en polígonos
    this.map.on('mouseenter', 'polygons-fill', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'polygons-fill', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  private subscribeToData(): void {
    // Combinar todos los datos
    const dataSub = combineLatest([
      this.apiService.polygons$,
      this.apiService.incidents$,
      this.apiService.jams$,
    ]).subscribe(([polygons, incidents, jams]) => {
      this._stats.set({
        polygonCount: polygons.length,
        incidentCount: incidents.length,
        jamCount: jams.length,
      });

      this.updatePolygonsLayer(polygons);
      this.updateIncidentsMarkers(incidents);
      this.updateJamsLayer(jams);
    });

    this.subscription.add(dataSub);
  }

  private updatePolygonsLayer(polygons: Polygon[]): void {
    if (!this.map.getSource('polygons')) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: polygons
        .filter((p) => p.geometry)
        .map((p) => ({
          type: 'Feature' as const,
          geometry: p.geometry,
          properties: {
            id: p.id,
            name: p.name,
            group: p.group,
            state: p.state,
            color: this.getPolygonColor(p.state),
            alertCount: p.metrics?.alertCount || 0,
            jamCount: p.metrics?.jamCount || 0,
          },
        })),
    };

    (this.map.getSource('polygons') as maplibregl.GeoJSONSource).setData(geojson);

    // Mostrar/ocultar según toggle
    this.map.setLayoutProperty(
      'polygons-fill',
      'visibility',
      this.showPolygons() ? 'visible' : 'none',
    );
    this.map.setLayoutProperty(
      'polygons-border',
      'visibility',
      this.showPolygons() ? 'visible' : 'none',
    );
  }

  private updateIncidentsMarkers(incidents: Incident[]): void {
    this.clearMarkers();

    if (!this.showIncidents()) return;

    incidents.forEach((incident) => {
      const el = document.createElement('div');
      el.className = 'incident-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = INCIDENT_COLORS[incident.type] || INCIDENT_COLORS['DEFAULT'];
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      const marker = new Marker({ element: el })
        .setLngLat([incident.longitude, incident.latitude])
        .setPopup(
          new Popup({ offset: 25 }).setHTML(`
            <div class="p-2 max-w-xs">
              <h3 class="font-bold text-sm">${incident.type}</h3>
              ${incident.subtype ? `<p class="text-xs text-gray-600">${incident.subtype}</p>` : ''}
              ${incident.street ? `<p class="text-xs">📍 ${incident.street}</p>` : ''}
              ${incident.description ? `<p class="text-xs mt-1">${incident.description}</p>` : ''}
            </div>
          `),
        )
        .addTo(this.map);

      this.markers.push(marker);
    });
  }

  private updateJamsLayer(jams: TrafficJam[]): void {
    if (!this.map.getSource('jams')) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: jams
        .filter((j) => j.line && j.line.length >= 2)
        .map((j) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: j.line.map((p) => [p.x, p.y]),
          },
          properties: {
            id: j.id,
            level: j.level,
            speed: j.speed,
            delay: j.delay,
            street: j.street,
            color: JAM_COLORS[j.level] || JAM_COLORS[3],
          },
        })),
    };

    (this.map.getSource('jams') as maplibregl.GeoJSONSource).setData(geojson);

    // Mostrar/ocultar según toggle
    this.map.setLayoutProperty('jams-line', 'visibility', this.showJams() ? 'visible' : 'none');
  }

  private clearMarkers(): void {
    this.markers.forEach((m) => m.remove());
    this.markers = [];
  }

  private getPolygonColor(state: string): string {
    switch (state) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f97316';
      default:
        return '#22c55e';
    }
  }

  // === Public methods ===

  toggleLayer(layer: 'polygons' | 'incidents' | 'jams'): void {
    switch (layer) {
      case 'polygons':
        this.showPolygons.update((v) => !v);
        if (this.map.getLayer('polygons-fill')) {
          this.map.setLayoutProperty(
            'polygons-fill',
            'visibility',
            this.showPolygons() ? 'visible' : 'none',
          );
          this.map.setLayoutProperty(
            'polygons-border',
            'visibility',
            this.showPolygons() ? 'visible' : 'none',
          );
        }
        break;
      case 'incidents':
        this.showIncidents.update((v) => !v);
        // Re-render markers
        this.apiService.incidents$.pipe(take(1)).subscribe((i) => this.updateIncidentsMarkers(i));
        break;
      case 'jams':
        this.showJams.update((v) => !v);
        if (this.map.getLayer('jams-line')) {
          this.map.setLayoutProperty(
            'jams-line',
            'visibility',
            this.showJams() ? 'visible' : 'none',
          );
        }
        break;
    }
  }

  centerMap(): void {
    this.map.flyTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      duration: 1000,
    });
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }
}

/**
 * MapComponent - Mapa interactivo con MapLibre GL JS
 * Paridad con React: apps/frontend/src/components/map/MapLibreMap.tsx
 *
 * Incluye:
 * - Estilo oscuro (dark-matter)
 * - Sidebar glassmorphism con WazeOMeter
 * - Footer KPIs flotante
 * - Iconos Waze SVG dinámicos
 * - Capas de jams con efectos glow
 * - Mapa fullscreen
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
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { ApiService, Polygon, Incident, TrafficJam } from '../../core/services';
import { MapStateService } from '../../core/services/state/map-state.service';
import { combineLatest, Subscription, take, filter } from 'rxjs';
import maplibregl, { Map, Marker, Popup, NavigationControl, GeolocateControl } from 'maplibre-gl';
import { WazeOMeterComponent } from '../../shared/components/waze-o-meter/waze-o-meter.component';
import { getWazeIconSvg, loadWazeIconToMap } from '../../utils/waze-icons';

// Centro de Córdoba, Argentina
const DEFAULT_CENTER: [number, number] = [-64.1888, -31.4135];
const DEFAULT_ZOOM = 12;

// Colores por nivel de jam
const JAM_COLORS: Record<number, string> = {
  0: '#22c55e',
  1: '#84cc16',
  2: '#eab308',
  3: '#f97316',
  4: '#ef4444',
  5: '#991b1b',
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
  imports: [CommonModule, FormsModule, WazeOMeterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Contenedor principal fullscreen -->
    <div class="h-full w-full relative bg-[#222736]">
      <!-- Mapa container - fullscreen -->
      <div #mapContainer class="absolute inset-0"></div>

      <!-- Loading overlay -->
      @if (isLoading()) {
        <div
          class="absolute inset-0 bg-[#1E1E2E]/90 backdrop-blur-sm flex items-center justify-center z-[1000]"
        >
          <div class="flex flex-col items-center gap-3">
            <div
              class="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"
            ></div>
            <span class="text-gray-400 text-sm">Cargando mapa...</span>
          </div>
        </div>
      }

      <!-- Sidebar Flotante Glassmorphism -->
      <div
        class="absolute left-4 top-4 bottom-4 z-[1002] pointer-events-none flex flex-col justify-center"
      >
        <div class="pointer-events-auto h-auto max-h-full shadow-2xl rounded-2xl overflow-hidden">
          <div
            class="bg-[#1E1E2E]/95 backdrop-blur-xl text-white flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-white/5"
            [style.width.px]="sidebarExpanded() ? 300 : 72"
          >
            <!-- Header -->
            <div class="p-5 flex items-center justify-between">
              @if (sidebarExpanded()) {
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20"
                  >
                    <svg
                      class="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      ></path>
                    </svg>
                  </div>
                  <span class="font-bold text-lg tracking-tight">Controles</span>
                </div>
              }
              <button
                (click)="toggleSidebar()"
                class="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
              >
                @if (sidebarExpanded()) {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    ></path>
                  </svg>
                }
              </button>
            </div>

            <!-- WazeOMeter -->
            @if (sidebarExpanded()) {
              <div class="px-4 pb-4">
                <app-waze-o-meter
                  [jams]="_jamsData()"
                  title="Estado de la Red Vial"
                ></app-waze-o-meter>
              </div>
              <!-- Capas del Mapa -->
              <nav class="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                <div class="mb-2">
                  <button
                    (click)="toggleLayersMenu()"
                    class="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all bg-white/5 text-white"
                  >
                    <svg
                      class="w-5 h-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      ></path>
                    </svg>
                    <span class="flex-1 text-left text-sm font-medium">Capas del Mapa</span>
                    <svg
                      class="w-4 h-4 text-gray-500"
                      [class.rotate-180]="layersMenuOpen()"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </button>

                  @if (layersMenuOpen()) {
                    <div class="ml-4 pl-3 border-l border-white/5 mt-1 space-y-1">
                      <button
                        (click)="toggleLayer('incidents')"
                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-400 hover:text-white"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          ></path>
                        </svg>
                        <span>Incidentes Waze</span>
                        <div
                          class="ml-auto w-8 h-4 rounded-full flex items-center p-0.5 transition-colors"
                          [class]="
                            showIncidents()
                              ? 'bg-blue-500 justify-end'
                              : 'bg-gray-700 justify-start'
                          "
                        >
                          <div class="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      </button>
                    </div>
                  }
                </div>

                <!-- Filtros de Polígonos -->
                <div class="mt-4 pt-4 border-t border-white/10">
                  <button
                    (click)="toggleFiltersMenu()"
                    class="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-white/5 text-gray-400 hover:text-white"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      ></path>
                    </svg>
                    <span class="flex-1 text-left text-sm font-medium">Filtros</span>
                    @if (selectedGroup() || selectedPolygonId()) {
                      <span
                        class="w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 mr-2"
                      ></span>
                    }
                    <svg
                      class="w-4 h-4 text-gray-500"
                      [class.rotate-180]="filtersMenuOpen()"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </button>

                  @if (filtersMenuOpen()) {
                    <div class="px-2 mt-2">
                      <div class="bg-black/20 rounded-xl p-3 space-y-3">
                        <!-- Filtro por Grupo -->
                        <div>
                          <label
                            class="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 px-1"
                            >Grupo</label
                          >
                          <select
                            [ngModel]="selectedGroup() || ''"
                            (ngModelChange)="onGroupChange($event)"
                            class="w-full px-3 py-2 bg-[#12121a] border border-white/10 text-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos</option>
                            @for (group of polygonGroups(); track group) {
                              <option [value]="group">{{ group }}</option>
                            }
                          </select>
                        </div>

                        <!-- Filtro por Polígono -->
                        <div>
                          <label
                            class="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 px-1"
                            >Polígono</label
                          >
                          <select
                            [ngModel]="selectedPolygonId() || ''"
                            (ngModelChange)="onPolygonFilterChange($event)"
                            class="w-full px-3 py-2 bg-[#12121a] border border-white/10 text-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Todos</option>
                            @for (polygon of filteredPolygons(); track polygon.id) {
                              <option [value]="polygon.id">{{ polygon.name }}</option>
                            }
                          </select>
                        </div>

                        <!-- Contador y botón limpiar -->
                        <div class="flex items-center justify-between px-1 pt-1">
                          <span class="text-[10px] text-gray-500"
                            >{{ filteredPolygons().length }} resultados</span
                          >
                          @if (selectedGroup() || selectedPolygonId()) {
                            <button
                              (click)="clearFilters()"
                              class="text-[10px] text-blue-400 hover:text-blue-300 font-medium hover:underline"
                            >
                              Limpiar todo
                            </button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </nav>
            }
          </div>
        </div>
      </div>

      <!-- Footer KPIs Flotante -->
      <div
        class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-auto max-w-[90%] px-4 pointer-events-none"
      >
        <div
          class="bg-zinc-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-3 pointer-events-auto flex items-center justify-center gap-6 md:gap-10"
        >
          <!-- Fluidez -->
          <button
            class="flex items-center gap-3 min-w-max cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
            (click)="onKpiClick('fluidity')"
          >
            <div class="p-2 rounded-xl text-green-400 bg-green-900/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-[10px] font-bold uppercase text-gray-400 tracking-wider"
                >FLUIDEZ</span
              >
              <span class="text-xl font-black font-mono text-gray-100"
                >{{ kpis().fluidityPercentage }}%</span
              >
            </div>
          </button>

          <!-- Eventos -->
          <button
            class="flex items-center gap-3 min-w-max cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
            (click)="onKpiClick('events')"
          >
            <div
              class="p-2 rounded-xl"
              [class]="
                stats().incidentCount > 0
                  ? 'text-red-400 bg-red-900/20'
                  : 'text-green-400 bg-green-900/20'
              "
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                ></path>
              </svg>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-[10px] font-bold uppercase text-gray-400 tracking-wider"
                >EVENTOS</span
              >
              <span class="text-xl font-black font-mono text-gray-100">{{
                stats().incidentCount
              }}</span>
            </div>
          </button>

          <!-- Accidentes -->
          <button
            class="flex items-center gap-3 min-w-max cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
            (click)="onKpiClick('accidents')"
          >
            <div class="p-2 rounded-xl text-orange-400 bg-orange-900/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 16v3M19 9v4m-9 4h.01M12 3v4m0 4v.01M12 14v4m-7-3h3m4-9h4m4 0h3M5 16h3"
                ></path>
              </svg>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-[10px] font-bold uppercase text-gray-400 tracking-wider"
                >ACCIDENTES</span
              >
              <span class="text-xl font-black font-mono text-gray-100">{{
                kpis().roadAccidents || 0
              }}</span>
            </div>
          </button>

          <!-- Riesgos -->
          <button
            class="flex items-center gap-3 min-w-max cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
            (click)="onKpiClick('risks')"
          >
            <div class="p-2 rounded-xl text-purple-400 bg-purple-900/20">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                ></path>
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-[10px] font-bold uppercase text-gray-400 tracking-wider"
                >RIESGOS</span
              >
              <span class="text-xl font-black font-mono text-gray-100">{{
                kpis().criticalPolygons || 0
              }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
  @Input() selectedIncidentId?: string | null;
  @Input() forcedIncident?: any | null;
  @Output() polygonSelected = new EventEmitter<string>();

  private apiService = inject(ApiService);
  private mapState = inject(MapStateService);
  private router = inject(Router);
  private map!: Map;
  private markers: Marker[] = [];
  private subscription = new Subscription();

  // Data as signals para que computed funcionen
  private readonly _polygonsData = signal<Polygon[]>([]);
  private readonly _incidentsData = signal<Incident[]>([]);
  protected readonly _jamsData = signal<TrafficJam[]>([]);
  private currentPopup: Popup | null = null;

  // Signals de estado
  readonly isLoading = signal(true);
  readonly showPolygons = signal(true);
  readonly showIncidents = signal(true);
  readonly showJams = signal(true);
  readonly sidebarExpanded = signal(true);
  readonly layersMenuOpen = signal(true);
  readonly filtersMenuOpen = signal(true);
  readonly selectedGroup = signal<string | null>(null);
  readonly selectedPolygonId = signal<string | null>(null);

  // Stats
  private _stats = signal({ polygonCount: 0, incidentCount: 0, jamCount: 0 });
  readonly stats = computed(() => this._stats());

  // KPIs
  private _kpis = signal({
    fluidityPercentage: 94,
    roadAccidents: 0,
    criticalPolygons: 0,
  });
  readonly kpis = computed(() => this._kpis());

  // Polygon groups - ahora reacciona a _polygonsData signal
  readonly polygonGroups = computed(() => {
    const groups = new Set<string>();
    this._polygonsData().forEach((p) => {
      if (p.group) groups.add(p.group);
    });
    return Array.from(groups).sort();
  });

  // Filtered polygons - ahora reacciona a _polygonsData signal
  readonly filteredPolygons = computed(() => {
    let filtered = this._polygonsData();
    if (this.selectedGroup()) {
      filtered = filtered.filter((p) => p.group === this.selectedGroup());
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    console.log('📍 MapComponent initialized');

    // 1. Manejar estado inicial (carga directa o primera navegación)
    this.handleNavigationState();

    // 2. Suscribirse a eventos de navegación para manejar clics en notificaciones
    // cuando el componente ya está montado (router no recrea el componente)
    this.subscription.add(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
        this.handleNavigationState();
      }),
    );

    // 3. Suscribirse al servicio de estado del mapa (navegación imperativa)
    this.subscription.add(
      this.mapState.focusRequest$.subscribe((request) => {
        console.log('🔔 Map focus request received:', request);

        if (request.type === 'INCIDENT' && request.data) {
          // Actualizar forcedIncident con los datos recibidos
          this.forcedIncident = request.data;

          // Si tiene ID, actualizar el filtro seleccionado
          if (request.id) {
            this.selectedIncidentId = request.id;
          }

          // Ejecutar foco inmediato
          if (!this.isLoading() && this.map) {
            this.focusSelectedIncident();
          }
        }
      }),
    );
  }

  private handleNavigationState(): void {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;

    if (state && (state['forcedIncident'] || state['selectedPolygonId'] || state['focusEventId'])) {
      console.log('🔔 Navigation state received:', state);

      // Si viene un incidente forzado desde notificaciones
      if (state['forcedIncident']) {
        this.forcedIncident = state['forcedIncident'];
        console.log('📍 Forced incident from notification:', this.forcedIncident);
      }

      // Si viene un selectedPolygonId
      if (state['selectedPolygonId']) {
        this.selectedPolygonId.set(state['selectedPolygonId']);
        console.log('📍 Selected polygon from notification:', state['selectedPolygonId']);
      }

      // Si viene un selectedIncidentId
      if (state['focusEventId']) {
        this.selectedIncidentId = state['focusEventId'];
        console.log('📍 Selected incident from notification:', state['focusEventId']);
      }

      // Si el mapa ya está cargado, enfocar inmediatamente
      if (!this.isLoading()) {
        this.focusSelectedIncident();
      }
    }
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
      // Estilo OSCURO como React
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 40,
      bearing: 0,
      attributionControl: false,
    });

    // Agregar controles
    this.map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
    this.map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right',
    );

    // Cuando el mapa esté listo
    this.map.on('load', () => {
      console.log('🗺️ MapLibre GL loaded (dark mode)');
      this.isLoading.set(false);
      this.preloadWazeIcons();
      this.setupMapSources();
      this.subscribeToData();
      // Enfocar incidente si viene de notificación
      this.focusSelectedIncident();
    });

    // Listener para iconos faltantes
    this.map.on('styleimagemissing', (e: any) => {
      const id = e.id;
      if (id && id.startsWith('waze-')) {
        this.loadWazeIcon(id);
      }
    });
  }

  private preloadWazeIcons(): void {
    const commonIcons = [
      'waze-accident',
      'waze-jam',
      'waze-hazard',
      'waze-construction',
      'waze-roadclosed',
      'waze-road_closed',
      'waze-police',
      'waze-weatherhazard',
    ];
    commonIcons.forEach((iconId) => this.loadWazeIcon(iconId));
  }

  private loadWazeIcon(iconId: string): void {
    if (this.map.hasImage(iconId)) return;

    const cleanId = iconId.replace(/^waze-/, '');
    const firstDashIndex = cleanId.indexOf('-');

    let type: string;
    let subtype: string | undefined;

    if (firstDashIndex === -1) {
      type = cleanId;
    } else {
      type = cleanId.substring(0, firstDashIndex);
      subtype = cleanId.substring(firstDashIndex + 1);
    }

    const svgString = getWazeIconSvg(type, subtype);
    if (!svgString) return;

    const img = new Image(64, 64);
    img.onload = () => {
      if (!this.map.hasImage(iconId)) {
        this.map.addImage(iconId, img, { sdf: false });
        this.map.triggerRepaint();
      }
    };

    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  }

  private setupMapSources(): void {
    // Source para polígonos
    this.map.addSource('polygons', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Layer de relleno para polígonos (opacidad baja como React)
    this.map.addLayer({
      id: 'polygons-fill',
      type: 'fill',
      source: 'polygons',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.1,
      },
    });

    // Layer de borde para polígonos
    this.map.addLayer({
      id: 'polygons-border',
      type: 'line',
      source: 'polygons',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1,
        'line-opacity': 0.5,
      },
    });

    // Source para jams
    this.map.addSource('jams', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Layer de glow exterior para jams
    this.map.addLayer({
      id: 'jams-glow',
      type: 'line',
      source: 'jams',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 12,
        'line-opacity': 0.3,
        'line-blur': 4,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });

    // Layer principal para jams
    this.map.addLayer({
      id: 'jams-line',
      type: 'line',
      source: 'jams',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 5,
        'line-opacity': 0.9,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    });

    // Source para incidentes
    this.map.addSource('incidents', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Layer base para incidentes (círculo de fondo)
    this.map.addLayer({
      id: 'incidents-base',
      type: 'circle',
      source: 'incidents',
      paint: {
        'circle-radius': 14,
        'circle-color': '#ffffff',
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#222222',
      },
    });

    // Layer de iconos para incidentes
    this.map.addLayer({
      id: 'incidents-icon',
      type: 'symbol',
      source: 'incidents',
      layout: {
        'icon-image': ['get', 'iconId'],
        'icon-size': 0.75,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': 1,
      },
    });

    // Click handlers
    this.map.on('click', 'polygons-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const props = feature.properties as Record<string, unknown>;
        const polygonId = props['id'] as string;
        this.polygonSelected.emit(polygonId);
        this.selectedPolygonId.set(polygonId);
        this.zoomToPolygon(polygonId);
      }
    });

    this.map.on('click', 'incidents-base', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const props = feature.properties as Record<string, unknown>;
        this.showIncidentPopup(e.lngLat, props);
      }
    });

    // Cursor pointer
    this.map.on('mouseenter', 'polygons-fill', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'polygons-fill', () => {
      this.map.getCanvas().style.cursor = '';
    });
    this.map.on('mouseenter', 'incidents-base', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'incidents-base', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  private showIncidentPopup(lngLat: maplibregl.LngLat, props: Record<string, unknown>): void {
    // Cerrar popup anterior
    if (this.currentPopup) {
      this.currentPopup.remove();
    }

    const type = String(props['type'] || 'HAZARD');
    const subtype = String(props['subtype'] || '');
    const street = String(props['street'] || 'Ubicación desconocida');
    const description = String(props['description'] || 'Sin descripción');
    const timestamp = props['timestamp']
      ? new Date(String(props['timestamp'])).toLocaleString('es-AR')
      : 'N/A';
    const reportBy = String(props['reportBy'] || 'Wazer');
    const confidence = Number(props['confidence'] || 0);
    const nThumbsUp = Number(props['nThumbsUp'] || 0);
    const id = String(props['id'] || '');

    // Traducción de tipos
    const typeTranslations: Record<string, string> = {
      ACCIDENT: 'Accidente',
      JAM: 'Congestión',
      HAZARD: 'Peligro',
      ROAD_CLOSED: 'Vía Cerrada',
      WEATHERHAZARD: 'Clima Adverso',
      CONSTRUCTION: 'Construcción',
    };
    const typeLabel = typeTranslations[type.toUpperCase()] || type;

    const html = `
      <div class="rounded-xl shadow-2xl overflow-hidden min-w-[300px] bg-zinc-900 text-white">
        <!-- Header -->
        <div class="flex items-start justify-between p-4 border-b border-zinc-700 bg-zinc-800/50">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center text-xl">
              ${type === 'ACCIDENT' ? '💥' : type === 'JAM' ? '🚗' : type === 'ROAD_CLOSED' ? '🚧' : type === 'WEATHERHAZARD' ? '🌧️' : '⚠️'}
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">${street}</p>
              <h3 class="font-bold text-lg leading-tight">${typeLabel}</h3>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-3 text-sm">
          <div class="grid grid-cols-[100px_1fr] gap-y-2 gap-x-2">
            <span class="font-medium text-gray-400">Tipo</span>
            <span class="font-medium">${typeLabel}</span>

            <span class="font-medium text-gray-400">Fecha</span>
            <span>${timestamp}</span>

            <span class="font-medium text-gray-400">Descripción</span>
            <span class="leading-snug">${description}</span>

            <span class="font-medium text-gray-400">Informante</span>
            <span class="font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded w-fit text-blue-400">${reportBy}</span>

            <span class="font-medium text-gray-400">ID</span>
            <span class="text-[10px] uppercase font-mono text-gray-500 break-all">${id}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 bg-zinc-800 border-t border-zinc-700 flex items-center justify-between text-xs">
          <span class="flex items-center gap-1.5 text-gray-400">
            👍 ${nThumbsUp} valoraciones
          </span>
          <div class="flex items-center gap-1.5 px-3 py-1 bg-zinc-700 rounded-full">
            🛡️ Confianza: ${confidence}/10
          </div>
        </div>
      </div>
    `;

    this.currentPopup = new Popup({
      closeButton: true,
      className: 'dark-popup',
      maxWidth: '350px',
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(this.map);
  }

  private focusSelectedIncident(): void {
    if (!this.selectedIncidentId && !this.forcedIncident) return;

    setTimeout(() => {
      let incident: Incident | null = null;
      let lng = 0,
        lat = 0;

      // Helper idéntico a React para validar coordenadas
      const isValidCoord = (v1: any, v2: any) =>
        typeof v1 === 'number' && typeof v2 === 'number' && !isNaN(v1) && !isNaN(v2);

      // Buscar por forcedIncident primero
      if (this.forcedIncident) {
        const fi = this.forcedIncident;

        // 1. Formato Waze: location.x (longitude) / location.y (latitude)
        if (fi.location && isValidCoord(fi.location.y, fi.location.x)) {
          lat = fi.location.y;
          lng = fi.location.x;
        }
        // 2. Formato genérico: location.lat/lng
        else if (fi.location && isValidCoord(fi.location.lat, fi.location.lng)) {
          lat = fi.location.lat;
          lng = fi.location.lng;
        }
        // 3. Formato directo: lat/lng (top level)
        else if (isValidCoord(fi.lat, fi.lng)) {
          lat = fi.lat;
          lng = fi.lng;
        }
        // 4. Formato directo: latitude/longitude (top level)
        else if (isValidCoord(fi.latitude, fi.longitude)) {
          lat = fi.latitude;
          lng = fi.longitude;
        }

        incident = fi;
      }
      // Buscar por ID en datos actuales
      else if (this.selectedIncidentId) {
        incident =
          this._incidentsData().find((i: Incident) => i.id === this.selectedIncidentId) || null;
        if (incident && isValidCoord(incident.latitude, incident.longitude)) {
          lat = incident.latitude;
          lng = incident.longitude;
        }
      }

      if (incident && isValidCoord(lat, lng)) {
        console.log('📍 Focusing incident:', incident.id, { lat, lng });
        this.map.flyTo({
          center: [lng, lat],
          zoom: 16,
          duration: 1500,
          pitch: 50,
        });

        // Mostrar popup del incidente
        const props: Record<string, unknown> = {
          id: incident.id,
          type: incident.type,
          subtype: incident.subtype || '',
          street: incident.street || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          description: incident.description || 'Sin descripción',
          timestamp: incident.timestamp,
          reportBy: (incident as any).reportBy || 'Wazer',
          confidence: (incident as any).confidence || 0,
          nThumbsUp: (incident as any).nThumbsUp || 0,
        };
        this.showIncidentPopup(new maplibregl.LngLat(lng, lat), props);
      }
    }, 500);
  }

  private subscribeToData(): void {
    const dataSub = combineLatest([
      this.apiService.polygons$,
      this.apiService.incidents$,
      this.apiService.jams$,
    ]).subscribe(([polygons, incidents, jams]) => {
      // Actualizar signals de datos
      this._polygonsData.set(polygons);
      this._incidentsData.set(incidents);
      this._jamsData.set(jams);

      this._stats.set({
        polygonCount: polygons.length,
        incidentCount: incidents.length,
        jamCount: jams.length,
      });

      // Calcular KPIs
      const criticalPolygons = polygons.filter((p) => p.state === 'high').length;
      const accidents = incidents.filter((i) => i.type?.toLowerCase() === 'accident').length;
      this._kpis.set({
        fluidityPercentage: Math.max(0, 100 - jams.length),
        roadAccidents: accidents,
        criticalPolygons,
      });

      // Aplicar filtros a polígonos
      this.updatePolygonsLayerFiltered();
      this.updateIncidentsLayer(incidents);
      this.updateJamsLayer(jams);
    });

    this.subscription.add(dataSub);
  }

  private updatePolygonsLayerFiltered(): void {
    if (!this.map.getSource('polygons')) return;

    // Filtrar polígonos según los filtros seleccionados
    let polygons = this._polygonsData();

    console.log('🔺 updatePolygonsLayerFiltered - Total polígonos:', polygons.length);

    if (this.selectedGroup()) {
      polygons = polygons.filter((p) => p.group === this.selectedGroup());
    }

    if (this.selectedPolygonId()) {
      polygons = polygons.filter((p) => p.id === this.selectedPolygonId());
    }

    // Log para debug: mostrar estructura del primer polígono
    if (polygons.length > 0) {
      console.log('🔺 Primer polígono:', {
        id: polygons[0].id,
        name: polygons[0].name,
        state: polygons[0].state,
        hasGeometry: !!polygons[0].geometry,
        geometryType: polygons[0].geometry?.type,
        coordinatesLength: polygons[0].geometry?.coordinates?.[0]?.length,
      });
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: polygons
        .filter((p) => p.geometry && p.geometry.coordinates)
        .map((p) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: p.geometry.coordinates,
          },
          properties: {
            id: p.id,
            name: p.name,
            group: p.group,
            state: p.state,
            color: this.getPolygonColor(p.state),
            isSelected: p.id === this.selectedPolygonId() ? 1 : 0,
          },
        })),
    };

    console.log('🔺 GeoJSON Features generadas:', geojson.features.length);

    (this.map.getSource('polygons') as maplibregl.GeoJSONSource).setData(geojson);
  }

  private updateIncidentsLayer(incidents: Incident[]): void {
    if (!this.map.getSource('incidents')) return;
    if (!this.showIncidents()) {
      (this.map.getSource('incidents') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      });
      return;
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: incidents.map((inc) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [inc.longitude, inc.latitude],
        },
        properties: {
          id: inc.id,
          type: inc.type,
          subtype: inc.subtype || '',
          street: inc.street || '',
          description: inc.description || '',
          iconId: `waze-${inc.type.toLowerCase()}${inc.subtype ? '-' + inc.subtype.toLowerCase() : ''}`,
        },
      })),
    };

    (this.map.getSource('incidents') as maplibregl.GeoJSONSource).setData(geojson);
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
        return '#eab308';
      default:
        return '#22c55e';
    }
  }

  private zoomToPolygon(polygonId: string): void {
    const polygon = this._polygonsData().find((p: Polygon) => p.id === polygonId);
    if (!polygon || !polygon.geometry?.coordinates?.[0]) return;

    const coords = polygon.geometry.coordinates[0];
    let minLng = 180,
      maxLng = -180,
      minLat = 90,
      maxLat = -90;

    coords.forEach((coord: number[]) => {
      const lng = coord[0];
      const lat = coord[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    this.map.fitBounds(new maplibregl.LngLatBounds([minLng, minLat], [maxLng, maxLat]), {
      padding: 50,
      duration: 1000,
    });
  }

  // === Public methods ===

  toggleSidebar(): void {
    this.sidebarExpanded.update((v) => !v);
  }

  toggleLayersMenu(): void {
    this.layersMenuOpen.update((v) => !v);
  }

  toggleFiltersMenu(): void {
    this.filtersMenuOpen.update((v) => !v);
  }

  toggleLayer(layer: 'polygons' | 'incidents' | 'jams'): void {
    if (layer === 'incidents') {
      this.showIncidents.update((v) => !v);
      this.apiService.incidents$.pipe(take(1)).subscribe((incidents) => {
        this.updateIncidentsLayer(incidents);
      });
    }
  }

  onGroupChange(group: string): void {
    this.selectedGroup.set(group || null);
    this.selectedPolygonId.set(null);
    // Actualizar mapa con filtro
    this.updatePolygonsLayerFiltered();
  }

  onPolygonFilterChange(polygonId: string): void {
    this.selectedPolygonId.set(polygonId || null);
    // Actualizar mapa con filtro
    this.updatePolygonsLayerFiltered();
    if (polygonId) {
      this.zoomToPolygon(polygonId);
    }
  }

  clearFilters(): void {
    this.selectedGroup.set(null);
    this.selectedPolygonId.set(null);
    // Mostrar todos los polígonos
    this.updatePolygonsLayerFiltered();
  }

  onKpiClick(kpi: string): void {
    switch (kpi) {
      case 'events':
        this.router.navigate(['/alertas']);
        break;
      case 'accidents':
        this.router.navigate(['/siniestros']);
        break;
      case 'risks':
        this.router.navigate(['/riesgos']);
        break;
    }
  }
}

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ApiService, Incident } from '../../core/services';
import { ModernHeaderComponent } from '../../shared/components/modern-header/modern-header.component';
import { MiniMapComponent } from '../../shared/components/mini-map/mini-map.component';

interface AccidentData {
  id: string;
  title: string;
  severity: number;
  timestamp: Date;
  lat: number;
  lng: number;
  street?: string;
  city?: string;
  description?: string;
  type?: string;
  subtype?: string;
  operatorNotes?: string;
  wazeId?: string;
  reliability?: number;
  media: { id: string; type: 'image' | 'video'; url: string; name?: string }[];
  weather?: {
    temperature?: number;
    precipitation?: number;
    wind?: number;
    visibility?: number;
  };
}

@Component({
  selector: 'app-accidents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    ModernHeaderComponent,
    MiniMapComponent,
  ],
  template: `
    <div class="min-h-screen bg-veltrix-bg flex flex-col">
      <!-- Header -->
      <app-modern-header (refresh)="refreshData()" />

      <!-- Main Content -->
      <div class="flex-1 p-6">
        <!-- Page Title -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-red-500/20 rounded-xl">
              <ng-icon name="lucideCar" class="text-red-500" size="24" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-veltrix-text">Siniestros Viales</h1>
              <p class="text-sm text-veltrix-muted">Registro y seguimiento de accidentes de tránsito</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="backfillWeather()"
              class="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all"
            >
              <ng-icon name="lucideCloudRain" size="16" />
              <span>Backfill Clima</span>
            </button>
            <button class="flex items-center gap-2 px-4 py-2 bg-veltrix-primary text-white rounded-xl hover:brightness-110 transition-all">
              <ng-icon name="lucidePlus" size="16" />
              <span>Nuevo Accidente</span>
            </button>
          </div>
        </div>

        <!-- Split View Container -->
        <div class="flex gap-6 h-[calc(100vh-280px)]">
          <!-- Left: Accident List -->
          <div class="w-96 flex flex-col bg-veltrix-card rounded-2xl border border-veltrix-border overflow-hidden">
            <!-- Filters -->
            <div class="p-4 border-b border-veltrix-border">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-veltrix-muted mb-1 block">Desde</label>
                  <input
                    type="date"
                    [(ngModel)]="dateFrom"
                    class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                  />
                </div>
                <div>
                  <label class="text-xs text-veltrix-muted mb-1 block">Hasta</label>
                  <input
                    type="date"
                    [(ngModel)]="dateTo"
                    class="w-full px-3 py-2 bg-veltrix-bg border border-veltrix-border rounded-lg text-veltrix-text text-sm focus:outline-none focus:ring-2 focus:ring-veltrix-primary/50"
                  />
                </div>
              </div>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto">
              @for (accident of filteredAccidents(); track accident.id) {
                <div
                  (click)="selectAccident(accident)"
                  class="p-4 border-b border-veltrix-border cursor-pointer transition-all hover:bg-veltrix-bg/50"
                  [class.bg-blue-500/10]="selectedAccident()?.id === accident.id"
                  [class.border-l-4]="selectedAccident()?.id === accident.id"
                  [class.border-l-blue-500]="selectedAccident()?.id === accident.id"
                >
                  <!-- Top row: severity + timestamp -->
                  <div class="flex items-center justify-between mb-2">
                    <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
                          [class]="getSeverityClass(accident.severity)">
                      {{ getSubtypeLabel(accident.subtype) }}
                    </span>
                    <span class="text-[10px] text-veltrix-muted flex items-center gap-1">
                      <ng-icon name="lucideClock" size="10" />
                      {{ formatDateTime(accident.timestamp) }}
                    </span>
                  </div>
                  <!-- Title -->
                  <div class="text-sm font-semibold text-veltrix-text truncate">
                    {{ accident.street || accident.description || 'Ubicación desconocida' }}
                  </div>
                  <!-- Media preview -->
                  @if (accident.media.length > 0) {
                    <div class="flex items-center gap-1 mt-2">
                      @for (media of accident.media | slice:0:3; track media.id) {
                        <div class="w-6 h-6 rounded-full bg-veltrix-bg flex items-center justify-center">
                          <ng-icon [name]="media.type === 'video' ? 'lucidePlay' : 'lucideImage'" class="text-veltrix-muted" size="12" />
                        </div>
                      }
                      @if (accident.media.length > 3) {
                        <span class="text-[10px] text-veltrix-muted">+{{ accident.media.length - 3 }} archivos</span>
                      }
                    </div>
                  }
                </div>
              } @empty {
                <div class="flex flex-col items-center justify-center h-full text-veltrix-muted">
                  <ng-icon name="lucideCar" size="48" class="opacity-30 mb-3" />
                  <p>No hay accidentes registrados</p>
                </div>
              }
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-veltrix-border flex items-center justify-between">
              <button
                (click)="prevPage()"
                [disabled]="currentPage() === 0"
                class="p-2 rounded-lg border border-veltrix-border hover:bg-veltrix-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ng-icon name="lucideChevronLeft" size="16" class="text-veltrix-muted" />
              </button>
              <span class="text-xs text-veltrix-muted">Página {{ currentPage() + 1 }}</span>
              <button
                (click)="nextPage()"
                [disabled]="filteredAccidents().length < pageSize"
                class="p-2 rounded-lg border border-veltrix-border hover:bg-veltrix-bg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ng-icon name="lucideChevronRight" size="16" class="text-veltrix-muted" />
              </button>
            </div>
          </div>

          <!-- Right: Detail Panel -->
          <div class="flex-1 bg-veltrix-card rounded-2xl border border-veltrix-border overflow-hidden">
            @if (selectedAccident(); as accident) {
              <div class="h-full overflow-y-auto p-6">
                <!-- Header -->
                <div class="flex items-start justify-between mb-6">
                  <div>
                    <h2 class="text-3xl font-bold text-veltrix-text">
                      {{ accident.street || accident.description || 'Ubicación desconocida' }}
                    </h2>
                    <div class="flex items-center gap-4 mt-2">
                      <span class="px-3 py-1 text-sm font-medium rounded-lg"
                            [class]="getSeverityClass(accident.severity)">
                        Nivel {{ accident.severity }}
                      </span>
                      <span class="text-sm text-veltrix-muted flex items-center gap-1">
                        <ng-icon name="lucideMapPin" size="14" />
                        {{ accident.lat.toFixed(5) }}, {{ accident.lng.toFixed(5) }}
                      </span>
                    </div>
                  </div>
                  <button class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:brightness-110 transition-all">
                    <ng-icon name="lucideUpload" size="16" />
                    <span>Subir Respaldo</span>
                  </button>
                </div>

                <!-- Grid: Map + Weather -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <!-- Mini Map -->
                  <div class="h-[350px] rounded-2xl overflow-hidden border border-veltrix-border">
                    <app-mini-map
                      [center]="[accident.lat, accident.lng]"
                      [zoom]="15"
                      [markers]="[{
                        lat: accident.lat,
                        lng: accident.lng,
                        id: accident.id,
                        type: accident.type,
                        subtype: accident.subtype,
                        color: '#ef4444',
                        label: accident.street || 'Accidente'
                      }]"
                    />
                  </div>

                  <!-- Weather Info -->
                  <div class="bg-veltrix-bg rounded-2xl border border-veltrix-border p-4">
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center gap-2">
                        <ng-icon name="lucideCloudRain" class="text-blue-500" size="20" />
                        <h3 class="font-bold text-veltrix-text">Condiciones Climáticas al Momento</h3>
                      </div>
                      <span class="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">Open-Meteo</span>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <!-- Temperature -->
                      <div class="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                        <div class="flex items-center gap-2 mb-1">
                          <ng-icon name="lucideThermometer" class="text-orange-500" size="16" />
                          <span class="text-xs text-orange-600 dark:text-orange-400">Temperatura</span>
                        </div>
                        <span class="text-xl font-bold text-orange-700 dark:text-orange-300">
                          {{ accident.weather?.temperature || '--' }}°C
                        </span>
                      </div>

                      <!-- Precipitation -->
                      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                        <div class="flex items-center gap-2 mb-1">
                          <ng-icon name="lucideCloudRain" class="text-blue-500" size="16" />
                          <span class="text-xs text-blue-600 dark:text-blue-400">Precipitación</span>
                        </div>
                        <span class="text-xl font-bold text-blue-700 dark:text-blue-300">
                          {{ accident.weather?.precipitation || '--' }} mm
                        </span>
                      </div>

                      <!-- Wind -->
                      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                        <div class="flex items-center gap-2 mb-1">
                          <ng-icon name="lucideWind" class="text-gray-500" size="16" />
                          <span class="text-xs text-gray-600 dark:text-gray-400">Viento</span>
                        </div>
                        <span class="text-xl font-bold text-gray-700 dark:text-gray-300">
                          {{ accident.weather?.wind || '--' }} km/h
                        </span>
                      </div>

                      <!-- Visibility -->
                      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                        <div class="flex items-center gap-2 mb-1">
                          <ng-icon name="lucideEye" class="text-purple-500" size="16" />
                          <span class="text-xs text-purple-600 dark:text-purple-400">Visibilidad</span>
                        </div>
                        <span class="text-xl font-bold text-purple-700 dark:text-purple-300">
                          {{ accident.weather?.visibility || '--' }} km
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Notes and Waze Info -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <!-- Operator Notes -->
                  <div class="bg-veltrix-bg rounded-2xl border border-veltrix-border p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <ng-icon name="lucideFileText" class="text-green-500" size="20" />
                      <h3 class="font-bold text-veltrix-text">Notas del Operador</h3>
                    </div>
                    <div class="min-h-[100px] text-sm text-veltrix-muted">
                      {{ accident.operatorNotes || 'Sin notas adicionales...' }}
                    </div>
                  </div>

                  <!-- Waze Info -->
                  <div class="bg-veltrix-bg rounded-2xl border border-veltrix-border p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <ng-icon name="lucideAlertTriangle" class="text-yellow-500" size="20" />
                      <h3 class="font-bold text-veltrix-text">Información Waze</h3>
                    </div>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-veltrix-muted">Incident ID:</span>
                        <span class="text-veltrix-text font-mono">{{ accident.wazeId || 'N/A' }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-veltrix-muted">Reliability:</span>
                        <span class="text-veltrix-text">{{ accident.reliability || 'N/A' }}/10</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Media Gallery -->
                <div class="bg-veltrix-bg rounded-2xl border border-veltrix-border p-4">
                  <div class="flex items-center gap-2 mb-4">
                    <ng-icon name="lucideImage" class="text-indigo-500" size="20" />
                    <h3 class="font-bold text-veltrix-text">Respaldo Multimedia ({{ accident.media.length }})</h3>
                  </div>

                  @if (accident.media.length > 0) {
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      @for (media of accident.media; track media.id) {
                        <div class="relative group aspect-square rounded-xl overflow-hidden bg-veltrix-card border border-veltrix-border">
                          @if (media.type === 'image') {
                            <div class="w-full h-full flex items-center justify-center">
                              <ng-icon name="lucideImage" class="text-veltrix-muted" size="32" />
                            </div>
                          } @else {
                            <div class="w-full h-full flex items-center justify-center">
                              <ng-icon name="lucidePlay" class="text-veltrix-muted" size="32" />
                            </div>
                          }
                          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs">
                            <span>{{ media.name || 'archivo' }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="h-32 border-2 border-dashed border-veltrix-border rounded-xl flex flex-col items-center justify-center text-veltrix-muted">
                      <ng-icon name="lucideUpload" size="24" class="mb-2" />
                      <p class="text-sm">No hay archivos multimedia</p>
                      <p class="text-xs">Haga clic en "Subir Respaldo" para agregar</p>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <!-- Empty State -->
              <div class="h-full flex flex-col items-center justify-center text-veltrix-muted">
                <ng-icon name="lucideCar" size="64" class="opacity-30 mb-4" />
                <h3 class="text-lg font-medium text-veltrix-text">Seleccione un Siniestro</h3>
                <p class="text-sm mt-1">Haga clic en un elemento de la lista para ver los detalles</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-veltrix-card border-t border-veltrix-border px-6 py-3">
        <div class="flex items-center justify-between text-xs text-veltrix-muted">
          <span>© 2026 <strong>Caminos de las Sierras S.A.</strong> • Desarrollado por <strong>GED</strong></span>
          <div class="flex items-center gap-6">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-success"></span> Leve</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-warning"></span> Moderado</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500"></span> Grave</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-veltrix-danger"></span> Crítico</span>
          </div>
          <span class="flex items-center gap-2">
            <span>● Waze for Cities</span>
            <span class="text-veltrix-primary">• RAC Module</span>
          </span>
        </div>
      </footer>
    </div>
  `,
})
export class AccidentsComponent implements OnInit {
  private apiService = inject(ApiService);

  // State
  dateFrom = '';
  dateTo = '';
  readonly currentPage = signal(0);
  readonly pageSize = 20;
  readonly selectedAccident = signal<AccidentData | null>(null);

  // Data
  private accidents = signal<AccidentData[]>([]);

  ngOnInit(): void {
    // Set default dates (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.dateTo = now.toISOString().split('T')[0];
    this.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

    // Subscribe to incidents and filter for accidents
    this.apiService.incidents$.subscribe(incidents => {
      if (incidents) {
        const accidentData: AccidentData[] = incidents
          .filter(i => i.type === 'ACCIDENT')
          .map(i => ({
            id: i.id,
            title: i.street || i.description || 'Accidente',
            severity: i.severity || 1,
            timestamp: new Date(i.timestamp),
            lat: i.latitude || -31.4201,
            lng: i.longitude || -64.1888,
            street: i.street,
            city: i.city,
            description: i.description,
            type: i.type,
            subtype: i.subtype,
            operatorNotes: '',
            wazeId: i.id,
            reliability: i.reliability,
            media: [],
            weather: {
              temperature: 22,
              precipitation: 0,
              wind: 15,
              visibility: 10,
            },
          }));
        this.accidents.set(accidentData);
      }
    });
  }

  refreshData(): void {
    this.apiService.refreshAll();
  }

  backfillWeather(): void {
    console.log('Backfilling weather data...');
    // TODO: Implement backfill weather API call
  }

  readonly filteredAccidents = computed(() => {
    let result = this.accidents();

    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      result = result.filter(a => a.timestamp >= from);
    }

    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(a => a.timestamp <= to);
    }

    // Paginate
    const start = this.currentPage() * this.pageSize;
    return result.slice(start, start + this.pageSize);
  });

  selectAccident(accident: AccidentData): void {
    this.selectedAccident.set(accident);
  }

  prevPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
  }

  getSeverityClass(severity: number): string {
    if (severity >= 4) return 'bg-red-600 text-white';
    if (severity >= 3) return 'bg-orange-500 text-white';
    if (severity >= 2) return 'bg-yellow-500 text-black';
    return 'bg-blue-500 text-white';
  }

  getSubtypeLabel(subtype?: string): string {
    if (!subtype) return 'Accidente';
    const labels: Record<string, string> = {
      ACCIDENT_MINOR: 'Menor',
      ACCIDENT_MAJOR: 'Mayor',
      ACCIDENT_WITH_INJURIES: 'Con Heridos',
      ACCIDENT_FATAL: 'Fatal',
    };
    return labels[subtype] || subtype.replace(/_/g, ' ');
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

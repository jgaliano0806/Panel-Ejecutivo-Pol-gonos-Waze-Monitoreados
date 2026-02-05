/**
 * AccidentsComponent - Historial de siniestros viales
 * Equivalente a: apps/frontend/src/pages/RoadAccidentsPage.tsx
 */
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface RoadAccident {
  id: string;
  waze_uuid?: string;
  type: string;
  subtype?: string;
  description?: string;
  street?: string;
  city?: string;
  latitude: number;
  longitude: number;
  polygon_id?: string;
  polygon_name?: string;
  severity?: number;
  pub_millis?: number;
  created_at: string;
  weather_data?: {
    temperature?: number;
    precipitation?: number;
    visibility?: number;
    wind_speed?: number;
    weather_code?: number;
  };
}

const SUBTYPE_LABELS: Record<string, string> = {
  ACCIDENT_MAJOR: 'Accidente grave',
  ACCIDENT_MINOR: 'Accidente menor',
  HAZARD_ON_ROAD: 'Peligro en la vía',
  HAZARD_ON_SHOULDER: 'Peligro en banquina',
  HAZARD_WEATHER: 'Condición climática',
};

@Component({
  selector: 'app-accidents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold">Siniestros Viales</h2>
          <p class="text-[var(--secondary)]">Historial y análisis de accidentes</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="loadAccidents()"
            class="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
          <div class="text-3xl font-bold">{{ accidents().length }}</div>
          <div class="text-sm text-[var(--secondary)]">Total Siniestros</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-red-300 dark:border-red-800">
          <div class="text-3xl font-bold text-red-500">{{ severeCounts().major }}</div>
          <div class="text-sm text-[var(--secondary)]">Graves</div>
        </div>
        <div
          class="bg-[var(--card)] p-4 rounded-lg border border-yellow-300 dark:border-yellow-800"
        >
          <div class="text-3xl font-bold text-yellow-500">{{ severeCounts().minor }}</div>
          <div class="text-sm text-[var(--secondary)]">Menores</div>
        </div>
        <div class="bg-[var(--card)] p-4 rounded-lg border border-blue-300 dark:border-blue-800">
          <div class="text-3xl font-bold text-blue-500">{{ withWeather() }}</div>
          <div class="text-sm text-[var(--secondary)]">Con datos meteo</div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-[var(--card)] p-4 rounded-lg border border-[var(--border)]">
        <div class="flex flex-wrap gap-4">
          <div>
            <label for="date-from" class="block text-sm font-medium mb-1">Desde</label>
            <input
              type="date"
              id="date-from"
              [(ngModel)]="dateFrom"
              class="px-3 py-2 border rounded bg-[var(--background)]"
            />
          </div>

          <div>
            <label for="date-to" class="block text-sm font-medium mb-1">Hasta</label>
            <input
              type="date"
              id="date-to"
              [(ngModel)]="dateTo"
              class="px-3 py-2 border rounded bg-[var(--background)]"
            />
          </div>

          <div>
            <label for="type-filter" class="block text-sm font-medium mb-1">Tipo</label>
            <select
              id="type-filter"
              [(ngModel)]="typeFilter"
              class="px-3 py-2 border rounded bg-[var(--background)]"
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todos</option>
              <option value="ACCIDENT_MAJOR">Graves</option>
              <option value="ACCIDENT_MINOR">Menores</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Lista de accidentes -->
      <div class="bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden">
        <div class="p-4 border-b border-[var(--border)] font-semibold">
          Historial ({{ filteredAccidents().length }})
        </div>

        @if (loading()) {
          <div class="p-8 text-center text-[var(--secondary)]">Cargando siniestros...</div>
        } @else {
          <div class="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
            @for (acc of filteredAccidents(); track acc.id) {
              <div class="p-4 hover:bg-[var(--muted)] transition-colors">
                <div class="flex items-start gap-4">
                  <!-- Icono con severidad -->
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    [class]="getSeverityBg(acc.severity)"
                  >
                    🚗
                  </div>

                  <!-- Info -->
                  <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold">{{ getSubtypeLabel(acc.subtype) }}</span>
                      <span class="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700">
                        {{ acc.polygon_name || 'Sin polígono' }}
                      </span>
                    </div>

                    @if (acc.street) {
                      <div class="text-sm text-[var(--secondary)] mt-1">
                        📍 {{ acc.street }}{{ acc.city ? ', ' + acc.city : '' }}
                      </div>
                    }

                    @if (acc.description) {
                      <div class="text-sm mt-1">{{ acc.description }}</div>
                    }

                    <!-- Datos meteorológicos -->
                    @if (acc.weather_data) {
                      <div
                        class="flex flex-wrap gap-3 mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded"
                      >
                        @if (acc.weather_data.temperature !== undefined) {
                          <span>🌡️ {{ acc.weather_data.temperature }}°C</span>
                        }
                        @if (acc.weather_data.precipitation !== undefined) {
                          <span>🌧️ {{ acc.weather_data.precipitation }}mm</span>
                        }
                        @if (acc.weather_data.visibility !== undefined) {
                          <span>👁️ {{ acc.weather_data.visibility }}m</span>
                        }
                        @if (acc.weather_data.wind_speed !== undefined) {
                          <span>💨 {{ acc.weather_data.wind_speed }}km/h</span>
                        }
                      </div>
                    }
                  </div>

                  <!-- Fecha -->
                  <div class="text-right text-sm text-[var(--secondary)]">
                    <div>{{ formatDate(acc.created_at) }}</div>
                    <div class="text-xs">{{ formatTime(acc.created_at) }}</div>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-8 text-center text-[var(--secondary)]">
                No hay siniestros registrados en el período seleccionado
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class AccidentsComponent implements OnInit {
  private http = inject(HttpClient);

  readonly accidents = signal<RoadAccident[]>([]);
  readonly loading = signal(false);

  dateFrom = '';
  dateTo = '';
  typeFilter = 'all';

  readonly filteredAccidents = computed(() => {
    let result = this.accidents();

    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      result = result.filter((a) => new Date(a.created_at).getTime() >= from);
    }

    if (this.dateTo) {
      const to = new Date(this.dateTo).getTime() + 86400000; // +1 día
      result = result.filter((a) => new Date(a.created_at).getTime() <= to);
    }

    if (this.typeFilter !== 'all') {
      result = result.filter((a) => a.subtype === this.typeFilter);
    }

    return result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  });

  readonly severeCounts = computed(() => {
    const acc = this.accidents();
    return {
      major: acc.filter((a) => a.subtype === 'ACCIDENT_MAJOR').length,
      minor: acc.filter((a) => a.subtype === 'ACCIDENT_MINOR').length,
    };
  });

  readonly withWeather = computed(() => this.accidents().filter((a) => a.weather_data).length);

  ngOnInit(): void {
    // Establecer rango de últimos 30 días
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    this.dateTo = today.toISOString().split('T')[0];
    this.dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

    this.loadAccidents();
  }

  loadAccidents(): void {
    this.loading.set(true);

    this.http.get<RoadAccident[]>(`${environment.apiUrl}/api/accidents`).subscribe({
      next: (data) => {
        this.accidents.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando siniestros:', err);
        this.loading.set(false);
      },
    });
  }

  getSubtypeLabel(subtype?: string): string {
    if (!subtype) return 'Accidente';
    return SUBTYPE_LABELS[subtype] || subtype;
  }

  getSeverityBg(severity?: number): string {
    if (!severity) return 'bg-gray-500';
    if (severity >= 8) return 'bg-red-600';
    if (severity >= 5) return 'bg-orange-500';
    return 'bg-yellow-500';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

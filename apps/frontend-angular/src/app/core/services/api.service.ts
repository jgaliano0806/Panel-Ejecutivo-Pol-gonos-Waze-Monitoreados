/**
 * Servicio API para consumir el backend Fastify
 * Equivalente a: apps/frontend/src/hooks/useWazeData.ts
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  timer,
  switchMap,
  shareReplay,
  catchError,
  of,
  map,
  BehaviorSubject,
  combineLatest,
} from 'rxjs';
import { environment } from '../../../environments/environment';

// Tipos exportados
export interface Polygon {
  id: string;
  name: string;
  group: string;
  state: 'low' | 'medium' | 'high';
  geometry: any; // GeoJSON.Polygon - tipo externo no disponible
  metrics?: {
    alertCount: number;
    jamCount: number;
    totalDelay: number;
    avgSpeed: number | null;
    criticalAlerts: number;
  };
  lastUpdate?: string;
}

export interface Incident {
  id: string;
  uuid?: string;
  type: string;
  subtype?: string;
  description?: string;
  street?: string;
  city?: string;
  severity?: number;
  reliability?: number;
  confidence?: number;
  latitude: number;
  longitude: number;
  polygonId?: string;
  pubMillis?: number;
  timestamp: Date;
}

export interface TrafficJam {
  id: string;
  uuid?: string;
  level: number;
  speed: number;
  speedKMH?: number;
  delay: number;
  length: number;
  street?: string;
  city?: string;
  line: Array<{ x: number; y: number }>;
  polyline?: Array<{ x: number; y: number }>;
  polygonId?: string;
}

export interface GlobalKPIs {
  totalAlerts: number;
  totalJams: number;
  avgSpeed: number;
  totalDelay: number;
  criticalCount: number;
  roadAccidents?: number;
  lastUpdate: string;
}

export interface AlertStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private apiBase = environment.apiUrl;

  // Señales de estado de carga
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  // Cache subjects para invalidación manual
  private polygonsRefresh$ = new BehaviorSubject<void>(undefined);
  private incidentsRefresh$ = new BehaviorSubject<void>(undefined);
  private jamsRefresh$ = new BehaviorSubject<void>(undefined);

  /**
   * Polígonos con polling automático
   */
  readonly polygons$: Observable<Polygon[]> = combineLatest([
    this.polygonsRefresh$,
    timer(0, environment.refreshIntervals.realTimeData),
  ]).pipe(
    switchMap(() => this.http.get<Polygon[]>(`${this.apiBase}/polygons`)),
    catchError((err) => {
      console.error('Error fetching polygons:', err);
      this._error.set('Error cargando polígonos');
      return of([]);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /**
   * KPIs globales con polling
   */
  readonly globalKPIs$: Observable<GlobalKPIs | null> = timer(
    0,
    environment.refreshIntervals.globalKpis,
  ).pipe(
    switchMap(() => this.http.get<GlobalKPIs>(`${this.apiBase}/kpis/global`)),
    catchError((err) => {
      console.error('Error fetching KPIs:', err);
      return of(null);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /**
   * Incidentes con polling cada 30s
   */
  readonly incidents$: Observable<Incident[]> = combineLatest([
    this.incidentsRefresh$,
    timer(0, environment.refreshIntervals.realTimeData),
  ]).pipe(
    switchMap(() => this.http.get<Incident[]>(`${this.apiBase}/incidents/all`)),
    catchError((err) => {
      console.error('Error fetching incidents:', err);
      return of([]);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /**
   * Jams (atascos) con polling cada 30s
   */
  readonly jams$: Observable<TrafficJam[]> = combineLatest([
    this.jamsRefresh$,
    timer(0, environment.refreshIntervals.realTimeData),
  ]).pipe(
    switchMap(() => this.http.get<any[]>(`${this.apiBase}/jams/all`)),
    map((jams) =>
      jams.map((jam) => ({
        ...jam,
        line: jam.polyline || jam.line,
        speed: jam.speedKMH || jam.speed,
      })),
    ),
    catchError((err) => {
      console.error('Error fetching jams:', err);
      return of([]);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /**
   * Estadísticas de alertas
   */
  readonly alertStats$: Observable<AlertStats | null> = timer(
    0,
    environment.refreshIntervals.alertStats,
  ).pipe(
    switchMap(() => this.http.get<AlertStats>(`${this.apiBase}/alerts/stats`)),
    catchError((err) => {
      console.error('Error fetching alert stats:', err);
      return of(null);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  /**
   * Obtener detalle de un polígono específico
   */
  getPolygonDetail(id: string): Observable<Polygon | null> {
    return this.http.get<Polygon>(`${this.apiBase}/polygons/${id}`).pipe(
      catchError((err) => {
        console.error(`Error fetching polygon ${id}:`, err);
        return of(null);
      }),
    );
  }

  /**
   * Obtener datos históricos
   */
  getHistoricalData(hours: number = 24): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/historical/global?hours=${hours}`).pipe(
      catchError((err) => {
        console.error('Error fetching historical data:', err);
        return of([]);
      }),
    );
  }

  /**
   * Obtener análisis de incidentes bloqueantes
   */
  getBlockingAnalysis(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/incidents/blocking-analysis`).pipe(
      catchError((err) => {
        console.error('Error fetching blocking analysis:', err);
        return of({ count: 0, analyses: [], summary: null });
      }),
    );
  }

  /**
   * Forzar recarga de datos
   */
  refreshPolygons(): void {
    this.polygonsRefresh$.next();
  }

  refreshIncidents(): void {
    this.incidentsRefresh$.next();
  }

  refreshJams(): void {
    this.jamsRefresh$.next();
  }

  refreshAll(): void {
    this.refreshPolygons();
    this.refreshIncidents();
    this.refreshJams();
  }
}

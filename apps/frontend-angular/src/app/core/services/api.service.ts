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
import { realCordobaPolygons } from '../../data/realCordobaPolygons';

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
  feedUrl?: string;
  center?: { lat: number; lng: number };
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
  lat?: number;
  lng?: number;
  polygonId?: string;
  pubMillis?: number;
  timestamp: Date;
  isActive?: boolean;
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
  roadAccidentsCritical?: number;
  lastUpdate: string;
  fluidityPercentage?: number;
  criticalPolygons?: number;
  totalPolygons?: number;
  trends?: {
    fluidityChange?: number;
    incidentsChange?: number;
  };
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
   * Combina polígonos locales (con geometry) + datos del backend (state, group)
   * Igual que React: useWazeData.ts líneas 315-344
   */
  readonly polygons$: Observable<Polygon[]> = combineLatest([
    this.polygonsRefresh$,
    timer(0, environment.refreshIntervals.realTimeData),
  ]).pipe(
    switchMap(() => this.http.get<any[]>(`${this.apiBase}/polygons/all`)),
    map((backendPolygons) => {
      // Crear Map para búsqueda O(1)
      const backendMap = new Map(backendPolygons.map((p: any) => [p.id, p]));

      // Combinar: local (geometry) + backend (state, group, name)
      return realCordobaPolygons.map((localPoly: any) => {
        const backendData = backendMap.get(localPoly.id);

        if (!backendData) return localPoly;

        return {
          ...localPoly,
          state: backendData.state || localPoly.state,
          name: backendData.name || localPoly.name,
          group: backendData.group || localPoly.group,
        };
      });
    }),
    catchError((err) => {
      console.error('Error fetching polygons:', err);
      this._error.set('Error cargando polígonos');
      // En caso de error, retornar polígonos locales sin datos del backend
      return of(realCordobaPolygons as Polygon[]);
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

  // Alias for backwards compatibility
  readonly trafficJams$ = this.jams$;

  // ============================================
  // ADMIN APIs
  // ============================================

  /**
   * Obtener catálogo de tipos de incidentes
   */
  getCatalogTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/catalogs/types`).pipe(
      catchError((err) => {
        console.error('Error fetching catalog types:', err);
        return of([]);
      }),
    );
  }

  /**
   * Obtener catálogo de subtipos
   */
  getCatalogSubtypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/catalogs/subtypes`).pipe(
      catchError((err) => {
        console.error('Error fetching catalog subtypes:', err);
        return of([]);
      }),
    );
  }

  /**
   * Crear polígono
   */
  createPolygon(polygon: Partial<Polygon>): Observable<Polygon | null> {
    return this.http.post<Polygon>(`${this.apiBase}/polygons`, polygon).pipe(
      catchError((err) => {
        console.error('Error creating polygon:', err);
        this._error.set('Error creando polígono');
        return of(null);
      }),
    );
  }

  /**
   * Actualizar polígono
   */
  updatePolygon(id: string, polygon: Partial<Polygon>): Observable<Polygon | null> {
    return this.http.put<Polygon>(`${this.apiBase}/polygons/${id}`, polygon).pipe(
      catchError((err) => {
        console.error('Error updating polygon:', err);
        this._error.set('Error actualizando polígono');
        return of(null);
      }),
    );
  }

  /**
   * Eliminar polígono
   */
  deletePolygon(id: string): Observable<boolean> {
    return this.http.delete(`${this.apiBase}/polygons/${id}`).pipe(
      map(() => true),
      catchError((err) => {
        console.error('Error deleting polygon:', err);
        this._error.set('Error eliminando polígono');
        return of(false);
      }),
    );
  }

  // ============================================
  // STATISTICS APIs
  // ============================================

  /**
   * Obtener estadísticas diarias
   */
  getDailyStats(date?: string): Observable<any> {
    const params = date ? `?date=${date}` : '';
    return this.http.get<any>(`${this.apiBase}/stats/daily${params}`).pipe(
      catchError((err) => {
        console.error('Error fetching daily stats:', err);
        return of(null);
      }),
    );
  }

  /**
   * Obtener estadísticas semanales
   */
  getWeeklyStats(startDate?: string): Observable<any> {
    const params = startDate ? `?startDate=${startDate}` : '';
    return this.http.get<any>(`${this.apiBase}/stats/weekly${params}`).pipe(
      catchError((err) => {
        console.error('Error fetching weekly stats:', err);
        return of(null);
      }),
    );
  }

  /**
   * Obtener estadísticas mensuales
   */
  getMonthlyStats(year?: number, month?: number): Observable<any> {
    let params = '';
    if (year && month) {
      params = `?year=${year}&month=${month}`;
    }
    return this.http.get<any>(`${this.apiBase}/stats/monthly${params}`).pipe(
      catchError((err) => {
        console.error('Error fetching monthly stats:', err);
        return of(null);
      }),
    );
  }

  /**
   * Obtener tendencias históricas
   */
  getHistoricalTrends(days: number = 30): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/historical/trends?days=${days}`).pipe(
      catchError((err) => {
        console.error('Error fetching historical trends:', err);
        return of(null);
      }),
    );
  }

  // ============================================
  // ACCIDENTS (Siniestros) APIs
  // ============================================

  /**
   * Obtener accidentes/siniestros
   */
  getAccidents(params?: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    let queryParams = '';
    if (params) {
      const paramList = [];
      if (params.dateFrom) paramList.push(`dateFrom=${params.dateFrom}`);
      if (params.dateTo) paramList.push(`dateTo=${params.dateTo}`);
      if (params.page) paramList.push(`page=${params.page}`);
      if (params.limit) paramList.push(`limit=${params.limit}`);
      if (paramList.length > 0) queryParams = `?${paramList.join('&')}`;
    }
    return this.http.get<any>(`${this.apiBase}/accidents${queryParams}`).pipe(
      catchError((err) => {
        console.error('Error fetching accidents:', err);
        return of({ data: [], total: 0 });
      }),
    );
  }

  /**
   * Obtener detalle de un accidente
   */
  getAccidentDetail(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/accidents/${id}`).pipe(
      catchError((err) => {
        console.error('Error fetching accident detail:', err);
        return of(null);
      }),
    );
  }

  // ============================================
  // RISK APIs
  // ============================================

  /**
   * Obtener resumen de riesgos
   */
  getRiskSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/risk/summary`).pipe(
      catchError((err) => {
        console.error('Error fetching risk summary:', err);
        return of(null);
      }),
    );
  }

  /**
   * Obtener scores de riesgo
   */
  getRiskScores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/risk/scores`).pipe(
      catchError((err) => {
        console.error('Error fetching risk scores:', err);
        return of([]);
      }),
    );
  }

  // ============================================
  // NOTIFICATIONS APIs
  // ============================================

  /**
   * Obtener historial de notificaciones
   */
  getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Observable<any> {
    let queryParams = '';
    if (params) {
      const paramList = [];
      if (params.page) paramList.push(`page=${params.page}`);
      if (params.limit) paramList.push(`limit=${params.limit}`);
      if (params.unreadOnly) paramList.push(`unreadOnly=${params.unreadOnly}`);
      if (paramList.length > 0) queryParams = `?${paramList.join('&')}`;
    }
    return this.http.get<any>(`${this.apiBase}/notifications${queryParams}`).pipe(
      catchError((err) => {
        console.error('Error fetching notifications:', err);
        return of({ data: [], total: 0 });
      }),
    );
  }

  /**
   * Marcar notificación como leída
   */
  markNotificationAsRead(id: string): Observable<boolean> {
    return this.http.patch(`${this.apiBase}/notifications/${id}/read`, {}).pipe(
      map(() => true),
      catchError((err) => {
        console.error('Error marking notification as read:', err);
        return of(false);
      }),
    );
  }

  // ============================================
  // TVT (Waze Traffic) APIs
  // ============================================

  /**
   * Obtener métricas TVT
   */
  getTVTMetrics(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/tvt/metrics`).pipe(
      catchError((err) => {
        console.error('Error fetching TVT metrics:', err);
        return of(null);
      }),
    );
  }

  // ============================================
  // WEATHER APIs
  // ============================================

  /**
   * Obtener clima para un polígono
   */
  getWeather(polygonId: string): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/weather/${polygonId}`).pipe(
      catchError((err) => {
        console.error('Error fetching weather:', err);
        return of(null);
      }),
    );
  }
}

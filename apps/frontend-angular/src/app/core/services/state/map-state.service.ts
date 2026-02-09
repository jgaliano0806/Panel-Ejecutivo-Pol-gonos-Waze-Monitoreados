import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { NotificationData } from '../../stores/notification.store';

/**
 * Interface para solicitudes de foco en el mapa
 */
export interface MapFocusRequest {
  type: 'INCIDENT' | 'POLYGON';
  id?: string;
  data?: NotificationData | any;
  zoom?: number;
}

/**
 * MapStateService
 * Gestiona la comunicación entre componentes que necesitan interactuar con el mapa
 * (Notificaciones, Sidebar, etc.)
 */
@Injectable({
  providedIn: 'root',
})
export class MapStateService {
  // Subject para notificar solicitudes de enfoque
  private _focusRequest = new Subject<MapFocusRequest>();
  readonly focusRequest$ = this._focusRequest.asObservable();

  /**
   * Solicita enfocar un incidente en el mapa
   * @param data Datos del incidente o notificación
   */
  focusIncident(data: NotificationData): void {
    if (!data) return;

    // Extraer ID si existe
    const id = (data as any).id || (data as any).uuid || (data as any).forcedIncident?.id;

    this._focusRequest.next({
      type: 'INCIDENT',
      id,
      data,
      zoom: 16,
    });
  }

  /**
   * Solicita enfocar un polígono en el mapa
   * @param polygonId ID del polígono
   */
  focusPolygon(polygonId: string): void {
    if (!polygonId) return;

    this._focusRequest.next({
      type: 'POLYGON',
      id: polygonId,
      zoom: 14,
    });
  }
}

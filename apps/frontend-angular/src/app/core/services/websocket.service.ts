/**
 * Servicio WebSocket para Angular
 * Equivalente a: apps/frontend/src/services/websocket.ts
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  timestamp: Date;
  read: boolean;
  tts_played?: boolean;
  data?: {
    incidentType?: string;
    subtype?: string;
    street?: string;
    city?: string;
    polygonId?: string;
    location?: { x: number; y: number };
  };
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: Socket;
  private destroy$ = new Subject<void>();

  // Estado reactivo con Signals
  private _connected = signal(false);
  private _socketId = signal<string | null>(null);

  // Computed signals públicos
  readonly connected = computed(() => this._connected());
  readonly socketId = computed(() => this._socketId());

  // Subjects para eventos - NO usar shareReplay para evitar duplicación de TTS
  private notificationSubject = new Subject<Notification>();
  private processedNotificationIds = new Set<string>();
  readonly notifications$ = this.notificationSubject.asObservable();

  constructor() {
    this.socket = io(environment.socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Conexión
    this.socket.on('connect', () => {
      console.log('🟢 WebSocket connected:', this.socket.id);
      this._connected.set(true);
      this._socketId.set(this.socket.id ?? null);
    });

    // Desconexión
    this.socket.on('disconnect', (reason) => {
      console.log('🔴 WebSocket disconnected:', reason);
      this._connected.set(false);
      this._socketId.set(null);
    });

    // Error de conexión
    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
    });

    // Reconexión
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
    });

    // Debug: escuchar todos los eventos
    this.socket.onAny((event, ...args) => {
      console.log(`📡 WS event received: ${event}`, args);
    });

    // Notificaciones - evitar duplicados
    this.socket.on('notification:new', (notification: Notification) => {
      // Evitar procesar la misma notificación dos veces
      if (notification.id && this.processedNotificationIds.has(notification.id)) {
        console.log('⚠️ Notificación duplicada ignorada:', notification.id);
        return;
      }
      
      if (notification.id) {
        this.processedNotificationIds.add(notification.id);
        // Limpiar IDs antiguos para evitar memory leak
        if (this.processedNotificationIds.size > 100) {
          const idsArray = Array.from(this.processedNotificationIds);
          this.processedNotificationIds = new Set(idsArray.slice(-50));
        }
      }
      
      console.log('🔔 NOTIFICACIÓN RECIBIDA:', notification);
      this.notificationSubject.next(notification);
    });
  }

  /**
   * Suscribirse a updates de un polígono específico
   */
  subscribeToPolygon(polygonId: string): void {
    this.socket.emit('subscribe:polygon', polygonId);
    console.log(`📍 Subscribed to polygon: ${polygonId}`);
  }

  /**
   * Desuscribirse de un polígono
   */
  unsubscribeFromPolygon(polygonId: string): void {
    this.socket.emit('unsubscribe:polygon', polygonId);
    console.log(`📍 Unsubscribed from polygon: ${polygonId}`);
  }

  /**
   * Suscribirse a updates globales
   */
  subscribeToGlobal(): void {
    this.socket.emit('subscribe:global');
    console.log('🌍 Subscribed to global updates');
  }

  /**
   * Reconectar manualmente
   */
  reconnect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    this.socket.disconnect();
  }

  /**
   * Cleanup al destruir el servicio
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}

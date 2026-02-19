import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "../utils/logger";

/**
 * WebSocket Service - Gestión centralizada de Socket.io
 * - Rooms por polígono: polygon:{id}
 * - Eventos: waze:update, weather:update, risk:update
 */
class WebSocketService {
  private io: Server | null = null;
  private connectedClients: number = 0;

  /**
   * Inicializa Socket.io con el servidor HTTP de Fastify
   */
  public initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: (_origin, callback) => {
          callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    logger.info("🔌 WebSocket server initialized");
  }

  /**
   * Configura los manejadores de eventos
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      this.connectedClients++;
      logger.info(
        `🟢 WebSocket client connected: ${socket.id} (total: ${this.connectedClients})`,
      );

      // Suscribirse a un polígono
      socket.on("subscribe:polygon", (polygonId: string) => {
        if (!polygonId) return;
        socket.join(`polygon:${polygonId}`);
        logger.info(
          `📍 Client ${socket.id} subscribed to polygon:${polygonId}`,
        );
      });

      // Desuscribirse de un polígono
      socket.on("unsubscribe:polygon", (polygonId: string) => {
        if (!polygonId) return;
        socket.leave(`polygon:${polygonId}`);
        logger.info(
          `📍 Client ${socket.id} unsubscribed from polygon:${polygonId}`,
        );
      });

      // Suscribirse a todos los updates globales
      socket.on("subscribe:global", () => {
        socket.join("global");
        logger.info(`🌍 Client ${socket.id} subscribed to global updates`);
      });

      // Desconexión
      socket.on("disconnect", (reason: string) => {
        this.connectedClients--;
        logger.info(
          `🔴 WebSocket client disconnected: ${socket.id} (${reason}). Total: ${this.connectedClients}`,
        );
      });

      // Error handling
      socket.on("error", (error: Error) => {
        logger.error(`❌ WebSocket error for ${socket.id}: ${error.message}`);
      });
    });
  }

  /**
   * Emite un evento a un room específico (polígono)
   */
  public emitToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn("⚠️ WebSocket not initialized, cannot emit");
      return;
    }
    this.io.to(room).emit(event, data);
  }

  /**
   * Emite update de Waze a un polígono
   */
  public emitWazeUpdate(
    polygonId: string,
    data: { alerts: any[]; jams: any[] },
  ): void {
    this.emitToRoom(`polygon:${polygonId}`, "waze:update", {
      polygonId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emite update de clima a un polígono
   */
  public emitWeatherUpdate(polygonId: string, weather: any): void {
    this.emitToRoom(`polygon:${polygonId}`, "weather:update", {
      polygonId,
      weather,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emite update de riesgo a un polígono
   */
  public emitRiskUpdate(polygonId: string, score: any): void {
    this.emitToRoom(`polygon:${polygonId}`, "risk:update", {
      polygonId,
      score,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast a todos los clientes conectados
   */
  public broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Obtiene la instancia de Socket.io (para servicios que necesitan acceso directo)
   */
  public getIO(): Server | null {
    return this.io;
  }

  /**
   * Obtiene estadísticas del servidor WebSocket
   */
  public getStats(): { connected: number; rooms: string[] } {
    if (!this.io) {
      return { connected: 0, rooms: [] };
    }

    const rooms = Array.from(this.io.sockets.adapter.rooms.keys()).filter(
      (room) => room.startsWith("polygon:") || room === "global",
    );

    return {
      connected: this.connectedClients,
      rooms,
    };
  }
}

// Exportar singleton
export const websocketService = new WebSocketService();
export default websocketService;

import {
  eventBus,
  SystemEvents,
  WazePollCompletePayload,
  WazePollCycleDonePayload,
  RiskCalculatedPayload,
} from "../events";
import { Server } from "socket.io";
import { logger } from "../utils/logger";

export class SocketSubscriber {
  private io: Server;

  constructor(io: any) {
    this.io = io;
    this.setupListeners();
    logger.info("🔌 SocketSubscriber initialized");
  }

  private setupListeners(): void {
    eventBus.on(
      SystemEvents.WAZE_POLL_COMPLETE,
      this.handleWazePollComplete.bind(this),
    );
    eventBus.on(
      SystemEvents.WAZE_POLL_CYCLE_DONE,
      this.handlePollCycleDone.bind(this),
    );
    eventBus.on(
      SystemEvents.RISK_SCORE_CALCULATED,
      this.handleRiskScoreCalculated.bind(this),
    );
    eventBus.on("notification:new", this.handleNewNotification.bind(this));
  }

  private handleNewNotification(notification: any): void {
    try {
      this.io.emit("notification:new", notification);
    } catch (error) {
      logger.error(
        `Error in SocketSubscriber handling NewNotification: ${error}`,
      );
    }
  }

  /**
   * Evento por polígono: enviado al room específico
   */
  private handleWazePollComplete(payload: WazePollCompletePayload): void {
    try {
      const { polygonId, alerts, jams, timestamp } = payload;
      this.io.to(`polygon:${polygonId}`).emit("waze:update", {
        polygonId,
        alerts,
        jams,
        timestamp: timestamp.toISOString(),
      });
    } catch (error) {
      logger.error(
        `Error in SocketSubscriber handling WazePollComplete: ${error}`,
      );
    }
  }

  /**
   * Ciclo de polling completo: BROADCAST GLOBAL a TODOS los clientes.
   * - waze:data_updated  → frontend invalida todas las caches de React Query
   * - play_audio_alert   → si hubo alertas críticas nuevas, frontend reproduce beep
   */
  private handlePollCycleDone(payload: WazePollCycleDonePayload): void {
    try {
      const summary = {
        totalPolygons: payload.totalPolygons,
        successCount: payload.successCount,
        totalAlerts: payload.totalAlerts,
        totalJams: payload.totalJams,
        criticalAlerts: payload.criticalAlerts,
        durationMs: payload.durationMs,
        timestamp: payload.timestamp.toISOString(),
      };

      // Broadcast global: todos los paneles invalidan datos simultáneamente
      this.io.emit("waze:data_updated", summary);

      // Si hay alertas críticas nuevas, emitir señal de audio
      if (payload.criticalAlerts > 0) {
        this.io.emit("play_audio_alert", {
          count: payload.criticalAlerts,
          timestamp: payload.timestamp.toISOString(),
        });
        logger.info(
          `🔊 play_audio_alert emitted (${payload.criticalAlerts} critical alerts)`,
        );
      }
    } catch (error) {
      logger.error(
        `Error in SocketSubscriber handling PollCycleDone: ${error}`,
      );
    }
  }

  private handleRiskScoreCalculated(payload: RiskCalculatedPayload): void {
    try {
      const { polygonId, score, level, factors } = payload;
      this.io.to(`polygon:${polygonId}`).emit("risk:update", {
        polygonId,
        score,
        level,
        factors,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        `Error in SocketSubscriber handling RiskScoreCalculated: ${error}`,
      );
    }
  }
}

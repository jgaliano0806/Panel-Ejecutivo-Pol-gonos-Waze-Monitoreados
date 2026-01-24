import {
  eventBus,
  SystemEvents,
  WazePollCompletePayload,
  RiskCalculatedPayload,
} from "../events";
import { Server } from "socket.io"; // Or import from types if separate
import { logger } from "../utils/logger";

export class SocketSubscriber {
  private io: any; // Type as Server if available

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
      SystemEvents.RISK_SCORE_CALCULATED,
      this.handleRiskScoreCalculated.bind(this),
    );
  }

  private handleWazePollComplete(payload: WazePollCompletePayload): void {
    try {
      const { polygonId, alerts, jams, timestamp } = payload;

      // Construct payload expected by frontend
      const updatePayload = {
        polygonId,
        alerts,
        jams,
        timestamp: timestamp.toISOString(),
      };

      // Emit to specific room
      this.io.to(`polygon:${polygonId}`).emit("waze:update", updatePayload);

      // debug log (optional)
      // console.log(`📡 Broadcasted update for ${polygonId}`);
    } catch (error) {
      logger.error(
        `Error in SocketSubscriber handling WazePollComplete: ${error}`,
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

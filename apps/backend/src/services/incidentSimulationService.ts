import { randomUUID } from "crypto";
import { REAL_POLYGONS } from "../config/realPolygons";
import { SIMULATED_ALERT_UUID_PREFIX } from "../constants/simulation";
import { WazeAlert } from "@panel-waze/types";
import { pickSimulationPlacement } from "../utils/simulationPlacement";
import { cacheService } from "./cacheService";
import { logger } from "../utils/logger";
import { websocketService } from "./websocketService";
import { wazePollingService } from "./wazePollingService";

const INTERVAL_MS = 30_000;

/** Nombres de usuario estilo feed Waze (sin marcas de simulación) */
const WAZE_REPORTERS = [
  "wazer_cba",
  "cordoba_driver",
  "autopista_user",
  "waze_arg",
  "viajero_ruta",
  "conductor_abc",
] as const;

const SCENARIOS = [
  {
    type: "ACCIDENT",
    subtype: "ACCIDENT_MAJOR",
    forceDangerZone: true,
  },
  {
    type: "HAZARD",
    subtype: "HAZARD_ON_ROAD_CAR_STOPPED",
    forceDangerZone: false,
  },
  {
    type: "HAZARD",
    subtype: "HAZARD_ON_ROAD_OBJECT",
    forceDangerZone: false,
  },
  {
    type: "HAZARD",
    subtype: "HAZARD_ON_SHOULDER_ANIMALS",
    forceDangerZone: true,
  },
] as const;

class IncidentSimulationService {
  private interval: NodeJS.Timeout | null = null;
  private scenarioIndex = 0;
  private totalGenerated = 0;
  private tickInProgress = false;

  async initialize(): Promise<void> {
    this.interval = setInterval(() => {
      void this.tick();
    }, INTERVAL_MS);

    logger.info(
      `🤖 Bot simulación activo: 1 incidente cada ${INTERVAL_MS / 1000}s (ciclo de 4 tipos, 2 con zona peligrosa)`,
    );
  }

  private async tick(): Promise<void> {
    if (this.tickInProgress) {
      logger.warn("Bot simulación: tick anterior en curso, se omite");
      return;
    }

    this.tickInProgress = true;
    const globalIndex = this.scenarioIndex;
    const scenario = SCENARIOS[globalIndex % SCENARIOS.length]!;
    const forceDangerZone = scenario.forceDangerZone;
    this.scenarioIndex += 1;

    try {
      const placement = await pickSimulationPlacement(forceDangerZone);
      if (!placement) {
        logger.warn("Bot simulación: no se pudo ubicar el incidente");
        return;
      }

      const meta = REAL_POLYGONS.find((p) => p.id === placement.polygonId);
      const { lat, lon, polygonId } = placement;
      const now = Date.now();
      const streetName = meta?.name ?? placement.polygonName;

      const alert: WazeAlert = {
        uuid: `${SIMULATED_ALERT_UUID_PREFIX}${now}-${globalIndex}-${randomUUID().slice(0, 8)}`,
        type: scenario.type,
        subtype: scenario.subtype,
        location: { x: lon, y: lat },
        street: streetName,
        city: "Córdoba",
        country: "AR",
        pubMillis: now,
        reliability: 8,
        confidence: 7,
        nThumbsUp: 2,
        reportRating: 4,
        reportBy: WAZE_REPORTERS[this.totalGenerated % WAZE_REPORTERS.length],
      };

      await wazePollingService.ingestSimulatedAlerts([alert], polygonId);
      await cacheService.invalidate("waze:*");
      await this.broadcastDataUpdated();

      this.totalGenerated += 1;

      logger.info(
        `🤖 Simulación #${this.totalGenerated}: ${scenario.subtype} en ${polygonId}${placement.inDangerZone ? " 🚨 ZONA PELIGROSA" : ""}`,
      );
    } catch (error) {
      logger.error(
        `Error en tick de simulación: ${
          error instanceof Error ? error.message : error
        }`,
      );
    } finally {
      this.tickInProgress = false;
    }
  }

  private async broadcastDataUpdated(): Promise<void> {
    websocketService.broadcast("waze:data_updated", {
      source: "incident_simulation_bot",
      timestamp: new Date().toISOString(),
    });
  }
}

export const incidentSimulationService = new IncidentSimulationService();

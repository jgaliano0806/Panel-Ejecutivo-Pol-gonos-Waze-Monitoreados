import { DangerZone, DangerZoneFlag } from "@panel-waze/types";
import { dangerZoneService } from "./dangerZoneService";
import { booleanPointInPolygon, point, polygon } from "@turf/turf";
import { logger } from "../utils/logger";

/**
 * Servicio que comprueba si una coordenada cae dentro de una zona peligrosa activa.
 * Cachea las zonas en memoria y las refresca cada 60 s.
 */
class DangerZoneCheckService {
  private static instance: DangerZoneCheckService;
  private activeZones: DangerZone[] = [];
  private lastRefresh = 0;
  private readonly REFRESH_INTERVAL_MS = 60_000;

  public static getInstance(): DangerZoneCheckService {
    if (!DangerZoneCheckService.instance) {
      DangerZoneCheckService.instance = new DangerZoneCheckService();
    }
    return DangerZoneCheckService.instance;
  }

  private async refreshIfNeeded(): Promise<void> {
    if (Date.now() - this.lastRefresh < this.REFRESH_INTERVAL_MS) return;
    try {
      this.activeZones = await dangerZoneService.getActiveZones();
      this.lastRefresh = Date.now();
      logger.debug(`DangerZoneCheck: ${this.activeZones.length} zonas activas cargadas`);
    } catch (err) {
      logger.error(`Error cargando zonas peligrosas: ${err}`);
    }
  }

  /**
   * Retorna el DangerZoneFlag de la primera zona que intersecte, o null si no hay match.
   */
  public async checkAlert(lat: number, lng: number): Promise<DangerZoneFlag | null> {
    await this.refreshIfNeeded();

    const pt = point([lng, lat]);

    for (const zone of this.activeZones) {
      try {
        const coords = zone.geometry?.coordinates;
        if (!coords || !Array.isArray(coords) || coords.length === 0) continue;
        const poly = polygon(coords as number[][][]);
        if (booleanPointInPolygon(pt, poly)) {
          return {
            isDangerZone: true,
            dangerZoneId: zone.id,
            dangerZoneName: zone.name,
            severity: zone.severity,
          };
        }
      } catch {
        // geometría inválida — omitir
      }
    }
    return null;
  }
}

export const dangerZoneCheckService = DangerZoneCheckService.getInstance();

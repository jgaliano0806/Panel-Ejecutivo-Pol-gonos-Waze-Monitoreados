import { eventBus, SystemEvents, WazePollCompletePayload } from "../events";
import { incidentsHistoryService } from "../services/incidentsHistoryService";

export class IncidentsHistoryListener {
  constructor() {
    this.setupListeners();
    console.log("📊 IncidentsHistoryListener initialized");
  }

  private setupListeners(): void {
    eventBus.on(
      SystemEvents.WAZE_POLL_COMPLETE,
      this.handleWazePollComplete.bind(this)
    );
  }

  private async handleWazePollComplete(
    payload: WazePollCompletePayload
  ): Promise<void> {
    try {
      const { alerts, jams } = payload;
      const now = new Date();

      // Procesar alertas
      for (const alert of alerts) {
        try {
          await incidentsHistoryService.saveIncident({
            incident_id: alert.id,
            polygon_id: alert.polygonId || "UNKNOWN",
            polygon_name: alert.polygonName,
            type: alert.type,
            subtype: alert.subtype,
            severity: alert.severity,
            street: alert.street,
            city: alert.city,
            latitude: alert.location?.lat,
            longitude: alert.location?.lng,
            confidence: alert.confidence,
            reliability: alert.reliability,
            n_thumbs_up: alert.nThumbsUp,
            first_seen_at: alert.timestamp || now,
            last_seen_at: now,
            duration_minutes: undefined, // Will be calculated on conflict update
            blocking_jams: 0,
            estimated_delay_minutes: undefined,
          });
        } catch (err) {
          // Ignore duplicates or other errors for individual incidents
          if (err instanceof Error && !err.message.includes("duplicate")) {
            console.warn(`Warning saving alert ${alert.id}:`, err.message);
          }
        }
      }

      // Procesar jams (congestiones)
      for (const jam of jams) {
        try {
          await incidentsHistoryService.saveIncident({
            incident_id: jam.id,
            polygon_id: jam.polygonId || "UNKNOWN",
            polygon_name: jam.polygonName,
            type: "JAM",
            subtype: `LEVEL_${jam.level}`,
            severity: jam.level,
            street: jam.street,
            city: jam.city,
            latitude: jam.line?.[0]?.y,
            longitude: jam.line?.[0]?.x,
            confidence: undefined,
            reliability: undefined,
            n_thumbs_up: undefined,
            first_seen_at: jam.timestamp || now,
            last_seen_at: now,
            duration_minutes: undefined,
            blocking_jams: jam.blocking ? 1 : 0,
            estimated_delay_minutes: jam.delay
              ? Math.round(jam.delay / 60)
              : undefined,
          });
        } catch (err) {
          if (err instanceof Error && !err.message.includes("duplicate")) {
            console.warn(`Warning saving jam ${jam.id}:`, err.message);
          }
        }
      }

      if (alerts.length > 0 || jams.length > 0) {
        console.log(
          `📊 Saved to history: ${alerts.length} alerts + ${jams.length} jams`
        );
      }
    } catch (error) {
      console.error("❌ Error en IncidentsHistoryListener:", error);
    }
  }
}

import { eventBus, SystemEvents, WazePollCompletePayload } from "../events";
import { roadAccidentService } from "../services/roadAccidentService";
import { weatherService } from "../services/weatherService";

export class AccidentCaptureListener {
  constructor() {
    this.setupListeners();
    console.log("🚑 AccidentCaptureListener initialized");
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
      const { alerts, polygonId } = payload;

      const accidents = alerts.filter((a) => a.type?.toUpperCase() === "ACCIDENT");
      if (accidents.length === 0) return;

      let existingIds = new Set<string>();
      try {
        const existing = await roadAccidentService.getAccidents({
          limit: 1000,
        });
        existingIds = new Set(
          existing
            .map((a) => a.incident_id)
            .filter((id): id is string => id != null)
        );
      } catch (dbError) {
        console.error("⚠️ Error al obtener accidentes existentes:", dbError);
      }

      for (const accident of accidents) {
        const alertId = accident.uuid || (accident as any).id;
        if (!alertId) continue;
        if (existingIds.has(alertId)) continue;

        const lat = accident.location?.y ?? (accident.location as any)?.lat;
        const lng = accident.location?.x ?? (accident.location as any)?.lng;
        if (lat == null || lng == null) continue;

        try {
          let weatherData: Record<string, unknown> = {};
          try {
            const accidentAt = new Date(accident.pubMillis ?? Date.now());
            const w = await weatherService.fetchWeatherAtTimestamp(
              lat,
              lng,
              accidentAt,
            );
            if (w) {
              weatherData = {
                temperature_celsius: w.temperature_celsius,
                precipitation_mm: w.precipitation_mm,
                rain_mm: w.rain_mm,
                weather_code: w.weather_code,
                wind_speed_kmh: w.wind_speed_kmh,
                visibility_meters: w.visibility_meters,
                precipitation_probability: w.precipitation_probability,
                weather_description: w.weather_description,
                is_freezing_risk: w.is_freezing_risk,
                timestamp: w.timestamp,
              };
            }
          } catch (e) {
            console.warn(`⚠️ Clima no disponible para accidente ${alertId}`);
          }

          await roadAccidentService.createAccident({
            incident_id: alertId,
            waze_data: (accident as any).raw || accident,
            weather_data: weatherData,
            type: "ACCIDENT",
            subtype: accident.subtype,
            severity: accident.reliability
              ? Math.min(5, Math.max(1, Math.round(accident.reliability / 2)))
              : 3,
            street: accident.street,
            location_lat: lat,
            location_lng: lng,
            accident_at: new Date(accident.pubMillis ?? Date.now()),
            polygon_id: polygonId,
          });

          console.log(`✅ Siniestro auto-capturado: ${alertId}`);
        } catch (createError) {
          // Ignore duplicates silently
          if (createError instanceof Error) {
            if (
              !createError.message.includes("duplicate") &&
              !createError.message.includes("ya existe")
            ) {
              console.error(
                `❌ Error capturando accidente ${accident.id}:`,
                createError.message
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error en AccidentCaptureListener:", error);
    }
  }
}

import { eventBus, SystemEvents, WazePollCompletePayload } from "../events";
import { roadAccidentService } from "../services/roadAccidentService";
import { weatherService } from "../services/weatherService";
import { IncidentType } from "../types";

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
      const { alerts } = payload;

      // Filtrar accidentes por tipo (case-insensitive)
      const accidents = alerts.filter((a) => {
        const typeLower = a.type?.toLowerCase();
        return (
          typeLower === "accident" ||
          typeLower === IncidentType.ACCIDENT.toLowerCase()
        );
      });

      // También buscar por subtipo que pueda indicar accidente
      const accidentBySubtype = alerts.filter((a) => {
        if (a.type?.toLowerCase() === "accident") return false; // Ya está en accidents
        return (
          a.subtype &&
          (a.subtype.toUpperCase().includes("ACCIDENT") ||
            a.subtype.toUpperCase().includes("SINIESTRO") ||
            a.subtype.toUpperCase().includes("CRASH") ||
            a.subtype.toUpperCase().includes("COLLISION"))
        );
      });

      if (accidents.length === 0 && accidentBySubtype.length === 0) {
        return;
      }

      const allAccidents = [...accidents, ...accidentBySubtype];
      console.log(
        `🔍 Detectados ${allAccidents.length} accidente(s) en el feed. Verificando...`
      );

      // Obtener siniestros ya registrados para no duplicar
      let existingAccidents: any[] = [];
      let existingIds = new Set<string>();

      try {
        existingAccidents = await roadAccidentService.getAccidents({
          limit: 1000,
        });
        existingIds = new Set(
          existingAccidents
            .map((a) => a.incident_id)
            .filter((id) => id !== null && id !== undefined)
        );
      } catch (dbError) {
        console.error("⚠️ Error al obtener accidentes existentes:", dbError);
        // Continuar sin verificación
      }

      for (const accident of allAccidents) {
        // Verificar si ya existe
        if (existingIds.size > 0 && existingIds.has(accident.id)) {
          continue;
        }

        try {
          // Validar coordenadas
          if (
            !accident.location ||
            accident.location.lat === undefined ||
            accident.location.lng === undefined
          ) {
            continue;
          }

          // Obtener clima
          let weatherData = null;

          // Primero intentar desde el caché del polígono
          if (accident.polygonId) {
            try {
              weatherData = await weatherService.getLatestWeather(
                accident.polygonId
              );
            } catch (e) {
              console.warn(
                `⚠️ No se pudo obtener clima desde polígono ${accident.polygonId}`
              );
            }
          }

          // Si no hay datos del polígono, obtener directamente de Open-Meteo
          if (!weatherData || Object.keys(weatherData).length === 0) {
            try {
              console.log(
                `🌤️ Obteniendo clima en tiempo real para accidente en (${accident.location.lat}, ${accident.location.lng})...`
              );
              // Usar un ID temporal para el fetch directo
              const tempPolygonId = `accident_${accident.id}`;
              weatherData = await weatherService.fetchWeatherForPolygon(
                tempPolygonId,
                accident.location.lat,
                accident.location.lng
              );

              // Eliminar el polygon_id temporal para evitar confusión
              if (weatherData) {
                delete (weatherData as any).polygon_id;
              }

              console.log(`✅ Clima obtenido para accidente:`, {
                temp: weatherData?.temperature_celsius,
                desc: weatherData?.weather_description,
              });
            } catch (weatherError) {
              console.error(
                `❌ Error obteniendo clima para accidente:`,
                weatherError instanceof Error
                  ? weatherError.message
                  : weatherError
              );
            }
          }

          const normalizedType =
            accident.type?.toLowerCase() === "accident"
              ? "accident"
              : "ACCIDENT";

          await roadAccidentService.createAccident({
            incident_id: accident.id,
            waze_data: (accident as any).raw || accident,
            weather_data: weatherData || {},
            type: normalizedType,
            subtype: accident.subtype,
            severity: accident.severity,
            street: accident.street,
            location_lat: accident.location.lat,
            location_lng: accident.location.lng,
            accident_at: accident.timestamp,
          });

          console.log(`✅ Siniestro auto-capturado: ${accident.id}`);
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

import { dbService } from "../database/dbService";

interface OperationalInsight {
  topCriticalIncidents: CriticalIncident[];
  operationalAlerts: OperationalAlert[];
  potholeClusters: PotholeCluster[];
  feedStats: FeedStats;
}

interface CriticalIncident {
  uuid: string;
  type: string;
  subtype: string;
  street: string;
  location: { x: number; y: number };
  score: number; // Impact Score
  confidence: number;
  reliability: number;
  jamLevel: number;
  description: string;
}

interface OperationalAlert {
  id: string;
  type: "CRITICAL_ACCIDENT" | "CONGESTION" | "WEATHER_WARNING";
  level: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  location: string;
  recommendation: string;
}

interface PotholeCluster {
  street: string;
  city: string;
  count: number;
  avgConfidence: number;
  locations: Array<{ x: number; y: number }>;
}

interface FeedStats {
  lastUpdate: Date;
  totalActiveEvents: number;
  polygonsCovered: number;
}

// DB Row Interface
interface WazeAlertRow {
  uuid: string;
  type: string;
  subtype: string | null;
  street: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  confidence: number;
  reliability: number;
  report_rating: number;
  polygon_id: string;
  is_active: boolean;
  pub_millis: number;
}

interface WazeJamRow {
  uuid: string;
  level: number;
  street: string | null;
  polygon_id: string;
  is_active: boolean;
}

class WazeAnalyticsService {
  async getOperationalAnalysis(): Promise<OperationalInsight> {
    // 1. Fetch Active Raw Data
    const alertsConfig = {
      text: `
        SELECT * FROM waze_alerts
        WHERE is_active = true
        AND pub_millis > (EXTRACT(EPOCH FROM NOW()) * 1000 - 3600000) -- Última hora
      `,
    };
    const jamsConfig = {
      text: `SELECT * FROM waze_jams WHERE is_active = true`,
    };
    const potholesConfig = {
      text: `
        SELECT * FROM waze_alerts
        WHERE is_active = true
        AND subtype = 'HAZARD_ON_ROAD_POT_HOLE'
        AND pub_millis > (EXTRACT(EPOCH FROM NOW()) * 1000 - 86400000) -- Últimas 24 horas para planificación
      `,
    };

    const [alertsResult, jamsResult, potholesResult] = await Promise.all([
      dbService.query(alertsConfig.text),
      dbService.query(jamsConfig.text),
      dbService.query(potholesConfig.text),
    ]);

    const alerts = alertsResult.rows as WazeAlertRow[];
    const jams = jamsResult.rows as WazeJamRow[];
    const rawPotholes = potholesResult.rows as WazeAlertRow[];

    // 2. Process Critical Incidents
    const scoredIncidents = alerts.map((alert) => {
      // Encontrar jam asociado
      const nearbyJam = jams.find(
        (j) =>
          j.street === alert.street &&
          j.polygon_id === alert.polygon_id &&
          j.level >= 3
      );

      const jamBonus = nearbyJam ? nearbyJam.level * 2 : 0;
      const confidence = alert.confidence || 0; // 0-10
      const reliability = alert.reliability || 5; // 0-10 (Default 5)

      // FÓRMULA DE IMPACTO
      const impactScore = confidence * 1.5 + reliability * 1.2 + jamBonus;

      return {
        ...alert,
        score: impactScore,
        jamLevel: nearbyJam ? nearbyJam.level : 0,
        hasJam: !!nearbyJam,
      };
    });

    // Ordenar por score descendente
    scoredIncidents.sort((a, b) => b.score - a.score);
    const top5 = scoredIncidents.slice(0, 5).map((i) => ({
      uuid: i.uuid,
      type: i.type,
      subtype: i.subtype || "",
      street: i.street || "Desconocida",
      location: { x: i.longitude, y: i.latitude },
      score: parseFloat(i.score.toFixed(1)),
      confidence: i.confidence || 0,
      reliability: i.reliability || 0,
      jamLevel: i.jamLevel,
      description: this.formatDescription(i), // Helper description
    }));

    // 3. Generate Operational Alerts
    const operationalAlerts: OperationalAlert[] = [];

    // A. Grandes Accidentes con Tráfico
    const majorAccidents = scoredIncidents.filter(
      (i) =>
        i.type === "ACCIDENT" &&
        (i.subtype === "ACCIDENT_MAJOR" || (i.report_rating || 0) >= 4) &&
        i.hasJam
    );

    majorAccidents.forEach((acc) => {
      operationalAlerts.push({
        id: `ALERT-${acc.uuid}`,
        type: "CRITICAL_ACCIDENT",
        level: "HIGH",
        message: `Accidente Mayor en ${acc.street} generando congestión severa (Nivel ${acc.jamLevel})`,
        location: acc.street || "Ubicación desconocida",
        recommendation:
          "🚀 DESPLIEGUE INMEDIATO: Enviar moto niveladora y notificar a Policía Caminera.",
      });
    });

    // B. Weather Hazards
    const weatherHazards = scoredIncidents.filter(
      (i) => i.type === "HAZARD" && i.subtype && i.subtype.includes("WEATHER")
    );
    if (weatherHazards.length > 3) {
      operationalAlerts.push({
        id: "WEATHER-CLUSTER",
        type: "WEATHER_WARNING",
        level: "MEDIUM",
        message: `Múltiples reportes climáticos (${weatherHazards.length}) detectados.`,
        location: "Zona Monitoreada",
        recommendation:
          "⚠️ ACTIVAR ALERTA METEOROLÓGICA: Revisar Feed Open-Meteo.",
      });
    }

    // 4. Pothole Clusters (Planificación de Obras - 24hs window)
    const potholeMap = new Map<string, PotholeCluster>();

    rawPotholes.forEach((p) => {
      const key = p.street || "Desconocida";
      if (!potholeMap.has(key)) {
        potholeMap.set(key, {
          street: key,
          city: p.city || "Córdoba",
          count: 0,
          avgConfidence: 0,
          locations: [],
        });
      }
      const cluster = potholeMap.get(key)!;
      cluster.count++;
      cluster.avgConfidence += p.confidence || 0;
      cluster.locations.push({ x: p.longitude, y: p.latitude });
    });

    // Calcular promedios y filtrar clusters relevantes (más de 2 baches)
    const clusters = Array.from(potholeMap.values())
      .map((c) => ({
        ...c,
        avgConfidence: parseFloat((c.avgConfidence / c.count).toFixed(1)),
      }))
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 calles rotas

    return {
      topCriticalIncidents: top5,
      operationalAlerts: operationalAlerts,
      potholeClusters: clusters,
      feedStats: {
        lastUpdate: new Date(),
        totalActiveEvents: alerts.length,
        polygonsCovered: 67, // Hardcoded based on config
      },
    };
  }

  private formatDescription(alert: WazeAlertRow): string {
    const type =
      alert.type === "ACCIDENT"
        ? "Accidente"
        : alert.type === "JAM"
        ? "Atasco"
        : alert.type === "ROAD_CLOSED"
        ? "Cierre"
        : "Peligro";

    const translations: { [key: string]: string } = {
      // Hazards
      ON_ROAD_POT_HOLE: "Bache en calzada",
      ON_SHOULDER_CAR_STOPPED: "Vehículo detenido en banquina",
      ON_ROAD_CAR_STOPPED: "Vehículo detenido en calzada",
      ON_ROAD_CONSTRUCTION: "Obras en calzada",
      ON_ROAD_ICE: "Hielo en calzada",
      ON_ROAD_OBJECT: "Objeto en calzada",
      ON_ROAD_TRAFFIC_LIGHT_FAULT: "Semáforo defectuoso",
      ON_ROAD_LANE_CLOSED: "Carril cerrado",
      WEATHER_FOG: "Niebla",
      WEATHER_HAIL: "Granizo",
      WEATHER_HEAVY_RAIN: "Lluvia intensa",
      WEATHER_FLOOD: "Inundación",
      // Accidents
      MINOR: "Leve",
      MAJOR: "Grave",
      // Jams
      JAM_STAND_STILL: "Tráfico detenido",
      JAM_HEAVY: "Tráfico pesado",
      JAM_MODERATE: "Tráfico moderado",
      // Others
      ROAD_CLOSED_EVENT: "Evento en vía pública",
      ROAD_CLOSED_CONSTRUCTION: "Construcción",
    };

    let sub = "";
    if (alert.subtype) {
      const cleanSub = alert.subtype
        .replace("HAZARD_", "")
        .replace("ACCIDENT_", "")
        .replace("WEATHER_", "");

      sub =
        translations[cleanSub] ||
        translations[alert.subtype] ||
        cleanSub.replace(/_/g, " ");
    }

    return sub ? `${type} - ${sub}` : type;
  }
}

export const wazeAnalyticsService = new WazeAnalyticsService();

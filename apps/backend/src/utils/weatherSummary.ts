/**
 * Genera un resumen meteorológico interpretado para administración vial a partir
 * de los datos crudos de Open-Meteo (weather_data del siniestro).
 *
 * Objetivo: que un operador NO meteorólogo entienda las condiciones del momento
 * del incidente, con la seriedad suficiente para decisiones de gestión vial.
 *
 * Criterios de visibilidad (umbral vial estricto acordado):
 *   < 500 m            -> Niebla (sub-niveles: muy densa / densa / niebla)
 *   500 m a 2000 m     -> Neblina (agua, HR alta) o Bruma (partículas secas, HR baja)
 *   > 2000 m           -> Buena
 *
 * La distinción Neblina vs Bruma usa humedad relativa cuando está disponible;
 * si no hay HR (datos históricos previos a esta versión) se asume Neblina.
 */

export interface WeatherSummaryInput {
  temperature_celsius?: number | null;
  temperature_feels_like?: number | null;
  precipitation_mm?: number | null;
  rain_mm?: number | null;
  snow_mm?: number | null;
  wind_speed_kmh?: number | null;
  wind_gusts_kmh?: number | null;
  visibility_meters?: number | null;
  cloud_cover_percentage?: number | null;
  relative_humidity_percent?: number | null;
  weather_code?: number | null;
  weather_description?: string | null;
  is_freezing_risk?: boolean | null;
}

export type RoadRiskLevel = "bajo" | "moderado" | "alto" | "extremo";

export type VisibilityCategory =
  | "Niebla muy densa"
  | "Niebla densa"
  | "Niebla"
  | "Neblina"
  | "Bruma"
  | "Buena"
  | "Sin dato";

export type WeatherPhenomenon =
  | "niebla"
  | "neblina"
  | "bruma"
  | "lluvia"
  | "llovizna"
  | "nieve"
  | "tormenta"
  | "nublado"
  | "despejado"
  | "desconocido";

export interface WeatherRiskFactor {
  label: string;
  detail: string;
  severity: RoadRiskLevel;
}

export interface WeatherSummary {
  phenomenon: WeatherPhenomenon;
  visibility_category: VisibilityCategory;
  visibility_km: number | null;
  road_risk_level: RoadRiskLevel;
  headline: string;
  factors: WeatherRiskFactor[];
  narrative: string;
}

const RISK_ORDER: Record<RoadRiskLevel, number> = {
  bajo: 0,
  moderado: 1,
  alto: 2,
  extremo: 3,
};

function maxRisk(a: RoadRiskLevel, b: RoadRiskLevel): RoadRiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

function isFogCode(code?: number | null): boolean {
  return code === 45 || code === 48;
}

function isThunderCode(code?: number | null): boolean {
  return code != null && code >= 95 && code <= 99;
}

function isSnowCode(code?: number | null): boolean {
  return code != null && ((code >= 71 && code <= 77) || code === 85 || code === 86);
}

function isDrizzleCode(code?: number | null): boolean {
  return code != null && code >= 51 && code <= 57;
}

function isRainCode(code?: number | null): boolean {
  return (
    code != null &&
    ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
  );
}

function num(value?: number | null): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function classifyVisibility(visMeters: number | null): VisibilityCategory {
  if (visMeters === null) return "Sin dato";
  if (visMeters < 50) return "Niebla muy densa";
  if (visMeters < 200) return "Niebla densa";
  if (visMeters < 500) return "Niebla";
  if (visMeters <= 2000) return "Neblina";
  return "Buena";
}

/**
 * Resuelve el fenómeno principal priorizando lo más relevante para vialidad:
 * niebla/neblina > tormenta > nieve > lluvia/llovizna > nublado > despejado.
 */
function resolvePhenomenon(
  input: WeatherSummaryInput,
  visMeters: number | null,
  humidity: number | null,
): WeatherPhenomenon {
  const code = num(input.weather_code);
  const precip = num(input.precipitation_mm) ?? num(input.rain_mm) ?? 0;
  const snow = num(input.snow_mm) ?? 0;

  if (isFogCode(code)) return "niebla";

  // Sin code de niebla: inferir por visibilidad reducida (sin precipitación que la explique)
  const lowVisNoPrecip = visMeters !== null && precip < 0.2 && snow <= 0;
  if (lowVisNoPrecip && visMeters < 500) return "niebla";
  if (lowVisNoPrecip && visMeters <= 2000) {
    // Neblina (agua) si HR alta o desconocida; Bruma (seco) si HR baja
    if (humidity !== null && humidity < 80) return "bruma";
    return "neblina";
  }

  if (isThunderCode(code)) return "tormenta";
  if (snow > 0 || isSnowCode(code)) return "nieve";
  if (isRainCode(code) || precip > 1) return "lluvia";
  if (isDrizzleCode(code) || precip > 0) return "llovizna";

  const cloud = num(input.cloud_cover_percentage);
  if (cloud !== null && cloud >= 70) return "nublado";
  if (cloud !== null) return "despejado";
  return "desconocido";
}

function phenomenonLabel(p: WeatherPhenomenon): string {
  const map: Record<WeatherPhenomenon, string> = {
    niebla: "Niebla",
    neblina: "Neblina",
    bruma: "Bruma seca",
    lluvia: "Lluvia",
    llovizna: "Llovizna",
    nieve: "Nieve",
    tormenta: "Tormenta",
    nublado: "Cielo nublado",
    despejado: "Cielo despejado",
    desconocido: "Condiciones no determinadas",
  };
  return map[p];
}

export function buildWeatherSummary(
  input: WeatherSummaryInput | null | undefined,
): WeatherSummary | null {
  if (!input || Object.keys(input).length === 0) return null;

  const temp = num(input.temperature_celsius);
  const feels = num(input.temperature_feels_like);
  const precip = num(input.precipitation_mm) ?? num(input.rain_mm) ?? 0;
  const snow = num(input.snow_mm) ?? 0;
  const wind = num(input.wind_speed_kmh) ?? 0;
  const gusts = num(input.wind_gusts_kmh) ?? 0;
  const visMeters = num(input.visibility_meters);
  const humidity = num(input.relative_humidity_percent);
  const cloud = num(input.cloud_cover_percentage);
  const code = num(input.weather_code);

  const visibilityCategory = classifyVisibility(visMeters);
  const visibilityKm = visMeters !== null ? Math.round((visMeters / 1000) * 10) / 10 : null;
  const phenomenon = resolvePhenomenon(input, visMeters, humidity);

  const factors: WeatherRiskFactor[] = [];
  let risk: RoadRiskLevel = "bajo";

  // --- Factor visibilidad ---
  if (visMeters !== null) {
    if (visMeters < 50) {
      factors.push({
        label: "Visibilidad",
        detail: `Niebla muy densa: visibilidad inferior a 50 m (${visMeters} m). Circulación extremadamente peligrosa.`,
        severity: "extremo",
      });
      risk = maxRisk(risk, "extremo");
    } else if (visMeters < 200) {
      factors.push({
        label: "Visibilidad",
        detail: `Niebla densa: visibilidad de ${visMeters} m. Riesgo alto de alcance y salidas de calzada.`,
        severity: "alto",
      });
      risk = maxRisk(risk, "alto");
    } else if (visMeters < 500) {
      factors.push({
        label: "Visibilidad",
        detail: `Niebla: visibilidad de ${visMeters} m. Reducir velocidad y aumentar distancia de seguimiento.`,
        severity: "alto",
      });
      risk = maxRisk(risk, "alto");
    } else if (visMeters <= 2000) {
      const tipo = phenomenon === "bruma" ? "Bruma seca" : "Neblina";
      factors.push({
        label: "Visibilidad",
        detail: `${tipo}: visibilidad de ${(visMeters / 1000).toFixed(1)} km. Visibilidad reducida, requiere atención.`,
        severity: "moderado",
      });
      risk = maxRisk(risk, "moderado");
    }
  }

  // --- Factor precipitación ---
  if (snow > 0 || isSnowCode(code)) {
    factors.push({
      label: "Precipitación",
      detail:
        snow > 0
          ? `Nieve: ${snow} mm acumulados. Calzada potencialmente resbaladiza o cubierta.`
          : "Nieve reportada por el código meteorológico.",
      severity: "alto",
    });
    risk = maxRisk(risk, "alto");
  } else if (precip > 10) {
    factors.push({
      label: "Precipitación",
      detail: `Lluvia muy intensa: ${precip} mm. Riesgo de hidroplaneo y anegamientos.`,
      severity: "alto",
    });
    risk = maxRisk(risk, "alto");
  } else if (precip > 5) {
    factors.push({
      label: "Precipitación",
      detail: `Lluvia intensa: ${precip} mm. Calzada mojada y frenado comprometido.`,
      severity: "moderado",
    });
    risk = maxRisk(risk, "moderado");
  } else if (precip > 1) {
    factors.push({
      label: "Precipitación",
      detail: `Lluvia moderada: ${precip} mm. Calzada mojada.`,
      severity: "moderado",
    });
    risk = maxRisk(risk, "moderado");
  } else if (precip > 0 || isDrizzleCode(code) || isRainCode(code)) {
    factors.push({
      label: "Precipitación",
      detail:
        precip > 0
          ? `Precipitación ligera: ${precip} mm. Pavimento húmedo.`
          : "Llovizna indicada por el código meteorológico (acumulado cercano a 0 mm).",
      severity: "bajo",
    });
  }

  // --- Factor tormenta eléctrica ---
  if (isThunderCode(code)) {
    factors.push({
      label: "Tormenta",
      detail: "Tormenta eléctrica activa. Posibles ráfagas, granizo y lluvia súbita.",
      severity: "alto",
    });
    risk = maxRisk(risk, "alto");
  }

  // --- Factor temperatura / hielo ---
  if (input.is_freezing_risk || (temp !== null && temp <= 0)) {
    factors.push({
      label: "Temperatura",
      detail: `Riesgo de hielo/congelamiento (${temp ?? "≤0"}°C). Posible calzada helada, especialmente en puentes y zonas de sombra.`,
      severity: "alto",
    });
    risk = maxRisk(risk, "alto");
  } else if (temp !== null && temp <= 3 && (precip > 0 || (humidity !== null && humidity >= 85))) {
    factors.push({
      label: "Temperatura",
      detail: `Temperatura baja (${temp}°C) con humedad/precipitación. Vigilar formación de hielo.`,
      severity: "moderado",
    });
    risk = maxRisk(risk, "moderado");
  }

  // --- Factor viento ---
  const windRef = Math.max(wind, gusts);
  if (windRef > 60) {
    factors.push({
      label: "Viento",
      detail: `Viento fuerte (${windRef} km/h${gusts > wind ? ", en ráfagas" : ""}). Riesgo de desestabilización de vehículos altos.`,
      severity: "alto",
    });
    risk = maxRisk(risk, "alto");
  } else if (windRef > 40) {
    factors.push({
      label: "Viento",
      detail: `Viento moderado a fuerte (${windRef} km/h). Precaución con vehículos de gran superficie lateral.`,
      severity: "moderado",
    });
    risk = maxRisk(risk, "moderado");
  }

  // --- Headline ---
  const riskWord: Record<RoadRiskLevel, string> = {
    bajo: "Riesgo vial bajo",
    moderado: "Riesgo vial moderado",
    alto: "Riesgo vial alto",
    extremo: "Riesgo vial extremo",
  };
  const headline = `${phenomenonLabel(phenomenon)} — ${riskWord[risk]}`;

  // --- Narrativa para no meteorólogo ---
  const parts: string[] = [];
  parts.push(`Al momento del incidente predominaba ${phenomenonLabel(phenomenon).toLowerCase()}.`);

  if (temp !== null) {
    let t = `La temperatura era de ${temp}°C`;
    if (feels !== null && Math.abs(feels - temp) >= 2) {
      t += ` (sensación térmica ${feels}°C)`;
    }
    parts.push(t + ".");
  }

  if (visMeters !== null) {
    if (visMeters <= 2000) {
      parts.push(
        `La visibilidad era de ${visMeters >= 1000 ? (visMeters / 1000).toFixed(1) + " km" : visMeters + " m"} (${visibilityCategory.toLowerCase()}).`,
      );
    } else {
      parts.push(`La visibilidad era buena (${(visMeters / 1000).toFixed(1)} km).`);
    }
  }

  if (snow > 0) {
    parts.push(`Se registró nieve (${snow} mm).`);
  } else if (precip > 0) {
    parts.push(`Se registraron ${precip} mm de precipitación.`);
  } else {
    parts.push("No se registró precipitación.");
  }

  if (windRef > 40) {
    parts.push(`El viento alcanzaba ${windRef} km/h.`);
  }

  if (humidity !== null) {
    parts.push(`Humedad relativa del ${humidity}%.`);
  }

  if (cloud !== null && phenomenon !== "despejado" && phenomenon !== "nublado") {
    parts.push(`Nubosidad del ${cloud}%.`);
  }

  // Recomendación según riesgo
  const advice: Record<RoadRiskLevel, string> = {
    bajo: "Condiciones sin agravantes meteorológicos relevantes para la conducción.",
    moderado:
      "Condiciones que exigen precaución: moderar la velocidad y aumentar la distancia de seguimiento.",
    alto: "Condiciones adversas: alto riesgo de siniestralidad asociada al clima. Conducción muy cautelosa.",
    extremo:
      "Condiciones críticas: visibilidad o estado de calzada extremos. Circulación desaconsejada salvo necesidad.",
  };
  parts.push(advice[risk]);

  return {
    phenomenon,
    visibility_category: visibilityCategory,
    visibility_km: visibilityKm,
    road_risk_level: risk,
    headline,
    factors,
    narrative: parts.join(" "),
  };
}

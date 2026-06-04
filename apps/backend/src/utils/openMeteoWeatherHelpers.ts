export const OPEN_METEO_DEFAULT_TIMEZONE = "America/Argentina/Cordoba";

/** WMO codes 51–67, 80–82, 95–99 indican lluvia/llovizna/chubascos/tormenta */
export function isRainWeatherCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  );
}

/**
 * Open-Meteo puede devolver precipitation/rain en 0 con weather_code de lluvia.
 * Prioriza rain, luego precipitation, y usa mínimo simbólico si el código indica lluvia.
 */
export function normalizeOpenMeteoPrecipitation(
  weatherCode: number,
  precipitation: number | null | undefined,
  rain?: number | null | undefined,
): { precipitation_mm: number; rain_mm: number | undefined } {
  const precip = precipitation ?? 0;
  const rainVal = rain ?? 0;
  const effective = Math.max(precip, rainVal);

  if (effective > 0) {
    return {
      precipitation_mm: effective,
      rain_mm: rainVal > 0 ? rainVal : effective,
    };
  }

  if (isRainWeatherCode(weatherCode)) {
    return { precipitation_mm: 0.1, rain_mm: 0.1 };
  }

  return { precipitation_mm: 0, rain_mm: rainVal > 0 ? rainVal : undefined };
}

/** Fecha local (YYYY-MM-DD) para start_date/end_date de Open-Meteo */
export function formatLocalDateForOpenMeteo(
  date: Date,
  timeZone = OPEN_METEO_DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Convierte hora local Open-Meteo (sin offset) a timestamp UTC */
export function parseOpenMeteoHourlyTime(
  isoLocalTime: string,
  utcOffsetSeconds: number,
): number {
  const sign = utcOffsetSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(utcOffsetSeconds);
  const hours = String(Math.floor(abs / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return new Date(`${isoLocalTime}${sign}${hours}:${minutes}`).getTime();
}

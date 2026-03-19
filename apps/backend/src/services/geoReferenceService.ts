import { dbService } from "../database/dbService";
import { logger } from "../utils/logger";
import {
  WAZE_ALERT_TYPES,
  WAZE_ALERT_SUBTYPES,
} from "../utils/wazeTranslations";

interface CachedMarker {
  name: string;
  route_name: string;
  latitude: number;
  longitude: number;
  km_label: string;
}

interface NearestMarkerResult {
  name: string;
  route_name: string;
  km_label: string;
  distance: number;
}

const EARTH_RADIUS_M = 6_371_000;
const DEFAULT_THRESHOLD_M = 5_000;

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(hav));
}

// ─── Número a texto en español (0–999 + decimales) ─────────

const UNIDADES = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];

const DECENAS = [
  "",
  "",
  "",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function integerToWords(n: number): string {
  if (n === 0) return "cero";
  if (n === 100) return "cien";
  if (n < 0) return `menos ${integerToWords(-n)}`;

  const parts: string[] = [];

  if (n >= 1000) {
    const miles = Math.floor(n / 1000);
    if (miles === 1) {
      parts.push("mil");
    } else {
      parts.push(`${integerToWords(miles)} mil`);
    }
    n %= 1000;
  }

  if (n >= 100) {
    if (n === 100) {
      parts.push("cien");
      return parts.join(" ");
    }
    parts.push(CENTENAS[Math.floor(n / 100)]);
    n %= 100;
  }

  if (n >= 30) {
    const decena = Math.floor(n / 10);
    const unidad = n % 10;
    if (unidad === 0) {
      parts.push(DECENAS[decena]);
    } else {
      parts.push(`${DECENAS[decena]} y ${UNIDADES[unidad]}`);
    }
  } else if (n > 0) {
    parts.push(UNIDADES[n]);
  }

  return parts.join(" ");
}

function kmNumberToWords(raw: string): string {
  const cleaned = raw
    .replace(/^Km\s*/i, "")
    .replace(/^0+(\d)/, "$1")
    .trim();

  const num = parseFloat(cleaned);
  if (isNaN(num)) return cleaned;

  const intPart = Math.floor(num);
  const decPart = cleaned.includes(".") ? cleaned.split(".")[1] : null;

  let text = `kilómetro ${integerToWords(intPart)}`;

  if (decPart) {
    const dec = parseInt(decPart, 10);
    if (dec === 5 || dec === 50) {
      text += " y medio";
    } else if (dec === 25) {
      text += " y un cuarto";
    } else if (dec === 75) {
      text += " y tres cuartos";
    } else if (dec > 0) {
      text += ` punto ${integerToWords(dec)}`;
    }
  }

  return text;
}

function routeNameToSpeech(route: string): string {
  if (!route) return "";
  let speech = route
    .replace(/\bRN\s*(\d+)/gi, "Ruta Nacional $1")
    .replace(/\bRP\s*(\d+)/gi, "Ruta Provincial $1")
    .replace(/\bAU\s*(\d+)/gi, "Autopista $1")
    .replace(/\bRuta Nacional\s+/gi, "Ruta Nacional ")
    .replace(/\bRuta Provincial\s+/gi, "Ruta Provincial ")
    .replace(/\bAUTOVIA\s+/gi, "Autovía ")
    .trim();

  speech = speech.replace(/(\d+)/g, (_, digits) => {
    const n = parseInt(digits, 10);
    return isNaN(n) ? digits : integerToWords(n);
  });

  return speech;
}

function parseKmLabel(name: string): string {
  const kmMatch = name.match(/Km\s+[\d.]+/i);
  return kmMatch ? kmMatch[0] : name;
}

// ─── Servicio principal ────────────────────────────────────

export class GeoReferenceService {
  private static instance: GeoReferenceService;
  private markers: CachedMarker[] = [];
  private loaded = false;

  private constructor() {}

  static getInstance(): GeoReferenceService {
    if (!GeoReferenceService.instance) {
      GeoReferenceService.instance = new GeoReferenceService();
    }
    return GeoReferenceService.instance;
  }

  async loadMarkers(): Promise<void> {
    try {
      const res = await dbService.query(
        `SELECT name, route_name, latitude, longitude
         FROM kilometer_markers
         WHERE is_active = true`,
      );

      this.markers = res.rows.map((r: any) => ({
        name: r.name,
        route_name: r.route_name || "",
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        km_label: parseKmLabel(r.name),
      }));

      this.loaded = true;
      logger.info(
        `📍 GeoReferenceService: ${this.markers.length} hitos cargados en memoria`,
      );
    } catch (err) {
      logger.error(
        "Error cargando hitos kilométricos:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.loadMarkers();
  }

  async reloadMarkers(): Promise<void> {
    this.loaded = false;
    await this.loadMarkers();
  }

  findNearestMarker(
    lat: number,
    lng: number,
    thresholdM = DEFAULT_THRESHOLD_M,
  ): NearestMarkerResult | null {
    if (this.markers.length === 0) return null;

    let best: NearestMarkerResult | null = null;
    let minDist = Infinity;

    for (const m of this.markers) {
      const dist = haversineDistance(lat, lng, m.latitude, m.longitude);
      if (dist < minDist) {
        minDist = dist;
        best = {
          name: m.name,
          route_name: m.route_name,
          km_label: m.km_label,
          distance: dist,
        };
      }
    }

    return best && best.distance <= thresholdM ? best : null;
  }

  generateTTSText(
    type: string,
    subtype: string | null | undefined,
    nearest: NearestMarkerResult | null,
    street?: string | null,
  ): string {
    const typeLabel =
      WAZE_ALERT_SUBTYPES[subtype || ""] ||
      WAZE_ALERT_TYPES[type] ||
      "Incidente vial";

    const parts = [
      "Atención, operadores.",
      "Nuevo incidente ingresado en el sistema.",
      `Reporte: ${typeLabel}.`,
      "Localización:",
    ];

    if (nearest) {
      let routeSpeech = routeNameToSpeech(nearest.route_name);
      const kmSpeech = kmNumberToWords(nearest.km_label);

      // REGLA ESPECIAL: En Circunvalación (A-19) cambiar "Adiecinueve" por "cerodiecinueve"
      // También aplica a Ruta Nacional 19
      if (
        nearest.route_name.toLowerCase().includes("a-19") ||
        nearest.route_name.toLowerCase().includes("circunvalacion") ||
        nearest.route_name.includes("19")
      ) {
        routeSpeech = routeSpeech.replace(/Adiecinueve/gi, "cerodiecinueve");
        routeSpeech = routeSpeech.replace(/diecinueve/gi, "cerodiecinueve");
        
        // Si no menciona Circunvalación, lo agregamos para claridad del operador
        if (!routeSpeech.toLowerCase().includes("circunvalacion")) {
          routeSpeech = `${routeSpeech} Circunvalación`;
        }
      }

      if (routeSpeech) {
        parts.push(`${routeSpeech},`);
      }
      parts.push(`a la altura del ${kmSpeech}.`);
    } else if (street) {
      let streetClean = street
        .replace(/\bRN\s*/gi, "Ruta Nacional ")
        .replace(/\bRP\s*/gi, "Ruta Provincial ")
        .replace(/\bAv\.?\s*/gi, "Avenida ")
        .replace(/\bKM\s*(\d+)/gi, "kilómetro $1")
        .trim();

      // Aplicar regla cerodiecinueve también en streets limpias si es la RN 19
      if (streetClean.includes("19") || streetClean.toLowerCase().includes("a-19")) {
        streetClean = streetClean.replace(/19/g, "cerodiecinueve");
      }

      parts.push(`${streetClean}.`);
    } else {
      parts.push("Coordenadas no referenciadas.");
    }

    return parts.join(" ");
  }

  getMarkerCount(): number {
    return this.markers.length;
  }
}

export const geoReferenceService = GeoReferenceService.getInstance();

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  useBlockingAnalysis,
  type BlockingAnalysisItem,
} from "../hooks/useWazeData";
import {
  getIncidentDescription,
  getMainTypeTranslation,
  getSubtypeTranslation,
  getIncidentColor,
} from "../utils/wazeTranslations";
import { WazeIcon } from "./WazeIcon";
import {
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Map as MapIcon,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Radio,
  X,
  Filter,
  ChevronDown,
} from "lucide-react";
import { iconCacheService } from "../utils/iconCache";
import { MiniMapLibre } from "./map/MiniMapLibre";

// Tipos y subtipos de eventos para filtrar (jerarquía)
const EVENT_TYPE_FILTERS = {
  all: { label: "📋 Todos los tipos", parent: null },
  // Accidentes
  ACCIDENT: { label: "🚗 Siniestros (todos)", parent: null },
  ACCIDENT_MINOR: { label: "Accidente leve", parent: "ACCIDENT" },
  ACCIDENT_MAJOR: { label: "Colisión múltiple", parent: "ACCIDENT" },
  // Peligros
  HAZARD: { label: "⚠️ Peligros (todos)", parent: null },
  HAZARD_ON_ROAD_POT_HOLE: { label: "Bache", parent: "HAZARD" },
  HAZARD_ON_ROAD_OBJECT: { label: "Objeto en calzada", parent: "HAZARD" },
  HAZARD_ON_ROAD_CONSTRUCTION: { label: "Obras", parent: "HAZARD" },
  HAZARD_ON_ROAD_CAR_STOPPED: { label: "Vehículo detenido", parent: "HAZARD" },
  HAZARD_ON_SHOULDER_CAR_STOPPED: { label: "Auto en orilla", parent: "HAZARD" },
  HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT: {
    label: "Semáforo averiado",
    parent: "HAZARD",
  },
  HAZARD_WEATHER: { label: "Mal tiempo", parent: "HAZARD" },
  // Cierres
  ROAD_CLOSED: { label: "🚧 Cierres (todos)", parent: null },
  ROAD_CLOSED_EVENT: { label: "Cierre por evento", parent: "ROAD_CLOSED" },
  ROAD_CLOSED_CONSTRUCTION: {
    label: "Cierre por obras",
    parent: "ROAD_CLOSED",
  },
  ROAD_CLOSED_HAZARD: { label: "Cierre por peligro", parent: "ROAD_CLOSED" },
  // Congestiones
  JAM: { label: "🚦 Congestiones (todos)", parent: null },
  JAM_HEAVY_TRAFFIC: { label: "Embotellamiento", parent: "JAM" },
  JAM_MODERATE_TRAFFIC: { label: "Tránsito denso", parent: "JAM" },
  JAM_LIGHT_TRAFFIC: { label: "Tránsito lento", parent: "JAM" },
  JAM_STAND_STILL_TRAFFIC: { label: "Tránsito detenido", parent: "JAM" },
} as const;

type FilterValue = keyof typeof EVENT_TYPE_FILTERS;

/**
 * Componente de Incidentes Bloqueantes con Cálculo Mejorado de Demoras
 *
 * Usa el nuevo servicio de backend que calcula demoras mediante:
 * 1. Proximidad geográfica (jams cercanos al incidente)
 * 2. Estimación de desvío (para cortes de ruta)
 * 3. Comparación histórica (flujo actual vs histórico)
 */
export const BlockingIncidents: React.FC = () => {
  const { data, isLoading, isError } = useBlockingAnalysis();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [mapModalData, setMapModalData] = useState<{
    isOpen: boolean;
    locations: Array<{ lat: number; lng: number; id: string }>;
    title: string;
    description: string;
    type: string;
    subtype?: string;
    polygonName: string;
    feed: string;
  } | null>(null);

  // Filtrar análisis por tipo
  const filteredAnalyses = useMemo(() => {
    if (!data?.analyses) return [];
    if (typeFilter === "all") return data.analyses;

    const filterConfig = EVENT_TYPE_FILTERS[typeFilter as FilterValue];
    if (!filterConfig) return data.analyses;

    return data.analyses.filter((analysis: BlockingAnalysisItem) => {
      const type = analysis.incident.type?.toUpperCase() || "";
      const subtype = analysis.incident.subtype?.toUpperCase() || "";

      // Si es una categoría principal (parent === null)
      if (filterConfig.parent === null) {
        // Casos especiales de mapeo de tipos de Waze a nuestras categorías
        if (typeFilter === "ACCIDENT") return type === "ACCIDENT";
        if (typeFilter === "HAZARD")
          return type === "HAZARD" || type === "WEATHERHAZARD";
        if (typeFilter === "ROAD_CLOSED") return type === "ROAD_CLOSED";
        if (typeFilter === "JAM") return type === "JAM" || type === "TRAFFIC";
        return type === typeFilter;
      }

      // Si es un subtipo específico
      return subtype === typeFilter || type === typeFilter;
    });
  }, [data?.analyses, typeFilter]);

  if (isLoading) {
    return (
      <div className="card dark:bg-zinc-900 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🚨 Incidentes con Mayor Impacto
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Analizando incidentes...
          </span>
        </div>
      </div>
    );
  }

  if (isError || !data || data.analyses.length === 0) {
    return null;
  }

  const getImpactLevelStyle = (impactScore: number) => {
    if (impactScore >= 50)
      return {
        bg: "bg-red-100 dark:bg-red-900/40",
        text: "text-red-800 dark:text-red-200",
        label: "CRÍTICO",
      };
    if (impactScore >= 25)
      return {
        bg: "bg-orange-100 dark:bg-orange-900/40",
        text: "text-orange-800 dark:text-orange-200",
        label: "ALTO",
      };
    if (impactScore >= 10)
      return {
        bg: "bg-yellow-100 dark:bg-yellow-900/40",
        text: "text-yellow-800 dark:text-yellow-200",
        label: "MODERADO",
      };
    return {
      bg: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-800 dark:text-blue-200",
      label: "BAJO",
    };
  };

  const getConfidenceStyle = (confidence: number) => {
    if (confidence >= 70) return "text-green-600 dark:text-green-400";
    if (confidence >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-500 dark:text-red-400";
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "linked":
        return "🔗 Datos directos";
      case "proximity":
        return "📍 Zona afectada";
      case "detour":
        return "🔄 Estimación desvío";
      case "minimal":
        return "⚠️ Datos limitados";
      default:
        return method;
    }
  };

  const getDataQualityBadge = (quality?: string) => {
    switch (quality) {
      case "high":
        return {
          bg: "bg-green-100 dark:bg-green-900/30",
          text: "text-green-700 dark:text-green-300",
          label: "Datos reales",
        };
      case "medium":
        return {
          bg: "bg-yellow-100 dark:bg-yellow-900/30",
          text: "text-yellow-700 dark:text-yellow-300",
          label: "Datos parciales",
        };
      case "low":
        return {
          bg: "bg-orange-100 dark:bg-orange-900/30",
          text: "text-orange-700 dark:text-orange-300",
          label: "Estimación",
        };
      default:
        return {
          bg: "bg-gray-100 dark:bg-gray-800",
          text: "text-gray-600 dark:text-gray-400",
          label: "Sin datos",
        };
    }
  };

  // Tooltips explicativos para cada métrica
  const metricExplanations = {
    linkedJams:
      "Demora REAL reportada por Waze en congestiones vinculadas directamente al incidente",
    proximity:
      "Demora REAL de congestiones en calles cercanas (máx 300m del incidente)",
    detour:
      "Tiempo adicional estimado por usar ruta alternativa (solo si no hay datos de congestión)",
    historical:
      "Contexto: diferencia vs promedio histórico (NO se suma al total)",
    confidence:
      "Precisión del cálculo según disponibilidad de datos reales de Waze",
    impact: "Severidad considerando demora, extensión y tipo de vía",
  };

  // Calcula la antigüedad del incidente en formato legible
  const getIncidentAge = (timestamp: Date | string) => {
    const reportDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - reportDate.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    // Formato de duración
    let duration: string;
    if (years > 0) {
      duration = years === 1 ? "1 año" : `${years} años`;
      if (months % 12 > 0)
        duration += ` y ${months % 12} mes${months % 12 > 1 ? "es" : ""}`;
    } else if (months > 0) {
      duration = months === 1 ? "1 mes" : `${months} meses`;
    } else if (days > 0) {
      duration = days === 1 ? "1 día" : `${days} días`;
    } else if (hours > 0) {
      duration = hours === 1 ? "1 hora" : `${hours} horas`;
    } else {
      duration = minutes <= 1 ? "hace momentos" : `${minutes} minutos`;
    }

    // Formato de fecha
    const dateStr = reportDate.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return { duration, dateStr, days, isOld: days > 7 };
  };

  return (
    <div className="card dark:bg-zinc-900 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
          Incidentes con Mayor Impacto
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Tiempo Real
          </span>
        </h2>

        {/* Filtro de tipo de evento */}
        <div className="flex items-center gap-2">
          {/* Contador de eventos filtrados */}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-white">
              {filteredAnalyses.length}
            </strong>
            {typeFilter !== "all" && (
              <span className="text-gray-400 dark:text-gray-500">
                {" "}
                / {data?.analyses?.length || 0}
              </span>
            )}
          </span>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg pl-8 pr-8 py-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
            >
              <option value="all">{EVENT_TYPE_FILTERS.all.label}</option>

              <optgroup label="🚗 Siniestros">
                <option value="ACCIDENT">
                  {EVENT_TYPE_FILTERS.ACCIDENT.label}
                </option>
                <option value="ACCIDENT_MINOR">
                  {EVENT_TYPE_FILTERS.ACCIDENT_MINOR.label}
                </option>
                <option value="ACCIDENT_MAJOR">
                  {EVENT_TYPE_FILTERS.ACCIDENT_MAJOR.label}
                </option>
              </optgroup>

              <optgroup label="⚠️ Peligros">
                <option value="HAZARD">
                  {EVENT_TYPE_FILTERS.HAZARD.label}
                </option>
                <option value="HAZARD_ON_ROAD_POT_HOLE">
                  {EVENT_TYPE_FILTERS.HAZARD_ON_ROAD_POT_HOLE.label}
                </option>
                <option value="HAZARD_ON_ROAD_OBJECT">
                  {EVENT_TYPE_FILTERS.HAZARD_ON_ROAD_OBJECT.label}
                </option>
                <option value="HAZARD_ON_ROAD_CAR_STOPPED">
                  {EVENT_TYPE_FILTERS.HAZARD_ON_ROAD_CAR_STOPPED.label}
                </option>
                <option value="HAZARD_ON_SHOULDER_CAR_STOPPED">
                  {EVENT_TYPE_FILTERS.HAZARD_ON_SHOULDER_CAR_STOPPED.label}
                </option>
                <option value="HAZARD_ON_ROAD_CONSTRUCTION">
                  {EVENT_TYPE_FILTERS.HAZARD_ON_ROAD_CONSTRUCTION.label}
                </option>
                <option value="HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT">
                  {EVENT_TYPE_FILTERS.HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT.label}
                </option>
                <option value="HAZARD_WEATHER">
                  {EVENT_TYPE_FILTERS.HAZARD_WEATHER.label}
                </option>
              </optgroup>

              <optgroup label="🚧 Cierres">
                <option value="ROAD_CLOSED">
                  {EVENT_TYPE_FILTERS.ROAD_CLOSED.label}
                </option>
                <option value="ROAD_CLOSED_EVENT">
                  {EVENT_TYPE_FILTERS.ROAD_CLOSED_EVENT.label}
                </option>
                <option value="ROAD_CLOSED_CONSTRUCTION">
                  {EVENT_TYPE_FILTERS.ROAD_CLOSED_CONSTRUCTION.label}
                </option>
                <option value="ROAD_CLOSED_HAZARD">
                  {EVENT_TYPE_FILTERS.ROAD_CLOSED_HAZARD.label}
                </option>
              </optgroup>

              <optgroup label="🚦 Congestiones">
                <option value="JAM">{EVENT_TYPE_FILTERS.JAM.label}</option>
                <option value="JAM_HEAVY_TRAFFIC">
                  {EVENT_TYPE_FILTERS.JAM_HEAVY_TRAFFIC.label}
                </option>
                <option value="JAM_MODERATE_TRAFFIC">
                  {EVENT_TYPE_FILTERS.JAM_MODERATE_TRAFFIC.label}
                </option>
              </optgroup>
            </select>
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Mensaje cuando no hay resultados con el filtro */}
      {filteredAnalyses.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay incidentes de este tipo activos</p>
          <button
            onClick={() => setTypeFilter("all")}
            className="text-blue-600 dark:text-blue-400 text-sm mt-2 hover:underline"
          >
            Ver todos los incidentes
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredAnalyses.map((analysis: BlockingAnalysisItem) => {
          const description = getIncidentDescription(
            analysis.incident.type,
            analysis.incident.subtype
          );
          const impactStyle = getImpactLevelStyle(analysis.impactScore);
          const age = getIncidentAge(analysis.incident.timestamp);

          return (
            <div
              key={analysis.incident.id}
              className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors hover:shadow-md"
            >
              {/* Header del incidente */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <WazeIcon
                      type={analysis.incident.type}
                      subtype={analysis.incident.subtype}
                      size="lg"
                    />
                    <div className="flex flex-col">
                      <span className="leading-snug">
                        {(() => {
                          const isPlural = analysis.reportCount > 1;
                          let typeText = description;

                          // Lógica básica de pluralización
                          if (isPlural) {
                            if (
                              typeText.endsWith("a") ||
                              typeText.endsWith("e") ||
                              typeText.endsWith("o")
                            ) {
                              typeText += "s";
                            } else if (
                              typeText.endsWith("n") ||
                              typeText.endsWith("l") ||
                              typeText.endsWith("r")
                            ) {
                              typeText += "es";
                            }
                            if (typeText === "Baches") typeText = "Baches"; // Fix específico común
                          }

                          // Construcción del título: Tipo + Calle + Tramo
                          const locationPart = analysis.incident.street
                            ? ` en ${analysis.incident.street}`
                            : "";
                          const polygonPart = analysis.polygonName
                            ? ` - ${analysis.polygonName}`
                            : "";

                          return `${typeText}${locationPart}${polygonPart}`;
                        })()}
                      </span>
                    </div>
                  </h3>
                  {/* Mostrar descripción del evento si está disponible y es diferente del tipo traducido */}
                  {analysis.incident.description &&
                    analysis.incident.description !== description &&
                    analysis.incident.description !==
                      analysis.incident.subtype &&
                    analysis.incident.description !== analysis.incident.type &&
                    (() => {
                      // Intentar traducir la descripción si es una key de Waze
                      let translatedDescription = analysis.incident.description;
                      const mainTypeTranslated = getMainTypeTranslation(
                        analysis.incident.description
                      );

                      if (
                        mainTypeTranslated !== analysis.incident.description
                      ) {
                        translatedDescription = mainTypeTranslated;
                      } else if (analysis.incident.subtype) {
                        const subtypeTranslated = getSubtypeTranslation(
                          analysis.incident.type,
                          analysis.incident.description
                        );
                        if (
                          subtypeTranslated !== analysis.incident.description
                        ) {
                          translatedDescription = subtypeTranslated;
                        }
                      }

                      // Normalización para comparación
                      const descLower = description.toLowerCase();
                      const transLower = translatedDescription.toLowerCase();

                      // Si la información es redundante, no mostrarla
                      if (
                        descLower === transLower ||
                        descLower.includes(transLower) ||
                        transLower.includes(descLower)
                      ) {
                        return null;
                      }

                      return (
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
                          <WazeIcon type={analysis.incident.type} size="sm" />
                          <span className="font-medium">Evento:</span>
                          <span>{translatedDescription}</span>
                        </p>
                      );
                    })()}

                  {/* Sectores afectados con nombre del polígono */}
                  {analysis.affectedStreets?.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {analysis.affectedStreets.join(", ")}
                        {analysis.polygonName && ` (${analysis.polygonName})`}
                      </span>
                    </p>
                  )}
                  {/* Antigüedad del incidente */}
                  <p
                    className={`text-xs mt-1 flex items-center gap-1 ${
                      age.isOld
                        ? "text-orange-600 dark:text-orange-400 font-medium"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    title={`Reportado el ${age.dateStr}`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Activo hace {age.duration}</span>
                    {age.isOld && (
                      <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded ml-1">
                        Prolongado
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-xs px-2 py-1 rounded font-bold ${impactStyle.bg} ${impactStyle.text}`}
                  >
                    {impactStyle.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Impacto: {analysis.impactScore}
                  </span>
                  {/* Indicador de múltiples reportes */}
                  {analysis.reportCount > 1 && (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Users className="w-3 h-3" /> {analysis.reportCount}{" "}
                      reportes
                    </span>
                  )}
                  {/* Botón para ver en mapa */}
                  <button
                    onClick={() =>
                      setMapModalData({
                        isOpen: true,
                        locations: analysis.allLocations || [
                          {
                            lat: analysis.incident.location.lat,
                            lng: analysis.incident.location.lng,
                            id: analysis.incident.id,
                          },
                        ],
                        title: description,
                        description:
                          analysis.incident.street || "Ubicación del incidente",
                        type: analysis.incident.type,
                        subtype: analysis.incident.subtype,
                        polygonName: analysis.polygonName || "Desconocido",
                        feed: analysis.polygonGroup || "Feed principal",
                      })
                    }
                    className="text-xs bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:shadow-md font-medium mt-1"
                    title="Ver ubicación en mapa"
                  >
                    <MapIcon className="w-3 h-3" />
                    <span>Ver mapa</span>
                  </button>
                </div>
              </div>

              {/* Grid de métricas principales */}
              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div className="bg-gradient-to-br from-red-50 via-red-50 to-red-100 dark:from-red-900/20 dark:via-red-900/20 dark:to-red-900/40 rounded-lg p-2 border border-red-300 dark:border-red-800/50">
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-xs">
                    Demora Estimada
                  </p>
                  <p className="font-black text-red-600 dark:text-red-400 text-lg">
                    {analysis.delay.totalDelayMinutes} min
                  </p>
                </div>
                <div
                  className="bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-blue-900/20 dark:via-blue-900/20 dark:to-blue-900/40 rounded-lg p-2 border border-blue-300 dark:border-blue-800/50"
                  title={metricExplanations.linkedJams}
                >
                  <p className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1 text-xs">
                    Tramos Afectados
                    <span className="text-blue-500 dark:text-blue-400 cursor-help text-[10px]">
                      ⓘ
                    </span>
                  </p>
                  <p className="font-black text-blue-600 dark:text-blue-400 text-lg">
                    {analysis.linkedJams + analysis.delay.consideredJams.nearby}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 dark:from-purple-900/20 dark:via-purple-900/20 dark:to-purple-900/40 rounded-lg p-2 border border-purple-300 dark:border-purple-800/50">
                  <p className="text-gray-700 dark:text-gray-300 font-medium text-xs">
                    Extensión
                  </p>
                  <p className="font-black text-purple-600 dark:text-purple-400 text-lg">
                    {analysis.affectedLengthKm} km
                  </p>
                </div>
                <div
                  className="bg-gradient-to-br from-green-50 via-green-50 to-green-100 dark:from-green-900/20 dark:via-green-900/20 dark:to-green-900/40 rounded-lg p-2 border border-green-300 dark:border-green-800/50"
                  title={metricExplanations.confidence}
                >
                  <p className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1 text-xs">
                    Precisión
                    <span className="text-green-500 dark:text-green-400 cursor-help text-[10px]">
                      ⓘ
                    </span>
                  </p>
                  <p
                    className={`font-black text-lg ${getConfidenceStyle(
                      analysis.delay.confidence
                    )}`}
                  >
                    {analysis.delay.confidence}%
                  </p>
                </div>
              </div>

              {/* Desglose del cálculo de demora */}
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Origen de la Demora
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        getDataQualityBadge(analysis.delay.dataQuality).bg
                      } ${
                        getDataQualityBadge(analysis.delay.dataQuality).text
                      }`}
                    >
                      {getDataQualityBadge(analysis.delay.dataQuality).label}
                    </span>
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {getMethodLabel(analysis.delay.primaryMethod)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div
                    className="text-center bg-white dark:bg-zinc-900 rounded p-2 border dark:border-zinc-700"
                    title={metricExplanations.linkedJams}
                  >
                    <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 text-[10px]">
                      Congestión directa
                      <span className="text-gray-400 dark:text-gray-500 cursor-help">
                        ⓘ
                      </span>
                    </p>
                    <p className="font-bold text-gray-800 dark:text-white text-sm">
                      {Math.round(
                        analysis.delay.breakdown.linkedJamsDelay / 60
                      )}{" "}
                      min
                    </p>
                  </div>
                  <div
                    className="text-center bg-white dark:bg-zinc-900 rounded p-2 border dark:border-zinc-700"
                    title={metricExplanations.proximity}
                  >
                    <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 text-[10px]">
                      Zona afectada
                      <span className="text-gray-400 dark:text-gray-500 cursor-help">
                        ⓘ
                      </span>
                    </p>
                    <p className="font-bold text-gray-800 dark:text-white text-sm">
                      {Math.round(analysis.delay.breakdown.proximityDelay / 60)}{" "}
                      min
                    </p>
                  </div>
                  <div
                    className="text-center bg-white dark:bg-zinc-900 rounded p-2 border dark:border-zinc-700"
                    title={metricExplanations.detour}
                  >
                    <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 text-[10px]">
                      Desvío estimado
                      <span className="text-gray-400 dark:text-gray-500 cursor-help">
                        ⓘ
                      </span>
                    </p>
                    <p className="font-bold text-gray-800 dark:text-white text-sm">
                      {Math.round(analysis.delay.breakdown.detourDelay / 60)}{" "}
                      min
                    </p>
                  </div>
                </div>

                {/* Contexto histórico (informativo, no suma al total) */}
                {analysis.delay.breakdown.historicalDelta > 0 && (
                  <div
                    className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between text-[10px]"
                    title={metricExplanations.historical}
                  >
                    <span className="text-gray-400 dark:text-gray-500 italic flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Contexto:{" "}
                      {Math.round(
                        analysis.delay.breakdown.historicalDelta / 60
                      )}{" "}
                      min peor que promedio histórico
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      (no suma al total)
                    </span>
                  </div>
                )}

                {/* Datos raw de Waze */}
                {analysis.delay.rawDataUsed &&
                  analysis.delay.rawDataUsed.totalJamsConsidered > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-700 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Radio className="w-3 h-3" />
                        Datos Waze:
                      </span>
                      <span>
                        {analysis.delay.rawDataUsed.totalJamsConsidered}{" "}
                        congestiones
                      </span>
                      {analysis.delay.rawDataUsed.avgJamSpeed !== null && (
                        <span>
                          • {analysis.delay.rawDataUsed.avgJamSpeed} km/h prom
                        </span>
                      )}
                      <span>
                        •{" "}
                        {(
                          analysis.delay.rawDataUsed.totalAffectedLength / 1000
                        ).toFixed(1)}{" "}
                        km afectados
                      </span>
                    </div>
                  )}

                {analysis.delay.details && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 border-t border-gray-200 dark:border-zinc-700 pt-2 leading-relaxed flex items-start gap-1">
                    <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span>{analysis.delay.details}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen al final */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white">
                {data.count}
              </strong>{" "}
              incidentes
            </span>
            {data.summary.duplicatesRemoved > 0 && (
              <span
                className="text-xs text-blue-600 dark:text-blue-400"
                title={`Se agruparon ${data.summary.duplicatesRemoved} reportes duplicados`}
              >
                ({data.summary.totalReports} reportes agrupados)
              </span>
            )}
          </div>
          <div
            className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"
            title="Demoras calculadas usando datos reales del feed de Waze (delay, speed, length)"
          >
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
            Datos en tiempo real de Waze
          </div>
        </div>
      </div>

      {/* Modal del minimapa */}
      {mapModalData?.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setMapModalData(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
              className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-200 dark:border-zinc-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <MapIcon className="w-5 h-5" />
                      {mapModalData.title}
                    </h3>
                    <p className="text-blue-100 text-sm mt-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {mapModalData.description}
                      {mapModalData.locations.length > 1 && (
                        <span className="ml-2 bg-blue-500 px-2 py-0.5 rounded text-xs">
                          {mapModalData.locations.length} puntos reportados
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setMapModalData(null)}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-all hover:rotate-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mapa */}
              <div className="h-[400px]">
                <MiniMapLibre
                  center={[
                    mapModalData.locations[0].lat,
                    mapModalData.locations[0].lng,
                  ]}
                  zoom={mapModalData.locations.length > 1 ? 14 : 16}
                  markers={mapModalData.locations.map((loc, index) => ({
                    lat: loc.lat,
                    lng: loc.lng,
                    id: loc.id || `marker-${index}`,
                    type: mapModalData.type,
                    subtype: mapModalData.subtype,
                    color: getIncidentColor(mapModalData.type),
                    popup: (
                      <div className="bg-white dark:bg-zinc-800 rounded-lg overflow-hidden w-[300px]">
                        {/* Header con gradiente */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3">
                          <div className="flex items-center gap-2">
                            <WazeIcon
                              type={mapModalData.type}
                              subtype={mapModalData.subtype}
                              size="md"
                              className="text-white"
                            />
                            <p className="font-bold text-sm">
                              {mapModalData.title}
                            </p>
                          </div>
                        </div>

                        {/* Contenido */}
                        <div className="p-3 space-y-2">
                          {/* Feed */}
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2">
                            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                              </svg>
                              Feed: {mapModalData.feed}
                            </p>
                          </div>

                          {/* Polígono */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Polígono: {mapModalData.polygonName}
                            </p>
                          </div>

                          {/* Dirección */}
                          {mapModalData.description && (
                            <div className="bg-gray-50 dark:bg-zinc-700/50 border border-gray-200 dark:border-zinc-600 rounded-lg p-2">
                              <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold flex items-start gap-1">
                                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{mapModalData.description}</span>
                              </p>
                            </div>
                          )}

                          {/* Reporte # */}
                          {mapModalData.locations.length > 1 && (
                            <div className="text-center">
                              <span className="inline-block bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded">
                                Reporte #{index + 1} de{" "}
                                {mapModalData.locations.length}
                              </span>
                            </div>
                          )}

                          {/* Coordenadas */}
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                            <p className="text-xs text-amber-800 dark:text-amber-300 font-mono flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="font-semibold">Posición:</span>{" "}
                              {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  }))}
                  height="400px"
                />
              </div>

              {/* Footer */}
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 border-t flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {mapModalData.locations.length === 1
                    ? "1 ubicación reportada"
                    : `${mapModalData.locations.length} ubicaciones reportadas en esta zona`}
                </span>
                <button
                  onClick={() => setMapModalData(null)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

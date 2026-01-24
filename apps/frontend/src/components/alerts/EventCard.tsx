import React from "react";
import {
  Clock,
  Users,
  MapPin,
  Map as MapIcon,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { type BlockingAnalysisItem } from "../../hooks/useWazeData";
import {
  getIncidentDescription,
  getMainTypeTranslation,
  getSubtypeTranslation,
} from "../../utils/wazeTranslations";
import { WazeIcon } from "../ui/WazeIcon";

// Utilidades copiadas de BlockingIncidents
const getImpactLevelStyle = (score: number) => {
  if (score >= 80)
    return {
      label: "🔴 Crítico",
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
    };
  if (score >= 60)
    return {
      label: "🟠 Alto",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      text: "text-orange-700 dark:text-orange-400",
    };
  if (score >= 40)
    return {
      label: "🟡 Medio",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      text: "text-yellow-700 dark:text-yellow-400",
    };
  return {
    label: "🟢 Bajo",
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
  };
};

const getIncidentAge = (timestamp: string) => {
  const now = Date.now();
  const incidentTime = new Date(timestamp).getTime();
  const diffMs = now - incidentTime;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);

  let duration = "";
  let isOld = false;

  if (diffMin < 60) {
    duration = `${diffMin} min`;
  } else if (diffHrs < 24) {
    duration = `${diffHrs} hora${diffHrs > 1 ? "s" : ""}`;
    if (diffHrs >= 3) isOld = true;
  } else {
    const days = Math.floor(diffHrs / 24);
    duration = `${days} día${days > 1 ? "s" : ""}`;
    isOld = true;
  }

  return {
    duration,
    isOld,
    dateStr: new Date(timestamp).toLocaleString("es-AR"),
  };
};

const getConfidenceStyle = (conf: number) => {
  if (conf >= 80) return "text-green-600 dark:text-green-400";
  if (conf >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-orange-600 dark:text-orange-400";
};

const getDataQualityBadge = (quality: string) => {
  if (quality === "high")
    return {
      label: "Alta Fidelidad",
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
    };
  if (quality === "medium")
    return {
      label: "Estimación",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-700 dark:text-yellow-300",
    };
  return {
    label: "Heurística",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
  };
};

const getMethodLabel = (method: string) => {
  const methods: Record<string, string> = {
    DIRECT_JAM: "Medido por congestión directa",
    NEARBY_JAM: "Calculado por jams cercanos",
    DETOUR: "Estimado por desvío",
    HISTORICAL: "Comparado con histórico",
    FALLBACK: "Estimación por defecto",
  };
  return methods[method] || "Método no definido";
};

const metricExplanations = {
  linkedJams:
    "Cantidad de tramos congestionados vinculados geográficamente al incidente",
  confidence:
    "Nivel de certeza del cálculo basado en la calidad y cantidad de datos utilizados",
};

const getOperationalRecommendation = (
  type: string,
  subtype?: string,
  impact?: number,
) => {
  const t = type.toLowerCase();
  const s = (subtype || "").toLowerCase();

  if (t === "accident")
    return {
      text: "🚑 Priorizar despeje de calzada y asistencia",
      priority: "high",
    };
  if (t === "road_closed")
    return {
      text: "🚧 Verificar señalización de desvío y duración",
      priority: "high",
    };
  if (s.includes("pot_hole"))
    return {
      text: "🏗️ Programar cuadrilla de bacheo / inspección",
      priority: impact && impact > 40 ? "high" : "medium",
    };
  if (s.includes("construction"))
    return {
      text: "👷 Supervisar cumplimiento de señalización de obra",
      priority: "medium",
    };
  if (s.includes("object") || s.includes("animal"))
    return {
      text: "🧹 Despachar unidad de limpieza / remoción",
      priority: "high",
    };
  if (s.includes("car_stopped"))
    return {
      text: "🚔 Verificar necesidad de auxilio mecánico",
      priority: "medium",
    };

  return { text: "🧐 Monitorear evolución via cámaras y GPS", priority: "low" };
};

interface EventCardProps {
  analysis: BlockingAnalysisItem;
  onMapClick: () => void;
}

/**
 * Componente de tarjeta individual para mostrar un evento/incidente
 * con todas sus métricas y detalles.
 */
export const EventCard: React.FC<EventCardProps> = ({
  analysis,
  onMapClick,
}) => {
  const description = getIncidentDescription(
    analysis.incident.type,
    analysis.incident.subtype,
  );

  const isPlural = analysis.reportCount > 1;
  let typeText = description;
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
  }
  const polygonPart = analysis.polygonName ? ` - ${analysis.polygonName}` : "";

  const impactStyle = getImpactLevelStyle(analysis.impactScore);
  const age = getIncidentAge(analysis.incident.timestamp.toString());
  const recommendation = getOperationalRecommendation(
    analysis.incident.type,
    analysis.incident.subtype,
    analysis.impactScore,
  );

  return (
    <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors hover:shadow-md">
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
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                {analysis.incident.street || "Calle no identificada"}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                {typeText} {polygonPart}
              </span>
            </div>
          </h3>
          {/* Mostrar descripción del evento si está disponible */}
          {analysis.incident.description &&
            analysis.incident.description !== description &&
            analysis.incident.description !== analysis.incident.subtype &&
            analysis.incident.description !== analysis.incident.type &&
            (() => {
              let translatedDescription = analysis.incident.description;

              // Si la descripción es UNKNOWN, intentar mejorarla con el jamLevel si existe
              if (
                translatedDescription.toUpperCase() === "UNKNOWN" ||
                translatedDescription.toUpperCase() === "NO_SUBTYPE"
              ) {
                if (
                  analysis.incident.type === "JAM" ||
                  analysis.incident.type === "jam"
                ) {
                  // Para Jams, el nivel es la mejor descripción
                  return null; // El título ya tiene la descripción principal
                }
                translatedDescription = "Sin detalle específico";
              } else {
                const mainTypeTranslated = getMainTypeTranslation(
                  analysis.incident.description,
                );

                if (mainTypeTranslated !== analysis.incident.description) {
                  translatedDescription = mainTypeTranslated;
                } else if (analysis.incident.subtype) {
                  const subtypeTranslated = getSubtypeTranslation(
                    analysis.incident.type,
                    analysis.incident.description,
                  );
                  if (subtypeTranslated !== analysis.incident.description) {
                    translatedDescription = subtypeTranslated;
                  }
                }
              }

              // Normalización para comparación
              const descLower = description.toLowerCase();
              const transLower = translatedDescription.toLowerCase();

              // Si la información es redundante o está vacía, no mostrarla
              if (
                descLower === transLower ||
                descLower.includes(transLower) ||
                transLower.includes(descLower) ||
                translatedDescription === "Sin detalle específico"
              ) {
                return null;
              }

              return (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
                  <WazeIcon type={analysis.incident.type} size="sm" />
                  <span className="font-medium">Detalle:</span>
                  <span>{translatedDescription}</span>
                </p>
              );
            })()}

          {/* Sectores afectados */}
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
          {/* Recomendación operativa */}
          <div className="mt-2 p-2 rounded-md bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
            <p className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" /> Acción Sugerida
            </p>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {recommendation.text}
            </p>
          </div>
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
              <Users className="w-3 h-3" /> {analysis.reportCount} reportes
            </span>
          )}
          {/* Botón para ver en mapa */}
          <button
            onClick={onMapClick}
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
              analysis.delay.confidence,
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
                getDataQualityBadge(analysis.delay.dataQuality || "low").bg
              } ${getDataQualityBadge(analysis.delay.dataQuality || "low").text}`}
            >
              {getDataQualityBadge(analysis.delay.dataQuality || "low").label}
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
            <p className="font-bold text-base text-gray-900 dark:text-white">
              {analysis.delay.consideredJams.linked}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {analysis.delay.breakdown.linkedJamsDelay} min
            </p>
          </div>
          <div className="text-center bg-white dark:bg-zinc-900 rounded p-2 border dark:border-zinc-700">
            <p className="text-gray-500 dark:text-gray-400 text-[10px]">
              Desvíos
            </p>
            <p className="font-bold text-base text-gray-900 dark:text-white">
              {analysis.delay.rawDataUsed?.totalJamsConsidered || 0}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {analysis.delay.breakdown.detourDelay} min
            </p>
          </div>
          <div className="text-center bg-white dark:bg-zinc-900 rounded p-2 border dark:border-zinc-700">
            <p className="text-gray-500 dark:text-gray-400 text-[10px]">
              Proximidad
            </p>
            <p className="font-bold text-base text-gray-900 dark:text-white">
              {analysis.delay.consideredJams.nearby}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {analysis.delay.breakdown.proximityDelay} min
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import type { FluidityIndex } from "../../utils/fluidityCalculations";

interface FluidityIndexCardProps {
  index: FluidityIndex;
}

interface FactorCardProps {
  icon: string;
  title: string;
  weight: string;
  score: number;
  maxScore: number;
  contextInfo: string;
  tooltip: string;
}

const FactorCard: React.FC<FactorCardProps> = ({
  icon,
  title,
  weight,
  score,
  maxScore,
  contextInfo,
  tooltip,
}) => {
  const percentage = (score / maxScore) * 100;

  const getBarColor = () => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <div className="text-sm font-semibold text-gray-800">{title}</div>
            <div className="text-xs text-gray-500">{tooltip}</div>
          </div>
        </div>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
          {weight}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${getBarColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-700 min-w-[50px] text-right">
          {score}/{maxScore}
        </span>
      </div>

      <div className="text-xs text-gray-600 mt-1">📊 {contextInfo}</div>
    </div>
  );
};

export const FluidityIndexCard: React.FC<FluidityIndexCardProps> = ({
  index,
}) => {
  const getColor = () => {
    switch (index.level) {
      case "excellent":
        return "text-green-600 bg-green-50 border-green-200";
      case "good":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "moderate":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "poor":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  const getLabel = () => {
    switch (index.level) {
      case "excellent":
        return "EXCELENTE";
      case "good":
        return "BUENO";
      case "moderate":
        return "MODERADO";
      case "poor":
        return "CRÍTICO";
    }
  };

  const getEmoji = () => {
    switch (index.level) {
      case "excellent":
        return "🟢";
      case "good":
        return "🔵";
      case "moderate":
        return "🟡";
      case "poor":
        return "🔴";
    }
  };

  const getDescription = () => {
    switch (index.level) {
      case "excellent":
        return "Circulación fluida y sin problemas";
      case "good":
        return "Tráfico con demoras menores";
      case "moderate":
        return "Circulación con demoras moderadas";
      case "poor":
        return "Congestión severa y múltiples incidentes";
    }
  };

  // Calcular peso de estado de polígonos (actualmente se usa stateScore * 0.40 en el cálculo)
  // Para mostrarlo como un factor separado, necesitamos "deshacer" la ponderación
  const stateScore = index.context.greenPolygonsPercentage;

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-gray-600 mb-4">
        Índice de Fluidez General
      </h2>

      {/* Score Principal */}
      <div className="flex items-center gap-6 mb-4 pb-4 border-b border-gray-200">
        <div className="flex-shrink-0">
          <div
            className={`w-28 h-28 rounded-full border-4 ${getColor()} flex items-center justify-center shadow-sm`}
          >
            <div className="text-center">
              <div className="text-4xl font-black">{index.score}</div>
              <div className="text-xs font-medium">/ 100</div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${getColor()} border mb-2`}
          >
            <span>{getEmoji()}</span>
            <span>{getLabel()}</span>
          </div>
          <p className="text-sm text-gray-700 font-medium">
            {getDescription()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Basado en 4 factores ponderados
          </p>
        </div>
      </div>

      {/* Factores de Cálculo */}
      <div className="mb-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Factores de Cálculo
        </h3>

        <div className="space-y-3">
          <FactorCard
            icon="🚗"
            title="Estado de Polígonos"
            weight="40%"
            score={stateScore}
            maxScore={100}
            contextInfo={`${Math.round((stateScore / 100) * index.context.totalPolygons)} de ${index.context.totalPolygons} polígonos sin problemas`}
            tooltip="Porcentaje de zonas en estado verde"
          />

          <FactorCard
            icon="⚡"
            title="Velocidad Media"
            weight="30%"
            score={index.breakdown.speedScore}
            maxScore={100}
            contextInfo={
              `Global: ${index.context.avgSpeed} km/h | ` +
              `Waze: ${index.context.wazeMetrics.avgSpeed} km/h (${index.context.wazeMetrics.count} jams) | ` +
              `TVT: ${index.context.tvtMetrics.avgSpeed} km/h (${index.context.tvtMetrics.count} segmentos)`
            }
            tooltip="Score basado en velocidad de tráfico diferenciada por fuente"
          />

          <FactorCard
            icon="⏱️"
            title="Fluidez en Demoras"
            weight="20%"
            score={index.breakdown.delayScore}
            maxScore={100}
            contextInfo={
              `Global: ${index.context.avgDelay}s | ` +
              `Waze: ${index.context.wazeMetrics.avgDelay}s | ` +
              `TVT: ${index.context.tvtMetrics.avgDelay}s`
            }
            tooltip="Score inversamente proporcional a demoras - Waze vs TVT"
          />

          <FactorCard
            icon="⚠️"
            title="Severidad de Incidentes"
            weight="10%"
            score={index.breakdown.incidentScore}
            maxScore={100}
            contextInfo={`${index.context.criticalIncidents} incidente${index.context.criticalIncidents !== 1 ? "s" : ""} crítico${index.context.criticalIncidents !== 1 ? "s" : ""} activo${index.context.criticalIncidents !== 1 ? "s" : ""}`}
            tooltip="Penalización por incidentes críticos"
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          💡 Score final = (Estado×40%) + (Velocidad×30%) + (Demoras×20%) +
          (Incidentes×10%)
        </p>
      </div>
    </div>
  );
};

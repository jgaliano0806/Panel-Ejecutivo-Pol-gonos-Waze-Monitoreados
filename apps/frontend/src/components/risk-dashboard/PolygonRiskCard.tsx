/**
 * PolygonRiskCard - Card de Tramo con Risk Score
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 * Componente más complejo del dashboard
 */

import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Car,
  Gauge,
  Clock,
  CloudRain,
  AlertCircle as AlertIcon,
  MapPin,
} from "lucide-react";
import ClickableFactorBadge from "./ClickableFactorBadge";
import type { RiskScore } from "../../hooks/useRiskScoring";

export interface PolygonRiskCardProps {
  score: RiskScore;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onFactorClick: (
    type: "traffic" | "incidents" | "weather",
    polygonId: string,
  ) => void;
}

// Configuración de estilos por nivel de riesgo
const riskConfig = {
  LOW: {
    color: "green",
    bgColor: "bg-green-50 dark:bg-green-900/10",
    textColor: "text-green-900 dark:text-green-300",
    borderColor: "border-green-500 dark:border-green-600",
    label: "Bajo",
    description: "Condiciones normales de circulación",
  },
  MODERATE: {
    color: "yellow",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
    textColor: "text-yellow-900 dark:text-yellow-300",
    borderColor: "border-yellow-500 dark:border-yellow-600",
    label: "Moderado",
    description: "Situación que requiere atención",
  },
  HIGH: {
    color: "orange",
    bgColor: "bg-orange-50 dark:bg-orange-900/10",
    textColor: "text-orange-900 dark:text-orange-300",
    borderColor: "border-orange-500 dark:border-orange-600",
    label: "Alto",
    description: "Situación complicada con posibles afectaciones",
  },
  CRITICAL: {
    color: "red",
    bgColor: "bg-red-50 dark:bg-red-900/10",
    textColor: "text-red-900 dark:text-red-300",
    borderColor: "border-red-500 dark:border-red-600",
    label: "Crítico",
    description: "Requiere intervención inmediata",
  },
  SEVERE: {
    color: "purple",
    bgColor: "bg-purple-50 dark:bg-purple-900/10",
    textColor: "text-purple-900 dark:text-purple-300",
    borderColor: "border-purple-500 dark:border-purple-600",
    label: "Severo",
    description: "Crisis operacional - máxima prioridad",
  },
};

const PolygonRiskCard: React.FC<PolygonRiskCardProps> = ({
  score,
  index,
  isSelected,
  onClick,
  onFactorClick,
}) => {
  const config = riskConfig[score.risk_level];

  // Generar descripciones de factores
  const getFactorDescription = (
    factor: "traffic" | "incident" | "speed" | "delay",
  ) => {
    const rawData = score.raw_data;
    if (!rawData) return "Sin datos";

    switch (factor) {
      case "traffic":
        return rawData.total_jams > 0
          ? `${rawData.total_jams} atasco${
              rawData.total_jams > 1 ? "s" : ""
            } activo${rawData.total_jams > 1 ? "s" : ""}`
          : "Sin atascos";

      case "incident":
        return rawData.total_incidents > 0
          ? `${rawData.total_incidents} incidente${
              rawData.total_incidents > 1 ? "s" : ""
            } reportado${rawData.total_incidents > 1 ? "s" : ""}`
          : "Sin incidentes";

      case "speed":
        if (!rawData.avg_speed) return "Sin datos de velocidad";
        const speed = Math.round(rawData.avg_speed);
        if (speed < 20) return `${speed} km/h - Muy lento`;
        if (speed < 40) return `${speed} km/h - Lento`;
        if (speed < 60) return `${speed} km/h - Moderado`;
        return `${speed} km/h - Fluido`;

      case "delay":
        const delayMin = Math.round((rawData.avg_delay || 0) / 60);
        return delayMin > 0
          ? `${delayMin} min de demora promedio`
          : "Sin demoras significativas";
    }
  };

  const getWeatherDescription = () => {
    if (score.weather_score === 0) return "Condiciones climáticas normales";
    if (score.weather_score >= 80) return "Condiciones muy adversas";
    if (score.weather_score >= 60) return "Condiciones adversas";
    if (score.weather_score >= 40) return "Condiciones desfavorables";
    if (score.weather_score >= 20) return "Condiciones de precaución";
    return "Condiciones normales";
  };

  const generateDetailedRiskExplanation = () => {
    const parts: string[] = [];

    // Análisis de tráfico
    if (score.traffic_score >= 80) {
      parts.push(
        `Congestión severa con ${
          score.raw_data?.total_jams || 0
        } atascos activos que bloquean el tránsito normal`,
      );
    } else if (score.traffic_score >= 50) {
      parts.push(
        `Alta congestión detectada (${
          score.raw_data?.total_jams || 0
        } atascos) que ralentiza la circulación`,
      );
    }

    // Análisis de incidentes
    if (score.incident_score >= 80) {
      parts.push(
        `Múltiples incidentes graves (${
          score.raw_data?.total_incidents || 0
        }) afectando la vía`,
      );
    } else if (score.incident_score >= 50) {
      parts.push(
        `Incidentes reportados (${
          score.raw_data?.total_incidents || 0
        }) que pueden causar demoras`,
      );
    }

    // Análisis de velocidad
    if (score.speed_score >= 80) {
      const speed = score.raw_data?.avg_speed
        ? Math.round(score.raw_data.avg_speed)
        : 0;
      parts.push(
        `Velocidad promedio muy baja (${speed} km/h) indicando bloqueo parcial`,
      );
    } else if (score.speed_score >= 50) {
      const speed = score.raw_data?.avg_speed
        ? Math.round(score.raw_data.avg_speed)
        : 0;
      parts.push(
        `Velocidad reducida (${speed} km/h) por debajo del flujo normal`,
      );
    }

    // Análisis de demoras
    if (score.delay_score >= 60) {
      const delay = Math.round((score.raw_data?.avg_delay || 0) / 60);
      parts.push(
        `Demoras significativas de ${delay} minutos en promedio para atravesar el tramo`,
      );
    }

    // Análisis climático
    if (score.weather_score >= 50) {
      parts.push(
        "Condiciones meteorológicas adversas que afectan la visibilidad o adherencia",
      );
    }

    if (parts.length === 0) {
      return "El tramo presenta condiciones normales de circulación. Los factores de riesgo se encuentran dentro de los parámetros aceptables.";
    }

    return (
      parts.join(". ") +
      ". Se recomienda monitoreo continuo y posible intervención según evolución."
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white dark:bg-veltrix-card rounded-xl shadow-lg p-6 transition-all border-2 ${
        isSelected
          ? "border-primary-500 shadow-xl"
          : "border-transparent hover:shadow-xl dark:shadow-none hover:border-gray-200 dark:hover:border-veltrix-border"
      }`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div
          className="flex items-start justify-between cursor-pointer"
          onClick={onClick}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg bg-${config.color}-100 dark:bg-${config.color}-900/20`}
              >
                <MapPin
                  className={`w-5 h-5 text-${config.color}-600 dark:text-${config.color}-400`}
                />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {score.polygon_name}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-veltrix-muted ml-12">
              {score.group_name}
            </p>
          </div>

          {/* Badge de nivel de riesgo */}
          <div
            className={`px-4 py-2 rounded-lg ${config.bgColor} border-2 ${config.borderColor}`}
          >
            <div className={`text-sm font-black ${config.textColor} uppercase`}>
              Riesgo {config.label}
            </div>
          </div>
        </div>

        {/* Descripción del riesgo */}
        <div
          className={`p-3 rounded-lg ${config.bgColor} border-l-4 ${config.borderColor}`}
        >
          <p className={`text-sm font-bold ${config.textColor}`}>
            {config.description}
          </p>
          {score.raw_data && (
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 opacity-90">
              {score.raw_data.conditions_summary}
            </p>
          )}
        </div>

        {/* Factores descriptivos - Grid 3 cols */}
        <div className="grid grid-cols-3 gap-3">
          <ClickableFactorBadge
            icon={Car}
            label="Tráfico"
            description={getFactorDescription("traffic")}
            severity={score.traffic_score}
            onClick={(e) => {
              e.stopPropagation();
              if (score.raw_data && score.raw_data.total_jams > 0) {
                onFactorClick("traffic", score.polygon_id);
              }
            }}
            clickable={score.raw_data ? score.raw_data.total_jams > 0 : false}
          />
          <ClickableFactorBadge
            icon={AlertIcon}
            label="Incidentes"
            description={getFactorDescription("incident")}
            severity={score.incident_score}
            onClick={(e) => {
              e.stopPropagation();
              if (score.raw_data && score.raw_data.total_incidents > 0) {
                onFactorClick("incidents", score.polygon_id);
              }
            }}
            clickable={
              score.raw_data ? score.raw_data.total_incidents > 0 : false
            }
          />
          <ClickableFactorBadge
            icon={CloudRain}
            label="Clima"
            description={getWeatherDescription()}
            severity={score.weather_score}
            onClick={(e) => {
              e.stopPropagation();
              onFactorClick("weather", score.polygon_id);
            }}
            clickable={true}
          />
          <ClickableFactorBadge
            icon={Gauge}
            label="Velocidad"
            description={getFactorDescription("speed")}
            severity={score.speed_score}
            clickable={false}
          />
          <ClickableFactorBadge
            icon={Clock}
            label="Demoras"
            description={getFactorDescription("delay")}
            severity={score.delay_score}
            clickable={false}
          />
          {/* Celda de puntuación */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-veltrix-bg border-2 border-gray-200 dark:border-veltrix-border flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">
              Score
            </span>
            <span
              className={`text-2xl font-black ${
                score.final_risk_score >= 80
                  ? "text-red-600 dark:text-red-400"
                  : score.final_risk_score >= 50
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-green-600 dark:text-green-400"
              }`}
            >
              {Math.round(score.final_risk_score)}
            </span>
          </div>
        </div>

        {/* Análisis detallado del riesgo */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-veltrix-bg dark:to-veltrix-card rounded-lg border border-gray-200 dark:border-veltrix-border">
          <p className="text-sm font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Análisis Detallado del Riesgo
          </p>
          <p className="text-sm text-gray-700 dark:text-veltrix-muted leading-relaxed">
            {generateDetailedRiskExplanation()}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PolygonRiskCard;

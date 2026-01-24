/**
 * PolygonDetailPanel - Panel Detallado de Tramo
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 * Panel fijo inferior con detalle expandido del polígono
 */

import React from "react";
import { motion } from "framer-motion";
import {
  Car,
  CloudRain,
  Gauge,
  Clock,
  AlertCircle as AlertIcon,
} from "lucide-react";
import DetailFactorCard from "./DetailFactorCard";
import type { RiskScore } from "../../hooks/useRiskScoring";

export interface PolygonDetailPanelProps {
  score: RiskScore;
  onClose: () => void;
}

// Labels localizados
const riskLabels: Record<string, string> = {
  LOW: "Bajo",
  MODERATE: "Moderado",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  SEVERE: "Severo",
};

const categoryLabels: Record<string, string> = {
  normal: "Normal",
  incident_zone: "Zona de Incidentes",
  weather_hazard: "Riesgo Climático",
  traffic_congestion: "Congestión de Tráfico",
  mixed: "Múltiples Factores",
};

const PolygonDetailPanel: React.FC<PolygonDetailPanelProps> = ({
  score,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-veltrix-card shadow-2xl rounded-t-3xl p-8 z-50 max-h-[60vh] overflow-y-auto"
    >
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {score.polygon_name}
            </h2>
            <p className="text-gray-600 dark:text-veltrix-muted">
              {score.group_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-veltrix-bg hover:bg-gray-200 dark:hover:bg-veltrix-border rounded-lg transition-all text-gray-700 dark:text-gray-300"
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <DetailFactorCard
            title="Tráfico y Congestión"
            score={score.traffic_score}
            icon={Car}
            color="blue"
          />
          <DetailFactorCard
            title="Incidentes"
            score={score.incident_score}
            icon={AlertIcon}
            color="red"
          />
          <DetailFactorCard
            title="Condiciones Climáticas"
            score={score.weather_score}
            icon={CloudRain}
            color="cyan"
          />
          <DetailFactorCard
            title="Velocidad y Fluidez"
            score={score.speed_score}
            icon={Gauge}
            color="green"
          />
          <DetailFactorCard
            title="Demoras"
            score={score.delay_score}
            icon={Clock}
            color="purple"
          />
        </div>

        <div className="mt-6 p-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Categoría de Riesgo
          </h3>
          <p className="text-gray-700 dark:text-veltrix-muted">
            <span className="font-bold">
              {categoryLabels[score.risk_category] || score.risk_category}
            </span>{" "}
            - Nivel:{" "}
            <span className="font-bold">{riskLabels[score.risk_level]}</span>
            {score.alert_triggered && (
              <span className="ml-4 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                ALERTA ACTIVA
              </span>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PolygonDetailPanel;

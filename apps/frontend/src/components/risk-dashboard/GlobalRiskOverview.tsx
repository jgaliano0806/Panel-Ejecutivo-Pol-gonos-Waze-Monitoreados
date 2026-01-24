/**
 * GlobalRiskOverview - Resumen Global de Riesgos (Clickeable)
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 */

import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  TrendingUp,
  Minus,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import RiskStatCard from "./RiskStatCard";
import type { GroupRiskSummary } from "../../hooks/useRiskScoring";

export interface GlobalRiskOverviewProps {
  summaries: GroupRiskSummary[];
  selectedLevel: string | null;
  onLevelSelect: (level: string | null) => void;
}

const GlobalRiskOverview: React.FC<GlobalRiskOverviewProps> = ({
  summaries,
  selectedLevel,
  onLevelSelect,
}) => {
  const totalPolygons = summaries.reduce((sum, s) => sum + s.polygon_count, 0);

  const distributionTotal = summaries.reduce(
    (acc, s) => ({
      low: acc.low + s.risk_distribution.low,
      moderate: acc.moderate + s.risk_distribution.moderate,
      high: acc.high + s.risk_distribution.high,
      critical: acc.critical + s.risk_distribution.critical,
      severe: acc.severe + s.risk_distribution.severe,
    }),
    { low: 0, moderate: 0, high: 0, critical: 0, severe: 0 },
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-6 gap-4"
    >
      <RiskStatCard
        label="Tramos Monitoreados"
        value={totalPolygons}
        icon={CheckCircle2}
        color="blue"
        isSelected={selectedLevel === null}
        onClick={() => onLevelSelect(null)}
      />
      <RiskStatCard
        label="Riesgo Bajo"
        value={distributionTotal.low}
        icon={CheckCircle2}
        color="green"
        levelKey="LOW"
        isSelected={selectedLevel === "LOW"}
        onClick={() => onLevelSelect(selectedLevel === "LOW" ? null : "LOW")}
      />
      <RiskStatCard
        label="Riesgo Moderado"
        value={distributionTotal.moderate}
        icon={Minus}
        color="yellow"
        levelKey="MODERATE"
        isSelected={selectedLevel === "MODERATE"}
        onClick={() =>
          onLevelSelect(selectedLevel === "MODERATE" ? null : "MODERATE")
        }
      />
      <RiskStatCard
        label="Riesgo Alto"
        value={distributionTotal.high}
        icon={TrendingUp}
        color="orange"
        levelKey="HIGH"
        isSelected={selectedLevel === "HIGH"}
        onClick={() => onLevelSelect(selectedLevel === "HIGH" ? null : "HIGH")}
      />
      <RiskStatCard
        label="Riesgo Crítico"
        value={distributionTotal.critical}
        icon={AlertTriangle}
        color="red"
        levelKey="CRITICAL"
        isSelected={selectedLevel === "CRITICAL"}
        onClick={() =>
          onLevelSelect(selectedLevel === "CRITICAL" ? null : "CRITICAL")
        }
      />
      <RiskStatCard
        label="Riesgo Severo"
        value={distributionTotal.severe}
        icon={ShieldAlert}
        color="purple"
        levelKey="SEVERE"
        isSelected={selectedLevel === "SEVERE"}
        onClick={() =>
          onLevelSelect(selectedLevel === "SEVERE" ? null : "SEVERE")
        }
      />
    </motion.div>
  );
};

export default GlobalRiskOverview;

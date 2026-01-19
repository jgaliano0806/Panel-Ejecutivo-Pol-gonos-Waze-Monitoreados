/**
 * Dashboard de Análisis de Riesgos Multifactorial
 * Con filtros por grupo, nivel de riesgo y visualización de tramos individuales
 */

import React, { useState, useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  TrendingUp,
  Minus,
  ShieldAlert,
  CheckCircle2,
  Filter,
  RefreshCw,
  CloudRain,
  Car,
  Gauge,
  Clock,
  AlertCircle as AlertIcon,
  X,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
  Eye,
  History,
  ArrowLeft,
  TrendingDown,
  FileText,
} from "lucide-react";
import {
  useRiskSummary,
  useRiskScores,
  useCalculateAllScores,
  useRiskGroups,
} from "../hooks/useRiskScoring";
import { usePolygonWeather, useWeatherHistory } from "../hooks/useWeather";

import type { RiskScore, GroupRiskSummary } from "../hooks/useRiskScoring";

// Traducción de niveles de riesgo
const RISK_LEVEL_LABELS: Record<string, string> = {
  LOW: "Bajo",
  MODERATE: "Moderado",
  HIGH: "Alto",
  CRITICAL: "Crítico",
  SEVERE: "Severo",
};

export const RiskDashboard: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedPolygon, setSelectedPolygon] = useState<RiskScore | null>(
    null
  );
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(
    null
  );
  const [activeModal, setActiveModal] = useState<
    "traffic" | "incidents" | "weather" | null
  >(null);
  const [modalPolygonId, setModalPolygonId] = useState<string | null>(null);

  const { data: summaryData, isLoading: summaryLoading } = useRiskSummary();
  const { data: scoresData, isLoading: scoresLoading } = useRiskScores(
    selectedGroup || undefined
  );
  const { data: groupsData } = useRiskGroups();
  const calculateMutation = useCalculateAllScores();

  const allGroups = groupsData?.groups || [];

  // Filtrar scores por nivel de riesgo seleccionado
  const filteredScores = useMemo(() => {
    if (!scoresData?.scores) return [];
    if (!selectedRiskLevel) return scoresData.scores;
    return scoresData.scores.filter((s) => s.risk_level === selectedRiskLevel);
  }, [scoresData?.scores, selectedRiskLevel]);

  const handleRecalculate = async () => {
    try {
      await calculateMutation.mutateAsync();
    } catch (error) {
      console.error("Error recalculando scores:", error);
    }
  };

  const handleRiskLevelFilter = (level: string | null) => {
    setSelectedRiskLevel(level);
    setSelectedPolygon(null);
  };

  const openFactorModal = (
    type: "traffic" | "incidents" | "weather",
    polygonId: string
  ) => {
    setActiveModal(type);
    setModalPolygonId(polygonId);
  };

  if (summaryLoading && !summaryData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando análisis de riesgos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-veltrix-card rounded-2xl shadow-xl p-6 border-l-4 border-red-500 dark:border-red-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
              Análisis de Riesgos Multifactorial
            </h1>
            <p className="text-gray-600 dark:text-veltrix-muted">
              Sistema de scoring basado en tráfico, incidentes, clima, velocidad
              y demoras
            </p>
          </div>
          <motion.button
            onClick={handleRecalculate}
            disabled={calculateMutation.isPending}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 border border-transparent dark:border-primary-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center gap-2">
              <RefreshCw
                className={`w-5 h-5 ${
                  calculateMutation.isPending ? "animate-spin" : ""
                }`}
              />
              {calculateMutation.isPending ? "Calculando..." : "Recalcular"}
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Estado Global de Riesgos - Clickeable */}
      <GlobalRiskOverview
        summaries={summaryData?.summaries || []}
        selectedLevel={selectedRiskLevel}
        onLevelSelect={handleRiskLevelFilter}
      />

      {/* Filtro activo */}
      {selectedRiskLevel && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/50 rounded-xl p-4 flex items-center justify-between"
        >
          <p className="text-primary-800 dark:text-primary-200 font-semibold">
            Mostrando tramos con riesgo:{" "}
            <span className="font-black">
              {RISK_LEVEL_LABELS[selectedRiskLevel]}
            </span>{" "}
            ({filteredScores.length} tramo
            {filteredScores.length !== 1 ? "s" : ""})
          </p>
          <button
            onClick={() => handleRiskLevelFilter(null)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <X className="w-4 h-4" />
            Quitar filtro
          </button>
        </motion.div>
      )}

      {/* Filtros y Vista Principal */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar: Filtros por Grupo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-3 space-y-4"
        >
          <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-lg p-6 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Filtrar por Grupo
              </h2>
            </div>

            <button
              onClick={() => {
                setSelectedGroup(null);
                setSelectedPolygon(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all ${
                selectedGroup === null
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-300 font-bold shadow-sm ring-1 ring-primary-200 dark:ring-primary-700"
                  : "bg-gray-50 dark:bg-veltrix-bg text-gray-700 dark:text-veltrix-muted hover:bg-gray-100 dark:hover:bg-veltrix-card/80"
              }`}
            >
              Todos los Grupos
            </button>

            <div className="space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
              {allGroups.map((group) => {
                const summary = summaryData?.summaries.find(
                  (s) => s.group_name === group
                );
                return (
                  <button
                    key={group}
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedPolygon(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      selectedGroup === group
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-900 dark:text-primary-300 font-bold shadow-sm ring-1 ring-primary-200 dark:ring-primary-700"
                        : "bg-gray-50 dark:bg-veltrix-bg text-gray-700 dark:text-veltrix-muted hover:bg-gray-100 dark:hover:bg-veltrix-card/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate">{group}</span>
                      {summary && summary.critical_polygons > 0 && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full shadow-sm">
                          {summary.critical_polygons}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Main Content: Lista de Tramos */}
        <div className="col-span-9 space-y-4">
          {scoresLoading && !scoresData ? (
            <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-lg p-12 text-center transition-colors">
              <RefreshCw className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-veltrix-muted">
                Cargando datos...
              </p>
            </div>
          ) : (
            <>
              {/* Header de tramos */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-veltrix-card rounded-xl shadow-md p-4 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedGroup
                        ? `Tramos de ${selectedGroup}`
                        : "Todos los Tramos"}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-veltrix-muted mt-1">
                      {filteredScores.length} tramo(s){" "}
                      {selectedRiskLevel
                        ? `con riesgo ${RISK_LEVEL_LABELS[
                            selectedRiskLevel
                          ].toLowerCase()}`
                        : "monitoreado(s)"}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Lista de tramos virtualizada */}
              <VirtualizedRiskList
                scores={filteredScores}
                selectedPolygon={selectedPolygon}
                onPolygonClick={setSelectedPolygon}
                onFactorClick={openFactorModal}
              />
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <AnimatePresence>
        {activeModal === "traffic" && modalPolygonId && (
          <TrafficInfoModal
            polygonId={modalPolygonId}
            polygonName={
              filteredScores.find((s) => s.polygon_id === modalPolygonId)
                ?.polygon_name || ""
            }
            jamCount={
              filteredScores.find((s) => s.polygon_id === modalPolygonId)
                ?.raw_data?.total_jams || 0
            }
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "incidents" && modalPolygonId && (
          <IncidentsInfoModal
            polygonId={modalPolygonId}
            polygonName={
              filteredScores.find((s) => s.polygon_id === modalPolygonId)
                ?.polygon_name || ""
            }
            incidentCount={
              filteredScores.find((s) => s.polygon_id === modalPolygonId)
                ?.raw_data?.total_incidents || 0
            }
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === "weather" && modalPolygonId && (
          <WeatherDetailModal
            polygonId={modalPolygonId}
            onClose={() => setActiveModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Panel Detallado del Tramo Seleccionado */}
      <AnimatePresence>
        {selectedPolygon && (
          <PolygonDetailPanel
            score={selectedPolygon}
            onClose={() => setSelectedPolygon(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Componente: Resumen Global de Riesgos (Clickeable)
// ============================================================================

interface GlobalRiskOverviewProps {
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
    { low: 0, moderate: 0, high: 0, critical: 0, severe: 0 }
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

// ============================================================================
// Componente: Tarjeta de Estadística de Riesgo
// ============================================================================

interface RiskStatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "blue" | "green" | "yellow" | "orange" | "red" | "purple";
  levelKey?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const RiskStatCard: React.FC<RiskStatCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  isSelected,
  onClick,
}) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 border-blue-400",
    green: "from-green-500 to-green-600 border-green-400",
    yellow: "from-yellow-500 to-yellow-600 border-yellow-400",
    orange: "from-orange-500 to-orange-600 border-orange-400",
    red: "from-red-500 to-red-600 border-red-400",
    purple: "from-purple-500 to-purple-600 border-purple-400",
  };

  const borderColors = {
    blue: "border-blue-400 dark:border-blue-500",
    green: "border-green-400 dark:border-green-500",
    yellow: "border-yellow-400 dark:border-yellow-500",
    orange: "border-orange-400 dark:border-orange-500",
    red: "border-red-400 dark:border-red-500",
    purple: "border-purple-400 dark:border-purple-500",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-white dark:bg-veltrix-card rounded-xl shadow-lg p-6 cursor-pointer transition-all border-l-4 ${
        borderColors[color]
      } ${
        isSelected
          ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-veltrix-bg"
          : "hover:shadow-xl"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-md`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-3xl font-black text-gray-900 dark:text-white">
          {value}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-veltrix-muted">
        {label}
      </p>
      {value > 0 && (
        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 font-medium">
          Clic para filtrar
        </p>
      )}
    </motion.div>
  );
};

// ============================================================================
// Componente: Card de Tramo con Risk Score
// ============================================================================

interface PolygonRiskCardProps {
  score: RiskScore;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onFactorClick: (
    type: "traffic" | "incidents" | "weather",
    polygonId: string
  ) => void;
}

const PolygonRiskCard: React.FC<PolygonRiskCardProps> = ({
  score,
  index,
  isSelected,
  onClick,
  onFactorClick,
}) => {
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

  const config = riskConfig[score.risk_level];

  // Generar descripciones de factores
  const getFactorDescription = (
    factor: "traffic" | "incident" | "speed" | "delay"
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
        } atascos activos que bloquean el tránsito normal`
      );
    } else if (score.traffic_score >= 50) {
      parts.push(
        `Alta congestión detectada (${
          score.raw_data?.total_jams || 0
        } atascos) que ralentiza la circulación`
      );
    }

    // Análisis de incidentes
    if (score.incident_score >= 80) {
      parts.push(
        `Múltiples incidentes graves (${
          score.raw_data?.total_incidents || 0
        }) afectando la vía`
      );
    } else if (score.incident_score >= 50) {
      parts.push(
        `Incidentes reportados (${
          score.raw_data?.total_incidents || 0
        }) que pueden causar demoras`
      );
    }

    // Análisis de velocidad
    if (score.speed_score >= 80) {
      const speed = score.raw_data?.avg_speed
        ? Math.round(score.raw_data.avg_speed)
        : 0;
      parts.push(
        `Velocidad promedio muy baja (${speed} km/h) indicando bloqueo parcial`
      );
    } else if (score.speed_score >= 50) {
      const speed = score.raw_data?.avg_speed
        ? Math.round(score.raw_data.avg_speed)
        : 0;
      parts.push(
        `Velocidad reducida (${speed} km/h) por debajo del flujo normal`
      );
    }

    // Análisis de demoras
    if (score.delay_score >= 60) {
      const delay = Math.round((score.raw_data?.avg_delay || 0) / 60);
      parts.push(
        `Demoras significativas de ${delay} minutos en promedio para atravesar el tramo`
      );
    }

    // Análisis climático
    if (score.weather_score >= 50) {
      parts.push(
        "Condiciones meteorológicas adversas que afectan la visibilidad o adherencia"
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
        {/* Header - Sin score duplicado */}
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

// ============================================================================
// Componente: Badge de Factor Clickeable
// ============================================================================

interface ClickableFactorBadgeProps {
  icon: React.ElementType;
  label: string;
  description: string;
  severity: number;
  onClick?: (e: React.MouseEvent) => void;
  clickable: boolean;
}

const ClickableFactorBadge: React.FC<ClickableFactorBadgeProps> = ({
  icon: Icon,
  label,
  description,
  severity,
  onClick,
  clickable,
}) => {
  const getColor = (val: number) => {
    if (val >= 80)
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-500/30";
    if (val >= 60)
      return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-500/30";
    if (val >= 40)
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-500/30";
    return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-500/30";
  };

  return (
    <motion.div
      onClick={clickable ? onClick : undefined}
      className={`p-3 rounded-lg border-2 ${getColor(
        severity
      )} transition-all ${
        clickable ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""
      }`}
      whileHover={clickable ? { scale: 1.02 } : {}}
      whileTap={clickable ? { scale: 0.98 } : {}}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-bold uppercase">{label}</span>
      </div>
      <p className="text-xs font-semibold leading-tight">{description}</p>
      {clickable && (
        <p className="text-[10px] mt-1 opacity-70">Clic para detalles</p>
      )}
    </motion.div>
  );
};

// ============================================================================
// Componente: Modal de Detalle del Clima
// ============================================================================

interface WeatherDetailModalProps {
  polygonId: string;
  onClose: () => void;
}

const WeatherDetailModal: React.FC<WeatherDetailModalProps> = ({
  polygonId,
  onClose,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const {
    data: weatherData,
    isLoading,
    refetch,
  } = usePolygonWeather(polygonId);

  // Fechas para historial últimas 24h
  const now = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d;
  }, []);

  const { data: historyData, isLoading: isLoadingHistory } = useWeatherHistory(
    polygonId,
    yesterday.toISOString(),
    now.toISOString()
  );

  const handleRefresh = () => {
    refetch();
  };

  // Calcular estadísticas del historial
  const historyStats = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const temps = historyData
      .map((d) => d.temperature_celsius)
      .filter((t): t is number => t !== undefined && t !== null);

    const precipTotal = historyData.reduce(
      (sum, d) => sum + (d.precipitation_mm || 0),
      0
    );

    const windSpeeds = historyData
      .map((d) => d.wind_speed_kmh)
      .filter((w): w is number => w !== undefined && w !== null);

    // Condiciones más frecuentes
    const conditionCounts: Record<string, number> = {};
    historyData.forEach((d) => {
      const desc = d.weather_description || "Desconocido";
      conditionCounts[desc] = (conditionCounts[desc] || 0) + 1;
    });
    const predominantCondition =
      Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Sin datos";

    return {
      tempMin: temps.length > 0 ? Math.min(...temps) : null,
      tempMax: temps.length > 0 ? Math.max(...temps) : null,
      tempAvg:
        temps.length > 0
          ? temps.reduce((a, b) => a + b, 0) / temps.length
          : null,
      precipTotal: precipTotal,
      windMax: windSpeeds.length > 0 ? Math.max(...windSpeeds) : null,
      windAvg:
        windSpeeds.length > 0
          ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length
          : null,
      predominantCondition,
      dataPoints: historyData.length,
    };
  }, [historyData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white rounded-2xl w-full p-6 shadow-2xl ${
          showHistory ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {showHistory && (
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {showHistory ? (
                <>
                  <History className="w-6 h-6 text-purple-600" />
                  Historial 24 Horas
                </>
              ) : (
                <>
                  <CloudRain className="w-6 h-6 text-cyan-600" />
                  Condiciones Climáticas
                </>
              )}
            </h2>
            {!showHistory && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                🌤️ Open-Meteo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showHistory && (
              <>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-all text-purple-700 font-medium text-sm"
                  title="Ver historial últimas 24 horas"
                >
                  <History className="w-4 h-4" />
                  24h
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  title="Actualizar datos de Open-Meteo"
                >
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showHistory ? (
          // Vista de Historial
          isLoadingHistory ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          ) : historyStats ? (
            <div className="space-y-4">
              {/* Resumen de estadísticas */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900">
                    Informe Climático - Últimas 24h
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Basado en{" "}
                  <span className="font-bold">{historyStats.dataPoints}</span>{" "}
                  mediciones
                </p>
                <p className="text-sm text-gray-600">
                  Condición predominante:{" "}
                  <span className="font-bold text-purple-700">
                    {historyStats.predominantCondition}
                  </span>
                </p>
              </div>

              {/* Grid de estadísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-bold text-gray-700">
                      Temperatura
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Máxima:</span>
                      <span className="font-bold text-red-600">
                        {historyStats.tempMax?.toFixed(1) ?? "--"}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Mínima:</span>
                      <span className="font-bold text-blue-600">
                        {historyStats.tempMin?.toFixed(1) ?? "--"}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Promedio:</span>
                      <span className="font-bold">
                        {historyStats.tempAvg?.toFixed(1) ?? "--"}°C
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-cyan-600" />
                    <span className="text-sm font-bold text-gray-700">
                      Precipitación
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total 24h:</span>
                      <span className="font-bold text-cyan-600">
                        {historyStats.precipTotal.toFixed(1)} mm
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {historyStats.precipTotal === 0
                        ? "Sin precipitaciones registradas"
                        : historyStats.precipTotal > 10
                        ? "⚠️ Precipitación significativa"
                        : "🌧️ Lluvias leves"}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-bold text-gray-700">
                      Viento
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Máximo:</span>
                      <span className="font-bold">
                        {historyStats.windMax?.toFixed(0) ?? "--"} km/h
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Promedio:</span>
                      <span className="font-bold">
                        {historyStats.windAvg?.toFixed(0) ?? "--"} km/h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-bold text-gray-700">
                      Alertas
                    </span>
                  </div>
                  <div className="space-y-1">
                    {historyData &&
                    historyData.some((d) => d.has_weather_alert) ? (
                      <p className="text-sm text-amber-700 font-medium">
                        ⚠️ Se detectaron alertas meteorológicas
                      </p>
                    ) : (
                      <p className="text-sm text-green-700 font-medium">
                        ✅ Sin alertas en las últimas 24h
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Historial reciente */}
              {historyData && historyData.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">
                    Mediciones Recientes
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {historyData.slice(0, 10).map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <span className="text-gray-600">
                          {new Date(entry.timestamp).toLocaleTimeString(
                            "es-AR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                        <span className="font-medium">
                          {entry.weather_description}
                        </span>
                        <span className="font-bold">
                          {entry.temperature_celsius?.toFixed(0) ?? "--"}°C
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                No hay datos históricos disponibles
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Los datos se acumulan con el tiempo
              </p>
            </div>
          )
        ) : // Vista Actual (original)
        isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando datos meteorológicos...</p>
          </div>
        ) : weatherData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <WeatherInfoCard
                icon={Thermometer}
                label="Temperatura"
                value={`${
                  typeof weatherData.temperature_celsius === "number"
                    ? weatherData.temperature_celsius.toFixed(1)
                    : (Number(weatherData.temperature_celsius) || 0).toFixed(
                        1
                      ) || "--"
                }°C`}
                subvalue={`Sensación: ${
                  typeof weatherData.temperature_feels_like === "number"
                    ? weatherData.temperature_feels_like.toFixed(1)
                    : (Number(weatherData.temperature_feels_like) || 0).toFixed(
                        1
                      ) || "--"
                }°C`}
              />
              <WeatherInfoCard
                icon={Droplets}
                label="Precipitación"
                value={(() => {
                  // Detectar si está lloviendo por weather_code (códigos WMO)
                  const isRaining =
                    weatherData.weather_code &&
                    ((weatherData.weather_code >= 51 &&
                      weatherData.weather_code <= 67) ||
                      (weatherData.weather_code >= 80 &&
                        weatherData.weather_code <= 82) ||
                      (weatherData.weather_code >= 95 &&
                        weatherData.weather_code <= 99));

                  if (isRaining) {
                    return "🌧️ Lloviendo";
                  } else {
                    return "Sin lluvia";
                  }
                })()}
                subvalue={(() => {
                  const precipMm =
                    typeof weatherData.precipitation_mm === "number"
                      ? weatherData.precipitation_mm
                      : Number(weatherData.precipitation_mm) || 0;

                  if (precipMm > 0) {
                    return `Acumulado: ${precipMm.toFixed(1)} mm`;
                  } else {
                    return `Prob: ${
                      weatherData.precipitation_probability || 0
                    }%`;
                  }
                })()}
              />
              <WeatherInfoCard
                icon={Wind}
                label="Viento"
                value={`${
                  typeof weatherData.wind_speed_kmh === "number"
                    ? weatherData.wind_speed_kmh.toFixed(0)
                    : (Number(weatherData.wind_speed_kmh) || 0).toFixed(0) ||
                      "--"
                } km/h`}
                subvalue={`Ráfagas: ${
                  typeof weatherData.wind_gusts_kmh === "number"
                    ? weatherData.wind_gusts_kmh.toFixed(0)
                    : (Number(weatherData.wind_gusts_kmh) || 0).toFixed(0) ||
                      "--"
                } km/h`}
              />
              <WeatherInfoCard
                icon={Eye}
                label="Visibilidad"
                value={`${(
                  (Number(weatherData.visibility_meters) || 10000) / 1000
                ).toFixed(1)} km`}
                subvalue={weatherData.weather_description || "Sin datos"}
              />
            </div>

            {weatherData.is_freezing_risk && (
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <p className="text-blue-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Riesgo de congelamiento detectado
                </p>
                <p className="text-blue-700 text-sm mt-1">
                  Temperatura de carretera:{" "}
                  {typeof weatherData.road_temperature_celsius === "number"
                    ? weatherData.road_temperature_celsius.toFixed(1)
                    : (
                        Number(weatherData.road_temperature_celsius) || 0
                      ).toFixed(1) || "--"}
                  °C
                </p>
              </div>
            )}

            {weatherData.has_weather_alert && (
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                <p className="text-amber-800 font-bold">
                  Alerta Meteorológica: {weatherData.alert_severity}
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  {weatherData.alert_description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <CloudRain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No hay datos meteorológicos disponibles
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Los datos se actualizan periódicamente
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// Componente: Card de Info del Clima
// ============================================================================

interface WeatherInfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subvalue: string;
}

const WeatherInfoCard: React.FC<WeatherInfoCardProps> = ({
  icon: Icon,
  label,
  value,
  subvalue,
}) => (
  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-cyan-200 dark:border-cyan-800/30">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
      <span className="text-sm font-bold text-gray-700 dark:text-veltrix-text">
        {label}
      </span>
    </div>
    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-600 dark:text-veltrix-muted mt-1">
      {subvalue}
    </p>
  </div>
);

// ============================================================================
// Componente: Panel Detallado de Tramo
// ============================================================================

interface PolygonDetailPanelProps {
  score: RiskScore;
  onClose: () => void;
}

const PolygonDetailPanel: React.FC<PolygonDetailPanelProps> = ({
  score,
  onClose,
}) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl rounded-t-3xl p-8 z-50 max-h-[60vh] overflow-y-auto"
    >
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {score.polygon_name}
            </h2>
            <p className="text-gray-600">{score.group_name}</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
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

        <div className="mt-6 p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Categoría de Riesgo
          </h3>
          <p className="text-gray-700">
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

// ============================================================================
// Componente: Card Detallado de Factor
// ============================================================================

interface DetailFactorCardProps {
  title: string;
  score: number;
  icon: React.ElementType;
  color: string;
}

const DetailFactorCard: React.FC<DetailFactorCardProps> = ({
  title,
  score,
  icon: Icon,
  color,
}) => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-veltrix-bg dark:to-veltrix-card rounded-xl p-6 border-2 border-gray-200 dark:border-veltrix-border">
      <div
        className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 w-fit mb-3`}
      >
        <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <h4 className="text-sm font-bold text-gray-700 dark:text-veltrix-text mb-2">
        {title}
      </h4>
      <div className="text-4xl font-black text-gray-900 dark:text-white">
        {Math.round(score)}
      </div>
      <div className="mt-3 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r from-${color}-400 to-${color}-600`}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Componente: Modal de Info de Tráfico
// ============================================================================

interface TrafficInfoModalProps {
  polygonId: string;
  polygonName: string;
  jamCount: number;
  onClose: () => void;
}

const TrafficInfoModal: React.FC<TrafficInfoModalProps> = ({
  polygonId,
  polygonName,
  jamCount,
  onClose,
}) => {
  const navigate = useNavigate();

  const handleViewOnMap = () => {
    onClose();
    // Navegar al dashboard con el polígono seleccionado y filtro de jams
    navigate("/", {
      state: {
        selectedPolygonId: polygonId,
        filterType: "jams",
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            Tráfico - {polygonName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
            <div className="text-center">
              <div className="text-5xl font-black text-blue-600 mb-2">
                {jamCount}
              </div>
              <p className="text-blue-800 font-bold">
                Atasco{jamCount !== 1 ? "s" : ""} Activo
                {jamCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">
              <strong>Información:</strong> Los atascos se detectan en tiempo
              real a través del sistema Waze. Cada atasco representa una zona
              donde la velocidad del tráfico está significativamente reducida.
            </p>
          </div>

          <button
            onClick={handleViewOnMap}
            className="block w-full text-center py-3 px-4 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              Ver en el Mapa Principal
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// Componente: Modal de Info de Incidentes
// ============================================================================

interface IncidentsInfoModalProps {
  polygonId: string;
  polygonName: string;
  incidentCount: number;
  onClose: () => void;
}

const IncidentsInfoModal: React.FC<IncidentsInfoModalProps> = ({
  polygonId,
  polygonName,
  incidentCount,
  onClose,
}) => {
  const navigate = useNavigate();

  const handleViewOnMap = () => {
    onClose();
    // Navegar al dashboard con el polígono seleccionado y filtro de alertas
    navigate("/", {
      state: {
        selectedPolygonId: polygonId,
        filterType: "alerts",
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertIcon className="w-6 h-6 text-red-600" />
            Incidentes - {polygonName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl p-6 border-2 border-red-200">
            <div className="text-center">
              <div className="text-5xl font-black text-red-600 mb-2">
                {incidentCount}
              </div>
              <p className="text-red-800 font-bold">
                Incidente{incidentCount !== 1 ? "s" : ""} Reportado
                {incidentCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700 mb-3">
              <strong>Tipos de incidentes:</strong>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span>Accidentes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                <span>Obras en vía</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span>Peligros</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Cortes de vía</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleViewOnMap}
            className="block w-full text-center py-3 px-4 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              Ver en el Mapa Principal
            </div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================================
// Componente: Lista Virtualizada de Riesgos (Performance)
// ============================================================================

interface VirtualizedRiskListProps {
  scores: RiskScore[];
  selectedPolygon: RiskScore | null;
  onPolygonClick: (score: RiskScore) => void;
  onFactorClick: (
    type: "traffic" | "incidents" | "weather",
    polygonId: string
  ) => void;
}

const VirtualizedRiskList: React.FC<VirtualizedRiskListProps> = ({
  scores,
  selectedPolygon,
  onPolygonClick,
  onFactorClick,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: scores.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Altura estimada de cada card
    overscan: 3,
  });

  const scrollToPolygon = useCallback(
    (polygonId: string) => {
      const index = scores.findIndex((s) => s.polygon_id === polygonId);
      if (index !== -1) {
        virtualizer.scrollToIndex(index, {
          align: "center",
          behavior: "smooth",
        });
      }
    },
    [scores, virtualizer]
  );

  if (scores.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">
          No hay tramos con este nivel de riesgo
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-400px)] overflow-auto rounded-xl"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const score = scores[virtualRow.index];
          if (!score) return null;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: "16px",
              }}
            >
              <PolygonRiskCard
                score={score}
                index={virtualRow.index}
                isSelected={selectedPolygon?.polygon_id === score.polygon_id}
                onClick={() => onPolygonClick(score)}
                onFactorClick={onFactorClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskDashboard;

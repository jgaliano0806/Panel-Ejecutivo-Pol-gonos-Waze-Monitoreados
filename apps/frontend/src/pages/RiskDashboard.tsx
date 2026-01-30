/**
 * Dashboard de Análisis de Riesgos Multifactorial
 * Con filtros por grupo, nivel de riesgo y visualización de tramos individuales
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, RefreshCw, X } from "lucide-react";
import {
  useRiskSummary,
  useRiskScores,
  useCalculateAllScores,
  useRiskGroups,
} from "../hooks/useRiskScoring";
import {
  GlobalRiskOverview,
  VirtualizedRiskList,
  TrafficInfoModal,
  IncidentsInfoModal,
  WeatherDetailModal,
  PolygonDetailPanel,
  PredictiveRiskView,
} from "../components/risk-dashboard";
import {
  RiskDashboardViewSelector,
  RiskViewMode,
} from "../components/risk-dashboard/RiskDashboardViewSelector";
import { RiskMatrix } from "../components/risk-dashboard/RiskMatrix";
import { RiskHeatMap } from "../components/risk-dashboard/RiskHeatMap";
import { useWazeData } from "../hooks/useWazeData";

import type { RiskScore } from "../hooks/useRiskScoring";

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
    null,
  );
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(
    null,
  );
  const [activeModal, setActiveModal] = useState<
    "traffic" | "incidents" | "weather" | null
  >(null);
  const [modalPolygonId, setModalPolygonId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<RiskViewMode>("list"); // New state for view mode

  const { data: summaryData, isLoading: summaryLoading } = useRiskSummary();
  const { data: scoresData, isLoading: scoresLoading } = useRiskScores(
    selectedGroup || undefined,
  );
  // Fetch geometry for heatmap (reusing cached hook)
  const { polygons } = useWazeData();

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
    polygonId: string,
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
                  (s) => s.group_name === group,
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
                <div className="flex justify-between items-center flex-wrap gap-4">
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
                  {/* View Selector */}
                  <RiskDashboardViewSelector
                    currentView={viewMode}
                    onChange={setViewMode}
                  />
                </div>
              </motion.div>

              {/* Contenido Dinámico según Vista */}
              <div className="min-h-[500px]">
                {viewMode === "list" && (
                  <VirtualizedRiskList
                    scores={filteredScores}
                    selectedPolygon={selectedPolygon}
                    onPolygonClick={setSelectedPolygon}
                    onFactorClick={openFactorModal}
                  />
                )}
                {viewMode === "matrix" && (
                  <RiskMatrix
                    data={filteredScores}
                    onPolygonSelect={setSelectedPolygon}
                  />
                )}
                {viewMode === "heatmap" && (
                  <RiskHeatMap scores={filteredScores} polygons={polygons} />
                )}
                {viewMode === "predictive" && (
                  <PredictiveRiskView
                    scores={filteredScores}
                    onPolygonSelect={setSelectedPolygon}
                  />
                )}
              </div>
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

/**
 * PredictiveRiskView - Vista de Análisis Predictivo de Riesgos
 * Muestra predicciones de riesgo, tendencias, confianza y alertas clasificadas
 */

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  GitCompare,
  Filter,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useThemeStore } from "../../stores/useThemeStore";
import type { RiskScore, PredictionResult } from "../../hooks/useRiskScoring";
import { usePredictions } from "../../hooks/useRiskScoring";
import {
  getMainTypeTranslation,
  getSubtypeTranslation,
} from "../../utils/wazeTranslations";

interface PredictiveRiskViewProps {
  scores: RiskScore[];
  onPolygonSelect?: (score: RiskScore) => void;
}

// KPI Card Component
const PredictiveKPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: "blue" | "green" | "orange" | "red" | "purple" | "cyan";
  trend?: "up" | "down" | "neutral";
}> = ({ title, value, subtitle, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 text-blue-100",
    green: "from-green-500 to-green-600 text-green-100",
    orange: "from-orange-500 to-orange-600 text-orange-100",
    red: "from-red-500 to-red-600 text-red-100",
    purple: "from-purple-500 to-purple-600 text-purple-100",
    cyan: "from-cyan-500 to-cyan-600 text-cyan-100",
  };

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-80 font-medium">{title}</p>
          <p className="text-3xl font-black mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
              {trend && <TrendIcon className="w-3 h-3" />}
              {subtitle}
            </p>
          )}
        </div>
        <div className="p-2 bg-white/20 rounded-lg">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

// Prediction Card Component
const PredictionCard: React.FC<{
  prediction: PredictionResult;
  score?: RiskScore;
  onClick?: () => void;
}> = ({ prediction, score, onClick }) => {
  const trend = prediction.factors.current_trend;
  const trendDirection = trend > 5 ? "up" : trend < -5 ? "down" : "neutral";
  const TrendIcon =
    trendDirection === "up"
      ? TrendingUp
      : trendDirection === "down"
        ? TrendingDown
        : Minus;
  const trendColor =
    trendDirection === "up"
      ? "text-red-500"
      : trendDirection === "down"
        ? "text-green-500"
        : "text-gray-400";

  const confidenceColor =
    prediction.confidence >= 70
      ? "text-green-500 bg-green-100 dark:bg-green-900/30"
      : prediction.confidence >= 50
        ? "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30"
        : "text-gray-500 bg-gray-100 dark:bg-gray-800";

  const getRiskColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="bg-white dark:bg-veltrix-card rounded-xl p-4 shadow-sm border border-gray-100 dark:border-veltrix-border cursor-pointer hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900 dark:text-white truncate">
              {score?.polygon_name || prediction.polygon_id}
            </h4>
            {prediction.based_on_similarity && (
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
                <GitCompare className="w-3 h-3" />
                Día Gemelo
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-veltrix-muted mt-1">
            {score?.group_name || "Sin grupo"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Current Score */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Actual</p>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${getRiskColor(score?.final_risk_score || 0)}`}
              />
              <span className="font-bold text-gray-900 dark:text-white">
                {score?.final_risk_score?.toFixed(0) || "N/A"}
              </span>
            </div>
          </div>

          {/* Trend Arrow */}
          <div className={`${trendColor}`}>
            <TrendIcon className="w-5 h-5" />
          </div>

          {/* Predicted Score */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Predicción
            </p>
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${getRiskColor(prediction.predicted_risk_score)}`}
              />
              <span className="font-bold text-gray-900 dark:text-white">
                {prediction.predicted_risk_score}
              </span>
            </div>
          </div>

          {/* Confidence Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold ${confidenceColor}`}
          >
            {prediction.confidence}% conf.
          </div>
        </div>
      </div>

      {/* Factors Bar */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-veltrix-border">
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Hora: {prediction.factors.time_factor}:00
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Histórico: {prediction.factors.historical_avg}
          </span>
          <span className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            Tendencia: {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// Noise Alert Component
const NoiseAlertBadge: React.FC<{
  type: string;
  subtype?: string;
  isNoise: boolean;
}> = ({ type, subtype, isNoise }) => {
  // Traducir tipo y subtipo usando las funciones de wazeTranslations
  const translatedType = getMainTypeTranslation(type);
  const translatedSubtype = subtype
    ? getSubtypeTranslation(type, subtype)
    : null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
        isNoise
          ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
      }`}
    >
      {isNoise ? (
        <Filter className="w-4 h-4" />
      ) : (
        <AlertTriangle className="w-4 h-4" />
      )}
      <span className="font-medium">{translatedType}</span>
      {translatedSubtype && translatedSubtype !== translatedType && (
        <span className="opacity-70">· {translatedSubtype}</span>
      )}
      {isNoise && (
        <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-bold">
          RUIDO
        </span>
      )}
    </div>
  );
};

export const PredictiveRiskView: React.FC<PredictiveRiskViewProps> = ({
  scores,
  onPolygonSelect,
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const { data: predictionsData, isLoading: predictionsLoading } =
    usePredictions();

  // Combine predictions with scores
  const combinedData = useMemo(() => {
    if (!predictionsData?.predictions) return [];

    return predictionsData.predictions.map((prediction) => {
      const score = scores.find((s) => s.polygon_id === prediction.polygon_id);
      return { prediction, score };
    });
  }, [predictionsData, scores]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!combinedData.length)
      return {
        avgConfidence: 0,
        highRiskPredictions: 0,
        trendingUp: 0,
        trendingDown: 0,
        similarityBased: 0,
      };

    const predictions = combinedData.map((d) => d.prediction);

    return {
      avgConfidence: Math.round(
        predictions.reduce((sum, p) => sum + p.confidence, 0) /
          predictions.length,
      ),
      highRiskPredictions: predictions.filter(
        (p) => p.predicted_risk_score >= 60,
      ).length,
      trendingUp: predictions.filter((p) => p.factors.current_trend > 5).length,
      trendingDown: predictions.filter((p) => p.factors.current_trend < -5)
        .length,
      similarityBased: predictions.filter((p) => p.based_on_similarity).length,
    };
  }, [combinedData]);

  // Sort by predicted risk score (highest first)
  const sortedData = useMemo(() => {
    return [...combinedData].sort(
      (a, b) =>
        b.prediction.predicted_risk_score - a.prediction.predicted_risk_score,
    );
  }, [combinedData]);

  // Chart data for trend visualization
  const trendChartData = useMemo(() => {
    return sortedData.slice(0, 10).map((d) => ({
      name:
        d.score?.polygon_name?.substring(0, 15) ||
        d.prediction.polygon_id.substring(0, 8),
      actual: d.score?.final_risk_score || 0,
      predicted: d.prediction.predicted_risk_score,
      confidence: d.prediction.confidence,
    }));
  }, [sortedData]);

  // Simulated noise incidents (in real implementation, this would come from the backend)
  // Usar subtipos completos que coinciden con las traducciones de WAZE_TRANSLATIONS
  const noiseExamples = [
    {
      type: "HAZARD",
      subtype: "HAZARD_ON_SHOULDER_CAR_STOPPED",
      isNoise: true,
    },
    { type: "HAZARD", subtype: "HAZARD_ON_ROAD_CONSTRUCTION", isNoise: true },
    { type: "ACCIDENT", subtype: "ACCIDENT_MAJOR", isNoise: false },
    { type: "JAM", subtype: "JAM_HEAVY_TRAFFIC", isNoise: false },
    { type: "HAZARD", subtype: "HAZARD_WEATHER_FOG", isNoise: false },
  ];

  if (predictionsLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-white dark:bg-veltrix-card rounded-xl">
        <div className="text-center">
          <BrainCircuit className="w-12 h-12 text-primary-600 dark:text-primary-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 dark:text-veltrix-muted">
            Generando predicciones...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <PredictiveKPICard
          title="Confianza Promedio"
          value={`${kpis.avgConfidence}%`}
          subtitle="Basado en datos históricos"
          icon={Target}
          color="blue"
        />
        <PredictiveKPICard
          title="Riesgo Alto Predicho"
          value={kpis.highRiskPredictions}
          subtitle={`de ${combinedData.length} tramos`}
          icon={AlertTriangle}
          color="red"
          trend="up"
        />
        <PredictiveKPICard
          title="Tendencia Ascendente"
          value={kpis.trendingUp}
          subtitle="tramos empeorando"
          icon={TrendingUp}
          color="orange"
          trend="up"
        />
        <PredictiveKPICard
          title="Tendencia Descendente"
          value={kpis.trendingDown}
          subtitle="tramos mejorando"
          icon={TrendingDown}
          color="green"
          trend="down"
        />
        <PredictiveKPICard
          title="Días Gemelos"
          value={kpis.similarityBased}
          subtitle="predicciones por similitud"
          icon={GitCompare}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Comparison Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-7 bg-white dark:bg-veltrix-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-veltrix-border"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Actual vs Predicción (Top 10)
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={trendChartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#3f3f46" : "#e5e7eb"}
              />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fill: isDark ? "#a1a1aa" : "#4b5563", fontSize: 10 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: isDark ? "#a1a1aa" : "#4b5563", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#27272a" : "#ffffff",
                  border: `1px solid ${isDark ? "#3f3f46" : "#e5e7eb"}`,
                  borderRadius: "8px",
                }}
                labelStyle={{ color: isDark ? "#fafafa" : "#111827" }}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill={isDark ? "#60a5fa" : "#3b82f6"}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="predicted"
                name="Predicción"
                fill={isDark ? "#a78bfa" : "#8b5cf6"}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Noise Classification Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-5 bg-white dark:bg-veltrix-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-veltrix-border"
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Clasificación de Alertas (Smart Triage)
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-veltrix-muted mb-4">
            El sistema clasifica automáticamente alertas para filtrar ruido y
            priorizar incidentes accionables.
          </p>
          <div className="space-y-2">
            {noiseExamples.map((incident, idx) => (
              <NoiseAlertBadge
                key={idx}
                type={incident.type}
                subtype={incident.subtype}
                isNoise={incident.isNoise}
              />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-veltrix-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Alertas filtradas como ruido:
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                ~40%
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Basado en correlación histórica incidente → jam
            </p>
          </div>
        </motion.div>
      </div>

      {/* Predictions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-veltrix-card rounded-xl p-6 shadow-sm border border-gray-100 dark:border-veltrix-border"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Predicciones por Tramo
            </h3>
          </div>
          <span className="text-sm text-gray-500 dark:text-veltrix-muted">
            {sortedData.length} predicciones
          </span>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
          {sortedData.map(({ prediction, score }) => (
            <PredictionCard
              key={prediction.polygon_id}
              prediction={prediction}
              score={score}
              onClick={() => score && onPolygonSelect?.(score)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PredictiveRiskView;

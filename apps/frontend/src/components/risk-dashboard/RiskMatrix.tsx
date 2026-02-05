import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { useThemeStore } from "../../stores/useThemeStore";
import type { RiskScore } from "../../hooks/useRiskScoring";

interface RiskMatrixProps {
  data: RiskScore[];
  onPolygonSelect: (score: RiskScore) => void;
}

export const RiskMatrix: React.FC<RiskMatrixProps> = ({
  data,
  onPolygonSelect,
}) => {
  const isDark = useThemeStore((state) => state.isDark);

  // Transform data for scatter plot: x = probability (predictive_score), y = impact (incident_score)
  const chartData = data.map((item) => ({
    x: item.predictive_score || 0, // Use predictive_score as probability
    y: item.incident_score || 0, // Use incident_score as impact
    z: 1, // Bubble size factor (optional, could use severity)
    name: item.polygon_name || "Sin nombre",
    ...item,
  }));

  // Define colors based on risk level logic (simplified for visualization)
  const getPointColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "CRITICAL":
      case "SEVERE":
        return "#ef4444"; // Red
      case "HIGH":
        return "#f97316"; // Orange
      case "MODERATE":
        return "#eab308"; // Yellow
      default:
        return "#22c55e"; // Green
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-zinc-800 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg text-sm">
          <p className="font-bold text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <div className="mt-1 space-y-1 text-xs">
            <p className="text-gray-600 dark:text-gray-400">
              Riesgo:{" "}
              <span
                className="font-bold"
                style={{ color: getPointColor(data.risk_level) }}
              >
                {data.risk_level}
              </span>
            </p>
            <p>Impacto: {data.y.toFixed(1)} / 100</p>
            <p>Probabilidad: {data.x.toFixed(1)} / 100</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[500px] bg-white dark:bg-veltrix-card rounded-xl p-4 shadow-sm border border-gray-100 dark:border-veltrix-border">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 pl-2">
        Matriz de Impacto vs Probabilidad
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          {/* Background Quadrants (simulated with reference areas or CSS background) - Keeping it simple with Grid for now */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#3f3f46" : "#e5e7eb"}
          />
          <XAxis
            type="number"
            dataKey="x"
            name="Probabilidad"
            unit=""
            domain={[0, 100]}
            label={{
              value: "Probabilidad (Frecuencia Histórica)",
              position: "bottom",
              offset: 0,
              fill: isDark ? "#a1a1aa" : "#4b5563",
              fontSize: 12,
            }}
            tick={{ fill: isDark ? "#a1a1aa" : "#4b5563", fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Impacto"
            unit=""
            domain={[0, 100]}
            label={{
              value: "Impacto (Severidad Actual)",
              angle: -90,
              position: "left",
              offset: 10,
              fill: isDark ? "#a1a1aa" : "#4b5563",
              fontSize: 12,
            }}
            tick={{ fill: isDark ? "#a1a1aa" : "#4b5563", fontSize: 11 }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: "3 3", stroke: "#6b7280" }}
          />

          {/* Quadrant Lines */}
          <ReferenceLine
            x={50}
            stroke={isDark ? "#52525b" : "#d1d5db"}
            strokeDasharray="5 5"
          />
          <ReferenceLine
            y={50}
            stroke={isDark ? "#52525b" : "#d1d5db"}
            strokeDasharray="5 5"
          />

          {/* Quadrant Labels (Approximate) */}
          <ReferenceLine
            y={90}
            x={90}
            stroke="none"
            label={{
              value: "CRÍTICO",
              fill: "#ef4444",
              fontSize: 14,
              fontWeight: "bold",
              opacity: 0.3,
            }}
          />
          <ReferenceLine
            y={10}
            x={10}
            stroke="none"
            label={{
              value: "BAJO",
              fill: "#22c55e",
              fontSize: 14,
              fontWeight: "bold",
              opacity: 0.3,
            }}
          />

          <Scatter
            name="Tramos"
            data={chartData}
            fill="#8884d8"
            onClick={(e: { payload?: RiskScore }) => {
              if (e.payload) onPolygonSelect(e.payload);
            }}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getPointColor(entry.risk_level)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

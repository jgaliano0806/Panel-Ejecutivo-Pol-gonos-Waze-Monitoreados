import React, { useMemo } from "react";
import type { HistoricalSnapshot } from "../../types";

interface TrendsChartProps {
  snapshots: HistoricalSnapshot[];
  metric: "totalJams" | "avgSpeed" | "criticalKm" | "avgDelay";
  title: string;
  unit?: string;
}

export const TrendsChart: React.FC<TrendsChartProps> = ({
  snapshots,
  metric,
  title,
  unit = "",
}) => {
  const chartData = useMemo(() => {
    if (snapshots.length === 0) return null;

    const values = snapshots.map((s) => (s[metric] as number) || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    // Calcular puntos del gráfico (normalizado a 0-100%)
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return { x, y, value };
    });

    // Crear path SVG
    const pathData = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    // Calcular tendencia
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const percentChange = first !== 0 ? (change / first) * 100 : 0;

    return {
      points,
      pathData,
      max,
      min,
      current: last,
      change,
      percentChange,
      isImproving: metric === "avgSpeed" ? change > 0 : change < 0,
    };
  }, [snapshots, metric]);

  if (!chartData || snapshots.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Sin datos históricos
        </div>
      </div>
    );
  }

  const trendColor = chartData.isImproving ? "text-green-600" : "text-red-600";
  const bgColor = chartData.isImproving ? "bg-green-50" : "bg-red-50";
  const lineColor = chartData.isImproving ? "#10b981" : "#ef4444";

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <div className="mt-1">
            <span className="text-2xl font-black text-gray-900">
              {chartData.current}
            </span>
            {unit && <span className="text-sm text-gray-600 ml-1">{unit}</span>}
          </div>
        </div>

        <div className={`text-right px-2 py-1 rounded ${bgColor}`}>
          <div className={`text-xs font-bold ${trendColor}`}>
            {chartData.change > 0 ? "▲" : chartData.change < 0 ? "▼" : "━"}{" "}
            {Math.abs(chartData.percentChange).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">
            últimas {snapshots.length}h
          </div>
        </div>
      </div>

      {/* Gráfico SVG */}
      <div className="relative" style={{ height: "100px" }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Área debajo de la línea */}
          <defs>
            <linearGradient
              id={`gradient-${metric}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <path
            d={`${chartData.pathData} L 100 100 L 0 100 Z`}
            fill={`url(#gradient-${metric})`}
          />

          {/* Línea principal */}
          <path
            d={chartData.pathData}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Puntos */}
          {chartData.points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={lineColor}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {/* Rango */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>
          Mín: {chartData.min}
          {unit}
        </span>
        <span>
          Máx: {chartData.max}
          {unit}
        </span>
      </div>
    </div>
  );
};

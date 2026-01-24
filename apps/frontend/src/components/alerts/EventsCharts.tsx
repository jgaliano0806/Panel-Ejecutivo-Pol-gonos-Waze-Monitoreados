import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Sector,
} from "recharts";
import { BlockingAnalysisItem } from "../../hooks/useWazeData";
import { useThemeStore } from "../../stores/useThemeStore";
import { getIncidentDescription } from "../../utils/wazeTranslations";
import { cn } from "../../lib/utils";

interface EventsChartsProps {
  analyses: BlockingAnalysisItem[];
  selectedType?: string | null;
  onTypeClick?: (type: string) => void;
  onZoneClick?: (zone: string) => void;
}

// Premium Vivid Palette
const COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#eab308", // Yellow
  "#8b5cf6", // Violet
  "#10b981", // Emerald
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#84cc16", // Lime
];

// Custom Active Shape for Pie Chart effect
const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;
  return (
    <g style={{ outline: "none" }}>
      <text
        x={cx}
        y={cy}
        dy={-10}
        textAnchor="middle"
        fill={fill}
        className="font-bold text-2xl pointer-events-none"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
          outline: "none",
        }}
      >
        {payload.value}
      </text>
      <text
        x={cx}
        y={cy}
        dy={15}
        textAnchor="middle"
        fill="#9ca3af"
        className="text-xs font-medium uppercase tracking-wider pointer-events-none"
        style={{ outline: "none" }}
      >
        {(percent * 100).toFixed(0)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
        style={{
          filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))",
          outline: "none",
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 2}
        fill={fill}
        style={{ outline: "none" }}
      />
    </g>
  );
};

export const EventsCharts: React.FC<EventsChartsProps> = ({
  analyses,
  selectedType,
  onTypeClick,
  onZoneClick,
}) => {
  const isDark = useThemeStore((state) => state.isDark);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyses.forEach((a) => {
      const label = getIncidentDescription(a.incident.type, a.incident.subtype);
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [analyses]);

  // Filtrar zonas (tramos) por tipo seleccionado y contar eventos
  const tramosData = useMemo(() => {
    const filteredAnalyses = selectedType
      ? analyses.filter(
          (a) =>
            getIncidentDescription(a.incident.type, a.incident.subtype) ===
            selectedType,
        )
      : analyses;

    const countsByStreet: Record<string, number> = {};
    filteredAnalyses.forEach((a) => {
      // Priorizar el nombre de la calle (Tramo) sobre el nombre del polígono interno
      let streetName =
        a.incident.street || a.polygonName || "Tramo no identificado";

      // Limpiar textos nulos o genéricos
      if (streetName.toUpperCase() === "UNKNOWN" || streetName === "null") {
        streetName =
          a.polygonName && a.polygonName.toUpperCase() !== "UNKNOWN"
            ? a.polygonName
            : "Tramo no identificado";
      }

      countsByStreet[streetName] =
        (countsByStreet[streetName] || 0) + (a.reportCount || 1);
    });

    const sortedData = Object.entries(countsByStreet)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      display: showAll ? sortedData : sortedData.slice(0, 10),
      total: sortedData.length,
    };
  }, [analyses, selectedType, showAll]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Distribución por Tipo */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl transition-shadow duration-500">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 pl-2 border-l-4 border-blue-500">
          Distribución por Tipo
        </h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                onClick={(data: any) => onTypeClick && onTypeClick(data.name)}
                onMouseEnter={onPieEnter}
                cursor="pointer"
                cornerRadius={5}
                animationDuration={800}
                animationBegin={0}
              >
                {typeData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    strokeWidth={0}
                  />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: "11px",
                  paddingTop: "20px",
                  opacity: 0.8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tramos más afectados */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl transition-shadow duration-500 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white pl-2 border-l-4 border-indigo-500">
            Tramos más afectados
          </h3>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full transition-colors"
          >
            {showAll ? "Ver Top 10" : `Ver todos (${tramosData.total})`}
          </button>
        </div>
        <div
          className={cn(
            "w-full transition-all duration-300",
            showAll ? "h-[500px]" : "h-[280px]",
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tramosData.display}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 20, bottom: 0 }}
              barCategoryGap={showAll ? 4 : 15}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={isDark ? "#27272a" : "#f1f5f9"}
              />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{
                  fill: isDark ? "#9ca3af" : "#64748b",
                  fontSize: 11,
                  fontWeight: 500,
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: isDark ? "#27272a" : "#f8fafc", opacity: 0.6 }}
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-zinc-900 text-white p-2 rounded-lg text-xs shadow-xl border border-zinc-700">
                        <p className="font-bold">{payload[0].payload.name}</p>
                        <p className="text-zinc-400">
                          {payload[0].value} eventos detectados
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                fill="url(#barGradient)"
                radius={[0, 6, 6, 0]} // Rounded right edge
                barSize={showAll ? 12 : 24}
                onClick={(data: any) => onZoneClick && onZoneClick(data.name)}
                cursor="pointer"
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

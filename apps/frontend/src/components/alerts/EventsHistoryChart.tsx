import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useHistoricalData } from "../../hooks/useWazeData";
import { useThemeStore } from "../../stores/useThemeStore";
import { Clock, TrendingUp } from "lucide-react";

export const EventsHistoryChart: React.FC = () => {
  const { data: history, isLoading } = useHistoricalData(24);
  const isDark = useThemeStore((state) => state.isDark);

  if (isLoading) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm animate-pulse p-6">
        <div className="w-full h-full bg-gray-100 dark:bg-zinc-800/50 rounded-xl shimmer"></div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Tendencia Histórica (24h)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
              Evolución de carga en la red vial monitoreada
            </p>
          </div>
        </div>
        <div className="h-[120px] flex items-center justify-center bg-gray-50 dark:bg-zinc-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No hay datos históricos disponibles
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Los datos se irán acumulando con el tiempo
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = history
    .map((snapshot) => ({
      time: new Date(snapshot.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: new Date(snapshot.timestamp).getTime(),
      incidentes: snapshot.totalIncidents,
      demora: Math.round(snapshot.totalDelay / 60),
    }))
    .reverse();

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none mb-6 transition-all hover:shadow-2xl hover:shadow-blue-500/5 dark:hover:shadow-none duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Tendencia Histórica (24h)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
            Evolución de carga en la red vial monitoreada
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 shadow-sm shadow-blue-500/50"></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Incidentes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 shadow-sm shadow-orange-500/50"></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Demora (min)
            </span>
          </div>
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIncidentes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDemora" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              {/* Pattern for grid maybe? Kept simple for now */}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? "#27272a" : "#f3f4f6"}
            />
            <XAxis
              dataKey="time"
              tick={{
                fill: isDark ? "#71717a" : "#9ca3af",
                fontSize: 10,
                fontWeight: 500,
              }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
              dy={10}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark
                  ? "rgba(24, 24, 27, 0.8)"
                  : "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(8px)",
                borderColor: isDark ? "#27272a" : "#e5e7eb",
                color: isDark ? "#fff" : "#000",
                fontSize: "12px",
                borderRadius: "12px",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                padding: "8px 12px",
              }}
              itemStyle={{ padding: "2px 0" }}
              labelStyle={{
                color: isDark ? "#e4e4e7" : "#374151",
                marginBottom: "8px",
                fontWeight: 600,
                fontSize: "13px",
              }}
              cursor={{
                stroke: isDark ? "#52525b" : "#d1d5db",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="demora"
              stroke="#f97316"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDemora)"
              name="Demora (min)"
              animationDuration={1500}
              strokeLinecap="round"
            />
            <Area
              type="monotone"
              dataKey="incidentes"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorIncidentes)"
              name="Incidentes"
              animationDuration={1500}
              strokeLinecap="round"
              activeDot={{
                r: 6,
                strokeWidth: 0,
                fill: "#3b82f6",
                style: {
                  filter: "drop-shadow(0px 0px 6px rgba(59, 130, 246, 0.5))",
                },
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

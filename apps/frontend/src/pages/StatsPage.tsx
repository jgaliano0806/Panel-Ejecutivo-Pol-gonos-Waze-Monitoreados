import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Activity,
  History,
} from "lucide-react";
import { OperationalAnalyticsDashboard } from "../components/analytics/OperationalAnalyticsDashboard";
import {
  useDailyStats,
  useWeeklyStats,
  useMonthlyStats,
} from "../hooks/useDailyStats";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Period = "daily" | "weekly" | "monthly";

// Formatea la etiqueta X según el tipo de registro (daily/weekly/monthly)
function formatPeriodLabel(d: any): string {
  const tz = "America/Argentina/Buenos_Aires";
  if ("date" in d && d.date) {
    return new Date(d.date).toLocaleDateString("es-AR", { timeZone: tz });
  }
  if ("week" in d && d.week) {
    return new Date(d.week).toLocaleDateString("es-AR", { timeZone: tz });
  }
  if ("month" in d && d.month) {
    return new Date(d.month).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      timeZone: tz,
    });
  }
  return "";
}

export const StatsPage: React.FC = () => {
  const [period, setPeriod] = useState<Period>("daily");
  const [activeTab, setActiveTab] = useState<"historical" | "live">("live");
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const { data: dailyData } = useDailyStats(dateRange.from, dateRange.to);
  const { data: weeklyData } = useWeeklyStats(dateRange.from, dateRange.to);
  const { data: monthlyData } = useMonthlyStats(dateRange.from, dateRange.to);

  const currentData =
    period === "daily"
      ? dailyData
      : period === "weekly"
        ? weeklyData
        : monthlyData;

  // Normaliza los datos a un shape común consumible por recharts.
  // Memoizado: solo recalcula al cambiar período/rango.
  const chartRows = useMemo(
    () =>
      (currentData || []).map((d: any) => ({
        label: formatPeriodLabel(d),
        fluidity:
          (("avg_fluidity" in d ? d.avg_fluidity : d.avg_fluidity_percentage) ||
            0) as number,
        speed: (d.avg_speed || 0) as number,
        incidents: (d.total_incidents || 0) as number,
        jams: (d.total_jams || 0) as number,
      })),
    [currentData],
  );

  const latestStats = dailyData?.[0];
  const previousStats = dailyData?.[1];

  const calculateChange = (current?: number, previous?: number) => {
    if (!current || !previous) return null;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-veltrix-text">
            Estadísticas
          </h1>
          <p className="text-gray-500 dark:text-veltrix-muted mt-1">
            Análisis de tendencias y métricas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-4 py-2 border border-gray-300 dark:border-veltrix-border bg-white dark:bg-veltrix-card text-gray-900 dark:text-veltrix-text rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-all"
          >
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange({ ...dateRange, from: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 dark:border-veltrix-border bg-white dark:bg-veltrix-card text-gray-900 dark:text-veltrix-text rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-veltrix-border bg-white dark:bg-veltrix-card text-gray-900 dark:text-veltrix-text rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white dark:bg-veltrix-card p-1 rounded-lg border border-gray-200 dark:border-veltrix-border w-fit">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "live"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 dark:text-veltrix-muted hover:bg-gray-100 dark:hover:bg-veltrix-bg"
          }`}
        >
          <Activity className="w-4 h-4" />
          Operativo en Vivo
        </button>
        <button
          onClick={() => setActiveTab("historical")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "historical"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 dark:text-veltrix-muted hover:bg-gray-100 dark:hover:bg-veltrix-bg"
          }`}
        >
          <History className="w-4 h-4" />
          Histórico
        </button>
      </div>

      {activeTab === "live" ? (
        <div className="animate-in fade-in zoom-in-95 duration-200">
          <OperationalAnalyticsDashboard />
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          {/* KPIs del último día */}
          {latestStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-veltrix-card rounded-lg shadow-sm p-4 border border-gray-100 dark:border-veltrix-border transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-veltrix-muted">
                    Fluidez Promedio
                  </span>
                  {calculateChange(
                    latestStats.avg_fluidity_percentage,
                    previousStats?.avg_fluidity_percentage,
                  ) !== null && (
                    <div
                      className={`flex items-center text-xs ${
                        calculateChange(
                          latestStats.avg_fluidity_percentage,
                          previousStats?.avg_fluidity_percentage,
                        )! > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {calculateChange(
                        latestStats.avg_fluidity_percentage,
                        previousStats?.avg_fluidity_percentage,
                      )! > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {Math.abs(
                        calculateChange(
                          latestStats.avg_fluidity_percentage,
                          previousStats?.avg_fluidity_percentage,
                        )!,
                      ).toFixed(1)}
                      %
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {latestStats.avg_fluidity_percentage?.toFixed(1)}%
                </div>
              </div>

              <div className="bg-white dark:bg-veltrix-card rounded-lg shadow-sm p-4 border border-gray-100 dark:border-veltrix-border transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-veltrix-muted">
                    Velocidad Promedio
                  </span>
                  {calculateChange(
                    latestStats.avg_speed,
                    previousStats?.avg_speed,
                  ) !== null && (
                    <div
                      className={`flex items-center text-xs ${
                        calculateChange(
                          latestStats.avg_speed,
                          previousStats?.avg_speed,
                        )! > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {calculateChange(
                        latestStats.avg_speed,
                        previousStats?.avg_speed,
                      )! > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {Math.abs(
                        calculateChange(
                          latestStats.avg_speed,
                          previousStats?.avg_speed,
                        )!,
                      ).toFixed(1)}
                      %
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {latestStats.avg_speed?.toFixed(0)} km/h
                </div>
              </div>

              <div className="bg-white dark:bg-veltrix-card rounded-lg shadow-sm p-4 border border-gray-100 dark:border-veltrix-border transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-veltrix-muted">
                    Total Incidentes
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {latestStats.total_incidents}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {latestStats.critical_incidents} críticos
                </div>
              </div>

              <div className="bg-white dark:bg-veltrix-card rounded-lg shadow-sm p-4 border border-gray-100 dark:border-veltrix-border transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-veltrix-muted">
                    Total Congestiones
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {latestStats.total_jams}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {latestStats.avg_jam_duration_minutes?.toFixed(0)} min
                  promedio
                </div>
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-veltrix-card rounded-lg shadow-sm p-4 border border-gray-100 dark:border-veltrix-border transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tendencia de Fluidez
                </h2>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartRows}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="fluidity"
                      name="Fluidez (%)"
                      stroke="rgb(59, 130, 246)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-veltrix-card rounded-lg shadow-sm p-4 border border-gray-100 dark:border-veltrix-border transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Velocidad Promedio
                </h2>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartRows}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="speed"
                      name="Velocidad Promedio (km/h)"
                      stroke="rgb(16, 185, 129)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-veltrix-card rounded-lg shadow-sm p-4 border border-gray-100 dark:border-veltrix-border transition-colors lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-red-600 dark:text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Incidentes y Congestiones
                </h2>
              </div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartRows}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="incidents"
                      name="Total Incidentes"
                      fill="rgba(239, 68, 68, 0.8)"
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="jams"
                      name="Total Congestiones"
                      fill="rgba(251, 146, 60, 0.8)"
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

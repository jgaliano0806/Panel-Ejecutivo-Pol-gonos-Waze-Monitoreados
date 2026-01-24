import React from "react";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Users,
} from "lucide-react";
import { BlockingAnalysisItem, WazeTVTMetric } from "../../hooks/useWazeData";

interface EventsKPIsProps {
  analyses: BlockingAnalysisItem[];
  tvtMetrics?: WazeTVTMetric[];
}

export const EventsKPIs: React.FC<EventsKPIsProps> = ({
  analyses,
  tvtMetrics,
}) => {
  const totalActive = analyses.length;
  const criticalCount = analyses.filter((a) => a.impactScore >= 50).length;

  const totalDelayMinutes = analyses.reduce(
    (sum, a) => sum + (a.delay.totalDelayMinutes || 0),
    0,
  );

  const avgImpact =
    totalActive > 0
      ? (
          analyses.reduce((sum, a) => sum + a.impactScore, 0) / totalActive
        ).toFixed(1)
      : "0.0";

  // Calcular total de Wazers si hay métricas TVT (Traffic View Tool)
  const totalWazers =
    tvtMetrics?.reduce((sum, m) => sum + (m.wazersCount || 0), 0) || 0;

  const cards = [
    {
      title: "Incidentes Activos",
      value: totalActive,
      icon: <Activity className="w-5 h-5 text-blue-500" />,
      bg: "bg-blue-50 dark:bg-blue-900/10",
      border: "border-blue-200 dark:border-blue-800",
      trend: "Feed Waze Real",
    },
    {
      title: "Usuarios Waze (TVT)",
      value: totalWazers,
      icon: <Users className="w-5 h-5 text-indigo-500" />,
      bg: "bg-indigo-50 dark:bg-indigo-900/10",
      border: "border-indigo-200 dark:border-indigo-800",
      trend: tvtMetrics?.length ? "En rutas monitoreadas" : "Sin datos TVT",
    },
    {
      title: "Demora Acumulada",
      value: `${Math.round(totalDelayMinutes)} min`,
      icon: <Clock className="w-5 h-5 text-orange-500" />,
      bg: "bg-orange-50 dark:bg-orange-900/10",
      border: "border-orange-200 dark:border-orange-800",
      trend: "Estimado por Jams",
    },
    {
      title: "Impacto Promedio",
      value: avgImpact,
      icon: <TrendingUp className="w-5 h-5 text-purple-500" />,
      bg: "bg-purple-50 dark:bg-purple-900/10",
      border: "border-purple-200 dark:border-purple-800",
      trend: "Escala 0-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`p-4 rounded-xl border ${card.border} ${card.bg} backdrop-blur-sm transition-all hover:shadow-lg`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">
              {card.title}
            </span>
            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
              {card.icon}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {card.value}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {card.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

import React from "react";
import type { Polygon, Incident } from "../types";
import { Card } from "./ui/card";

interface TopCriticalDashboardProps {
  polygons: Polygon[];
  incidents?: Incident[];
  limit?: number;
  onPolygonClick?: (polygonId: string) => void;
}

export const TopCriticalDashboard: React.FC<TopCriticalDashboardProps> = ({
  polygons,
  incidents = [],
  limit = 10,
  onPolygonClick,
}) => {
  const criticalPolygons = polygons
    .filter((p) => p.trafficMetrics && p.trafficMetrics.totalJams > 0)
    .sort(
      (a, b) =>
        (b.trafficMetrics?.congestionIndex || 0) -
        (a.trafficMetrics?.congestionIndex || 0)
    )
    .slice(0, limit);

  if (criticalPolygons.length === 0) {
    return (
      <Card className="bg-white dark:bg-veltrix-card border dark:border-veltrix-border shadow-lg lg:col-span-1 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-veltrix-text mb-3">
          🏆 Top Polígonos Críticos
        </h2>
        <div className="text-center py-8 text-gray-400 dark:text-veltrix-muted">
          <p className="text-sm">No hay polígonos críticos en este momento</p>
          <p className="text-xs mt-2">✅ Todos los polígonos están fluidos</p>
        </div>
      </Card>
    );
  }

  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return (
      <span className="text-gray-500 dark:text-gray-400 font-mono">
        #{index + 1}
      </span>
    );
  };

  const getCongestionColor = (index: number) => {
    if (index >= 80) return "bg-red-600 text-white";
    if (index >= 60) return "bg-orange-500 text-white";
    if (index >= 40) return "bg-yellow-500 text-white";
    return "bg-green-500 text-white";
  };

  return (
    <Card className="bg-white dark:bg-veltrix-card border dark:border-veltrix-border shadow-lg p-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-veltrix-text">
            🏆 Top {limit} Polígonos Críticos
          </h2>
          <div className="text-xs text-gray-500 dark:text-veltrix-muted mt-1">
            Ordenado por severidad de congestión
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600 dark:text-blue-400">
            {criticalPolygons.length}
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
            Críticos
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {criticalPolygons.map((polygon, index) => {
          const metrics = polygon.trafficMetrics!;
          const activeIncidents = incidents
            ? incidents.filter((i) => i.polygonId === polygon.id).length
            : 0;

          return (
            <div
              key={polygon.id}
              onClick={() => onPolygonClick?.(polygon.id)}
              className="group border border-gray-100 dark:border-veltrix-border rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-veltrix-bg/50 transition-all cursor-pointer bg-white dark:bg-veltrix-bg/20 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Ranking */}
                <div className="flex-shrink-0 text-xl font-bold w-8 text-center pt-1">
                  {getRankBadge(index)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-veltrix-text truncate group-hover:text-primary-600 dark:group-hover:text-blue-400 transition-colors">
                      {polygon.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-veltrix-bg text-gray-600 dark:text-gray-400 border dark:border-veltrix-border">
                      {polygon.group}
                    </span>
                  </div>

                  {/* Métricas Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-2 text-center transition-colors">
                      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                        Jams
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {metrics.totalJams}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-2 text-center transition-colors">
                      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                        Eventos
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {activeIncidents}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-2 text-center transition-colors">
                      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                        Vel.
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {metrics.avgSpeed || 0}{" "}
                        <span className="text-[9px] font-normal opacity-70">
                          km/h
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-2 text-center transition-colors">
                      <div className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                        Índice
                      </div>
                      <div
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${getCongestionColor(
                          metrics.congestionIndex
                        )}`}
                      >
                        {metrics.congestionIndex}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

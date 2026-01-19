import React, { useMemo } from "react";
import type { Polygon, PolygonTrafficMetrics } from "../types";
import { Card } from "./ui/card";

interface PolygonWithMetrics extends Polygon {
  trafficMetrics?: PolygonTrafficMetrics;
}

interface GroupTrafficComparisonProps {
  polygons: PolygonWithMetrics[];
  groups: string[];
}

interface GroupAnalysis {
  groupName: string;
  avgSpeedGroup: number | null;
  totalJamsGroup: number;
  worstPolygon: PolygonWithMetrics | null;
  bestPolygon: PolygonWithMetrics | null;
  polygonsWithData: number;
  totalPolygons: number;
  avgCongestionIndex: number;
}

export const GroupTrafficComparison: React.FC<GroupTrafficComparisonProps> = ({
  polygons,
  groups,
}) => {
  const groupAnalysis = useMemo(() => {
    const analysis: GroupAnalysis[] = [];

    for (const groupName of groups) {
      const groupPolygons = polygons.filter((p) => p.group === groupName);
      const polygonsWithData = groupPolygons.filter(
        (p) =>
          p.trafficMetrics &&
          (p.trafficMetrics.totalJams > 0 ||
            (p.trafficMetrics.totalAlerts || 0) > 0)
      );

      if (polygonsWithData.length === 0) {
        analysis.push({
          groupName,
          avgSpeedGroup: null,
          totalJamsGroup: 0,
          worstPolygon: null,
          bestPolygon: null,
          polygonsWithData: 0,
          totalPolygons: groupPolygons.length,
          avgCongestionIndex: 0,
        });
        continue;
      }

      const totalSpeed = polygonsWithData.reduce(
        (sum, p) => sum + (p.trafficMetrics?.avgSpeed || 0),
        0
      );
      const avgSpeedGroup = totalSpeed / polygonsWithData.length;

      const totalJamsGroup = polygonsWithData.reduce(
        (sum, p) => sum + (p.trafficMetrics?.totalJams || 0),
        0
      );

      const totalCongestion = polygonsWithData.reduce(
        (sum, p) => sum + (p.trafficMetrics?.congestionIndex || 0),
        0
      );
      const avgCongestionIndex = totalCongestion / polygonsWithData.length;

      const sortedByCongestion = [...polygonsWithData].sort(
        (a, b) =>
          (b.trafficMetrics?.congestionIndex || 0) -
          (a.trafficMetrics?.congestionIndex || 0)
      );

      analysis.push({
        groupName,
        avgSpeedGroup: Math.round(avgSpeedGroup * 10) / 10,
        totalJamsGroup,
        worstPolygon: sortedByCongestion[0],
        bestPolygon: sortedByCongestion[sortedByCongestion.length - 1],
        polygonsWithData: polygonsWithData.length,
        totalPolygons: groupPolygons.length,
        avgCongestionIndex: Math.round(avgCongestionIndex),
      });
    }

    return analysis.sort((a, b) => b.avgCongestionIndex - a.avgCongestionIndex);
  }, [polygons, groups]);

  const getCongestionColor = (index: number) => {
    if (index <= 30)
      return "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-600/50 text-green-800 dark:text-green-400";
    if (index <= 60)
      return "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600/50 text-yellow-800 dark:text-yellow-400";
    return "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-600/50 text-red-800 dark:text-red-400";
  };

  const getCongestionIcon = (index: number) => {
    if (index <= 30) return "🟢";
    if (index <= 60) return "🟡";
    return "🔴";
  };

  return (
    <Card className="bg-white dark:bg-veltrix-card border dark:border-veltrix-border shadow-lg p-6 transition-colors duration-300 mt-0">
      <h2 className="text-lg font-bold text-gray-900 dark:text-veltrix-text mb-4">
        🛣️ Estado por Grupo de Rutas
      </h2>

      <div className="space-y-4">
        {groupAnalysis.map((group) => {
          const hasData = group.polygonsWithData > 0;

          return (
            <div
              key={group.groupName}
              className={`border-2 rounded-xl p-4 transition-all ${
                hasData
                  ? getCongestionColor(group.avgCongestionIndex)
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
              }`}
            >
              {/* Header del grupo */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {hasData && (
                      <span>{getCongestionIcon(group.avgCongestionIndex)}</span>
                    )}
                    <span>{group.groupName}</span>
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {group.polygonsWithData} de {group.totalPolygons} polígonos
                    con datos
                  </p>
                </div>

                {hasData && (
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                      {group.avgCongestionIndex}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 opacity-80">
                      Índice Cong.
                    </div>
                  </div>
                )}
              </div>

              {hasData ? (
                <>
                  {/* Métricas del grupo */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/50 dark:bg-white/5 rounded-lg p-3 backdrop-blur-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Vel. Promedio
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {group.avgSpeedGroup} km/h
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-white/5 rounded-lg p-3 backdrop-blur-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                        Total Atascos
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {group.totalJamsGroup}
                      </p>
                    </div>
                  </div>

                  {/* Peor y mejor polígono */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-3">
                      <p className="font-semibold text-red-800 dark:text-red-300 mb-1 flex items-center gap-1">
                        🔻 Mayor Congestión
                      </p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium truncate">
                        {group.worstPolygon?.name}
                      </p>
                      <p className="text-red-700 dark:text-red-400 font-bold mt-1">
                        {group.worstPolygon?.trafficMetrics?.avgSpeed} km/h
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg p-3">
                      <p className="font-semibold text-green-800 dark:text-green-300 mb-1 flex items-center gap-1">
                        🔺 Mejor Estado
                      </p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium truncate">
                        {group.bestPolygon?.name}
                      </p>
                      <p className="text-green-700 dark:text-green-400 font-bold mt-1">
                        {group.bestPolygon?.trafficMetrics?.avgSpeed} km/h
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Sin datos de tráfico recientes
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumen global */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-veltrix-border">
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <div>
            <p className="text-gray-600 dark:text-veltrix-muted mb-1">
              Total Atascos (Red)
            </p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {groupAnalysis.reduce((sum, g) => sum + g.totalJamsGroup, 0)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                en {groups.length} grupos
              </span>
            </div>
          </div>
          <div>
            <p className="text-gray-600 dark:text-veltrix-muted mb-1">
              Velocidad Global (Red)
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(
                groupAnalysis
                  .filter((g) => g.avgSpeedGroup !== null)
                  .reduce((sum, g) => sum + (g.avgSpeedGroup || 0), 0) /
                  (groupAnalysis.filter((g) => g.avgSpeedGroup !== null)
                    .length || 1)
              )}{" "}
              km/h
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

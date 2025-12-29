import React, { useMemo } from 'react';
import type { Polygon, PolygonTrafficMetrics } from '../types';

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
        (p) => p.trafficMetrics && p.trafficMetrics.totalJams > 0
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

      // Calcular velocidad promedio del grupo
      const totalSpeed = polygonsWithData.reduce(
        (sum, p) => sum + (p.trafficMetrics?.avgSpeed || 0),
        0
      );
      const avgSpeedGroup = totalSpeed / polygonsWithData.length;

      // Total de jams del grupo
      const totalJamsGroup = polygonsWithData.reduce(
        (sum, p) => sum + (p.trafficMetrics?.totalJams || 0),
        0
      );

      // Índice de congestión promedio
      const totalCongestion = polygonsWithData.reduce(
        (sum, p) => sum + (p.trafficMetrics?.congestionIndex || 0),
        0
      );
      const avgCongestionIndex = totalCongestion / polygonsWithData.length;

      // Peor y mejor polígono
      const sortedByCongestion = [...polygonsWithData].sort(
        (a, b) =>
          (b.trafficMetrics?.congestionIndex || 0) - (a.trafficMetrics?.congestionIndex || 0)
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

    // Ordenar por congestión descendente
    return analysis.sort((a, b) => b.avgCongestionIndex - a.avgCongestionIndex);
  }, [polygons, groups]);

  const getCongestionColor = (index: number) => {
    if (index <= 30) return 'bg-green-100 border-green-300 text-green-800';
    if (index <= 60) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-red-100 border-red-300 text-red-800';
  };

  const getCongestionIcon = (index: number) => {
    if (index <= 30) return '🟢';
    if (index <= 60) return '🟡';
    return '🔴';
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        🛣️ Estado por Grupo de Rutas
      </h2>

      <div className="space-y-3">
        {groupAnalysis.map((group) => {
          const hasData = group.polygonsWithData > 0;

          return (
            <div
              key={group.groupName}
              className={`border-2 rounded-lg p-4 transition-all ${
                hasData ? getCongestionColor(group.avgCongestionIndex) : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* Header del grupo */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    {hasData && <span>{getCongestionIcon(group.avgCongestionIndex)}</span>}
                    <span>{group.groupName}</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {group.polygonsWithData} de {group.totalPolygons} polígonos con datos
                  </p>
                </div>

                {hasData && (
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900">
                      {group.avgCongestionIndex}
                    </div>
                    <div className="text-xs text-gray-600">Índice Cong.</div>
                  </div>
                )}
              </div>

              {hasData ? (
                <>
                  {/* Métricas del grupo */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/50 rounded p-2">
                      <p className="text-xs text-gray-600">Vel. Promedio</p>
                      <p className="text-lg font-bold text-gray-900">{group.avgSpeedGroup} km/h</p>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <p className="text-xs text-gray-600">Total Atascos</p>
                      <p className="text-lg font-bold text-gray-900">{group.totalJamsGroup}</p>
                    </div>
                  </div>

                  {/* Peor y mejor polígono */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="font-semibold text-red-800 mb-1">🔻 Mayor Congestión</p>
                      <p className="text-gray-900 font-medium truncate">
                        {group.worstPolygon?.name}
                      </p>
                      <p className="text-red-700 font-bold">
                        {group.worstPolygon?.trafficMetrics?.avgSpeed} km/h
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-semibold text-green-800 mb-1">🔺 Mejor Estado</p>
                      <p className="text-gray-900 font-medium truncate">
                        {group.bestPolygon?.name}
                      </p>
                      <p className="text-green-700 font-bold">
                        {group.bestPolygon?.trafficMetrics?.avgSpeed} km/h
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">Sin datos de tráfico</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resumen global */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <div>
            <p className="text-gray-600 mb-1">Puntos de Congestión</p>
            <p className="text-lg font-bold text-gray-900">
              {groupAnalysis.reduce((sum, g) => sum + g.totalJamsGroup, 0)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Velocidad General</p>
            <p className="text-lg font-bold text-gray-900">
              {Math.round(
                groupAnalysis
                  .filter((g) => g.avgSpeedGroup !== null)
                  .reduce((sum, g) => sum + (g.avgSpeedGroup || 0), 0) /
                  groupAnalysis.filter((g) => g.avgSpeedGroup !== null).length
              )}{' '}
              km/h
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


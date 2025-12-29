import React, { useMemo, useState } from 'react';
import type { Polygon, PolygonTrafficMetrics } from '../types';

interface PolygonWithMetrics extends Polygon {
  trafficMetrics?: PolygonTrafficMetrics;
}

interface SpeedHeatmapProps {
  polygons: PolygonWithMetrics[];
  onPolygonClick?: (polygonId: string) => void;
}

type FilterMode = 'all' | 'critical' | 'withData';

export const SpeedHeatmap: React.FC<SpeedHeatmapProps> = ({ polygons, onPolygonClick }) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const filteredAndSortedPolygons = useMemo(() => {
    let filtered = [...polygons];

    // Aplicar filtro
    switch (filterMode) {
      case 'critical':
        filtered = filtered.filter(p => p.trafficMetrics && p.trafficMetrics.congestionIndex >= 60);
        break;
      case 'withData':
        filtered = filtered.filter(p => p.trafficMetrics && p.trafficMetrics.totalJams > 0);
        break;
      // 'all' no necesita filtrado adicional
    }

    // Ordenar por índice de congestión descendente
    return filtered.sort((a, b) => {
      const aIndex = a.trafficMetrics?.congestionIndex ?? -1;
      const bIndex = b.trafficMetrics?.congestionIndex ?? -1;
      return bIndex - aIndex;
    });
  }, [polygons, filterMode]);

  const getCongestionColor = (index: number | undefined) => {
    if (!index || index === 0) return 'bg-gray-50 text-gray-600';
    if (index <= 30) return 'bg-green-100 text-green-800';
    if (index <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSpeedColor = (speed: number | null | undefined) => {
    if (!speed) return 'text-gray-400';
    if (speed < 20) return 'text-red-600 font-bold';
    if (speed < 40) return 'text-yellow-600 font-semibold';
    return 'text-green-600 font-semibold';
  };

  const getStateEmoji = (congestionIndex: number | undefined) => {
    if (!congestionIndex || congestionIndex === 0) return '⚪';
    if (congestionIndex <= 30) return '🟢';
    if (congestionIndex <= 60) return '🟡';
    return '🔴';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          🌡️ Mapa de Calor - Velocidades
        </h2>

        {/* Filtros */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos ({polygons.length})
          </button>
          <button
            onClick={() => setFilterMode('critical')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              filterMode === 'critical'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Críticos
          </button>
          <button
            onClick={() => setFilterMode('withData')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              filterMode === 'withData'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Con Datos
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white border-b-2 border-gray-300 z-10">
            <tr>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Estado</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Polígono</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Vel. Prom.</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Índice Cong.</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Puntos Lentos</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Total Jams</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPolygons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No hay polígonos que coincidan con el filtro
                </td>
              </tr>
            ) : (
              filteredAndSortedPolygons.map((polygon) => {
                const metrics = polygon.trafficMetrics;
                const hasData = metrics && metrics.totalJams > 0;

                return (
                  <tr
                    key={polygon.id}
                    onClick={() => onPolygonClick?.(polygon.id)}
                    className={`border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer ${
                      hasData ? getCongestionColor(metrics.congestionIndex) : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-xl">
                      {getStateEmoji(metrics?.congestionIndex)}
                    </td>
                    <td className="py-2 px-3 font-medium">
                      <div>{polygon.name}</div>
                      <div className="text-xs text-gray-500">{polygon.group}</div>
                    </td>
                    <td className="text-center py-2 px-3">
                      {hasData ? (
                        <span className={getSpeedColor(metrics.avgSpeed)}>
                          {metrics.avgSpeed} km/h
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin datos</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-3">
                      {hasData ? (
                        <span
                          className={`inline-block px-2 py-1 rounded font-bold text-xs ${
                            metrics.congestionIndex <= 30
                              ? 'bg-green-200 text-green-900'
                              : metrics.congestionIndex <= 60
                              ? 'bg-yellow-200 text-yellow-900'
                              : 'bg-red-200 text-red-900'
                          }`}
                        >
                          {metrics.congestionIndex}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-3">
                      {hasData ? (
                        <span className="font-medium">
                          {metrics.slowPoints + metrics.stoppedPoints}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-3">
                      {hasData ? (
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold text-xs">
                          {metrics.totalJams}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span>Fluido (0-30)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span>Moderado (30-60)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span>Crítico (60-100)</span>
          </div>
        </div>
      </div>
    </div>
  );
};


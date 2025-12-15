import React from 'react';
import type { Polygon, Incident } from '../types';

// Eliminada interfaz local conflictiva, usamos la global ya enriquecida

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
  // Filtrar y ordenar polígonos por índice de congestión
  const criticalPolygons = polygons
    .filter(p => p.trafficMetrics && p.trafficMetrics.totalJams > 0)
    .sort((a, b) =>
      (b.trafficMetrics?.congestionIndex || 0) - (a.trafficMetrics?.congestionIndex || 0)
    )
    .slice(0, limit);

  if (criticalPolygons.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          🏆 Top Polígonos Críticos
        </h2>
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No hay polígonos críticos en este momento</p>
          <p className="text-xs mt-2">✅ Todos los polígonos están fluidos</p>
        </div>
      </div>
    );
  }

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getCongestionColor = (index: number) => {
    if (index >= 80) return 'bg-red-600 text-white';
    if (index >= 60) return 'bg-orange-500 text-white';
    if (index >= 40) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          🏆 Top {limit} Polígonos Críticos
        </h2>
        <div className="text-right">
          <div className="text-xs text-gray-600">
            De {polygons.length} totales
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5 italic">
            Ordenado por Índice de Congestión y Atascos
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {criticalPolygons.map((polygon, index) => {
          const metrics = polygon.trafficMetrics!;
          // Calcular incidentes activos para este polígono
          const activeIncidents = incidents ? incidents.filter(i => i.polygonId === polygon.id).length : 0;

          return (
            <div
              key={polygon.id}
              onClick={() => onPolygonClick?.(polygon.id)}
              className="border-2 border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-all cursor-pointer hover:border-gray-400"
            >
              <div className="flex items-start gap-3">
                {/* Ranking */}
                <div className="flex-shrink-0 text-2xl">
                  {getRankBadge(index)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{polygon.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{polygon.group}</p>

                  {/* Métricas Explícitas */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div className="bg-gray-50 rounded px-2 py-1 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Atascos</div>
                      <div className="text-sm font-bold text-gray-900">
                        {metrics.totalJams}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded px-2 py-1 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Eventos</div>
                      <div className="text-sm font-bold text-gray-900">
                        {activeIncidents}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded px-2 py-1 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Velocidad</div>
                      <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        {metrics.avgSpeed || 0} km/h
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded px-2 py-1 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Índice</div>
                      <div className={`text-sm font-bold px-2 py-0.5 rounded-full ${getCongestionColor(metrics.congestionIndex)}`}>
                        {metrics.congestionIndex}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge de Estado */}
                <div className="flex-shrink-0 self-center">
                  {/* Badge simplificado o eliminado si ya mostramos índice explícito. Lo mantengo como resumen visual rápido */}
                  <div className={`w-3 h-3 rounded-full ${getCongestionColor(metrics.congestionIndex)}`} title="Estado Crítico"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


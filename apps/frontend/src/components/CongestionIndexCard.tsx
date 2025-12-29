import React from 'react';
import type { PolygonTrafficMetrics } from '../types';

interface CongestionIndexCardProps {
  polygonId: string;
  metrics: PolygonTrafficMetrics | null;
}

export const CongestionIndexCard: React.FC<CongestionIndexCardProps> = ({ polygonId: _polygonId, metrics }) => {
  // Sin datos
  if (!metrics || metrics.totalJams === 0) {
    return (
      <div className="card">
        <h2 className="text-sm font-medium text-gray-600 mb-3">Índice de Congestión</h2>
        <div className="flex items-center justify-center h-40">
          <p className="text-gray-400 text-sm">Sin datos de tráfico</p>
        </div>
      </div>
    );
  }

  const getColor = () => {
    if (metrics.congestionIndex <= 30) return 'text-green-600 bg-green-50 border-green-300';
    if (metrics.congestionIndex <= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    return 'text-red-600 bg-red-50 border-red-300';
  };

  const getBarColor = (value: number, total: number) => {
    if (total === 0) return 'bg-gray-200';
    const percentage = (value / total) * 100;
    if (percentage >= 50) return 'bg-red-500';
    if (percentage >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const totalPoints = metrics.slowPoints + metrics.moderatePoints + metrics.fastPoints + metrics.stoppedPoints;

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-gray-600 mb-3">Índice de Congestión</h2>

      <div className="flex items-center gap-6 mb-4">
        {/* Gauge circular */}
        <div className="flex-shrink-0">
          <div className={`w-28 h-28 rounded-full border-4 ${getColor()} flex items-center justify-center`}>
            <div className="text-center">
              <div className="text-3xl font-black">{metrics.congestionIndex}</div>
              <div className="text-xs font-medium">/ 100</div>
            </div>
          </div>
        </div>

        {/* Velocidad promedio */}
        <div className="flex-1">
          <div className="mb-2">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.avgSpeed} <span className="text-sm font-normal text-gray-600">km/h</span>
            </div>
            <div className="text-xs text-gray-500">Velocidad promedio</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Mín:</span>{' '}
              <span className="font-semibold">{metrics.minSpeed} km/h</span>
            </div>
            <div>
              <span className="text-gray-600">Máx:</span>{' '}
              <span className="font-semibold">{metrics.maxSpeed} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución de puntos */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-700 mb-2">
          Distribución de velocidades ({metrics.totalJams} puntos)
        </div>

        {/* Detenido */}
        {metrics.stoppedPoints > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">🔴 Detenido (&lt;10 km/h)</span>
              <span className="font-medium">{metrics.stoppedPoints}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={getBarColor(metrics.stoppedPoints, totalPoints)}
                style={{ width: `${(metrics.stoppedPoints / totalPoints) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Lento */}
        {metrics.slowPoints > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">🟠 Lento (10-20 km/h)</span>
              <span className="font-medium">{metrics.slowPoints}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={getBarColor(metrics.slowPoints, totalPoints)}
                style={{ width: `${(metrics.slowPoints / totalPoints) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Moderado */}
        {metrics.moderatePoints > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">🟡 Moderado (20-40 km/h)</span>
              <span className="font-medium">{metrics.moderatePoints}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={getBarColor(metrics.moderatePoints, totalPoints)}
                style={{ width: `${(metrics.moderatePoints / totalPoints) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Rápido */}
        {metrics.fastPoints > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">🟢 Rápido (&gt;40 km/h)</span>
              <span className="font-medium">{metrics.fastPoints}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500"
                style={{ width: `${(metrics.fastPoints / totalPoints) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


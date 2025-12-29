import React from 'react';
import type { AllTrends } from '../types';

interface TrendIndicatorsProps {
  trends: AllTrends | undefined;
}

export const TrendIndicators: React.FC<TrendIndicatorsProps> = ({ trends }) => {
  if (!trends) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Tendencias</h3>
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    );
  }

  const indicators = [
    {
      label: 'Atascos',
      current: trends.totalJams.current,
      trend: trends.totalJams.trend,
      percentChange: trends.totalJams.percentChange,
      icon: '🚦',
      inversed: true, // Para atascos, menos es mejor
    },
    {
      label: 'Velocidad',
      current: trends.avgSpeed.current,
      trend: trends.avgSpeed.trend,
      percentChange: trends.avgSpeed.percentChange,
      icon: '⚡',
      unit: 'km/h',
      inversed: false, // Para velocidad, más es mejor
    },
    {
      label: 'Km Críticos',
      current: trends.criticalKm.current,
      trend: trends.criticalKm.trend,
      percentChange: trends.criticalKm.percentChange,
      icon: '🚨',
      unit: 'km',
      inversed: true,
    },
    {
      label: 'Demora',
      current: trends.avgDelay.current,
      trend: trends.avgDelay.trend,
      percentChange: trends.avgDelay.percentChange,
      icon: '⏱️',
      unit: 's',
      inversed: true,
    },
  ];

  const getTrendConfig = (trend: string, inversed: boolean) => {
    const actualTrend = inversed 
      ? (trend === 'improving' ? 'worsening' : trend === 'worsening' ? 'improving' : trend)
      : trend;

    switch (actualTrend) {
      case 'improving':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: '📈',
          label: 'Mejorando',
        };
      case 'worsening':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          icon: '📉',
          label: 'Empeorando',
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: '━',
          label: 'Estable',
        };
    }
  };

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Tendencias (última hora)</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {indicators.map((indicator) => {
          const trendConfig = getTrendConfig(indicator.trend, indicator.inversed);

          return (
            <div
              key={indicator.label}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{indicator.icon}</span>
                <span className="text-xs font-medium text-gray-600">{indicator.label}</span>
              </div>

              <div className="mb-2">
                <div className="text-xl font-black text-gray-900">
                  {indicator.current}
                  {indicator.unit && (
                    <span className="text-sm font-normal text-gray-600 ml-1">
                      {indicator.unit}
                    </span>
                  )}
                </div>
              </div>

              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${trendConfig.bg} ${trendConfig.color}`}>
                <span>{trendConfig.icon}</span>
                <span>{Math.abs(indicator.percentChange).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


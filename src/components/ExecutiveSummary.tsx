import React from 'react';
import type { GlobalKPIs, AlertStats } from '../types';

interface ExecutiveSummaryProps {
  kpis: GlobalKPIs;
  alertStats?: AlertStats;
  totalPolygons: number;
  criticalPolygons: number;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  kpis,
  alertStats,
  totalPolygons,
  criticalPolygons,
}) => {
  const metrics = [
    {
      label: 'Fluidez del Sistema',
      value: `${kpis.fluidityPercentage}%`,
      subtext: `${totalPolygons - criticalPolygons}/${totalPolygons} polígonos fluidos`,
      icon: '🎯',
      color: kpis.fluidityPercentage >= 70 ? 'green' : kpis.fluidityPercentage >= 50 ? 'yellow' : 'red',
    },
    {
      label: 'Alertas Activas',
      value: alertStats?.active || 0,
      subtext: alertStats?.bySeverity.critical 
        ? `${alertStats.bySeverity.critical} críticas`
        : 'Sin críticas',
      icon: '🚨',
      color: (alertStats?.bySeverity.critical || 0) > 0 ? 'red' : 'green',
    },
    {
      label: 'Incidentes Activos',
      value: kpis.activeIncidents,
      subtext: `${kpis.activeConstructions} obras activas`,
      icon: '⚠️',
      color: kpis.activeIncidents > 50 ? 'red' : kpis.activeIncidents > 20 ? 'yellow' : 'green',
    },
    {
      label: 'Polígonos Críticos',
      value: criticalPolygons,
      subtext: `${((criticalPolygons / totalPolygons) * 100).toFixed(0)}% del total`,
      icon: '🚦',
      color: criticalPolygons > 10 ? 'red' : criticalPolygons > 5 ? 'yellow' : 'green',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 border-green-300 text-green-900';
      case 'yellow':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'red':
        return 'bg-red-100 border-red-300 text-red-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">📋 Resumen Ejecutivo</h2>
        <div className="text-xs text-gray-600">
          Actualizado: {new Date().toLocaleTimeString('es-AR')}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`border-2 rounded-lg p-3 ${getColorClasses(metric.color)}`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">{metric.icon}</div>
              <div className="text-2xl font-black mb-1">{metric.value}</div>
              <div className="text-xs font-semibold mb-1">{metric.label}</div>
              <div className="text-xs opacity-80">{metric.subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores adicionales */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-600 mb-1">Tendencia Fluidez</div>
          <div className={`text-sm font-bold ${
            kpis.trends?.fluidityChange && kpis.trends.fluidityChange > 0 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {kpis.trends?.fluidityChange !== undefined && kpis.trends.fluidityChange > 0 ? '▲' : '▼'} {Math.abs(kpis.trends?.fluidityChange || 0)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Tendencia Incidentes</div>
          <div className={`text-sm font-bold ${
            kpis.trends?.incidentsChange && kpis.trends.incidentsChange < 0 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {kpis.trends?.incidentsChange !== undefined && kpis.trends.incidentsChange > 0 ? '▲' : '▼'} {Math.abs(kpis.trends?.incidentsChange || 0)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Estado General</div>
          <div className="text-sm font-bold">
            {kpis.fluidityPercentage >= 70 ? '✅ Óptimo' : 
             kpis.fluidityPercentage >= 50 ? '⚠️ Moderado' : '🚨 Crítico'}
          </div>
        </div>
      </div>
    </div>
  );
};


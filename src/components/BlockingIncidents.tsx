import React from 'react';
import { useBlockingAnalysis, type BlockingAnalysisItem } from '../hooks/useWazeData';
import { getIncidentDescription, getIncidentEmoji, getMainTypeTranslation } from '../utils/wazeTranslations';

/**
 * Componente de Incidentes Bloqueantes con Cálculo Mejorado de Demoras
 *
 * Usa el nuevo servicio de backend que calcula demoras mediante:
 * 1. Proximidad geográfica (jams cercanos al incidente)
 * 2. Estimación de desvío (para cortes de ruta)
 * 3. Comparación histórica (flujo actual vs histórico)
 */
export const BlockingIncidents: React.FC = () => {
  const { data, isLoading, isError } = useBlockingAnalysis();

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          🚨 Incidentes con Mayor Impacto
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Analizando incidentes...</span>
        </div>
      </div>
    );
  }

  if (isError || !data || data.analyses.length === 0) {
    return null;
  }

  const getImpactLevelStyle = (impactScore: number) => {
    if (impactScore >= 50) return { bg: 'bg-red-100', text: 'text-red-800', label: 'CRÍTICO' };
    if (impactScore >= 25) return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'ALTO' };
    if (impactScore >= 10) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'MODERADO' };
    return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'BAJO' };
  };

  const getConfidenceStyle = (confidence: number) => {
    if (confidence >= 70) return 'text-green-600';
    if (confidence >= 40) return 'text-yellow-600';
    return 'text-red-500';
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'linked': return '🔗 Vinculado';
      case 'proximity': return '📍 Proximidad';
      case 'detour': return '🔄 Desvío';
      case 'historical': return '📊 Histórico';
      default: return method;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🚨 Incidentes con Mayor Impacto
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            Cálculo Mejorado
          </span>
        </h2>
        <div className="text-xs text-gray-500">
          <span className="font-medium">{data.summary.totalDelayMinutes}</span> min demora total estimada
        </div>
      </div>

      <div className="space-y-3">
        {data.analyses.slice(0, 5).map((analysis: BlockingAnalysisItem) => {
          const emoji = getIncidentEmoji(analysis.incident.type, analysis.incident.subtype);
          const description = getIncidentDescription(
            analysis.incident.type,
            analysis.incident.subtype
          );
          const translatedType = getMainTypeTranslation(analysis.incident.type);
          const impactStyle = getImpactLevelStyle(analysis.impactScore);

          return (
            <div
              key={analysis.incident.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors hover:shadow-md"
            >
              {/* Header del incidente */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <span className="text-xl">{emoji}</span>
                    <span>{description}</span>
                  </h3>
                  {analysis.incident.street && (
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <span>📍</span>
                      {analysis.incident.street}
                      {analysis.incident.city && `, ${analysis.incident.city}`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${impactStyle.bg} ${impactStyle.text}`}>
                    {impactStyle.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    Score: {analysis.impactScore}
                  </span>
                </div>
              </div>

              {/* Grid de métricas principales */}
              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2 border border-red-200">
                  <p className="text-gray-600 font-medium">Demora Total</p>
                  <p className="font-black text-red-700 text-lg">
                    {analysis.delay.totalDelayMinutes} min
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 border border-blue-200">
                  <p className="text-gray-600 font-medium">Jams Afectados</p>
                  <p className="font-black text-blue-700 text-lg">
                    {analysis.linkedJams + analysis.delay.consideredJams.nearby}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 border border-purple-200">
                  <p className="text-gray-600 font-medium">Tramo</p>
                  <p className="font-black text-purple-700 text-lg">
                    {analysis.affectedLengthKm} km
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 border border-green-200">
                  <p className="text-gray-600 font-medium">Confianza</p>
                  <p className={`font-black text-lg ${getConfidenceStyle(analysis.delay.confidence)}`}>
                    {analysis.delay.confidence}%
                  </p>
                </div>
              </div>

              {/* Desglose del cálculo de demora */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    📊 Desglose del Cálculo
                    <span className="font-normal text-gray-500">
                      ({getMethodLabel(analysis.delay.primaryMethod)})
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-gray-500">Vinculados</p>
                    <p className="font-bold text-gray-800">
                      {Math.round(analysis.delay.breakdown.linkedJamsDelay / 60)} min
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Proximidad</p>
                    <p className="font-bold text-gray-800">
                      {Math.round(analysis.delay.breakdown.proximityDelay / 60)} min
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Desvío Est.</p>
                    <p className="font-bold text-gray-800">
                      {Math.round(analysis.delay.breakdown.detourDelay / 60)} min
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Δ Histórico</p>
                    <p className="font-bold text-gray-800">
                      {Math.round(analysis.delay.breakdown.historicalDelta / 60)} min
                    </p>
                  </div>
                </div>
                {analysis.delay.details && (
                  <p className="text-xs text-gray-500 mt-2 italic border-t border-gray-200 pt-2">
                    💡 {analysis.delay.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen al final */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">
              <strong className="text-gray-900">{data.count}</strong> incidentes analizados
            </span>
            <span className="text-gray-500">
              Confianza promedio: <strong className={getConfidenceStyle(data.summary.avgConfidence)}>
                {data.summary.avgConfidence}%
              </strong>
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Método: Proximidad + Desvío + Histórico
          </div>
        </div>
      </div>
    </div>
  );
};

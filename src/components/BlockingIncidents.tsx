import React, { useMemo } from 'react';
import type { Incident, TrafficJam } from '../types';
import { getIncidentDescription, getIncidentEmoji } from '../utils/wazeTranslations';

interface BlockingIncidentsProps {
  incidents: Incident[];
  jams: TrafficJam[];
}

interface BlockingAnalysis {
  incident: Incident;
  causedJams: TrafficJam[];
  totalLength: number;
  totalDelay: number;
  impactLevel: 'high' | 'medium' | 'low';
}

export const BlockingIncidents: React.FC<BlockingIncidentsProps> = ({ incidents, jams }) => {
  const blockingAnalysis = useMemo(() => {
    const analysis: BlockingAnalysis[] = [];
    
    for (const incident of incidents) {
      const causedJams = jams.filter(jam => jam.blockingAlertUuid === incident.id);
      
      if (causedJams.length === 0) continue;
      
      const totalLength = causedJams.reduce((sum, j) => sum + j.length, 0);
      const totalDelay = causedJams.reduce((sum, j) => sum + j.delay, 0);
      
      analysis.push({
        incident,
        causedJams,
        totalLength,
        totalDelay,
        impactLevel: totalLength > 1000 ? 'high' : totalLength > 500 ? 'medium' : 'low'
      });
    }
    
    return analysis.sort((a, b) => b.totalLength - a.totalLength).slice(0, 5);
  }, [incidents, jams]);

  if (blockingAnalysis.length === 0) return null;

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        🚨 Incidentes con Mayor Impacto
      </h2>
      <div className="space-y-3">
        {blockingAnalysis.map((analysis) => {
          const emoji = getIncidentEmoji(analysis.incident.type);
          const description = getIncidentDescription(
            analysis.incident.type,
            analysis.incident.subtype
          );
          
          return (
            <div
              key={analysis.incident.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <span>{emoji}</span>
                    <span>{description}</span>
                  </h3>
                  {analysis.incident.street && (
                    <p className="text-xs text-gray-600 mt-1">
                      📍 {analysis.incident.street}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    analysis.impactLevel === 'high'
                      ? 'bg-red-100 text-red-800'
                      : analysis.impactLevel === 'medium'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {analysis.impactLevel === 'high' ? 'CRÍTICO' : 
                   analysis.impactLevel === 'medium' ? 'MODERADO' : 'BAJO'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-600">Puntos Afectados</p>
                  <p className="font-bold text-gray-900">{analysis.causedJams.length}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-600">Tramo Afectado</p>
                  <p className="font-bold text-gray-900">
                    {(analysis.totalLength / 1000).toFixed(1)} km
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-600">Demora Estimada</p>
                  <p className="font-bold text-gray-900">
                    {Math.round(analysis.totalDelay / 60)} min
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
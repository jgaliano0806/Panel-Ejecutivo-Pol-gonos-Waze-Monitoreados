import React from 'react';
import type { Incident, TrafficAlert } from '../types';
import { getIncidentDescription, getIncidentEmoji } from '../utils/wazeTranslations';

interface EventsListModalProps {
  incidents: Incident[];
  alerts: TrafficAlert[];
  onClose: () => void;
  onEventClick: (event: Incident | TrafficAlert, type: 'incident' | 'alert') => void;
}

export const EventsListModal: React.FC<EventsListModalProps> = ({
  incidents,
  alerts,
  onClose,
  onEventClick,
}) => {
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-100 border-red-400 text-red-900';
    if (severity >= 3) return 'bg-orange-100 border-orange-400 text-orange-900';
    if (severity >= 2) return 'bg-yellow-100 border-yellow-400 text-yellow-900';
    return 'bg-blue-100 border-blue-400 text-blue-900';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity >= 4) return 'CRÍTICA';
    if (severity >= 3) return 'ALTA';
    if (severity >= 2) return 'MEDIA';
    return 'BAJA';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">📋 Eventos Activos</h2>
            <p className="text-sm text-blue-100 mt-1">
              {incidents.length} incidentes • {alerts.length} alertas del sistema
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Incidentes Section */}
          {incidents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>⚠️</span>
                <span>Incidentes de Waze ({incidents.length})</span>
              </h3>
              <div className="space-y-3">
                {incidents.map((incident) => {
                  const emoji = getIncidentEmoji(incident.type, incident.subtype);
                  const typeDescription = getIncidentDescription(incident.type, incident.subtype);
                  
                  // Evitar duplicación si subtipo es igual al tipo
                  const showSubtype = incident.subtype && 
                    incident.subtype !== incident.type && 
                    incident.subtype !== 'NO_SUBTYPE';

                  return (
                    <div
                      key={incident.id}
                      onClick={() => onEventClick(incident, 'incident')}
                      className="border-2 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="text-4xl flex-shrink-0">{emoji}</div>

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg">
                                {typeDescription}
                              </h4>
                              {showSubtype && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Subtipo: {incident.subtype}
                                </p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getSeverityColor(incident.severity)}`}>
                              {getSeverityLabel(incident.severity)}
                            </span>
                          </div>

                          {/* Location Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {incident.street && (
                              <div className="flex items-start gap-2">
                                <span className="text-gray-500 font-semibold">📍 Dirección:</span>
                                <span className="text-gray-900">{incident.street}</span>
                              </div>
                            )}
                            {incident.city && (
                              <div className="flex items-start gap-2">
                                <span className="text-gray-500 font-semibold">🏙️ Ciudad:</span>
                                <span className="text-gray-900">{incident.city}</span>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <span className="text-gray-500 font-semibold">🗺️ Coordenadas:</span>
                              <span className="text-gray-900 font-mono text-xs">
                                {formatCoordinates(incident.location.lat, incident.location.lng)}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-gray-500 font-semibold">🕐 Reportado:</span>
                              <span className="text-gray-900">
                                {new Date(incident.timestamp).toLocaleString('es-AR')}
                              </span>
                            </div>
                          </div>

                          {/* Additional Info */}
                          {(incident.nThumbsUp || incident.reliability || incident.reportRating) && (
                            <div className="mt-2 pt-2 border-t border-gray-200 flex gap-3 text-xs">
                              {incident.nThumbsUp !== undefined && incident.nThumbsUp > 0 && (
                                <span className="text-green-700 font-semibold">
                                  👍 {incident.nThumbsUp} confirmaciones
                                </span>
                              )}
                              {incident.reliability !== undefined && (
                                <span className="text-blue-700 font-semibold">
                                  ✓ Confiabilidad: {incident.reliability}/10
                                </span>
                              )}
                              {incident.reportRating !== undefined && (
                                <span className="text-indigo-700 font-semibold">
                                  📊 Rating: {incident.reportRating}/10
                                </span>
                              )}
                            </div>
                          )}

                          {/* Description if available and not a key */}
                          {incident.description && 
                           incident.description !== incident.subtype &&
                           !/^[A-Z_]+$/.test(incident.description) && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              "{incident.description}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Click hint */}
                      <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                        <span className="text-xs text-blue-600 font-semibold">
                          🗺️ Click para ver en el mapa
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alertas del Sistema Section */}
          {alerts.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>🚨</span>
                <span>Alertas del Sistema ({alerts.length})</span>
              </h3>
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const severityConfig = {
                    critical: { label: 'CRÍTICA', color: 'bg-red-100 border-red-400 text-red-900', icon: '🚨' },
                    high: { label: 'ALTA', color: 'bg-orange-100 border-orange-400 text-orange-900', icon: '⚠️' },
                    medium: { label: 'MEDIA', color: 'bg-yellow-100 border-yellow-400 text-yellow-900', icon: '⚡' },
                    low: { label: 'BAJA', color: 'bg-blue-100 border-blue-400 text-blue-900', icon: 'ℹ️' },
                  }[alert.severity];

                  return (
                    <div
                      key={alert.id}
                      onClick={() => onEventClick(alert, 'alert')}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${severityConfig.color}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">{severityConfig.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-bold text-lg">{alert.message}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${severityConfig.color}`}>
                              {severityConfig.label}
                            </span>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">📍 Ubicación:</span>
                              <span>{alert.location} - {alert.polygonName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">🕐 Detectada:</span>
                              <span>{new Date(alert.timestamp).toLocaleString('es-AR')}</span>
                            </div>
                            {alert.data && Object.keys(alert.data).length > 0 && (
                              <div className="mt-2 pt-2 border-t flex gap-3 text-xs">
                                {alert.data.criticalJamsCount && (
                                  <span className="font-semibold">
                                    🚦 {alert.data.criticalJamsCount} puntos críticos
                                  </span>
                                )}
                                {alert.data.avgDelayMinutes !== undefined && (
                                  <span className="font-semibold">
                                    ⏱️ +{alert.data.avgDelayMinutes} min demora
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {incidents.length === 0 && alerts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-xl font-semibold text-gray-600">No hay eventos activos</p>
              <p className="text-sm text-gray-500 mt-2">Todos los sistemas operando normalmente</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center text-sm text-gray-600">
          💡 <strong>Tip:</strong> Haz click en cualquier evento para ver su ubicación en el mapa
        </div>
      </div>
    </div>
  );
};

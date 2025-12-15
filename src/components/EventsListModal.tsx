import React, { useState } from 'react';
import type { Incident, TrafficAlert } from '../types';
import { getIncidentDescription, getIncidentEmoji } from '../utils/wazeTranslations';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-8 py-6 flex items-center justify-between border-b-4 border-blue-800">
          <div>
            <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
              <span className="text-4xl">📋</span>
              Eventos Activos en Tiempo Real
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-white/20 rounded-full font-semibold backdrop-blur-sm">
                ⚠️ {incidents.length} Incidentes
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full font-semibold backdrop-blur-sm">
                🚨 {alerts.length} Alertas
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full font-semibold backdrop-blur-sm">
                📊 Total: {incidents.length + alerts.length}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-3 transition-all hover:scale-110 hover:rotate-90"
            title="Cerrar"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {/* Incidentes Section */}
          {incidents.length > 0 && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-t-xl shadow-md">
                <h3 className="text-xl font-black flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <span>Incidentes de Waze</span>
                  <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                    {incidents.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-4 bg-white p-6 rounded-b-xl shadow-lg">
                {incidents
                  .sort((a, b) => {
                    // Ordenar por severidad (mayor a menor)
                    if (b.severity !== a.severity) {
                      return b.severity - a.severity;
                    }
                    // Si tienen misma severidad, por confiabilidad
                    return (b.reliability || 0) - (a.reliability || 0);
                  })
                  .map((incident) => {
                  const emoji = getIncidentEmoji(incident.type, incident.subtype);
                  const typeDescription = getIncidentDescription(incident.type, incident.subtype);

                  // NO mostrar subtipo si la descripción ya lo incluye
                  const showSubtype = false; // Siempre ocultar el subtipo raw

                  return (
                    <div
                      key={incident.id}
                      onClick={() => onEventClick(incident, 'incident')}
                      className="border-2 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:border-blue-400"
                    >
                      <div className="flex items-start gap-5">
                        {/* Icon */}
                        <div className="text-5xl flex-shrink-0 drop-shadow-md">{emoji}</div>

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h4 className="font-black text-gray-900 text-xl mb-1">
                                {typeDescription}
                              </h4>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-xs font-black border-2 shadow-md ${getSeverityColor(incident.severity)}`}>
                              {getSeverityLabel(incident.severity)}
                            </span>
                          </div>

                          {/* Location Info */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-white/70 rounded-lg p-4 border border-gray-200">
                              {incident.street && (
                                <div className="flex items-start gap-2">
                                  <span className="text-blue-600 font-bold">📍</span>
                                  <div>
                                    <span className="text-gray-500 font-semibold text-xs">Dirección:</span>
                                    <p className="text-gray-900 font-medium">{incident.street}</p>
                                  </div>
                                </div>
                              )}
                              {incident.city && (
                                <div className="flex items-start gap-2">
                                  <span className="text-blue-600 font-bold">🏙️</span>
                                  <div>
                                    <span className="text-gray-500 font-semibold text-xs">Ciudad:</span>
                                    <p className="text-gray-900 font-medium">{incident.city}</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">🗺️</span>
                                <div>
                                  <span className="text-gray-500 font-semibold text-xs">Coordenadas:</span>
                                  <p className="text-gray-900 font-mono text-xs font-medium">
                                    {formatCoordinates(incident.location.lat, incident.location.lng)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">🕐</span>
                                <div>
                                  <span className="text-gray-500 font-semibold text-xs">Reportado:</span>
                                  <p className="text-gray-900 font-medium text-xs">
                                    {new Date(incident.timestamp).toLocaleString('es-AR')}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Botón Ver en Minimapa */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedIncident(expandedIncident === incident.id ? null : incident.id);
                              }}
                              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                              <span className="text-xl">
                                {expandedIncident === incident.id ? '📍' : '🗺️'}
                              </span>
                              <span>
                                {expandedIncident === incident.id ? 'Ocultar Minimapa' : 'Ver Ubicación en Minimapa'}
                              </span>
                            </button>

                            {/* Minimapa Expandido */}
                            {expandedIncident === incident.id && (
                              <div className="mt-3 border-2 border-blue-400 rounded-xl overflow-hidden shadow-2xl bg-white">
                                {/* Mapa */}
                                <div style={{ height: '300px', width: '100%' }}>
                                  <MapContainer
                                    center={[incident.location.lat, incident.location.lng]}
                                    zoom={16}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={false}
                                  >
                                    <TileLayer
                                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    />
                                    <Marker position={[incident.location.lat, incident.location.lng]}>
                                      <Popup>
                                        <div className="text-center">
                                          <p className="font-bold text-lg mb-1">{emoji} {typeDescription}</p>
                                          {incident.street && <p className="text-sm">{incident.street}</p>}
                                        </div>
                                      </Popup>
                                    </Marker>
                                  </MapContainer>
                                </div>

                                {/* Información Detallada */}
                                <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 space-y-3">
                                  <h4 className="font-black text-lg text-gray-900 border-b-2 border-blue-300 pb-2">
                                    📋 Información Completa del Incidente
                                  </h4>
                                  
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-gray-500 font-semibold text-xs mb-1">Tipo</p>
                                      <p className="text-gray-900 font-bold">{emoji} {typeDescription}</p>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-gray-500 font-semibold text-xs mb-1">Severidad</p>
                                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(incident.severity)}`}>
                                        {getSeverityLabel(incident.severity)}
                                      </span>
                                    </div>

                                    {incident.street && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200 col-span-2">
                                        <p className="text-gray-500 font-semibold text-xs mb-1">📍 Ubicación</p>
                                        <p className="text-gray-900 font-medium">{incident.street}</p>
                                        {incident.city && <p className="text-gray-600 text-xs mt-1">{incident.city}</p>}
                                      </div>
                                    )}

                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-gray-500 font-semibold text-xs mb-1">🗺️ Latitud</p>
                                      <p className="text-gray-900 font-mono text-xs">{incident.location.lat.toFixed(6)}</p>
                                    </div>

                                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                                      <p className="text-gray-500 font-semibold text-xs mb-1">🗺️ Longitud</p>
                                      <p className="text-gray-900 font-mono text-xs">{incident.location.lng.toFixed(6)}</p>
                                    </div>

                                    <div className="bg-white rounded-lg p-3 border border-gray-200 col-span-2">
                                      <p className="text-gray-500 font-semibold text-xs mb-1">🕐 Fecha y Hora</p>
                                      <p className="text-gray-900 font-medium">{new Date(incident.timestamp).toLocaleString('es-AR', { 
                                        dateStyle: 'full', 
                                        timeStyle: 'medium' 
                                      })}</p>
                                    </div>

                                    {incident.nThumbsUp !== undefined && (
                                      <div className="bg-white rounded-lg p-3 border border-gray-200 col-span-2">
                                        <p className="text-gray-500 font-semibold text-xs mb-1">👍 Confirmaciones</p>
                                        <p className="text-green-700 font-bold text-lg">{incident.nThumbsUp} Wazers confirmaron</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Confirmaciones de Wazers */}
                          {incident.nThumbsUp !== undefined && (
                            <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300">
                              <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-3 shadow-md">
                                <span className="text-3xl">👍</span>
                                <div className="flex-1">
                                  <p className="text-xs text-gray-600 font-semibold">Confirmado por Wazers</p>
                                  <p className="text-2xl font-black text-green-700">
                                    {incident.nThumbsUp} {incident.nThumbsUp === 1 ? 'usuario' : 'usuarios'}
                                  </p>
                                </div>
                                {incident.nThumbsUp > 5 && (
                                  <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold shadow-sm">
                                    ✓ Alta confianza
                                  </span>
                                )}
                                {incident.nThumbsUp === 0 && (
                                  <span className="px-3 py-1 bg-gray-400 text-white rounded-full text-xs font-bold shadow-sm">
                                    Sin confirmar
                                  </span>
                                )}
                              </div>
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
                      <div className="mt-4 pt-4 border-t-2 border-gray-200 text-center">
                        <span className="text-sm text-blue-600 font-black flex items-center justify-center gap-2">
                          <span className="text-lg">🗺️</span>
                          Click para ver ubicación en el mapa
                          <span className="text-lg">→</span>
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
            <div className="mb-6">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-t-xl shadow-md">
                <h3 className="text-xl font-black flex items-center gap-3">
                  <span className="text-2xl">🚨</span>
                  <span>Alertas del Sistema</span>
                  <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                    {alerts.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-4 bg-white p-6 rounded-b-xl shadow-lg">
                {alerts
                  .sort((a, b) => {
                    // Ordenar por severidad: critical > high > medium > low
                    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                  })
                  .map((alert) => {
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
                      className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${severityConfig.color}`}
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
            <div className="text-center py-20 bg-white rounded-xl shadow-lg">
              <div className="text-8xl mb-6 animate-bounce">✅</div>
              <p className="text-3xl font-black text-gray-700 mb-2">¡Todo en Orden!</p>
              <p className="text-lg text-gray-500">No hay eventos activos en este momento</p>
              <p className="text-sm text-gray-400 mt-3">Todos los sistemas operando normalmente</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-8 py-4 border-t-2 border-gray-300">
          <div className="flex items-center justify-center gap-3 text-sm text-gray-700">
            <span className="text-2xl">💡</span>
            <p className="font-semibold">
              <strong className="text-blue-600">Tip:</strong> Haz click en cualquier evento para ver su ubicación exacta en el mapa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

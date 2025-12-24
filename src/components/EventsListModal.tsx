import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Incident, TrafficAlert, Polygon } from '../types';
import { getIncidentDescription, getIncidentEmoji, getSubtypeTranslation, getMainTypeTranslation } from '../utils/wazeTranslations';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix para los iconos de Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Configurar iconos de Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes pulse-marker {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 0 15px rgba(220, 38, 38, 0);
    }
  }
`;
if (!document.head.querySelector('style[data-minimap-animations]')) {
  style.setAttribute('data-minimap-animations', 'true');
  document.head.appendChild(style);
}

// Componente para centrar el mapa automáticamente
const MapCenterUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
};

// Crear icono personalizado para el marcador
const createCustomIcon = (severity: number) => {
  const color = severity >= 4 ? '#dc2626' : severity >= 3 ? '#ea580c' : '#fbbf24';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse-marker 2s infinite;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

interface EventsListModalProps {
  incidents: Incident[];
  alerts: TrafficAlert[];
  polygons?: Polygon[];
  onClose: () => void;
  onEventClick: (event: Incident | TrafficAlert, type: 'incident' | 'alert') => void;
}

export const EventsListModal: React.FC<EventsListModalProps> = ({
  incidents,
  alerts,
  polygons = [],
  onClose,
  onEventClick,
}) => {
  const [expandedEvent, setExpandedEvent] = useState<{ id: string; type: 'incident' | 'alert' } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'incidents' | 'alerts'>('all');

  // Cerrar minimapa con tecla ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && expandedEvent) {
        setExpandedEvent(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [expandedEvent]);

  // Encontrar el evento expandido (incidente o alerta)
  const currentExpandedIncident = expandedEvent && expandedEvent.type === 'incident'
    ? incidents.find(i => i.id === expandedEvent.id)
    : null;

  const currentExpandedAlert = expandedEvent && expandedEvent.type === 'alert'
    ? alerts.find(a => a.id === expandedEvent.id)
    : null;

  // Obtener coordenadas del evento expandido
  const getEventCoordinates = () => {
    if (currentExpandedIncident) {
      return {
        lat: currentExpandedIncident.location.lat,
        lng: currentExpandedIncident.location.lng,
      };
    }
    if (currentExpandedAlert) {
      // Buscar el polígono para obtener sus coordenadas
      const polygon = polygons.find(p => p.id === currentExpandedAlert.polygonId);
      if (polygon && polygon.geometry && polygon.geometry.coordinates) {
        // Calcular el centro del polígono desde las coordenadas GeoJSON
        const coordinates = polygon.geometry.coordinates[0]; // Primer anillo del polígono
        if (coordinates && coordinates.length > 0) {
          let sumLat = 0;
          let sumLng = 0;
          let count = 0;

          // Sumar todas las coordenadas
          for (const coord of coordinates) {
            if (Array.isArray(coord) && coord.length >= 2) {
              sumLng += coord[0]; // Longitud
              sumLat += coord[1]; // Latitud
              count++;
            }
          }

          if (count > 0) {
            return {
              lat: sumLat / count,
              lng: sumLng / count,
            };
          }
        }
      }
      // Fallback: coordenadas de Córdoba centro
      return { lat: -31.4201, lng: -64.1888 };
    }
    return null;
  };

  const eventCoordinates = getEventCoordinates();
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter('all');
                }}
                className={`px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                  activeFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-lg scale-105 border-2 border-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                📊 Total: {incidents.length + alerts.length}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter('incidents');
                }}
                className={`px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                  activeFilter === 'incidents'
                    ? 'bg-white text-orange-700 shadow-lg scale-105 border-2 border-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                ⚠️ {incidents.length} Incidentes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter('alerts');
                }}
                className={`px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                  activeFilter === 'alerts'
                    ? 'bg-white text-red-700 shadow-lg scale-105 border-2 border-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                🚨 {alerts.length} Alertas
              </button>
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
          {/* Layout de dos columnas cuando se muestran ambos tipos */}
          {activeFilter === 'all' && incidents.length > 0 && alerts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda: Incidentes reportados por usuarios de Waze */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-t-xl shadow-md">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <span>Incidentes reportados por usuarios de Waze</span>
                    <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                      {incidents.length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-4 bg-white p-6 rounded-b-xl shadow-lg flex-1 overflow-y-auto max-h-[calc(90vh-200px)]">
                {incidents
                  // Deduplicar por ID antes de renderizar
                  .filter((incident, index, self) =>
                    index === self.findIndex((i) => i.id === incident.id)
                  )
                  .sort((a, b) => {
                    // Ordenar por severidad (mayor a menor)
                    if (b.severity !== a.severity) {
                      return b.severity - a.severity;
                    }
                    // Si tienen misma severidad, por confiabilidad
                    return (b.reliability || 0) - (a.reliability || 0);
                  })
                  .map((incident, index) => {
                  const emoji = getIncidentEmoji(incident.type, incident.subtype);
                  const typeDescription = getIncidentDescription(incident.type, incident.subtype);

                  // NO mostrar subtipo si la descripción ya lo incluye

                  return (
                    <div
                      key={`incident-${incident.id}-${index}`}
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
                                setExpandedEvent({ id: incident.id, type: 'incident' });
                              }}
                              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
                            >
                              <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                                🗺️
                              </span>
                              <span className="tracking-wide">
                                Ver Ubicación en Minimapa
                              </span>
                              <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
                                →
                              </span>
                            </button>
                          </div>

                          {/* Confirmaciones de Wazers */}

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
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Columna Derecha: Alertas automaticas de Waze */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-t-xl shadow-md">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <span className="text-2xl">🚨</span>
                    <span>Alertas automaticas de Waze</span>
                    <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                      {alerts.length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-4 bg-white p-6 rounded-b-xl shadow-lg flex-1 overflow-y-auto max-h-[calc(90vh-200px)]">
                {alerts
                  // Deduplicar por ID antes de renderizar
                  .filter((alert, index, self) =>
                    index === self.findIndex((a) => a.id === alert.id)
                  )
                  .sort((a, b) => {
                    // Ordenar por severidad: critical > high > medium > low
                    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                  })
                  .map((alert, index) => {
                  const severityConfig = {
                    critical: { label: 'CRÍTICA', color: 'bg-red-100 border-red-400 text-red-900', icon: '🚨' },
                    high: { label: 'ALTA', color: 'bg-orange-100 border-orange-400 text-orange-900', icon: '⚠️' },
                    medium: { label: 'MEDIA', color: 'bg-yellow-100 border-yellow-400 text-yellow-900', icon: '⚡' },
                    low: { label: 'BAJA', color: 'bg-blue-100 border-blue-400 text-blue-900', icon: 'ℹ️' },
                  }[alert.severity];

                  return (
                    <div
                      key={`alert-${alert.id}-${index}`}
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

                          {/* Botón Ver en Minimapa */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedEvent({ id: alert.id, type: 'alert' });
                            }}
                            className="w-full mt-3 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
                          >
                            <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                              🗺️
                            </span>
                            <span className="tracking-wide">
                              Ver Ubicación en Minimapa
                            </span>
                            <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
                              →
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Vista de una sola columna cuando se filtra por tipo específico */}
              {/* Incidentes Section */}
              {incidents.length > 0 && (activeFilter === 'all' || activeFilter === 'incidents') && (
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-t-xl shadow-md">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <span>Incidentes reportados por usuarios de Waze</span>
                      <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                        {incidents.length}
                      </span>
                    </h3>
                  </div>
                  <div className="space-y-4 bg-white p-6 rounded-b-xl shadow-lg">
                    {incidents
                      .filter((incident, index, self) =>
                        index === self.findIndex((i) => i.id === incident.id)
                      )
                      .sort((a, b) => {
                        if (b.severity !== a.severity) {
                          return b.severity - a.severity;
                        }
                        return (b.reliability || 0) - (a.reliability || 0);
                      })
                      .map((incident, index) => {
                        const emoji = getIncidentEmoji(incident.type, incident.subtype);
                        const typeDescription = getIncidentDescription(incident.type, incident.subtype);

                        return (
                          <div
                            key={`incident-${incident.id}-${index}`}
                            onClick={() => onEventClick(incident, 'incident')}
                            className="border-2 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:border-blue-400"
                          >
                            <div className="flex items-start gap-5">
                              <div className="text-5xl flex-shrink-0 drop-shadow-md">{emoji}</div>
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedEvent({ id: incident.id, type: 'incident' });
                                    }}
                                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
                                  >
                                    <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                                      🗺️
                                    </span>
                                    <span className="tracking-wide">
                                      Ver Ubicación en Minimapa
                                    </span>
                                    <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
                                      →
                                    </span>
                                  </button>
                                </div>
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
                                {incident.description &&
                                 incident.description !== incident.subtype &&
                                 !/^[A-Z_]+$/.test(incident.description) && (
                                  <div className="mt-2 text-sm text-gray-600 italic">
                                    "{incident.description}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Alertas automaticas de Waze Section */}
              {alerts.length > 0 && (activeFilter === 'all' || activeFilter === 'alerts') && (
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-t-xl shadow-md">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <span className="text-2xl">🚨</span>
                      <span>Alertas automaticas de Waze</span>
                      <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                        {alerts.length}
                      </span>
                    </h3>
                  </div>
                  <div className="space-y-4 bg-white p-6 rounded-b-xl shadow-lg">
                    {alerts
                      .filter((alert, index, self) =>
                        index === self.findIndex((a) => a.id === alert.id)
                      )
                      .sort((a, b) => {
                        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                      })
                      .map((alert, index) => {
                        const severityConfig = {
                          critical: { label: 'CRÍTICA', color: 'bg-red-100 border-red-400 text-red-900', icon: '🚨' },
                          high: { label: 'ALTA', color: 'bg-orange-100 border-orange-400 text-orange-900', icon: '⚠️' },
                          medium: { label: 'MEDIA', color: 'bg-yellow-100 border-yellow-400 text-yellow-900', icon: '⚡' },
                          low: { label: 'BAJA', color: 'bg-blue-100 border-blue-400 text-blue-900', icon: 'ℹ️' },
                        }[alert.severity];

                        return (
                          <div
                            key={`alert-${alert.id}-${index}`}
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedEvent({ id: alert.id, type: 'alert' });
                                  }}
                                  className="w-full mt-3 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
                                >
                                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                                    🗺️
                                  </span>
                                  <span className="tracking-wide">
                                    Ver Ubicación en Minimapa
                                  </span>
                                  <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
                                    →
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {((activeFilter === 'all' && incidents.length === 0 && alerts.length === 0) ||
            (activeFilter === 'incidents' && incidents.length === 0) ||
            (activeFilter === 'alerts' && alerts.length === 0)) && (
            <div className="text-center py-20 bg-white rounded-xl shadow-lg">
              <div className="text-8xl mb-6 animate-bounce">✅</div>
              <p className="text-3xl font-black text-gray-700 mb-2">
                {activeFilter === 'incidents' && 'No hay incidentes activos'}
                {activeFilter === 'alerts' && 'No hay alertas activas'}
                {activeFilter === 'all' && '¡Todo en Orden!'}
              </p>
              <p className="text-lg text-gray-500">
                {activeFilter === 'all' && 'No hay eventos activos en este momento'}
                {activeFilter !== 'all' && 'Intenta cambiar el filtro para ver otros eventos'}
              </p>
              {activeFilter === 'all' && (
                <p className="text-sm text-gray-400 mt-3">Todos los sistemas operando normalmente</p>
              )}
            </div>
          )}
        </div>

        {/* Portal para el Modal Flotante del Minimapa - Renderizado fuera del DOM principal */}
        {(currentExpandedIncident || currentExpandedAlert) && eventCoordinates && createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center p-4 animate-fade-in"
            style={{
              zIndex: 99999,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)'
            }}
            onClick={(e) => {
              e.stopPropagation();
              setExpandedEvent(null);
            }}
          >
            <div
              className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
              onClick={(e) => e.stopPropagation()}
              style={{
                animation: 'scaleIn 0.3s ease-out',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)',
                border: '3px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              {(() => {
                // Determinar si es incidente o alerta
                const isIncident = !!currentExpandedIncident;

                let emoji: string;
                let typeDescription: string;
                let eventData: any;

                if (isIncident && currentExpandedIncident) {
                  emoji = getIncidentEmoji(currentExpandedIncident.type, currentExpandedIncident.subtype);
                  typeDescription = getIncidentDescription(currentExpandedIncident.type, currentExpandedIncident.subtype);
                  eventData = currentExpandedIncident;
                } else if (currentExpandedAlert) {
                  const severityConfig = {
                    critical: { icon: '🚨', label: 'CRÍTICA' },
                    high: { icon: '⚠️', label: 'ALTA' },
                    medium: { icon: '⚡', label: 'MEDIA' },
                    low: { icon: 'ℹ️', label: 'BAJA' },
                  }[currentExpandedAlert.severity];
                  emoji = severityConfig.icon;
                  typeDescription = currentExpandedAlert.message;
                  eventData = currentExpandedAlert;
                } else {
                  return null;
                }

                return (
                  <>
                    {/* Header del Modal */}
                    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white px-8 py-6 relative overflow-hidden">
                      {/* Efecto de brillo animado */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                           style={{ animation: 'shimmer 3s infinite' }}></div>

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-5xl drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
                            {emoji}
                          </div>
                          <div>
                            <h3 className="text-2xl font-black mb-1">{typeDescription}</h3>
                            <div className="flex items-center gap-2">
                              {isIncident && currentExpandedIncident && (
                                <>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(currentExpandedIncident.severity)} shadow-lg`}>
                                    {getSeverityLabel(currentExpandedIncident.severity)}
                                  </span>
                                  {currentExpandedIncident.nThumbsUp !== undefined && currentExpandedIncident.nThumbsUp > 0 && (
                                    <span className="px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-xs font-bold">
                                      👍 {currentExpandedIncident.nThumbsUp} confirmaciones
                                    </span>
                                  )}
                                </>
                              )}
                              {!isIncident && currentExpandedAlert && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  currentExpandedAlert.severity === 'critical' ? 'bg-red-100 border-red-400 text-red-900' :
                                  currentExpandedAlert.severity === 'high' ? 'bg-orange-100 border-orange-400 text-orange-900' :
                                  currentExpandedAlert.severity === 'medium' ? 'bg-yellow-100 border-yellow-400 text-yellow-900' :
                                  'bg-blue-100 border-blue-400 text-blue-900'
                                } shadow-lg`}>
                                  {currentExpandedAlert.severity === 'critical' ? 'CRÍTICA' :
                                   currentExpandedAlert.severity === 'high' ? 'ALTA' :
                                   currentExpandedAlert.severity === 'medium' ? 'MEDIA' : 'BAJA'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedEvent(null);
                          }}
                          className="text-white bg-white/10 hover:bg-white/30 rounded-full p-3 transition-all duration-300 hover:scale-125 hover:rotate-90 group backdrop-blur-sm border-2 border-white/30 hover:border-white/60"
                          title="Cerrar minimapa (ESC)"
                        >
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Layout de 2 columnas: Mapa + Info */}
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 150px)' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 h-full">
                        {/* MINIMAPA - 3/5 del espacio */}
                        <div className="lg:col-span-3 relative h-full" style={{ minHeight: '500px' }}>
                          <MapContainer
                            center={[eventCoordinates.lat, eventCoordinates.lng]}
                            zoom={16}
                            style={{ width: '100%', height: '100%', minHeight: '500px' }}
                            scrollWheelZoom={true}
                            zoomControl={true}
                          >
                            <MapCenterUpdater center={[eventCoordinates.lat, eventCoordinates.lng]} />
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker
                              position={[eventCoordinates.lat, eventCoordinates.lng]}
                              icon={createCustomIcon(isIncident && currentExpandedIncident ? currentExpandedIncident.severity : 4)}
                            >
                              <Popup>
                                <div className="p-2 min-w-[200px]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-3xl">{emoji}</span>
                                    <div>
                                      <p className="font-black text-base">{typeDescription}</p>
                                      {isIncident && currentExpandedIncident && (
                                        <span className={`text-xs font-bold ${
                                          currentExpandedIncident.severity >= 4 ? 'text-red-600' :
                                          currentExpandedIncident.severity >= 3 ? 'text-orange-600' : 'text-yellow-600'
                                        }`}>
                                          {getSeverityLabel(currentExpandedIncident.severity)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isIncident && currentExpandedIncident?.street && (
                                    <p className="text-sm text-gray-700 mb-1">📍 {currentExpandedIncident.street}</p>
                                  )}
                                  {isIncident && currentExpandedIncident?.city && (
                                    <p className="text-xs text-gray-500">🏙️ {currentExpandedIncident.city}</p>
                                  )}
                                  {!isIncident && currentExpandedAlert && (
                                    <>
                                      <p className="text-sm text-gray-700 mb-1">📍 {currentExpandedAlert.location}</p>
                                      <p className="text-xs text-gray-500">🗺️ {currentExpandedAlert.polygonName}</p>
                                    </>
                                  )}
                                </div>
                              </Popup>
                            </Marker>
                          </MapContainer>

                          {/* Badge flotante con tipo de evento */}
                          <div className="absolute top-4 left-4 z-10">
                            <div className={`px-4 py-2 rounded-full backdrop-blur-md shadow-xl font-bold text-sm flex items-center gap-2 ${
                              isIncident && currentExpandedIncident?.severity >= 4
                                ? 'bg-red-600/90 text-white'
                                : isIncident && currentExpandedIncident?.severity >= 3
                                ? 'bg-orange-500/90 text-white'
                                : 'bg-blue-600/90 text-white'
                            }`}>
                              <span className="text-xl">{emoji}</span>
                              <span>{isIncident ? 'INCIDENTE' : 'ALERTA'}</span>
                            </div>
                          </div>
                        </div>

                        {/* PANEL DE INFORMACIÓN - 2/5 del espacio */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-gray-50 to-blue-50 p-6 overflow-y-auto h-full">
                          <h4 className="font-black text-xl text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-2xl">📋</span>
                            Información Detallada
                          </h4>

                          <div className="space-y-3">
                          {/* Card Ubicación Principal */}
                          {(isIncident && currentExpandedIncident?.street) || (!isIncident && currentExpandedAlert) ? (
                            <div className="md:col-span-2 bg-gradient-to-br from-white to-blue-50 rounded-2xl p-5 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                              <div className="flex items-start gap-4">
                                <span className="text-4xl">📍</span>
                                <div className="flex-1">
                                  <p className="text-gray-500 font-bold text-sm mb-2">UBICACIÓN</p>
                                  {isIncident && currentExpandedIncident?.street && (
                                    <>
                                      <p className="text-gray-900 font-black text-xl mb-1">{currentExpandedIncident.street}</p>
                                      {currentExpandedIncident.city && (
                                        <p className="text-gray-600 font-semibold">{currentExpandedIncident.city}</p>
                                      )}
                                    </>
                                  )}
                                  {!isIncident && currentExpandedAlert && (
                                    <>
                                      <p className="text-gray-900 font-black text-xl mb-1">{currentExpandedAlert.location}</p>
                                      <p className="text-gray-600 font-semibold">{currentExpandedAlert.polygonName}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {/* Card Coordenadas */}
                          {eventCoordinates && (
                            <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl p-5 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">🌍</span>
                                <p className="text-gray-700 font-bold">COORDENADAS GPS</p>
                              </div>
                              <div className="space-y-2 bg-white/50 rounded-lg p-3">
                                <div>
                                  <p className="text-gray-500 text-xs font-semibold">Latitud</p>
                                  <p className="text-gray-900 font-mono font-bold text-lg">{eventCoordinates.lat.toFixed(6)}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-2">
                                  <p className="text-gray-500 text-xs font-semibold">Longitud</p>
                                  <p className="text-gray-900 font-mono font-bold text-lg">{eventCoordinates.lng.toFixed(6)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Card Fecha y Hora */}
                          {eventData && (
                            <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl p-5 border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">🕐</span>
                                <p className="text-gray-700 font-bold">FECHA Y HORA</p>
                              </div>
                              <div className="bg-white/50 rounded-lg p-3">
                                <p className="text-gray-900 font-bold text-base leading-relaxed">
                                  {new Date(eventData.timestamp).toLocaleString('es-AR', {
                                    dateStyle: 'full',
                                    timeStyle: 'short'
                                  })}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Card Confirmaciones - Solo para incidentes */}
                          {isIncident && currentExpandedIncident?.nThumbsUp !== undefined && (
                            <div className="md:col-span-2 bg-gradient-to-br from-white to-green-50 rounded-2xl p-5 border-2 border-green-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <span className="text-5xl">👍</span>
                                  <div>
                                    <p className="text-gray-500 font-bold text-sm mb-1">CONFIRMADO POR WAZERS</p>
                                    <p className="text-green-700 font-black text-3xl">
                                      {currentExpandedIncident.nThumbsUp} {currentExpandedIncident.nThumbsUp === 1 ? 'usuario' : 'usuarios'}
                                    </p>
                                  </div>
                                </div>
                                {currentExpandedIncident.nThumbsUp > 5 && (
                                  <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg">
                                    <p className="font-black text-sm">✓ ALTA</p>
                                    <p className="font-black text-xs">CONFIANZA</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ===== INFORMACIÓN ADICIONAL DEL FEED ===== */}

                          {/* Card Confiabilidad y Métricas (INCIDENTES) */}
                          {isIncident && currentExpandedIncident && (
                            <>
                              {/* Reliability & Confidence */}
                              {(currentExpandedIncident.reliability !== undefined || currentExpandedIncident.confidence !== undefined) && (
                                <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl p-5 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                  <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl">📊</span>
                                    <p className="text-gray-700 font-bold">MÉTRICAS DE CALIDAD</p>
                                  </div>
                                  <div className="space-y-3">
                                    {currentExpandedIncident.reliability !== undefined && (
                                      <div className="bg-white/60 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-gray-600 font-semibold text-sm">Confiabilidad</p>
                                          <p className="text-purple-700 font-black text-xl">{currentExpandedIncident.reliability}/10</p>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-gradient-to-r from-purple-500 to-purple-700 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(currentExpandedIncident.reliability / 10) * 100}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}
                                    {currentExpandedIncident.confidence !== undefined && (
                                      <div className="bg-white/60 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-gray-600 font-semibold text-sm">Nivel de Confianza</p>
                                          <p className="text-indigo-700 font-black text-xl">{currentExpandedIncident.confidence}/10</p>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(currentExpandedIncident.confidence / 10) * 100}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Report Rating */}
                              {currentExpandedIncident.reportRating !== undefined && (
                                <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl p-5 border-2 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-3xl">⭐</span>
                                    <div className="flex-1">
                                      <p className="text-gray-500 font-bold text-sm mb-1">RATING DEL REPORTE</p>
                                      <div className="flex items-center gap-3">
                                        <p className="text-yellow-700 font-black text-3xl">{currentExpandedIncident.reportRating}</p>
                                        <div className="flex gap-1">
                                          {Array.from({ length: 10 }).map((_, i) => (
                                            <div
                                              key={i}
                                              className={`w-2 h-8 rounded-full ${
                                                i < currentExpandedIncident.reportRating!
                                                  ? 'bg-gradient-to-t from-yellow-400 to-yellow-600'
                                                  : 'bg-gray-200'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Subtipo y Descripción */}
                              {(currentExpandedIncident.subtype || currentExpandedIncident.description) && (
                                <div className="md:col-span-2 bg-gradient-to-br from-white to-cyan-50 rounded-2xl p-5 border-2 border-cyan-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                  <div className="flex items-start gap-4">
                                    <span className="text-4xl">ℹ️</span>
                                    <div className="flex-1">
                                      <p className="text-gray-500 font-bold text-sm mb-3">INFORMACIÓN ADICIONAL</p>
                                      {currentExpandedIncident.subtype && (
                                        <div className="mb-3">
                                          <p className="text-gray-600 font-semibold text-xs mb-1">Clasificación:</p>
                                          <p className="text-cyan-800 font-bold text-base">
                                            {getSubtypeTranslation(currentExpandedIncident.type, currentExpandedIncident.subtype)}
                                          </p>
                                        </div>
                                      )}
                                      {currentExpandedIncident.description && (
                                        <div className="bg-white/60 rounded-lg p-3">
                                          <p className="text-gray-600 font-semibold text-xs mb-2">Descripción:</p>
                                          <p className="text-gray-800 leading-relaxed">
                                            {(() => {
                                              const desc = currentExpandedIncident.description;
                                              // Si parece un subtype (formato HAZARD_ON_SHOULDER_CAR_STOPPED)
                                              if (/^[A-Z_]+$/.test(desc)) {
                                                // Intentar traducir como subtype
                                                const subtypeTranslation = getSubtypeTranslation(
                                                  currentExpandedIncident.type,
                                                  desc
                                                );
                                                // Si se tradujo, usarlo; si no, intentar como main type
                                                if (subtypeTranslation !== desc) {
                                                  return subtypeTranslation;
                                                }
                                              }
                                              // Intentar como main type
                                              const mainTranslation = getMainTypeTranslation(desc.toLowerCase());
                                              // Si no se tradujo, intentar con el subtype del incidente
                                              if (mainTranslation === desc.toLowerCase() && currentExpandedIncident.subtype) {
                                                return getSubtypeTranslation(currentExpandedIncident.type, currentExpandedIncident.subtype);
                                              }
                                              return mainTranslation !== desc.toLowerCase() ? mainTranslation : desc;
                                            })()}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Card Estado de Reconocimiento (ALERTAS) */}
                          {!isIncident && currentExpandedAlert && (
                            <>
                              <div className="md:col-span-2 bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-5 border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                <div className="flex items-start gap-4">
                                  <span className="text-4xl">{currentExpandedAlert.isAcknowledged ? '✅' : '🔔'}</span>
                                  <div className="flex-1">
                                    <p className="text-gray-500 font-bold text-sm mb-3">ESTADO DE RECONOCIMIENTO</p>
                                    <div className="space-y-3">
                                      <div className={`px-4 py-3 rounded-lg ${
                                        currentExpandedAlert.isAcknowledged
                                          ? 'bg-green-100 border-2 border-green-300'
                                          : 'bg-orange-100 border-2 border-orange-300'
                                      }`}>
                                        <p className={`font-black text-lg ${
                                          currentExpandedAlert.isAcknowledged ? 'text-green-800' : 'text-orange-800'
                                        }`}>
                                          {currentExpandedAlert.isAcknowledged ? '✓ RECONOCIDA' : '⚠️ PENDIENTE DE RECONOCIMIENTO'}
                                        </p>
                                      </div>
                                      {currentExpandedAlert.isAcknowledged && currentExpandedAlert.acknowledgedAt && (
                                        <div className="bg-white/60 rounded-lg p-3 space-y-2">
                                          <div>
                                            <p className="text-gray-600 font-semibold text-xs">Reconocida el:</p>
                                            <p className="text-gray-800 font-bold">
                                              {new Date(currentExpandedAlert.acknowledgedAt).toLocaleString('es-AR', {
                                                dateStyle: 'long',
                                                timeStyle: 'short'
                                              })}
                                            </p>
                                          </div>
                                          {currentExpandedAlert.acknowledgedBy && (
                                            <div>
                                              <p className="text-gray-600 font-semibold text-xs">Por:</p>
                                              <p className="text-gray-800 font-bold">{currentExpandedAlert.acknowledgedBy}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Tipo de Alerta */}
                              {currentExpandedAlert.type && (
                                <div className="bg-gradient-to-br from-white to-rose-50 rounded-2xl p-5 border-2 border-rose-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                  <div className="flex items-center gap-3">
                                    <span className="text-3xl">🏷️</span>
                                    <div className="flex-1">
                                      <p className="text-gray-500 font-bold text-sm mb-1">TIPO DE ALERTA</p>
                                      <p className="text-rose-800 font-black text-lg uppercase">
                                        {getMainTypeTranslation(currentExpandedAlert.type.toLowerCase())}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer del Modal */}
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-8 py-4 border-t-2 border-gray-300">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl">💡</span>
                        <p className="text-gray-700 font-semibold text-sm">
                          Haz zoom o mueve el mapa para explorar el área
                        </p>
                      </div>
                    </div>
                  </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

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

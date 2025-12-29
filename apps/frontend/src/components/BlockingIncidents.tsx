import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useBlockingAnalysis, type BlockingAnalysisItem } from '../hooks/useWazeData';
import { getIncidentDescription, getMainTypeTranslation, getSubtypeTranslation } from '../utils/wazeTranslations';
import { WazeIcon } from './WazeIcon';

// Icono personalizado para marcadores
const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para centrar el mapa
const MapCenterUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

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
  const [mapModalData, setMapModalData] = useState<{
    isOpen: boolean;
    locations: Array<{ lat: number; lng: number; id: string }>;
    title: string;
    description: string;
  } | null>(null);

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
      case 'linked': return '🔗 Datos directos';
      case 'proximity': return '📍 Zona afectada';
      case 'detour': return '🔄 Estimación desvío';
      case 'minimal': return '⚠️ Datos limitados';
      default: return method;
    }
  };

  const getDataQualityBadge = (quality?: string) => {
    switch (quality) {
      case 'high': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Datos reales' };
      case 'medium': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Datos parciales' };
      case 'low': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Estimación' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Sin datos' };
    }
  };

  // Tooltips explicativos para cada métrica
  const metricExplanations = {
    linkedJams: 'Demora REAL reportada por Waze en congestiones vinculadas directamente al incidente',
    proximity: 'Demora REAL de congestiones en calles cercanas (máx 300m del incidente)',
    detour: 'Tiempo adicional estimado por usar ruta alternativa (solo si no hay datos de congestión)',
    historical: 'Contexto: diferencia vs promedio histórico (NO se suma al total)',
    confidence: 'Precisión del cálculo según disponibilidad de datos reales de Waze',
    impact: 'Severidad considerando demora, extensión y tipo de vía'
  };

  // Calcula la antigüedad del incidente en formato legible
  const getIncidentAge = (timestamp: Date | string) => {
    const reportDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - reportDate.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    // Formato de duración
    let duration: string;
    if (years > 0) {
      duration = years === 1 ? '1 año' : `${years} años`;
      if (months % 12 > 0) duration += ` y ${months % 12} mes${months % 12 > 1 ? 'es' : ''}`;
    } else if (months > 0) {
      duration = months === 1 ? '1 mes' : `${months} meses`;
    } else if (days > 0) {
      duration = days === 1 ? '1 día' : `${days} días`;
    } else if (hours > 0) {
      duration = hours === 1 ? '1 hora' : `${hours} horas`;
    } else {
      duration = minutes <= 1 ? 'hace momentos' : `${minutes} minutos`;
    }

    // Formato de fecha
    const dateStr = reportDate.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return { duration, dateStr, days, isOld: days > 7 };
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🚨 Incidentes con Mayor Impacto
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Tiempo Real
          </span>
        </h2>
      </div>

      <div className="space-y-3">
        {data.analyses.slice(0, 5).map((analysis: BlockingAnalysisItem) => {
          const description = getIncidentDescription(
            analysis.incident.type,
            analysis.incident.subtype
          );
          const impactStyle = getImpactLevelStyle(analysis.impactScore);
          const age = getIncidentAge(analysis.incident.timestamp);

          return (
            <div
              key={analysis.incident.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors hover:shadow-md"
            >
              {/* Header del incidente */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <WazeIcon type={analysis.incident.type} subtype={analysis.incident.subtype} size="lg" />
                    <span>{description}</span>
                    {/* Debug info - mostrar tipo y subtipo */}
                    <span className="text-xs text-gray-400 ml-2 bg-gray-100 px-1 rounded">
                      {analysis.incident.type}:{analysis.incident.subtype || 'null'}
                    </span>
                  </h3>
                  {/* Mostrar descripción del evento si está disponible y es diferente del tipo traducido */}
                  {analysis.incident.description &&
                   analysis.incident.description !== description &&
                   analysis.incident.description !== analysis.incident.subtype &&
                   analysis.incident.description !== analysis.incident.type && (() => {
                    // Intentar traducir la descripción si es una key de Waze
                    let translatedDescription = analysis.incident.description;
                    const mainTypeTranslated = getMainTypeTranslation(analysis.incident.description);
                    if (mainTypeTranslated !== analysis.incident.description) {
                      translatedDescription = mainTypeTranslated;
                    } else if (analysis.incident.subtype) {
                      const subtypeTranslated = getSubtypeTranslation(analysis.incident.type, analysis.incident.description);
                      if (subtypeTranslated !== analysis.incident.description) {
                        translatedDescription = subtypeTranslated;
                      }
                    }
                    return (
                      <p className="text-xs text-blue-700 mt-1 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        <span>📝</span>
                        <span className="font-medium">Evento:</span>
                        <span>{translatedDescription}</span>
                      </p>
                    );
                  })()}
                  {/* Grupo/Polígono */}
                  {analysis.polygonGroup && (
                    <div className="mt-1">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded inline-block">
                        🛣️ {analysis.polygonGroup}
                      </span>
                    </div>
                  )}
                  {/* Sectores afectados con nombre del polígono */}
                  {analysis.affectedStreets?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      📍 {analysis.affectedStreets.join(', ')}
                      {analysis.polygonName && ` (${analysis.polygonName})`}
                    </p>
                  )}
                  {/* Antigüedad del incidente */}
                  <p className={`text-xs mt-1 flex items-center gap-1 ${age.isOld ? 'text-orange-600 font-medium' : 'text-gray-500'}`}
                     title={`Reportado el ${age.dateStr}`}>
                    <span>🕐</span>
                    <span>Activo hace {age.duration}</span>
                    {age.isOld && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded ml-1">Prolongado</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${impactStyle.bg} ${impactStyle.text}`}>
                    {impactStyle.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    Impacto: {analysis.impactScore}
                  </span>
                  {/* Indicador de múltiples reportes */}
                  {analysis.reportCount > 1 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                      👥 {analysis.reportCount} reportes
                    </span>
                  )}
                  {/* Botón para ver en mapa */}
                  <button
                    onClick={() => setMapModalData({
                      isOpen: true,
                      locations: analysis.allLocations || [{ lat: analysis.incident.location.lat, lng: analysis.incident.location.lng, id: analysis.incident.id }],
                      title: description,
                      description: analysis.incident.street || 'Ubicación del incidente'
                    })}
                    className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 transition-colors mt-1"
                    title="Ver ubicación en mapa"
                  >
                    🗺️ Ver mapa
                  </button>
                </div>
              </div>

              {/* Grid de métricas principales */}
              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2 border border-red-200">
                  <p className="text-gray-600 font-medium">Demora Estimada</p>
                  <p className="font-black text-red-700 text-lg">
                    {analysis.delay.totalDelayMinutes} min
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 border border-blue-200" title={metricExplanations.linkedJams}>
                  <p className="text-gray-600 font-medium flex items-center gap-1">
                    Tramos Afectados
                    <span className="text-blue-400 cursor-help">ⓘ</span>
                  </p>
                  <p className="font-black text-blue-700 text-lg">
                    {analysis.linkedJams + analysis.delay.consideredJams.nearby}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 border border-purple-200">
                  <p className="text-gray-600 font-medium">Extensión</p>
                  <p className="font-black text-purple-700 text-lg">
                    {analysis.affectedLengthKm} km
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 border border-green-200" title={metricExplanations.confidence}>
                  <p className="text-gray-600 font-medium flex items-center gap-1">
                    Precisión
                    <span className="text-green-400 cursor-help">ⓘ</span>
                  </p>
                  <p className={`font-black text-lg ${getConfidenceStyle(analysis.delay.confidence)}`}>
                    {analysis.delay.confidence}%
                  </p>
                </div>
              </div>

              {/* Desglose del cálculo de demora */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
                    📊 Origen de la Demora
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getDataQualityBadge(analysis.delay.dataQuality).bg} ${getDataQualityBadge(analysis.delay.dataQuality).text}`}>
                      {getDataQualityBadge(analysis.delay.dataQuality).label}
                    </span>
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {getMethodLabel(analysis.delay.primaryMethod)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center bg-white rounded p-2 border" title={metricExplanations.linkedJams}>
                    <p className="text-gray-500 flex items-center justify-center gap-1 text-[10px]">
                      Congestión directa
                      <span className="text-gray-400 cursor-help">ⓘ</span>
                    </p>
                    <p className="font-bold text-gray-800 text-sm">
                      {Math.round(analysis.delay.breakdown.linkedJamsDelay / 60)} min
                    </p>
                  </div>
                  <div className="text-center bg-white rounded p-2 border" title={metricExplanations.proximity}>
                    <p className="text-gray-500 flex items-center justify-center gap-1 text-[10px]">
                      Zona afectada
                      <span className="text-gray-400 cursor-help">ⓘ</span>
                    </p>
                    <p className="font-bold text-gray-800 text-sm">
                      {Math.round(analysis.delay.breakdown.proximityDelay / 60)} min
                    </p>
                  </div>
                  <div className="text-center bg-white rounded p-2 border" title={metricExplanations.detour}>
                    <p className="text-gray-500 flex items-center justify-center gap-1 text-[10px]">
                      Desvío estimado
                      <span className="text-gray-400 cursor-help">ⓘ</span>
                    </p>
                    <p className="font-bold text-gray-800 text-sm">
                      {Math.round(analysis.delay.breakdown.detourDelay / 60)} min
                    </p>
                  </div>
                </div>

                {/* Contexto histórico (informativo, no suma al total) */}
                {analysis.delay.breakdown.historicalDelta > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px]" title={metricExplanations.historical}>
                    <span className="text-gray-400 italic">
                      📈 Contexto: {Math.round(analysis.delay.breakdown.historicalDelta / 60)} min peor que promedio histórico
                    </span>
                    <span className="text-gray-400">(no suma al total)</span>
                  </div>
                )}

                {/* Datos raw de Waze */}
                {analysis.delay.rawDataUsed && analysis.delay.rawDataUsed.totalJamsConsidered > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-3 text-[10px] text-gray-400">
                    <span>📡 Datos Waze:</span>
                    <span>{analysis.delay.rawDataUsed.totalJamsConsidered} congestiones</span>
                    {analysis.delay.rawDataUsed.avgJamSpeed !== null && (
                      <span>• {analysis.delay.rawDataUsed.avgJamSpeed} km/h prom</span>
                    )}
                    <span>• {(analysis.delay.rawDataUsed.totalAffectedLength / 1000).toFixed(1)} km afectados</span>
                  </div>
                )}

                {analysis.delay.details && (
                  <p className="text-xs text-gray-600 mt-2 border-t border-gray-200 pt-2 leading-relaxed">
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
          <div className="flex items-center gap-3">
            <span className="text-gray-500">
              <strong className="text-gray-900">{data.count}</strong> incidentes
            </span>
            {data.summary.duplicatesRemoved > 0 && (
              <span className="text-xs text-blue-600" title={`Se agruparon ${data.summary.duplicatesRemoved} reportes duplicados`}>
                ({data.summary.totalReports} reportes agrupados)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1" title="Demoras calculadas usando datos reales del feed de Waze (delay, speed, length)">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
            Datos en tiempo real de Waze
          </div>
        </div>
      </div>

      {/* Modal del minimapa */}
      {mapModalData?.isOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={() => setMapModalData(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border-2 border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    🗺️ {mapModalData.title}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    📍 {mapModalData.description}
                    {mapModalData.locations.length > 1 && (
                      <span className="ml-2 bg-blue-500 px-2 py-0.5 rounded text-xs">
                        {mapModalData.locations.length} puntos reportados
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setMapModalData(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Mapa */}
            <div className="h-[400px]">
              <MapContainer
                center={[mapModalData.locations[0].lat, mapModalData.locations[0].lng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapCenterUpdater
                  center={[mapModalData.locations[0].lat, mapModalData.locations[0].lng]}
                  zoom={mapModalData.locations.length > 1 ? 14 : 16}
                />
                {mapModalData.locations.map((loc, index) => (
                  <Marker
                    key={loc.id || index}
                    position={[loc.lat, loc.lng]}
                    icon={incidentIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{mapModalData.title}</p>
                        <p className="text-gray-600">Reporte #{index + 1}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-3 border-t flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {mapModalData.locations.length === 1
                  ? '1 ubicación reportada'
                  : `${mapModalData.locations.length} ubicaciones reportadas en esta zona`}
              </span>
              <button
                onClick={() => setMapModalData(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

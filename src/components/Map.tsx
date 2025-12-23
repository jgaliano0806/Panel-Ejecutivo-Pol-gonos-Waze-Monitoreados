import React, { useEffect, useMemo } from 'react';
import { useRelativeTime } from '../hooks/useRelativeTime';
import { MapContainer, TileLayer, Polygon as LeafletPolygon, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Polygon, Incident, TrafficJam } from '../types';
import { PolygonState } from '../types';
import { getPolygonColor, getPolygonOpacity } from '../utils/polygonCalculations';
import {
    getIncidentDescription,
    getIncidentEmoji,
    getIncidentColor,
    getJamLevelTranslation,
    getRoadTypeTranslation
} from '../utils/wazeTranslations';
import { getPolygonById } from '../utils/polygonHelpers';
import { MAP_CONFIG } from '../config/constants';


// Helper para calcular dirección del flujo
const getFlowDirection = (start: { lat: number; lng: number }, end?: { lat: number; lng: number }): string => {
    if (!end) return 'No disponible';

    const deltaLat = end.lat - start.lat;
    const deltaLng = end.lng - start.lng;
    const angle = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);

    if (angle >= -22.5 && angle < 22.5) return '⬆️ Norte';
    if (angle >= 22.5 && angle < 67.5) return '↗️ Noreste';
    if (angle >= 67.5 && angle < 112.5) return '➡️ Este';
    if (angle >= 112.5 && angle < 157.5) return '↘️ Sureste';
    if (angle >= 157.5 || angle < -157.5) return '⬇️ Sur';
    if (angle >= -157.5 && angle < -112.5) return '↙️ Suroeste';
    if (angle >= -112.5 && angle < -67.5) return '⬅️ Oeste';
    if (angle >= -67.5 && angle < -22.5) return '↖️ Noroeste';
    return 'No disponible';
};

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Crear iconos dinámicos con emojis
const createEmojiMarker = (emoji: string, color: string) => L.divIcon({
    className: 'custom-incident-marker',
    html: `<div style="
        background-color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid ${color};
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const createJamIcon = (color: string) => L.divIcon({
    className: 'custom-jam-marker',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; opacity: 0.9;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

// Cache simple para evitar recrear objetos Leaflet idénticos
const MARKER_CACHE: Record<string, L.DivIcon> = {};

const getCachedEmojiMarker = (emoji: string, color: string) => {
    const key = `${emoji}-${color}`;
    if (!MARKER_CACHE[key]) {
        MARKER_CACHE[key] = createEmojiMarker(emoji, color);
    }
    return MARKER_CACHE[key];
};

interface MapProps {
    polygons: Polygon[];
    incidents: Incident[];
    jams: TrafficJam[];
    selectedPolygon: string | null;
    onPolygonClick: (polygonId: string) => void;
}

// Componente para ajustar el zoom automáticamente
const MapController: React.FC<{
    selectedPolygon: string | null;
    polygons: Polygon[];
    initialLoad: boolean;
}> = ({
    selectedPolygon,
    polygons,
    initialLoad
}) => {
        const map = useMap();

        // Ajustar mapa al cargar para mostrar todos los polígonos
        useEffect(() => {
            if (initialLoad && polygons.length > 0) {
                const allCoords: [number, number][] = [];

                // Recopilar todas las coordenadas de todos los polígonos
                polygons.forEach(polygon => {
                    polygon.geometry.coordinates[0].forEach(coord => {
                        allCoords.push([coord[1], coord[0]]); // [lat, lng]
                    });
                });

                if (allCoords.length > 0) {
                    const bounds = L.latLngBounds(allCoords);
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }, [initialLoad, polygons, map]);

        // Ajustar zoom cuando se selecciona un polígono
        useEffect(() => {
            if (selectedPolygon) {
                const polygon = polygons.find(p => p.id === selectedPolygon);
                if (polygon) {
                    const coords = polygon.geometry.coordinates[0];
                    const lats = coords.map(c => c[1]);
                    const lngs = coords.map(c => c[0]);
                    const bounds = L.latLngBounds(
                        [Math.min(...lats), Math.min(...lngs)],
                        [Math.max(...lats), Math.max(...lngs)]
                    );
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }, [selectedPolygon, polygons, map]);

        return null;
    };

// Componente para mostrar tiempo relativo sin usar Date.now() en render
const RelativeTime: React.FC<{ timestamp: string | Date }> = ({ timestamp }) => {
    const minutesAgo = useRelativeTime(timestamp);
    const timeString = typeof timestamp === 'string'
        ? new Date(timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        : timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    return <span className="text-sm">🕐 {timeString} • {minutesAgo} min</span>;
};

const Map: React.FC<MapProps> = ({
    polygons,
    incidents,
    jams,
    selectedPolygon,
    onPolygonClick
}) => {
    // Centro del mapa desde configuración
    const center: [number, number] = [MAP_CONFIG.defaultCenter.lat, MAP_CONFIG.defaultCenter.lng];

    // Flag para indicar carga inicial
    const [initialLoad, setInitialLoad] = React.useState(true);

    React.useEffect(() => {
        if (polygons.length > 0) {
            setInitialLoad(false);
        }
    }, [polygons]);

    // Obtener icono dinámico para incidentes
    const getIncidentMarker = (incident: Incident) => {
        const emoji = getIncidentEmoji(incident.type, incident.subtype);
        const color = getIncidentColor(incident.type);
        return getCachedEmojiMarker(emoji, color);
    };

    const getJamMarker = (jam: TrafficJam) => {
        if (jam.speed < 15) return createJamIcon('#ef4444');
        if (jam.speed < 30) return createJamIcon('#eab308');
        return createJamIcon('#22c55e');
    };

    // Memoizar incidentes filtrados
    const filteredIncidents = useMemo(() =>
        incidents.filter(inc => inc.polygonId),
        [incidents]
    );

    // Memoizar jams filtrados - Excluir jams TVT (no tienen coordenadas reales)
    const filteredJams = useMemo(() =>
        jams.filter(jam => jam.polygonId && jam.source !== 'tvt'), // Filtrar TVT: no tienen coords válidas
        [jams]
    );

    return (
        <div className="card p-0 overflow-hidden h-[850px]">
            <MapContainer
                center={center}
                zoom={MAP_CONFIG.defaultZoom}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController selectedPolygon={selectedPolygon} polygons={polygons} initialLoad={initialLoad} />

                {/* Renderizar polígonos */}
                {polygons.map((polygon) => {
                    const coords = polygon.geometry.coordinates[0].map(
                        c => [c[1], c[0]] as [number, number]
                    );

                    const isSelected = polygon.id === selectedPolygon;
                    const color = getPolygonColor(polygon.state);
                    const opacity = getPolygonOpacity(polygon.state);

                    return (
                        <LeafletPolygon
                            key={polygon.id}
                            positions={coords}
                            pathOptions={{
                                color: color,
                                fillColor: color,
                                fillOpacity: isSelected ? opacity * 1.5 : opacity,
                                weight: isSelected ? 3 : 2,
                            }}
                            eventHandlers={{
                                click: () => onPolygonClick(polygon.id),
                            }}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-semibold text-sm">{polygon.name}</h3>
                                    <p className="text-xs text-gray-600 mt-1">Grupo: {polygon.group}</p>
                                    <p className="text-xs mt-1">
                                        Estado: <span className={`font-medium ${polygon.state === PolygonState.HIGH ? 'text-danger' :
                                            polygon.state === PolygonState.MEDIUM ? 'text-warning' :
                                                'text-success'
                                            }`}>
                                            {polygon.state === PolygonState.HIGH ? 'Crítico' :
                                                polygon.state === PolygonState.MEDIUM ? 'Moderado' :
                                                    'Fluido'}
                                        </span>
                                    </p>
                                </div>
                            </Popup>
                        </LeafletPolygon>
                    );
                })}

                {/* Renderizar marcadores de incidentes */}
                {filteredIncidents.map((incident) => {
                    const emoji = getIncidentEmoji(incident.type);
                    const description = getIncidentDescription(incident.type, incident.subtype);
                    const polygon = incident.polygonId ? getPolygonById(polygons, incident.polygonId) : null;

                    return (
                        <Marker
                            key={incident.id}
                            position={[incident.location.lat, incident.location.lng]}
                            icon={getIncidentMarker(incident)}
                        >
                            <Popup maxWidth={700} className="custom-popup">
                                <div className="w-[700px] min-h-[300px] p-0 overflow-visible bg-white rounded-xl shadow-2xl border-3 border-black">
                                    {/* Header compacto - 40px */}
                                    <div className={`px-4 py-2.5 ${incident.severity >= 4 ? 'bg-gradient-to-r from-red-600 to-red-700' :
                                        incident.severity >= 3 ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
                                            incident.severity >= 2 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                                'bg-gradient-to-r from-gray-500 to-gray-600'
                                        } text-white`}>
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-black text-lg">{emoji} {description.toUpperCase()}</h3>
                                            <RelativeTime timestamp={incident.timestamp} />
                                        </div>
                                    </div>

                                    {/* Layout balanceado - 260px */}
                                    <div className="p-4 bg-gray-50">
                                        {/* FILA 1: Info Principal - 110px */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            {/* Severidad Grande */}
                                            <div className={`flex flex-col items-center justify-center rounded-xl p-4 border-3 shadow-xl ${incident.severity >= 4 ? 'bg-red-100 border-red-600' :
                                                incident.severity >= 3 ? 'bg-orange-100 border-orange-600' :
                                                    incident.severity >= 2 ? 'bg-yellow-100 border-yellow-600' :
                                                        'bg-gray-100 border-gray-600'
                                                }`}>
                                                <span className="text-4xl mb-2">⚠️</span>
                                                <p className="text-xs text-gray-700 font-bold uppercase mb-1">Severidad</p>
                                                <p className={`text-2xl font-black ${incident.severity >= 4 ? 'text-red-800' :
                                                    incident.severity >= 3 ? 'text-orange-800' :
                                                        incident.severity >= 2 ? 'text-yellow-800' : 'text-gray-800'
                                                    }`}>
                                                    {incident.severity >= 4 ? 'CRÍTICA' :
                                                        incident.severity >= 3 ? 'ALTA' :
                                                            incident.severity >= 2 ? 'MEDIA' : 'BAJA'}
                                                </p>
                                                {incident.nThumbsUp !== undefined && incident.nThumbsUp > 0 && (
                                                    <p className="text-sm font-bold text-green-700 mt-2">✓ {incident.nThumbsUp} confirmaciones</p>
                                                )}
                                            </div>

                                            {/* Ubicación Unificada */}
                                            <div className="bg-gradient-to-br from-blue-50 to-white border-3 border-blue-600 rounded-xl p-3 shadow-xl">
                                                {/* Tramo y Grupo */}
                                                {polygon && (
                                                    <div className="mb-3">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-2xl">🗺️</span>
                                                            <p className="text-xs text-blue-700 font-bold uppercase">Tramo</p>
                                                        </div>
                                                        <p className="text-lg text-blue-900 font-black leading-tight mb-1">{polygon.name}</p>
                                                        <p className="text-xs text-blue-600 font-semibold bg-blue-100 inline-block px-2 py-0.5 rounded">
                                                            📂 {polygon.group}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Separador */}
                                                {polygon && incident.street && (
                                                    <div className="h-px bg-blue-300 my-2"></div>
                                                )}

                                                {/* Ubicación específica */}
                                                {incident.street && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xl">📍</span>
                                                            <p className="text-xs text-gray-700 font-bold uppercase">Ubicación</p>
                                                        </div>
                                                        <p className="text-base text-gray-900 font-black leading-tight mb-0.5">{incident.street}</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {incident.city && (
                                                                <span className="text-xs text-gray-600 font-medium">🏙️ {incident.city}</span>
                                                            )}
                                                            <span className="text-xs text-gray-500 font-mono">
                                                                📐 {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* FILA 2: Métricas de Confiabilidad - 100px */}
                                        {(incident.reportRating !== undefined || incident.reliability !== undefined) && (
                                            <div className="grid grid-cols-3 gap-3">
                                                {incident.reportRating !== undefined && (
                                                    <div className="flex flex-col items-center justify-center bg-blue-50 border-2 border-blue-600 rounded-lg p-3 shadow-md">
                                                        <span className="text-3xl mb-1">📊</span>
                                                        <p className="text-xs text-blue-700 font-bold mb-1">RATING</p>
                                                        <p className="text-2xl font-black text-blue-900">{incident.reportRating}<span className="text-base">/10</span></p>
                                                    </div>
                                                )}
                                                {incident.reliability !== undefined && (
                                                    <div className="flex flex-col items-center justify-center bg-indigo-50 border-2 border-indigo-600 rounded-lg p-3 shadow-md">
                                                        <span className="text-3xl mb-1">✓</span>
                                                        <p className="text-xs text-indigo-700 font-bold mb-1">CONFIABILIDAD</p>
                                                        <p className="text-2xl font-black text-indigo-900">{incident.reliability}<span className="text-base">/10</span></p>
                                                    </div>
                                                )}
                                                {incident.nThumbsUp !== undefined && incident.nThumbsUp > 0 && (
                                                    <div className="flex flex-col items-center justify-center bg-green-50 border-2 border-green-600 rounded-lg p-3 shadow-md">
                                                        <span className="text-3xl mb-1">👍</span>
                                                        <p className="text-xs text-green-700 font-bold mb-1">VALIDACIONES</p>
                                                        <p className="text-2xl font-black text-green-900">{incident.nThumbsUp}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Renderizar líneas de congestión */}
                {filteredJams.map((jam) => {
                    // Verificar si tiene datos de línea
                    if (!jam.line || jam.line.length < 2) return null;

                    // Convertir coordenadas de Waze (x=lng, y=lat) a formato Leaflet [lat, lng]
                    const positions = jam.line.map(point => [point.y, point.x] as [number, number]);

                    // Color según velocidad
                    const lineColor =
                        jam.speed < 10 ? '#dc2626' :  // rojo
                            jam.speed < 20 ? '#ea580c' :  // naranja
                                jam.speed < 30 ? '#d97706' :  // amarillo oscuro
                                    '#16a34a';                     // verde

                    return (
                        <Polyline
                            key={`line-${jam.id}`}
                            positions={positions}
                            pathOptions={{
                                color: lineColor,
                                weight: 5,
                                opacity: 0.6,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }}
                        />
                    );
                })}

                {/* Renderizar marcadores de atascos */}
                {filteredJams.map((jam) => {
                    const jamLevelText = jam.level !== undefined
                        ? getJamLevelTranslation(jam.level)
                        : 'Congestión';
                    const polygon = jam.polygonId ? getPolygonById(polygons, jam.polygonId) : null;
                    const flowDirection = getFlowDirection(jam.location, jam.endLocation);

                    return (
                        <Marker
                            key={jam.id}
                            position={[jam.location.lat, jam.location.lng]}
                            icon={getJamMarker(jam)}
                        >
                            <Popup maxWidth={700} className="custom-popup">
                                <div className="w-[700px] min-h-[300px] p-0 overflow-visible bg-white rounded-xl shadow-2xl border-3 border-black">
                                    {/* Header compacto - 40px */}
                                    <div className={`px-4 py-2.5 ${(jam.level ?? 0) >= 4 ? 'bg-gradient-to-r from-red-600 to-red-700' :
                                        (jam.level ?? 0) >= 3 ? 'bg-gradient-to-r from-orange-600 to-orange-700' :
                                            (jam.level ?? 0) >= 2 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                                'bg-gradient-to-r from-green-600 to-green-700'
                                        } text-white`}>
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-black text-lg">🚦 {jamLevelText.toUpperCase()}</h3>
                                            <RelativeTime timestamp={jam.timestamp} />
                                        </div>
                                    </div>

                                    {/* Layout balanceado - 260px */}
                                    <div className="p-4 bg-gray-50">
                                        {/* FILA 1: Métricas de Impacto - 110px */}
                                        <div className="grid grid-cols-4 gap-3 mb-4">
                                            {/* Velocidad */}
                                            <div className={`flex flex-col items-center justify-center rounded-xl p-4 border-3 shadow-xl ${jam.speed < 10 ? 'bg-red-100 border-red-600' :
                                                jam.speed < 20 ? 'bg-orange-100 border-orange-600' :
                                                    jam.speed < 30 ? 'bg-yellow-100 border-yellow-600' :
                                                        'bg-green-100 border-green-600'
                                                }`}>
                                                <span className="text-3xl mb-1">🏎️</span>
                                                <p className="text-xs text-gray-700 font-bold uppercase mb-1">Velocidad</p>
                                                <p className={`text-xl font-black ${jam.speed < 10 ? 'text-red-800' :
                                                    jam.speed < 20 ? 'text-orange-800' :
                                                        jam.speed < 30 ? 'text-yellow-800' :
                                                            'text-green-800'
                                                    }`}>{jam.speed.toFixed(0)} km/h</p>
                                            </div>

                                            {/* Demora */}
                                            <div className="flex flex-col items-center justify-center bg-orange-100 border-3 border-orange-600 rounded-xl p-4 shadow-xl">
                                                <span className="text-3xl mb-1">⏱️</span>
                                                <p className="text-xs text-gray-700 font-bold uppercase mb-1">Demora</p>
                                                <p className="text-xl font-black text-orange-800">+{Math.round(jam.delay / 60)} min</p>
                                            </div>

                                            {/* Longitud */}
                                            <div className="flex flex-col items-center justify-center bg-blue-100 border-3 border-blue-600 rounded-xl p-4 shadow-xl">
                                                <span className="text-3xl mb-1">📏</span>
                                                <p className="text-xs text-gray-700 font-bold uppercase mb-1">Longitud</p>
                                                <p className="text-xl font-black text-blue-800">
                                                    {jam.length >= 1000 ? `${(jam.length / 1000).toFixed(1)} km` : `${jam.length} m`}
                                                </p>
                                            </div>

                                            {/* Nivel */}
                                            <div className="flex flex-col items-center justify-center bg-gray-100 border-3 border-gray-600 rounded-xl p-4 shadow-xl">
                                                <span className="text-3xl mb-1">⚡</span>
                                                <p className="text-xs text-gray-700 font-bold uppercase mb-1">Nivel</p>
                                                <p className={`text-xl font-black ${(jam.level ?? 0) >= 4 ? 'text-red-800' :
                                                    (jam.level ?? 0) >= 3 ? 'text-orange-800' :
                                                        (jam.level ?? 0) >= 2 ? 'text-yellow-800' :
                                                            'text-green-800'
                                                    }`}>{jam.level ?? 0}/5</p>
                                            </div>
                                        </div>

                                        {/* FILA 2: Ubicación y Detalles - 110px */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Ubicación Unificada - Ocupa 2 columnas */}
                                            <div className="col-span-2 bg-gradient-to-br from-blue-50 to-white border-3 border-blue-600 rounded-xl p-3 shadow-xl">
                                                {/* Tramo y Grupo */}
                                                {polygon && (
                                                    <div className="mb-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xl">🗺️</span>
                                                            <p className="text-xs text-blue-700 font-bold uppercase">Tramo</p>
                                                        </div>
                                                        <p className="text-base text-blue-900 font-black leading-tight mb-1">{polygon.name}</p>
                                                        <p className="text-xs text-blue-600 font-semibold bg-blue-100 inline-block px-2 py-0.5 rounded">
                                                            📂 {polygon.group}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Separador */}
                                                {polygon && jam.street && (
                                                    <div className="h-px bg-blue-300 my-2"></div>
                                                )}

                                                {/* Ubicación específica */}
                                                {jam.street && (
                                                    <div>
                                                        <div className="flex items-center gap-1 mb-0.5">
                                                            <span className="text-lg">📍</span>
                                                            <p className="text-xs text-gray-700 font-bold uppercase">Ubicación</p>
                                                        </div>
                                                        <p className="text-sm text-gray-900 font-black leading-tight mb-0.5">{jam.street}</p>
                                                        <p className="text-xs text-gray-500 font-mono">
                                                            📐 {jam.location.lat.toFixed(5)}, {jam.location.lng.toFixed(5)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Columna de Info Adicional */}
                                            <div className="flex flex-col gap-2">
                                                {/* Sentido */}
                                                <div className="flex flex-col items-center justify-center bg-indigo-50 border-2 border-indigo-600 rounded-lg p-2 shadow-md flex-1">
                                                    <span className="text-xl mb-1">🧭</span>
                                                    <p className="text-xs text-indigo-700 font-bold mb-0.5">SENTIDO</p>
                                                    <p className="text-sm font-black text-indigo-900 text-center">{flowDirection.split(' ')[1] || flowDirection}</p>
                                                </div>

                                                {/* Tipo Vía o Alerta */}
                                                {jam.roadType ? (
                                                    <div className="flex flex-col items-center justify-center bg-purple-50 border-2 border-purple-600 rounded-lg p-2 shadow-md flex-1">
                                                        <span className="text-xl mb-1">🛣️</span>
                                                        <p className="text-xs text-purple-700 font-bold mb-0.5">TIPO</p>
                                                        <p className="text-xs font-black text-purple-900 text-center leading-tight">{getRoadTypeTranslation(jam.roadType)}</p>
                                                    </div>
                                                ) : jam.blockingAlertUuid ? (
                                                    <div className="flex flex-col items-center justify-center bg-red-100 border-3 border-red-700 rounded-lg p-2 shadow-xl flex-1">
                                                        <span className="text-2xl mb-1">🚨</span>
                                                        <p className="text-xs font-black text-red-900 text-center">BLOQ.</p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default Map;

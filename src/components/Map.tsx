import React, { useEffect, useMemo, memo } from 'react';
import { MapContainer, TileLayer, Polygon as LeafletPolygon, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Polygon, Incident, TrafficJam } from '../types';
import { PolygonState } from '../types';
import { getPolygonColor, getPolygonOpacity } from '../utils/polygonCalculations';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Crear iconos una sola vez y reutilizarlos
const createIncidentIcon = (color: string) => L.divIcon({
    className: 'custom-incident-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const createJamIcon = (color: string) => L.divIcon({
    className: 'custom-jam-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; opacity: 0.8;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

// Cache de iconos para evitar recrearlos
const ICON_CACHE = {
    incidents: {
        red: createIncidentIcon('#ef4444'),
        orange: createIncidentIcon('#f97316'),
        darkRed: createIncidentIcon('#dc2626'),
        yellow: createIncidentIcon('#eab308'),
        gray: createIncidentIcon('#6b7280'),
    },
    jams: {
        red: createJamIcon('#ef4444'),
        yellow: createJamIcon('#eab308'),
        green: createJamIcon('#22c55e'),
    }
};

interface MapProps {
    polygons: Polygon[];
    incidents: Incident[];
    jams: TrafficJam[];
    selectedPolygon: string | null;
    onPolygonClick: (polygonId: string) => void;
}

// Componente para ajustar el zoom cuando cambia el polígono seleccionado
const MapController: React.FC<{ selectedPolygon: string | null; polygons: Polygon[] }> = ({
    selectedPolygon,
    polygons
}) => {
    const map = useMap();

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

const Map: React.FC<MapProps> = ({
    polygons,
    incidents,
    jams,
    selectedPolygon,
    onPolygonClick
}) => {
    // Centro aproximado de Buenos Aires
    const center: [number, number] = [-34.6037, -58.3816];

    // Usar iconos del cache - performance mejorada
    const getIncidentIcon = (incident: Incident) => {
        switch (incident.type) {
            case 'accident':
                return ICON_CACHE.incidents.red;
            case 'construction':
                return ICON_CACHE.incidents.orange;
            case 'roadclosed':
                return ICON_CACHE.incidents.darkRed;
            case 'hazard':
                return ICON_CACHE.incidents.yellow;
            default:
                return ICON_CACHE.incidents.gray;
        }
    };

    const getJamIcon = (jam: TrafficJam) => {
        if (jam.speed < 15) return ICON_CACHE.jams.red;
        if (jam.speed < 30) return ICON_CACHE.jams.yellow;
        return ICON_CACHE.jams.green;
    };

    // Memoizar incidentes filtrados
    const filteredIncidents = useMemo(() => 
        incidents.filter(inc => inc.polygonId),
        [incidents]
    );

    // Memoizar jams filtrados
    const filteredJams = useMemo(() =>
        jams.filter(jam => jam.polygonId),
        [jams]
    );

    return (
        <div className="card p-0 overflow-hidden h-[600px]">
            <MapContainer
                center={center}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController selectedPolygon={selectedPolygon} polygons={polygons} />

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
                {filteredIncidents.map((incident) => (
                        <Marker
                            key={incident.id}
                            position={[incident.location.lat, incident.location.lng]}
                            icon={getIncidentIcon(incident)}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-semibold text-sm capitalize">{incident.type}</h3>
                                    <p className="text-xs text-gray-600 mt-1">{incident.description}</p>
                                    <p className="text-xs mt-1">
                                        Severidad: <span className={`font-medium ${incident.severity >= 3 ? 'text-danger' : 'text-warning'
                                            }`}>
                                            {incident.severity >= 4 ? 'Crítica' :
                                                incident.severity >= 3 ? 'Alta' :
                                                    incident.severity >= 2 ? 'Media' : 'Baja'}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(incident.timestamp).toLocaleTimeString('es-AR')}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                {/* Renderizar marcadores de atascos */}
                {filteredJams.map((jam) => (
                        <Marker
                            key={jam.id}
                            position={[jam.location.lat, jam.location.lng]}
                            icon={getJamIcon(jam)}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-semibold text-sm">Atasco</h3>
                                    <p className="text-xs mt-1">Velocidad: <span className="font-medium">{jam.speed} km/h</span></p>
                                    <p className="text-xs">Delay: <span className="font-medium">{Math.round(jam.delay / 60)} min</span></p>
                                    <p className="text-xs">Longitud: <span className="font-medium">{jam.length}m</span></p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(jam.timestamp).toLocaleTimeString('es-AR')}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
            </MapContainer>
        </div>
    );
};

export default Map;

import React, { useState } from 'react';
import { MapPin, Clock, AlertCircle, Filter } from 'lucide-react';
import { useIncidentsHistory, useIncidentsHotspots, useIncidentsStats } from '../hooks/useIncidentsHistory';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export const IncidentsHistoryPage: React.FC = () => {
    const [filters, setFilters] = useState({
        polygon_id: '',
        type: '',
        from: '',
        to: '',
        limit: 50
    });

    const [statsGroupBy, setStatsGroupBy] = useState<'type' | 'hour' | 'day'>('type');

    const { data: incidents, isLoading: incidentsLoading } = useIncidentsHistory(filters);
    const { data: hotspots, isLoading: hotspotsLoading } = useIncidentsHotspots({ limit: 10 });
    const { data: stats } = useIncidentsStats({ group_by: statsGroupBy });

    const getIncidentTypeColor = (type: string) => {
        switch (type) {
            case 'ACCIDENT': return '#ef4444';
            case 'JAM': return '#f59e0b';
            case 'ROAD_CLOSED': return '#dc2626';
            case 'HAZARD': return '#eab308';
            default: return '#6b7280';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Historial de Incidentes</h1>
                <p className="text-gray-500 mt-1">Análisis detallado de incidentes históricos</p>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-700">Filtros</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input
                        type="text"
                        placeholder="ID Polígono"
                        value={filters.polygon_id}
                        onChange={(e) => setFilters({ ...filters, polygon_id: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="ACCIDENT">Accidente</option>
                        <option value="JAM">Congestión</option>
                        <option value="ROAD_CLOSED">Carretera Cerrada</option>
                        <option value="HAZARD">Peligro</option>
                    </select>
                    <input
                        type="date"
                        placeholder="Desde"
                        value={filters.from}
                        onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                        type="date"
                        placeholder="Hasta"
                        value={filters.to}
                        onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                        type="number"
                        placeholder="Límite"
                        value={filters.limit}
                        onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mapa de Puntos Negros */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Puntos Negros</h2>
                    {hotspotsLoading ? (
                        <div className="h-96 flex items-center justify-center">
                            <div className="text-gray-400">Cargando...</div>
                        </div>
                    ) : hotspots && hotspots.length > 0 ? (
                        <MapContainer
                            center={[hotspots[0].latitude, hotspots[0].longitude]}
                            zoom={10}
                            style={{ height: '400px', borderRadius: '8px' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            {hotspots.map((hotspot, idx) => (
                                <CircleMarker
                                    key={idx}
                                    center={[hotspot.latitude, hotspot.longitude]}
                                    radius={Math.min(hotspot.incident_count * 2, 30)}
                                    pathOptions={{
                                        color: getIncidentTypeColor(hotspot.most_common_type),
                                        fillColor: getIncidentTypeColor(hotspot.most_common_type),
                                        fillOpacity: 0.5
                                    }}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <div className="font-semibold">{hotspot.street || 'Sin nombre'}</div>
                                            <div>Incidentes: {hotspot.incident_count}</div>
                                            <div>Duración promedio: {hotspot.avg_duration_minutes?.toFixed(0)} min</div>
                                            <div>Tipo más común: {hotspot.most_common_type}</div>
                                        </div>
                                    </Popup>
                                    <Tooltip>{hotspot.incident_count} incidentes</Tooltip>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    ) : (
                        <div className="h-96 flex items-center justify-center text-gray-400">
                            No hay datos de puntos negros
                        </div>
                    )}
                </div>

                {/* Estadísticas */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Estadísticas</h2>
                        <select
                            value={statsGroupBy}
                            onChange={(e) => setStatsGroupBy(e.target.value as 'type' | 'hour' | 'day')}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                        >
                            <option value="type">Por Tipo</option>
                            <option value="hour">Por Hora</option>
                            <option value="day">Por Día</option>
                        </select>
                    </div>
                    {stats && stats.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900">{stat.category}</span>
                                        <span className="text-sm text-gray-500">{stat.total_incidents} incidentes</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div>
                                            <div className="text-gray-500">Duración avg</div>
                                            <div className="font-medium">{stat.avg_duration?.toFixed(0)} min</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Demora avg</div>
                                            <div className="font-medium">{stat.avg_delay?.toFixed(0)} min</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Bloqueos</div>
                                            <div className="font-medium">{stat.total_blocking_jams}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-96 flex items-center justify-center text-gray-400">
                            No hay estadísticas disponibles
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de incidentes */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Incidentes Recientes ({incidents?.length || 0})
                </h2>
                {incidentsLoading ? (
                    <div className="text-center py-8 text-gray-400">Cargando...</div>
                ) : incidents && incidents.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {incidents.map((incident) => (
                            <div
                                key={incident.incident_id}
                                className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                                                style={{ backgroundColor: getIncidentTypeColor(incident.type) }}
                                            >
                                                {incident.type}
                                            </span>
                                            {incident.subtype && (
                                                <span className="text-sm text-gray-500">{incident.subtype}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {incident.street || 'Sin ubicación'}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {incident.duration_minutes
                                                    ? `${incident.duration_minutes} min`
                                                    : 'En curso'
                                                }
                                            </div>
                                            {incident.estimated_delay_minutes && (
                                                <div className="flex items-center gap-1">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Demora: {incident.estimated_delay_minutes} min
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        {new Date(incident.first_seen_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">No hay incidentes</div>
                )}
            </div>
        </div>
    );
};




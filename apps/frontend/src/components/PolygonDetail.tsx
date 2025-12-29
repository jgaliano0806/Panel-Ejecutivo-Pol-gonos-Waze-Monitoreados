import React from 'react';
import type { Polygon, Incident, TrafficJam, IncidentType } from '../types';
import { PolygonState } from '../types';
import { calculatePolygonStats, formatDelay } from '../utils/polygonCalculations';
import {
    getIncidentDescription,
    getJamLevelTranslation,
    getRoadTypeTranslation
} from '../utils/wazeTranslations';
import { CongestionIndexCard } from './CongestionIndexCard';
import { WazeIcon } from './WazeIcon';

interface PolygonDetailProps {
    polygon: Polygon;
    incidents: Incident[];
    jams: TrafficJam[];
    onClose: () => void;
}

const PolygonDetail: React.FC<PolygonDetailProps> = ({
    polygon,
    incidents,
    jams,
    onClose
}) => {
    const stats = calculatePolygonStats(polygon, incidents, jams);
    const polygonIncidents = incidents.filter(inc => inc.polygonId === polygon.id);
    const polygonJams = jams.filter(jam => jam.polygonId === polygon.id);

    const getStateLabel = (state: PolygonState) => {
        switch (state) {
            case PolygonState.HIGH:
                return { label: 'Crítico', color: 'text-danger', bg: 'bg-danger-light/20' };
            case PolygonState.MEDIUM:
                return { label: 'Moderado', color: 'text-warning', bg: 'bg-warning-light/20' };
            case PolygonState.LOW:
                return { label: 'Fluido', color: 'text-success', bg: 'bg-success-light/20' };
        }
    };

    const stateInfo = getStateLabel(stats.state);

    return (
        <div className="flex flex-col h-full">
            {/* Header fijo */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{polygon.name}</h2>
                        <p className="text-xs text-gray-600 mt-1">Grupo: {polygon.group}</p>
                        <div className="mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stateInfo.bg} ${stateInfo.color}`}>
                                Estado: {stateInfo.label}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* KPIs del polígono - Compactos */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-600 uppercase">Incidentes</p>
                        <p className="text-xl font-bold text-gray-900">{stats.totalIncidents}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-600 uppercase">Críticos</p>
                        <p className="text-xl font-bold text-danger">{stats.criticalIncidents}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-600 uppercase">Velocidad</p>
                        <p className="text-xl font-bold text-gray-900">
                            {stats.averageSpeed !== null ? `${Math.round(stats.averageSpeed)}` : '-'}
                            <span className="text-xs text-gray-500 ml-1">km/h</span>
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-600 uppercase">Demora</p>
                        <p className="text-xl font-bold text-gray-900">
                            {stats.totalDelay > 0 ? formatDelay(stats.totalDelay) : '-'}
                        </p>
                    </div>
                </div>

                {/* Índice de Congestión (si hay datos) */}
                {polygon.trafficMetrics && (
                    <div className="mb-4">
                        <CongestionIndexCard
                            polygonId={polygon.id}
                            metrics={polygon.trafficMetrics}
                        />
                    </div>
                )}

                {/* Lista de incidentes */}
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase">
                        Incidentes ({polygonIncidents.length})
                    </h3>
                {polygonIncidents.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No hay incidentes activos</p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {polygonIncidents.map(incident => {
                            const description = getIncidentDescription(incident.type, incident.subtype);

                            return (
                                <div
                                    key={incident.id}
                                    className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                                >
                                    {/* Header con icono Waze */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
                                        <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                            <WazeIcon type={incident.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {incident.street && (
                                                <p className="text-[10px] text-gray-500 truncate uppercase">
                                                    {incident.street}
                                                </p>
                                            )}
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {description}
                                            </p>
                                        </div>
                                        <span className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full font-bold ${
                                            incident.severity >= 4 ? 'bg-red-100 text-red-700' :
                                            incident.severity >= 3 ? 'bg-orange-100 text-orange-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            Sev. {incident.severity}
                                        </span>
                                    </div>

                                    {/* Información detallada */}
                                    <div className="p-3 space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-medium">Tipo</span>
                                            <span className="text-gray-900">{description}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-medium">Fecha</span>
                                            <span className="text-gray-900">
                                                {new Date(incident.timestamp).toLocaleString('es-AR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        {incident.city && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Ciudad</span>
                                                <span className="text-gray-900">{incident.city}</span>
                                            </div>
                                        )}
                                        {incident.confidence !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Confianza</span>
                                                <span className="text-gray-900">{Math.round(incident.confidence * 100)}%</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-medium">ID</span>
                                            <span className="text-gray-400 font-mono text-[10px] truncate max-w-[150px]">
                                                {incident.id}
                                            </span>
                                        </div>

                                        {/* Footer con confirmaciones */}
                                        {incident.nThumbsUp !== undefined && incident.nThumbsUp > 0 && (
                                            <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                    </svg>
                                                    <span className="font-medium">{incident.nThumbsUp} confirmación{incident.nThumbsUp > 1 ? 'es' : ''}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

                {/* Lista de atascos */}
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase">
                        Atascos ({polygonJams.length})
                    </h3>
                    {polygonJams.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No hay atascos reportados</p>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {polygonJams.map(jam => {
                                const jamLevelText = jam.level !== undefined
                                    ? getJamLevelTranslation(jam.level)
                                    : 'Sin info';

                                return (
                                    <div
                                        key={jam.id}
                                        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                                    >
                                        {/* Header con icono Waze */}
                                        <div className="flex items-center gap-3 p-3 bg-red-50 border-b border-red-100">
                                            <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                                <WazeIcon type="jam" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {jam.street && (
                                                    <p className="text-[10px] text-gray-500 truncate uppercase">
                                                        {jam.street}
                                                    </p>
                                                )}
                                                <p className="text-sm font-bold text-gray-900">
                                                    {jamLevelText}
                                                </p>
                                            </div>
                                            <span className={`flex-shrink-0 text-sm px-3 py-1 rounded-full font-black ${
                                                jam.speed < 15 ? 'bg-red-100 text-red-700' :
                                                jam.speed < 30 ? 'bg-orange-100 text-orange-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {jam.speed} km/h
                                            </span>
                                        </div>

                                        {/* Información detallada */}
                                        <div className="p-3 space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Demora estimada</span>
                                                <span className="text-gray-900 font-bold">{formatDelay(jam.delay)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Longitud</span>
                                                <span className="text-gray-900">{jam.length} metros</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">Severidad</span>
                                                <span className="text-gray-900">{jam.severity}/5</span>
                                            </div>
                                            {jam.roadType && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500 font-medium">Tipo de vía</span>
                                                    <span className="text-gray-900">{getRoadTypeTranslation(jam.roadType)}</span>
                                                </div>
                                            )}
                                            {jam.city && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500 font-medium">Ciudad</span>
                                                    <span className="text-gray-900">{jam.city}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-medium">ID</span>
                                                <span className="text-gray-400 font-mono text-[10px] truncate max-w-[150px]">
                                                    {jam.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Indicador de experiencia del usuario */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Impacto en Usuarios</h3>
                    <div className="bg-gradient-to-r from-success-light/20 via-warning-light/20 to-danger-light/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-700">Nivel de impacto</p>
                                <p className="text-sm font-bold text-gray-900 mt-1">
                                    {stats.state === PolygonState.HIGH ? 'Alto' :
                                        stats.state === PolygonState.MEDIUM ? 'Medio' : 'Bajo'}
                                </p>
                            </div>
                            {stats.totalDelay > 0 && (
                                <div className="text-right">
                                    <p className="text-xs text-gray-700">Tiempo extra</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                        +{formatDelay(stats.totalDelay)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolygonDetail;

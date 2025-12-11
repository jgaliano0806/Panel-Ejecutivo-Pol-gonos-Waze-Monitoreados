import React from 'react';
import type { Polygon, Incident, TrafficJam } from '../types';
import { PolygonState } from '../types';
import { calculatePolygonStats, formatDelay } from '../utils/polygonCalculations';
import { 
    getIncidentDescription, 
    getIncidentEmoji, 
    getJamLevelTranslation,
    getRoadTypeTranslation 
} from '../utils/wazeTranslations';
import { CongestionIndexCard } from './CongestionIndexCard';

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
        <div className="card">
            {/* Header */}
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{polygon.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">Grupo: {polygon.group}</p>
                    <div className="mt-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stateInfo.bg} ${stateInfo.color}`}>
                            Estado: {stateInfo.label}
                        </span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* KPIs del polígono */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Incidentes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalIncidents}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Críticos</p>
                    <p className="text-2xl font-bold text-danger mt-1">{stats.criticalIncidents}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Velocidad Prom.</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stats.averageSpeed !== null ? `${Math.round(stats.averageSpeed)}` : '-'}
                        {stats.averageSpeed !== null && <span className="text-sm text-gray-500 ml-1">km/h</span>}
                    </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Delay Total</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {stats.totalDelay > 0 ? formatDelay(stats.totalDelay) : '-'}
                    </p>
                </div>
            </div>

            {/* Índice de Congestión (si hay datos) */}
            {polygon.trafficMetrics && (
                <div className="mb-6">
                    <CongestionIndexCard 
                        polygonId={polygon.id}
                        metrics={polygon.trafficMetrics}
                    />
                </div>
            )}

            {/* Lista de incidentes */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Incidentes Activos ({polygonIncidents.length})
                </h3>
                {polygonIncidents.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No hay incidentes activos</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {polygonIncidents.map(incident => {
                            const emoji = getIncidentEmoji(incident.type);
                            const description = getIncidentDescription(incident.type, incident.subtype);
                            
                            return (
                                <div
                                    key={incident.id}
                                    className="bg-gray-50 rounded-lg p-3 text-sm border-l-4 border-orange-400"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {emoji} {description}
                                            </p>
                                            {incident.street && (
                                                <p className="text-xs text-gray-600 mt-1">
                                                    📍 {incident.street}
                                                </p>
                                            )}
                                            {/* Solo mostrar descripción si no es una key */}
                                            {incident.description && 
                                             incident.description !== incident.subtype &&
                                             !/^[A-Z_]+$/.test(incident.description) && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {incident.description}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${incident.severity >= 3 ? 'bg-danger-light/30 text-danger-dark' : 'bg-warning-light/30 text-warning-dark'
                                            }`}>
                                            Sev. {incident.severity}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-gray-500">
                                            {new Date(incident.timestamp).toLocaleString('es-AR')}
                                        </p>
                                        {incident.nThumbsUp && incident.nThumbsUp > 0 && (
                                            <p className="text-xs text-green-600">
                                                👍 {incident.nThumbsUp} confirmaciones
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lista de atascos */}
            <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Atascos Activos ({polygonJams.length})
                </h3>
                {polygonJams.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No hay atascos reportados</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {polygonJams.map(jam => {
                            const jamLevelText = jam.level !== undefined 
                                ? getJamLevelTranslation(jam.level) 
                                : 'Sin información';
                            
                            return (
                                <div
                                    key={jam.id}
                                    className="bg-gray-50 rounded-lg p-3 text-sm border-l-4 border-red-400"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900">
                                            🚦 {jamLevelText}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                                            jam.speed < 15 ? 'bg-danger-light/30 text-danger-dark' :
                                            jam.speed < 30 ? 'bg-warning-light/30 text-warning-dark' :
                                            'bg-success-light/30 text-success-dark'
                                        }`}>
                                            {jam.speed} km/h
                                        </span>
                                    </div>
                                    
                                    {jam.street && (
                                        <p className="text-xs text-gray-600 mb-2">
                                            📍 {jam.street}
                                        </p>
                                    )}
                                    
                                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                        <div>
                                            <p className="text-gray-500">Demora</p>
                                            <p className="font-medium text-gray-900">{formatDelay(jam.delay)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Longitud</p>
                                            <p className="font-medium text-gray-900">{jam.length}m</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Severidad</p>
                                            <p className="font-medium text-gray-900">{jam.severity}/5</p>
                                        </div>
                                    </div>
                                    
                                    {jam.roadType && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            🛣️ {getRoadTypeTranslation(jam.roadType)}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Indicador de experiencia del usuario */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Impacto en Usuarios</h3>
                <div className="bg-gradient-to-r from-success-light/20 via-warning-light/20 to-danger-light/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-700">Nivel de impacto estimado</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                                {stats.state === PolygonState.HIGH ? 'Alto' :
                                    stats.state === PolygonState.MEDIUM ? 'Medio' : 'Bajo'}
                            </p>
                        </div>
                        {stats.totalDelay > 0 && (
                            <div className="text-right">
                                <p className="text-sm text-gray-700">Tiempo extra estimado</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                    +{formatDelay(stats.totalDelay)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolygonDetail;

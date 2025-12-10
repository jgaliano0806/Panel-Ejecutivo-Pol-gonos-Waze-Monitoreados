import React from 'react';
import type { Incident, Polygon } from '../types';
import { Severity } from '../types';
import { getPolygonById } from '../utils/polygonHelpers';
import { getIncidentDescription, getIncidentEmoji } from '../utils/wazeTranslations';

interface AlertsPanelProps {
    incidents: Incident[];
    polygons: Polygon[];
    limit?: number;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ incidents, polygons, limit = 10 }) => {
    // Ordenar por severidad y timestamp
    const sortedIncidents = [...incidents]
        .sort((a, b) => {
            // Primero por severidad (mayor a menor)
            if (b.severity !== a.severity) {
                return b.severity - a.severity;
            }
            // Luego por timestamp (más reciente primero)
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .slice(0, limit);

    const getSeverityBadge = (severity: Severity) => {
        if (severity >= Severity.CRITICAL) {
            return <span className="badge badge-danger">Crítica</span>;
        } else if (severity >= Severity.HIGH) {
            return <span className="badge bg-orange-100 text-orange-800">Alta</span>;
        } else if (severity >= Severity.MEDIUM) {
            return <span className="badge badge-warning">Media</span>;
        }
        return <span className="badge bg-gray-100 text-gray-700">Baja</span>;
    };

    const getIncidentTypeLabel = (incident: Incident) => {
        const emoji = getIncidentEmoji(incident.type);
        const description = getIncidentDescription(incident.type, incident.subtype);
        return `${emoji} ${description}`;
    };

    const getIncidentIcon = (type: string) => {
        switch (type) {
            case 'accident':
                return (
                    <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'construction':
                return (
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                );
            case 'roadclosed':
                return (
                    <svg className="w-5 h-5 text-danger-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
        return new Date(date).toLocaleDateString('es-AR');
    };

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Alertas Estratégicas</h2>
                <span className="text-sm text-gray-500">{sortedIncidents.length} activas</span>
            </div>

            <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
                {sortedIncidents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">No hay alertas activas</p>
                    </div>
                ) : (
                    sortedIncidents.map((incident) => {
                        const polygon = incident.polygonId ? getPolygonById(polygons, incident.polygonId) : null;

                        return (
                            <div
                                key={incident.id}
                                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getIncidentIcon(incident.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-sm font-medium text-gray-900">
                                                {getIncidentTypeLabel(incident)}
                                            </h3>
                                            {getSeverityBadge(incident.severity)}
                                        </div>

                                        {incident.street && (
                                            <p className="text-xs text-gray-600 mb-1">
                                                📍 {incident.street}
                                            </p>
                                        )}
                                        
                                        {/* Solo mostrar descripción si no es una key */}
                                        {incident.description && 
                                         incident.description !== incident.subtype &&
                                         !/^[A-Z_]+$/.test(incident.description) && (
                                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                                {incident.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="font-medium text-primary-600">
                                                {polygon ? polygon.name : 'Fuera de polígonos'}
                                            </span>
                                            <span>{formatTime(incident.timestamp)}</span>
                                        </div>

                                        {incident.nThumbsUp && incident.nThumbsUp > 0 && (
                                            <div className="mt-2 flex items-center text-xs text-gray-500">
                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                </svg>
                                                {incident.nThumbsUp} confirmaciones
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AlertsPanel;

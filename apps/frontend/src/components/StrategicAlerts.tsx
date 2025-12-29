import React from 'react';
import type { DiscrepancyAlert } from '../types';

interface StrategicAlertsProps {
    alerts: DiscrepancyAlert[];
    onAcknowledge: (alertId: string) => void;
}

export const StrategicAlerts: React.FC<StrategicAlertsProps> = ({
    alerts,
    onAcknowledge
}) => {
    const activeAlerts = alerts.filter(a => !a.isAcknowledged);

    // Ordenar por severidad
    const sortedAlerts = [...activeAlerts].sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
    });

    if (sortedAlerts.length === 0) {
        return (
            <div className="card p-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <div>
                        <h3 className="font-bold text-green-700">Todo en Orden</h3>
                        <p className="text-sm text-gray-600">Las fuentes de datos (Waze y Sensores) coinciden en sus reportes.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        Análisis de Discrepancias (Waze vs Sensores)
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                        <strong>Objetivo:</strong> Detectar cuando los usuarios (Waze) y los sensores (TVT) reportan realidades diferentes.
                        Esto permite identificar fallos de medición o situaciones confusas.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {sortedAlerts.filter(a => a.severity === 'critical').length > 0 && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                            {sortedAlerts.filter(a => a.severity === 'critical').length} Crítica{sortedAlerts.filter(a => a.severity === 'critical').length !== 1 ? 's' : ''}
                        </span>
                    )}
                    {sortedAlerts.filter(a => a.severity === 'high').length > 0 && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                            {sortedAlerts.filter(a => a.severity === 'high').length} Alta{sortedAlerts.filter(a => a.severity === 'high').length !== 1 ? 's' : ''}
                        </span>
                    )}
                    {sortedAlerts.filter(a => a.severity === 'medium').length > 0 && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                            {sortedAlerts.filter(a => a.severity === 'medium').length} Media{sortedAlerts.filter(a => a.severity === 'medium').length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {sortedAlerts.map(alert => (
                    <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={onAcknowledge}
                    />
                ))}
            </div>
        </div>
    );
};

interface AlertCardProps {
    alert: DiscrepancyAlert;
    onAcknowledge: (id: string) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onAcknowledge }) => {
    const getAlertColors = () => {
        switch (alert.severity) {
            case 'critical':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-500',
                    text: 'text-red-900',
                    badge: 'bg-red-600 text-white'
                };
            case 'high':
                return {
                    bg: 'bg-orange-50',
                    border: 'border-orange-500',
                    text: 'text-orange-900',
                    badge: 'bg-orange-600 text-white'
                };
            case 'medium':
                return {
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-500',
                    text: 'text-yellow-900',
                    badge: 'bg-yellow-600 text-white'
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-500',
                    text: 'text-blue-900',
                    badge: 'bg-blue-600 text-white'
                };
        }
    };

    const getAlertIcon = () => {
        switch (alert.severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return 'ℹ️';
            default: return '💡';
        }
    };

    const getAlertTypeLabel = () => {
        switch (alert.type) {
            case 'speed_discrepancy': return 'Velocidad';
            case 'coverage_discrepancy': return 'Cobertura';
            case 'delay_discrepancy': return 'Delay';
            default: return 'Desconocido';
        }
    };

    const colors = getAlertColors();

    return (
        <div className={`border-l-4 ${colors.bg} ${colors.border} p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getAlertIcon()}</span>
                        <span className={`px-2 py-0.5 ${colors.badge} rounded text-xs font-bold uppercase`}>
                            {alert.severity}
                        </span>
                        <span className="px-2 py-0 bg-gray-200 text-gray-700 rounded text-xs font-semibold">
                            {getAlertTypeLabel()}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                            {alert.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Message */}
                    <p className={`font-bold ${colors.text} mb-3 text-sm`}>{alert.message}</p>

                    {/* Data Comparison */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white p-2 rounded border border-blue-200">
                            <p className="text-xs text-blue-700 font-semibold mb-1">📱 Waze (Reportado)</p>
                            <div className="space-y-0.5 text-xs">
                                <p className="font-mono">
                                    Velocidad: <span className="font-bold">{alert.data.waze.avgSpeed} km/h</span>
                                </p>
                                <p className="font-mono">
                                    Delay: <span className="font-bold">{alert.data.waze.avgDelay}s</span>
                                </p>
                                <p className="font-mono">
                                    Jams: <span className="font-bold">{alert.data.waze.count}</span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-2 rounded border border-green-200">
                            <p className="text-xs text-green-700 font-semibold mb-1">🛣️ TVT (Calculado)</p>
                            <div className="space-y-0.5 text-xs">
                                <p className="font-mono">
                                    Velocidad: <span className="font-bold">{alert.data.tvt.avgSpeed} km/h</span>
                                </p>
                                <p className="font-mono">
                                    Delay: <span className="font-bold">{alert.data.tvt.avgDelay}s</span>
                                </p>
                                <p className="font-mono">
                                    Segmentos: <span className="font-bold">{alert.data.tvt.count}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-white p-3 rounded border-l-3 border-blue-500 shadow-sm">
                        <div className="flex items-start gap-2">
                            <span className="text-lg">💡</span>
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-blue-900 uppercase mb-1">Recomendación</p>
                                <p className="text-sm text-gray-800">{alert.recommendation}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 hover:border-gray-400 transition-colors whitespace-nowrap"
                    title="Marcar como reconocida"
                >
                    ✓ Reconocer
                </button>
            </div>
        </div>
    );
};

export default StrategicAlerts;

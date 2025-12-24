import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useWeatherAlerts } from '../../hooks/useWeather';
import { motion, AnimatePresence } from 'framer-motion';

export const WeatherAlertsPanel: React.FC = () => {
    const { data: alerts, isLoading } = useWeatherAlerts();
    const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

    const activeAlerts = alerts?.filter(a => !dismissed.has(a.polygon_id)) || [];

    if (isLoading || activeAlerts.length === 0) return null;

    const getSeverityStyles = (severity?: string) => {
        switch (severity) {
            case 'CRITICAL':
                return 'bg-red-100 border-red-500 text-red-900';
            case 'HIGH':
                return 'bg-orange-100 border-orange-500 text-orange-900';
            case 'MEDIUM':
                return 'bg-yellow-100 border-yellow-500 text-yellow-900';
            default:
                return 'bg-blue-100 border-blue-500 text-blue-900';
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
            <AnimatePresence>
                {activeAlerts.map((alert) => (
                    <motion.div
                        key={alert.polygon_id}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className={`border-l-4 p-4 rounded-lg shadow-lg ${getSeverityStyles(alert.alert_severity)}`}
                    >
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-semibold text-sm">
                                    Alerta Meteorológica - {alert.alert_severity}
                                </div>
                                <div className="text-sm mt-1">{alert.alert_description}</div>
                                <div className="text-xs mt-2 opacity-75">
                                    Polígono: {alert.polygon_id}
                                </div>
                            </div>
                            <button
                                onClick={() => setDismissed(prev => new Set(prev).add(alert.polygon_id))}
                                className="text-current opacity-50 hover:opacity-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};


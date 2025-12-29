import React from 'react';
import { Cloud, AlertTriangle, Loader } from 'lucide-react';
import { usePolygonWeather } from '../../hooks/useWeather';

interface PolygonWeatherBadgeProps {
    polygonId: string;
}

export const PolygonWeatherBadge: React.FC<PolygonWeatherBadgeProps> = ({ polygonId }) => {
    const { data: weather, isLoading } = usePolygonWeather(polygonId);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 pt-2 border-t">
                <Loader className="w-3 h-3 animate-spin" />
                <span>Cargando clima...</span>
            </div>
        );
    }

    if (!weather) return null;

    return (
        <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <Cloud className="w-3 h-3 text-blue-500" />
                    <span className="font-medium text-gray-700">{weather.weather_description}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded">
                        AW
                    </span>
                </div>
                <span className="font-semibold text-gray-900">{weather.temperature_celsius}°C</span>
            </div>

            {weather.has_weather_alert && (
                <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{weather.alert_description}</span>
                </div>
            )}

            {weather.is_freezing_risk && (
                <div className="mt-1 text-xs text-blue-600 font-medium">
                    ❄️ Riesgo de congelamiento
                </div>
            )}
        </div>
    );
};




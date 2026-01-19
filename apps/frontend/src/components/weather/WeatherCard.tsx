import React from "react";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Eye,
  Thermometer,
  AlertTriangle,
} from "lucide-react";
import { WeatherData } from "../../hooks/useWeather";

interface WeatherCardProps {
  weather: WeatherData;
  compact?: boolean;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  compact = false,
}) => {
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "CRITICAL":
        return "text-red-600 bg-red-50";
      case "HIGH":
        return "text-orange-600 bg-orange-50";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  const getWeatherIcon = () => {
    if (weather.snow_mm && weather.snow_mm > 0)
      return <CloudSnow className="w-5 h-5" />;
    if (weather.rain_mm && weather.rain_mm > 0)
      return <CloudRain className="w-5 h-5" />;
    return <Cloud className="w-5 h-5" />;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {getWeatherIcon()}
        <span className="font-medium">
          {weather.temperature_celsius ?? "--"}°C
        </span>
        {weather.is_freezing_risk && (
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getWeatherIcon()}
          <span className="font-medium text-gray-700">
            {weather.weather_description || "Sin descripción"}
          </span>
          {/* Indicador de Open-Meteo */}
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            Open-Meteo
          </span>
        </div>
        <span className="text-2xl font-bold text-gray-900">
          {weather.temperature_celsius ?? "--"}°C
        </span>
      </div>

      {/* Alerta */}
      {weather.has_weather_alert && (
        <div
          className={`p-2 rounded-md flex items-start gap-2 ${getSeverityColor(
            weather.alert_severity
          )}`}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">{weather.alert_severity}</div>
            <div>{weather.alert_description}</div>
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-gray-400" />
          <div className="text-sm">
            <div className="text-gray-500">Sensación</div>
            <div className="font-medium">
              {weather.temperature_feels_like ?? "--"}°C
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-gray-400" />
          <div className="text-sm">
            <div className="text-gray-500">Viento</div>
            <div className="font-medium">
              {weather.wind_speed_kmh ?? "--"} km/h
            </div>
          </div>
        </div>

        {weather.visibility_meters !== undefined &&
          weather.visibility_meters !== null && (
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-400" />
              <div className="text-sm">
                <div className="text-gray-500">Visibilidad</div>
                <div className="font-medium">
                  {weather.visibility_meters >= 1000
                    ? `${(weather.visibility_meters / 1000).toFixed(1)} km`
                    : `${weather.visibility_meters} m`}
                </div>
              </div>
            </div>
          )}

        {(() => {
          // Detectar si está lloviendo por weather_code (códigos WMO)
          const isRaining =
            weather.weather_code &&
            ((weather.weather_code >= 51 && weather.weather_code <= 67) ||
              (weather.weather_code >= 80 && weather.weather_code <= 82) ||
              (weather.weather_code >= 95 && weather.weather_code <= 99));
          const hasPrecipitation =
            weather.precipitation_mm !== undefined &&
            weather.precipitation_mm !== null &&
            weather.precipitation_mm > 0;

          // Siempre mostrar el indicador
          return (
            <div className="flex items-center gap-2">
              <CloudRain
                className={`w-4 h-4 ${
                  isRaining ? "text-blue-500" : "text-gray-400"
                }`}
              />
              <div className="text-sm">
                <div className="text-gray-500">Precipitación</div>
                <div className="font-medium">
                  {isRaining ? (
                    <span className="text-blue-600">🌧️ Lloviendo</span>
                  ) : (
                    <span>Sin lluvia</span>
                  )}
                </div>
                {hasPrecipitation && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Acumulado: {weather.precipitation_mm} mm
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Riesgo de congelamiento */}
      {weather.is_freezing_risk && (
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              ⚠️ Riesgo de congelamiento - Carretera:{" "}
              {weather.road_temperature_celsius ?? "--"}°C
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

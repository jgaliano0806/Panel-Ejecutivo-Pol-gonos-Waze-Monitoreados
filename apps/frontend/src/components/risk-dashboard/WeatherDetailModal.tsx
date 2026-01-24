/**
 * WeatherDetailModal - Modal de Detalle del Clima
 * Extraído de RiskDashboard.tsx siguiendo Atomic Design
 * Componente más complejo con historial 24h y datos actuales
 */

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CloudRain,
  RefreshCw,
  X,
  History,
  ArrowLeft,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { usePolygonWeather, useWeatherHistory } from "../../hooks/useWeather";
import WeatherInfoCard from "./WeatherInfoCard";

export interface WeatherDetailModalProps {
  polygonId: string;
  onClose: () => void;
}

const WeatherDetailModal: React.FC<WeatherDetailModalProps> = ({
  polygonId,
  onClose,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const {
    data: weatherData,
    isLoading,
    refetch,
  } = usePolygonWeather(polygonId);

  // Fechas para historial últimas 24h
  const now = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - 24);
    return d;
  }, []);

  const { data: historyData, isLoading: isLoadingHistory } = useWeatherHistory(
    polygonId,
    yesterday.toISOString(),
    now.toISOString(),
  );

  const handleRefresh = () => {
    refetch();
  };

  // Calcular estadísticas del historial
  const historyStats = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const temps = historyData
      .map((d) => d.temperature_celsius)
      .filter((t): t is number => t !== undefined && t !== null);

    const precipTotal = historyData.reduce(
      (sum, d) => sum + (d.precipitation_mm || 0),
      0,
    );

    const windSpeeds = historyData
      .map((d) => d.wind_speed_kmh)
      .filter((w): w is number => w !== undefined && w !== null);

    // Condiciones más frecuentes
    const conditionCounts: Record<string, number> = {};
    historyData.forEach((d) => {
      const desc = d.weather_description || "Desconocido";
      conditionCounts[desc] = (conditionCounts[desc] || 0) + 1;
    });
    const predominantCondition =
      Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Sin datos";

    return {
      tempMin: temps.length > 0 ? Math.min(...temps) : null,
      tempMax: temps.length > 0 ? Math.max(...temps) : null,
      tempAvg:
        temps.length > 0
          ? temps.reduce((a, b) => a + b, 0) / temps.length
          : null,
      precipTotal: precipTotal,
      windMax: windSpeeds.length > 0 ? Math.max(...windSpeeds) : null,
      windAvg:
        windSpeeds.length > 0
          ? windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length
          : null,
      predominantCondition,
      dataPoints: historyData.length,
    };
  }, [historyData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white dark:bg-veltrix-card rounded-2xl w-full p-6 shadow-2xl ${
          showHistory ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {showHistory && (
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-veltrix-bg rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {showHistory ? (
                <>
                  <History className="w-6 h-6 text-purple-600" />
                  Historial 24 Horas
                </>
              ) : (
                <>
                  <CloudRain className="w-6 h-6 text-cyan-600" />
                  Condiciones Climáticas
                </>
              )}
            </h2>
            {!showHistory && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                🌤️ Open-Meteo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showHistory && (
              <>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800/30 rounded-lg transition-all text-purple-700 dark:text-purple-300 font-medium text-sm"
                  title="Ver historial últimas 24 horas"
                >
                  <History className="w-4 h-4" />
                  24h
                </button>
                <button
                  onClick={handleRefresh}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-veltrix-bg rounded-lg transition-all"
                  title="Actualizar datos de Open-Meteo"
                >
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-veltrix-bg rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {showHistory ? (
          // Vista de Historial
          isLoadingHistory ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-veltrix-muted">
                Cargando historial...
              </p>
            </div>
          ) : historyStats ? (
            <div className="space-y-4">
              {/* Resumen de estadísticas */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Informe Climático - Últimas 24h
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-veltrix-muted mb-1">
                  Basado en{" "}
                  <span className="font-bold">{historyStats.dataPoints}</span>{" "}
                  mediciones
                </p>
                <p className="text-sm text-gray-600 dark:text-veltrix-muted">
                  Condición predominante:{" "}
                  <span className="font-bold text-purple-700 dark:text-purple-400">
                    {historyStats.predominantCondition}
                  </span>
                </p>
              </div>

              {/* Grid de estadísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Temperatura
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Máxima:
                      </span>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {historyStats.tempMax?.toFixed(1) ?? "--"}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Mínima:
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {historyStats.tempMin?.toFixed(1) ?? "--"}°C
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Promedio:
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {historyStats.tempAvg?.toFixed(1) ?? "--"}°C
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-cyan-600" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Precipitación
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total 24h:
                      </span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {historyStats.precipTotal.toFixed(1)} mm
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {historyStats.precipTotal === 0
                        ? "Sin precipitaciones registradas"
                        : historyStats.precipTotal > 10
                          ? "⚠️ Precipitación significativa"
                          : "🌧️ Lluvias leves"}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/30 dark:to-slate-800/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Viento
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Máximo:
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {historyStats.windMax?.toFixed(0) ?? "--"} km/h
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Promedio:
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {historyStats.windAvg?.toFixed(0) ?? "--"} km/h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      Alertas
                    </span>
                  </div>
                  <div className="space-y-1">
                    {historyData &&
                    historyData.some((d) => d.has_weather_alert) ? (
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        ⚠️ Se detectaron alertas meteorológicas
                      </p>
                    ) : (
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        ✅ Sin alertas en las últimas 24h
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Historial reciente */}
              {historyData && historyData.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Mediciones Recientes
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {historyData.slice(0, 10).map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-veltrix-bg rounded-lg text-sm"
                      >
                        <span className="text-gray-600 dark:text-gray-400">
                          {new Date(entry.timestamp).toLocaleTimeString(
                            "es-AR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {entry.weather_description}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {entry.temperature_celsius?.toFixed(0) ?? "--"}°C
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-veltrix-muted">
                No hay datos históricos disponibles
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Los datos se acumulan con el tiempo
              </p>
            </div>
          )
        ) : // Vista Actual (original)
        isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-veltrix-muted">
              Cargando datos meteorológicos...
            </p>
          </div>
        ) : weatherData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <WeatherInfoCard
                icon={Thermometer}
                label="Temperatura"
                value={`${
                  typeof weatherData.temperature_celsius === "number"
                    ? weatherData.temperature_celsius.toFixed(1)
                    : (Number(weatherData.temperature_celsius) || 0).toFixed(
                        1,
                      ) || "--"
                }°C`}
                subvalue={`Sensación: ${
                  typeof weatherData.temperature_feels_like === "number"
                    ? weatherData.temperature_feels_like.toFixed(1)
                    : (Number(weatherData.temperature_feels_like) || 0).toFixed(
                        1,
                      ) || "--"
                }°C`}
              />
              <WeatherInfoCard
                icon={Droplets}
                label="Precipitación"
                value={(() => {
                  // Detectar si está lloviendo por weather_code (códigos WMO)
                  const isRaining =
                    weatherData.weather_code &&
                    ((weatherData.weather_code >= 51 &&
                      weatherData.weather_code <= 67) ||
                      (weatherData.weather_code >= 80 &&
                        weatherData.weather_code <= 82) ||
                      (weatherData.weather_code >= 95 &&
                        weatherData.weather_code <= 99));

                  if (isRaining) {
                    return "🌧️ Lloviendo";
                  } else {
                    return "Sin lluvia";
                  }
                })()}
                subvalue={(() => {
                  const precipMm =
                    typeof weatherData.precipitation_mm === "number"
                      ? weatherData.precipitation_mm
                      : Number(weatherData.precipitation_mm) || 0;

                  if (precipMm > 0) {
                    return `Acumulado: ${precipMm.toFixed(1)} mm`;
                  } else {
                    return `Prob: ${
                      weatherData.precipitation_probability || 0
                    }%`;
                  }
                })()}
              />
              <WeatherInfoCard
                icon={Wind}
                label="Viento"
                value={`${
                  typeof weatherData.wind_speed_kmh === "number"
                    ? weatherData.wind_speed_kmh.toFixed(0)
                    : (Number(weatherData.wind_speed_kmh) || 0).toFixed(0) ||
                      "--"
                } km/h`}
                subvalue={`Ráfagas: ${
                  typeof weatherData.wind_gusts_kmh === "number"
                    ? weatherData.wind_gusts_kmh.toFixed(0)
                    : (Number(weatherData.wind_gusts_kmh) || 0).toFixed(0) ||
                      "--"
                } km/h`}
              />
              <WeatherInfoCard
                icon={Eye}
                label="Visibilidad"
                value={`${(
                  (Number(weatherData.visibility_meters) || 10000) / 1000
                ).toFixed(1)} km`}
                subvalue={weatherData.weather_description || "Sin datos"}
              />
            </div>

            {weatherData.is_freezing_risk && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
                <p className="text-blue-800 dark:text-blue-300 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Riesgo de congelamiento detectado
                </p>
                <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                  Temperatura de carretera:{" "}
                  {typeof weatherData.road_temperature_celsius === "number"
                    ? weatherData.road_temperature_celsius.toFixed(1)
                    : (
                        Number(weatherData.road_temperature_celsius) || 0
                      ).toFixed(1) || "--"}
                  °C
                </p>
              </div>
            )}

            {weatherData.has_weather_alert && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-700 rounded-lg">
                <p className="text-amber-800 dark:text-amber-300 font-bold">
                  Alerta Meteorológica: {weatherData.alert_severity}
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                  {weatherData.alert_description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <CloudRain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-veltrix-muted">
              No hay datos meteorológicos disponibles
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Los datos se actualizan periódicamente
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default WeatherDetailModal;

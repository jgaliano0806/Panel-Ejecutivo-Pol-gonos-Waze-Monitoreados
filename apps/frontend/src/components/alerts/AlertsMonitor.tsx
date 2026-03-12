import React, { useState } from "react";
import type { TrafficAlert, AlertSeverity } from "../../types";

interface AlertsMonitorProps {
  alerts: TrafficAlert[];
  onAcknowledge?: (alertId: string) => void;
}

export const AlertsMonitor: React.FC<AlertsMonitorProps> = ({
  alerts,
  onAcknowledge,
}) => {
  const [filter, setFilter] = useState<AlertSeverity | "all">("all");

  const filteredAlerts =
    filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  const getSeverityConfig = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return {
          label: "CRÍTICO",
          bgColor: "bg-red-100 border-red-300",
          textColor: "text-red-900",
          badgeColor: "bg-red-600 text-white",
          icon: "🚨",
        };
      case "high":
        return {
          label: "ALTO",
          bgColor: "bg-orange-100 border-orange-300",
          textColor: "text-orange-900",
          badgeColor: "bg-orange-600 text-white",
          icon: "⚠️",
        };
      case "medium":
        return {
          label: "MEDIO",
          bgColor: "bg-yellow-100 border-yellow-300",
          textColor: "text-yellow-900",
          badgeColor: "bg-yellow-600 text-white",
          icon: "⚡",
        };
      case "low":
        return {
          label: "BAJO",
          bgColor: "bg-blue-100 border-blue-300",
          textColor: "text-blue-900",
          badgeColor: "bg-blue-600 text-white",
          icon: "ℹ️",
        };
      default:
        return {
          label: "INFO",
          bgColor: "bg-gray-100 border-gray-300",
          textColor: "text-gray-900",
          badgeColor: "bg-gray-600 text-white",
          icon: "ℹ️",
        };
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      total_blockage: "Bloqueo Total",
      excessive_delay: "Demora Crítica",
      significant_delay: "Demora Significativa",
      extensive_congestion: "Congestión Extensa",
      high_user_impact: "Alto Impacto",
      jam_level_increase: "Empeoramiento",
      new_irregularity: "Irregularidad",
    };
    return labels[type] || type;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            🚨 Monitor de Alertas
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            {alerts.length} alerta(s) activa(s)
            {criticalCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                {criticalCount} CRÍTICAS
              </span>
            )}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-medium rounded ${
              filter === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Todas ({alerts.length})
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`px-3 py-1 text-xs font-medium rounded ${
              filter === "critical"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Críticas ({criticalCount})
          </button>
          <button
            onClick={() => setFilter("high")}
            className={`px-3 py-1 text-xs font-medium rounded ${
              filter === "high"
                ? "bg-orange-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Altas ({highCount})
          </button>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">
              No hay alertas {filter !== "all" && `de severidad ${filter}`}
            </p>
          </div>
        ) : (
          filteredAlerts
            .sort((a, b) => {
              // Ordenar por severidad y luego por tiempo
              const severityOrder: Record<string, number> = {
                critical: 0,
                high: 1,
                medium: 2,
                low: 3,
              };
              const sevA = a.severity as string;
              const sevB = b.severity as string;
              const severityDiff =
                (severityOrder[sevA] ?? 3) - (severityOrder[sevB] ?? 3);
              if (severityDiff !== 0) return severityDiff;
              return (
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
              );
            })
            .map((alert) => {
              const config = getSeverityConfig(alert.severity);

              return (
                <div
                  key={alert.id}
                  className={`border-2 rounded-lg p-3 ${config.bgColor} ${config.textColor} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{config.icon}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${config.badgeColor}`}
                        >
                          {config.label}
                        </span>
                        <span className="px-2 py-0.5 bg-white/70 text-xs font-medium rounded">
                          {getTypeLabel(alert.type)}
                        </span>
                        <span className="text-xs text-gray-600 ml-auto">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>

                      {/* Mensaje */}
                      <p className="font-bold text-sm mb-2">{alert.message}</p>

                      {/* Ubicación */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600">📍</span>
                        <span className="font-medium">{alert.location}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-600">
                          {alert.polygonName}
                        </span>
                      </div>

                      {/* Datos adicionales */}
                      {alert.data && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {alert.data.criticalJamsCount && (
                            <div className="bg-white/50 rounded px-2 py-1 text-xs">
                              <span className="font-semibold">
                                {alert.data.criticalJamsCount}
                              </span>{" "}
                              puntos
                            </div>
                          )}
                          {alert.data.avgDelayMinutes !== undefined && (
                            <div className="bg-white/50 rounded px-2 py-1 text-xs">
                              <span className="font-semibold">
                                +{alert.data.avgDelayMinutes}
                              </span>{" "}
                              min
                            </div>
                          )}
                          {alert.data.criticalKm !== undefined && (
                            <div className="bg-white/50 rounded px-2 py-1 text-xs">
                              <span className="font-semibold">
                                {alert.data.criticalKm}
                              </span>{" "}
                              km
                            </div>
                          )}
                          {alert.data.stoppedPercent !== undefined && (
                            <div className="bg-white/50 rounded px-2 py-1 text-xs">
                              <span className="font-semibold">
                                {alert.data.stoppedPercent}%
                              </span>{" "}
                              detenidos
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botón de reconocimiento */}
                    {onAcknowledge && !alert.isAcknowledged && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="flex-shrink-0 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-medium rounded border border-gray-300 transition-colors"
                        title="Reconocer alerta"
                      >
                        ✓ Reconocer
                      </button>
                    )}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

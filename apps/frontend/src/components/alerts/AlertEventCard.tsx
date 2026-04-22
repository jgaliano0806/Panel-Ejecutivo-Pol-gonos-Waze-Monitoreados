import React, { memo } from "react";
import type { TrafficAlert } from "../../types";
import { WazeIcon } from "../ui/WazeIcon";

interface AlertEventCardProps {
  alert: TrafficAlert;
  onSelect: (alert: TrafficAlert) => void;
  onExpand: (alertId: string) => void;
}

type Severity = "critical" | "high" | "medium" | "low";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; iconType: string }
> = {
  critical: {
    label: "CRÍTICA",
    color:
      "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-500 text-red-900 dark:text-red-200",
    iconType: "critical",
  },
  high: {
    label: "ALTA",
    color:
      "bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-500 text-orange-900 dark:text-orange-200",
    iconType: "warning",
  },
  medium: {
    label: "MEDIA",
    color:
      "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-500 text-yellow-900 dark:text-yellow-200",
    iconType: "warning",
  },
  low: {
    label: "BAJA",
    color:
      "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-200",
    iconType: "alert",
  },
};

/**
 * Tarjeta de alerta automática de Waze memoizada.
 * Se re-renderiza solo si cambia la referencia de `alert` o los callbacks.
 */
const AlertEventCardImpl: React.FC<AlertEventCardProps> = ({
  alert,
  onSelect,
  onExpand,
}) => {
  const severityConfig =
    SEVERITY_CONFIG[alert.severity as Severity] ?? SEVERITY_CONFIG.low;

  return (
    <div
      onClick={() => onSelect(alert)}
      className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] mb-4 ${severityConfig.color}`}
    >
      <div className="flex items-start gap-4">
        <div>
          <WazeIcon type={severityConfig.iconType} uiIcon size="xl" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-bold text-lg">{alert.message}</h4>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${severityConfig.color}`}
            >
              {severityConfig.label}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold flex items-center gap-1">
                <WazeIcon type="map" uiIcon size="sm" />
                Ubicación:
              </span>
              <span>
                {alert.location} - {alert.polygonName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold flex items-center gap-1">
                <WazeIcon type="time" uiIcon size="sm" />
                Detectada:
              </span>
              <span>
                {new Date(alert.timestamp).toLocaleString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                })}
              </span>
            </div>
            {alert.data && Object.keys(alert.data).length > 0 && (
              <div className="mt-2 pt-2 border-t flex gap-3 text-xs">
                {alert.data.criticalJamsCount && (
                  <span className="font-semibold flex items-center gap-1">
                    <WazeIcon type="jam" size="sm" />
                    {alert.data.criticalJamsCount} puntos críticos
                  </span>
                )}
                {alert.data.avgDelayMinutes !== undefined && (
                  <span className="font-semibold flex items-center gap-1">
                    <WazeIcon type="time" uiIcon size="sm" />+
                    {alert.data.avgDelayMinutes} min demora
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand(alert.id);
            }}
            className="w-full mt-3 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
          >
            <span className="group-hover:scale-125 transition-transform duration-300">
              <WazeIcon type="map" uiIcon size="lg" />
            </span>
            <span className="tracking-wide">Ver Ubicación en Minimapa</span>
            <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const AlertEventCard = memo(AlertEventCardImpl);
AlertEventCard.displayName = "AlertEventCard";

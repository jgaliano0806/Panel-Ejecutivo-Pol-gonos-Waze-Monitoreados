import React, { memo, useState, useEffect } from "react";
import type { Incident } from "../../types";
import { getIncidentDescription } from "../../utils/wazeTranslations";
import { WazeIcon } from "../ui/WazeIcon";
import {
  formatCoordinates,
  getSeverityColor,
  getSeverityLabel,
  formatActiveDuration,
  getDurationColor,
} from "./eventsList.utils";

/** Se auto-actualiza cada minuto sin re-renderizar la card padre (memo). */
const LiveDuration: React.FC<{ timestamp: Date | string }> = ({ timestamp }) => {
  const [text, setText] = useState(() => formatActiveDuration(timestamp));
  const [colorClass, setColorClass] = useState(() => getDurationColor(timestamp));

  useEffect(() => {
    const refresh = () => {
      setText(formatActiveDuration(timestamp));
      setColorClass(getDurationColor(timestamp));
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${colorClass}`}
      title="Tiempo activo del incidente"
    >
      <span aria-hidden>⏱</span>
      {text}
    </span>
  );
};

interface IncidentEventCardProps {
  incident: Incident;
  registering: boolean;
  onSelect: (incident: Incident) => void;
  onExpand: (incidentId: string) => void;
  onRegisterAccident: (incident: Incident) => void;
}

/**
 * Tarjeta de incidente memoizada.
 *
 * Se re-renderiza solo cuando cambian:
 *  - la referencia del incidente (nuevos datos de Waze).
 *  - el flag `registering` (afecta al botón "Registrar en Siniestros").
 *  - alguno de los callbacks (deberían venir de useCallback en el padre).
 */
const IncidentEventCardImpl: React.FC<IncidentEventCardProps> = ({
  incident,
  registering,
  onSelect,
  onExpand,
  onRegisterAccident,
}) => {
  const typeDescription = getIncidentDescription(
    incident.type,
    incident.subtype,
  );
  const isAccident = incident.type?.toLowerCase() === "accident";

  return (
    <div
      onClick={() => onSelect(incident)}
      className="border-2 dark:border-veltrix-border rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 dark:from-veltrix-card dark:to-veltrix-bg/30 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-veltrix-bg dark:hover:to-veltrix-bg cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500 mb-4"
    >
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0 drop-shadow-md">
          <WazeIcon
            type={incident.type}
            subtype={incident.subtype}
            size="xl"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h4 className="font-black text-gray-900 dark:text-white text-xl mb-1">
                {typeDescription}
              </h4>
              <LiveDuration timestamp={incident.timestamp} />
            </div>
            <span
              className={`px-4 py-2 rounded-full text-xs font-black border-2 shadow-md flex-shrink-0 ${getSeverityColor(
                incident.severity,
              )}`}
            >
              {getSeverityLabel(incident.severity)}
            </span>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-white/70 dark:bg-veltrix-bg/40 rounded-lg p-4 border border-gray-200 dark:border-veltrix-border">
              {incident.street && (
                <div className="flex items-start gap-2">
                  <WazeIcon
                    type="map"
                    uiIcon
                    size="sm"
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-gray-500 dark:text-veltrix-muted font-semibold text-xs">
                      Dirección:
                    </span>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {incident.street}
                    </p>
                  </div>
                </div>
              )}
              {incident.city && (
                <div className="flex items-start gap-2">
                  <WazeIcon
                    type="map"
                    uiIcon
                    size="sm"
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-gray-500 dark:text-veltrix-muted font-semibold text-xs">
                      Ciudad:
                    </span>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {incident.city}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <WazeIcon
                  type="map"
                  uiIcon
                  size="sm"
                  className="text-blue-600"
                />
                <div>
                  <span className="text-gray-500 dark:text-veltrix-muted font-semibold text-xs">
                    Coordenadas:
                  </span>
                  <p className="text-gray-900 dark:text-white font-mono text-xs font-medium">
                    {formatCoordinates(
                      incident.location.lat,
                      incident.location.lng,
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <WazeIcon
                  type="time"
                  uiIcon
                  size="sm"
                  className="text-blue-600"
                />
                <div className="space-y-1">
                  <span className="text-gray-500 dark:text-veltrix-muted font-semibold text-xs">
                    Reportado:
                  </span>
                  <p className="text-gray-900 dark:text-white font-medium text-xs">
                    {new Date(incident.timestamp).toLocaleString("es-AR", {
                      timeZone: "America/Argentina/Buenos_Aires",
                    })}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 dark:text-veltrix-muted text-xs">
                      Activo hace:
                    </span>
                    <LiveDuration timestamp={incident.timestamp} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand(incident.id);
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
              >
                <span className="group-hover:scale-125 transition-transform duration-300">
                  <WazeIcon type="map" uiIcon size="lg" />
                </span>
                <span className="tracking-wide">
                  Ver Ubicación en Minimapa
                </span>
                <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </button>
              {isAccident && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (registering) return;
                    onRegisterAccident(incident);
                  }}
                  disabled={registering}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {registering ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <WazeIcon type="plus" uiIcon size="lg" />
                      <span>Registrar en Siniestros</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {incident.nThumbsUp !== undefined && (
            <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300">
              <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-3 shadow-md">
                <WazeIcon type="check" uiIcon size="lg" />
                <div className="flex-1">
                  <p className="text-xs text-gray-600 font-semibold">
                    Confirmado por Wazers
                  </p>
                  <p className="text-2xl font-black text-green-700">
                    {incident.nThumbsUp}{" "}
                    {incident.nThumbsUp === 1 ? "usuario" : "usuarios"}
                  </p>
                </div>
                {incident.nThumbsUp > 5 && (
                  <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold shadow-sm">
                    ✓ Alta confianza
                  </span>
                )}
                {incident.nThumbsUp === 0 && (
                  <span className="px-3 py-1 bg-gray-400 text-white rounded-full text-xs font-bold shadow-sm">
                    Sin confirmar
                  </span>
                )}
              </div>
            </div>
          )}
          {incident.description &&
            incident.description !== incident.subtype &&
            !/^[A-Z_]+$/.test(incident.description) && (
              <div className="mt-2 text-sm text-gray-600 italic">
                &ldquo;{incident.description}&rdquo;
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export const IncidentEventCard = memo(IncidentEventCardImpl);
IncidentEventCard.displayName = "IncidentEventCard";

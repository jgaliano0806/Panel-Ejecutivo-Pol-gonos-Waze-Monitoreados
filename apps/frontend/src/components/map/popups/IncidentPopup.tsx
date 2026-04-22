/**
 * IncidentPopup.tsx — Popup de detalle de incidente Waze (memoizado).
 */
import React, { useState, useEffect } from "react";
import { Popup } from "react-map-gl/maplibre";
import { X, ShieldCheck, Navigation, FileText } from "lucide-react";
import {
  getWazePartnerHubIconUrl,
} from "../../../utils/wazeIcons";
import {
  getIncidentDescription,
  getMainTypeTranslation,
} from "../../../utils/wazeTranslations";
import { getCardinalDirection } from "../mapUtils";
import {
  formatActiveDuration,
  getDurationColor,
} from "../../alerts/eventsList.utils";

/** Actualiza el tiempo activo cada minuto sin re-renderizar el popup completo. */
const LiveDuration: React.FC<{ timestamp: string }> = ({ timestamp }) => {
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
      title="Tiempo que lleva activo este incidente"
    >
      <span aria-hidden>⏱</span>
      {text}
    </span>
  );
};

interface IncidentPopupData {
  lng: number;
  lat: number;
  properties: {
    id: string;
    street?: string;
    type: string;
    subtype?: string;
    description: string;
    timestamp?: string;
    reportBy?: string;
    reportRating?: number;
    reliability?: number;
    confidence?: number;
    magvar?: number;
    nThumbsUp?: number;
    isNew?: number;
  };
}

interface IncidentPopupProps {
  incident: IncidentPopupData;
  isDark: boolean;
  onClose: () => void;
  onViewDetail: (incidentId: string) => void;
}

export const IncidentPopup: React.FC<IncidentPopupProps> = React.memo(
  ({ incident, isDark, onClose, onViewDetail }) => {
    const { properties: p } = incident;

    return (
      <Popup
        longitude={incident.lng}
        latitude={incident.lat}
        anchor="bottom"
        onClose={onClose}
        closeButton={false}
        className="incident-popup"
        maxWidth="350px"
        style={{ zIndex: 99999 }}
      >
        <div
          className={`rounded-xl shadow-2xl overflow-hidden min-w-[320px] ${
            isDark ? "bg-veltrix-card text-white" : "bg-white text-gray-800"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-veltrix-border bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="flex items-start gap-3">
              <div className="relative">
                <img
                  src={getWazePartnerHubIconUrl(p.type, p.subtype)}
                  className="w-10 h-10 object-contain drop-shadow-md"
                  alt="icon"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">
                  {p.street || "Ubicación"}
                </p>
                <h3 className="font-bold text-lg leading-tight">
                  {getIncidentDescription(p.type, p.subtype)}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-500"
              aria-label="Cerrar detalle"
              title="Cerrar detalle"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-4 text-sm">
            {/* Tabla de Información */}
            <div className="grid grid-cols-[110px_1fr] gap-y-3 gap-x-2">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Tipo
              </span>
              <span className="font-medium">
                {getMainTypeTranslation(p.type)}
              </span>

              <span className="font-medium text-gray-500 dark:text-gray-400">
                Fecha de inicio
              </span>
              <span>
                {p.timestamp
                  ? new Date(p.timestamp).toLocaleString("es-AR", {
                      timeZone: "America/Argentina/Buenos_Aires",
                    })
                  : "N/A"}
              </span>

              {p.timestamp && (
                <>
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    Tiempo activo
                  </span>
                  <LiveDuration timestamp={p.timestamp} />
                </>
              )}

              <span className="font-medium text-gray-500 dark:text-gray-400">
                Descripción
              </span>
              <span className="leading-snug">{p.description}</span>

              <span className="font-medium text-gray-500 dark:text-gray-400">
                Informante
              </span>
              <span className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded w-fit text-blue-600 dark:text-blue-400">
                {p.reportBy || "Wazer"}
              </span>

              {p.magvar !== undefined && p.magvar !== null && (
                <>
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    Dirección
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Navigation
                      className="h-3.5 w-3.5 text-blue-500"
                      style={{
                        transform: `rotate(${p.magvar}deg)`,
                      }}
                    />
                    {getCardinalDirection(p.magvar)}
                    <span className="text-gray-400 text-xs">
                      ({Math.round(p.magvar)}°)
                    </span>
                  </span>
                </>
              )}

              <span className="font-medium text-gray-500 dark:text-gray-400">
                ID
              </span>
              <span className="text-[10px] uppercase font-mono text-gray-400 break-all leading-tight">
                {p.id}
              </span>
            </div>
          </div>

          {/* Footer Status */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-veltrix-border space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  👍
                </span>
                {Number(p.nThumbsUp) || 0} valoraciones
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-veltrix-bg rounded-full shadow-sm border border-gray-100 dark:border-veltrix-border">
                <ShieldCheck className="h-3 w-3 text-gray-400" />
                <span className="font-medium">
                  Confianza:{" "}
                  {(() => {
                    const c = p.confidence;
                    if (c == null) return "N/A";
                    const n =
                      typeof c === "number" ? c : parseFloat(String(c));
                    return !Number.isNaN(n) ? `${n.toFixed(1)}/5` : "N/A";
                  })()}
                </span>
              </div>
            </div>
            <button
              onClick={() => onViewDetail(p.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              Ver detalle completo
            </button>
          </div>
        </div>
      </Popup>
    );
  },
);

IncidentPopup.displayName = "IncidentPopup";

/**
 * JamPopup.tsx — Popup de detalle de atasco/congestión (memoizado).
 */
import React from "react";
import { Popup } from "react-map-gl/maplibre";
import { X, Car, Gauge, Timer, Route } from "lucide-react";
import { getJamSeverityText } from "../mapUtils";

interface JamPopupData {
  lng: number;
  lat: number;
  properties: {
    street?: string;
    city?: string;
    color: string;
    severityText?: string;
    level: number;
    speed: number;
    delay: number;
    length: number;
    roadType?: number;
  };
}

interface JamPopupProps {
  jam: JamPopupData;
  isDark: boolean;
  onClose: () => void;
}

export const JamPopup: React.FC<JamPopupProps> = React.memo(
  ({ jam, isDark, onClose }) => {
    const { properties: p } = jam;
    const severityText =
      p.severityText || getJamSeverityText(p.level, p.speed);

    return (
      <Popup
        longitude={jam.lng}
        latitude={jam.lat}
        anchor="bottom"
        onClose={onClose}
        closeButton={false}
        className="jam-popup"
        maxWidth="320px"
        style={{ zIndex: 99999 }}
      >
        <div
          className={`rounded-xl shadow-2xl overflow-hidden min-w-[280px] ${
            isDark ? "bg-veltrix-card text-white" : "bg-white text-gray-800"
          }`}
        >
          {/* Header con gradiente según severidad */}
          <div
            className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-veltrix-border"
            style={{
              background: isDark
                ? `linear-gradient(135deg, ${p.color}30 0%, transparent 100%)`
                : `linear-gradient(135deg, ${p.color}20 0%, transparent 100%)`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2.5 rounded-xl shadow-lg"
                style={{ backgroundColor: p.color }}
              >
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">
                  Congestión de Tráfico
                </p>
                <h3 className="font-bold text-lg leading-tight">
                  {p.street || "Vía"}
                </h3>
                {p.city && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {p.city}
                  </p>
                )}
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

          {/* Indicador de severidad visual */}
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Estado del tráfico
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: p.color }}
              >
                {severityText}
              </span>
            </div>
            {/* Barra de nivel de congestión */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.min(100, (p.level || 1) * 20)}%`,
                  backgroundColor: p.color,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Fluido</span>
              <span>Detenido</span>
            </div>
          </div>

          {/* Métricas principales */}
          <div className="p-4 grid grid-cols-3 gap-3">
            {/* Velocidad */}
            <div className="text-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
              <Gauge className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p
                className="text-lg font-bold"
                style={{ color: p.color }}
              >
                {Math.round(p.speed || 0)}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                km/h
              </p>
            </div>
            {/* Demora */}
            <div className="text-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
              <Timer className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {p.delay > 60
                  ? `+${Math.round(p.delay / 60)}`
                  : `+${Math.round(p.delay || 0)}`}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {p.delay > 60 ? "min" : "seg"}
              </p>
            </div>
            {/* Longitud */}
            <div className="text-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg">
              <Route className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {p.length > 1000
                  ? (p.length / 1000).toFixed(1)
                  : Math.round(p.length || 0)}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {p.length > 1000 ? "km" : "m"}
              </p>
            </div>
          </div>

          {/* Footer con nivel de congestión Waze */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-veltrix-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">
                Nivel Waze:
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div
                    key={lvl}
                    className={`w-3 h-3 rounded-sm ${
                      lvl <= (p.level || 0)
                        ? ""
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                    style={{
                      backgroundColor:
                        lvl <= (p.level || 0) ? p.color : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-gray-400 font-mono text-[10px]">
              Tipo vía: {p.roadType || "-"}
            </span>
          </div>
        </div>
      </Popup>
    );
  },
);

JamPopup.displayName = "JamPopup";

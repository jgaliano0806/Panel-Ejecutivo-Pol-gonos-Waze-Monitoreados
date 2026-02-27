import React from "react";
import type { Polygon, Incident, TrafficJam } from "../../types";
import { PolygonState } from "../../types";
import {
  calculatePolygonStats,
} from "../../utils/polygonCalculations";
import {
  getIncidentDescription,
  getJamLevelTranslation,
  getRoadTypeTranslation,
} from "../../utils/wazeTranslations";
import { CongestionIndexCard } from "./CongestionIndexCard";
import { WazeIcon } from "../ui/WazeIcon";
import { cn } from "../../lib/utils";

interface PolygonDetailProps {
  polygon: Polygon;
  incidents: Incident[];
  jams: TrafficJam[];
  onClose: () => void;
}

const PolygonDetail: React.FC<PolygonDetailProps> = ({
  polygon,
  incidents,
  jams,
  onClose,
}) => {
  const stats = calculatePolygonStats(polygon, incidents, jams);
  const polygonIncidents = incidents.filter(
    (inc) => inc.polygonId === polygon.id,
  );
  const polygonJams = jams.filter((jam) => jam.polygonId === polygon.id);

  const getStateLabel = (state: PolygonState) => {
    switch (state) {
      case PolygonState.HIGH:
        return { label: "Crítico", color: "text-danger", bg: "bg-red-500/10" };
      case PolygonState.MEDIUM:
        return {
          label: "Moderado",
          color: "text-warning",
          bg: "bg-yellow-500/10",
        };
      case PolygonState.LOW:
        return {
          label: "Fluido",
          color: "text-success",
          bg: "bg-green-500/10",
        };
    }
  };

  const stateInfo = getStateLabel(stats.state);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-veltrix-card transition-colors duration-300">
      {/* Header fijo */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-veltrix-border bg-white dark:bg-veltrix-card backdrop-blur-sm z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-veltrix-text truncate">
              {polygon.name}
            </h2>
            <p className="text-xs text-gray-600 dark:text-veltrix-muted mt-1">
              Grupo: {polygon.group}
            </p>
            <div className="mt-2">
              <span
                className={cn(
                  `inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border border-transparent`,
                  stateInfo.bg,
                  stateInfo.color,
                )}
              >
                Estado: {stateInfo.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 p-1 text-gray-400 dark:text-veltrix-muted hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-veltrix-bg rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* KPIs del polígono — solo datos verificables del feed */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-2.5 transition-colors">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold">
              Incidentes
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.totalIncidents}
            </p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">del feed</p>
          </div>
          <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-2.5 transition-colors">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold">
              Críticos
            </p>
            <p className="text-lg font-bold text-red-500 dark:text-red-400">
              {stats.criticalIncidents}
            </p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500">HAZARD / ACCIDENT</p>
          </div>
        </div>

        {/* Resumen de Tráfico — solo datos del feed TVT */}
        <CongestionIndexCard polygonId={polygon.id} />

        {/* Lista de incidentes */}
        <div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-veltrix-text mb-2 uppercase flex items-center gap-2">
            Incidentes{" "}
            <span className="bg-gray-100 dark:bg-veltrix-bg px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">
              {polygonIncidents.length}
            </span>
          </h3>
          {polygonIncidents.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 dark:bg-veltrix-bg/50 rounded-lg dashed-border">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                No hay incidentes activos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {polygonIncidents.map((incident) => {
                const description = getIncidentDescription(
                  incident.type,
                  incident.subtype,
                );

                return (
                  <div
                    key={incident.id}
                    className="bg-white dark:bg-veltrix-bg/30 rounded-lg border border-gray-200 dark:border-veltrix-border overflow-hidden transition-colors"
                  >
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                      <div className="flex-shrink-0 w-8 h-8 bg-white dark:bg-veltrix-card rounded-lg flex items-center justify-center shadow-sm">
                        <WazeIcon type={incident.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {incident.street && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate uppercase">
                            {incident.street}
                          </p>
                        )}
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          `flex-shrink-0 text-[10px] px-2 py-1 rounded-full font-bold border`,
                          incident.severity >= 4
                            ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800"
                            : incident.severity >= 3
                              ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800"
                              : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800",
                        )}
                      >
                        S.{incident.severity}
                      </span>
                    </div>

                    <div className="p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">
                          Fecha
                        </span>
                        <span className="text-gray-900 dark:text-gray-200 font-mono">
                          {new Date(incident.timestamp).toLocaleTimeString(
                            "es-AR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                      {incident.confidence !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">
                            Confianza
                          </span>
                          <span className="text-gray-900 dark:text-gray-200 font-bold">
                            {incident.confidence}/10
                          </span>
                        </div>
                      )}

                      {incident.nThumbsUp !== undefined &&
                        incident.nThumbsUp > 0 && (
                          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/5 flex items-center gap-2 text-green-600 dark:text-green-400">
                            <span className="font-bold">
                              👍 {incident.nThumbsUp}
                            </span>
                            <span className="opacity-80">confirmaciones</span>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Atascos — solo visibles cuando hay jams en el feed principal */}
        {polygonJams.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-veltrix-text mb-2 uppercase flex items-center gap-2">
              Atascos{" "}
              <span className="bg-gray-100 dark:bg-veltrix-bg px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">
                {polygonJams.length}
              </span>
            </h3>
            <div className="space-y-2">
              {polygonJams.map((jam) => {
                const jamLevelText =
                  jam.level !== undefined
                    ? getJamLevelTranslation(jam.level)
                    : "Sin info";

                return (
                  <div
                    key={jam.id}
                    className="bg-white dark:bg-veltrix-bg/30 rounded-lg border border-gray-200 dark:border-veltrix-border overflow-hidden transition-colors"
                  >
                    <div className="flex items-center gap-3 p-2.5 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20">
                      <div className="flex-shrink-0 w-8 h-8 bg-white dark:bg-veltrix-card rounded-lg flex items-center justify-center shadow-sm">
                        <WazeIcon type="jam" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {jam.street && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate uppercase">
                            {jam.street}
                          </p>
                        )}
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {jamLevelText}
                        </p>
                      </div>
                    </div>
                    <div className="p-2.5 space-y-1 text-xs">
                      {jam.speed !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Velocidad</span>
                          <span className={cn(
                            "font-bold",
                            jam.speed < 15 ? "text-red-600 dark:text-red-400"
                              : jam.speed < 30 ? "text-orange-600 dark:text-orange-400"
                              : "text-green-600 dark:text-green-400",
                          )}>
                            {jam.speed} km/h
                          </span>
                        </div>
                      )}
                      {jam.delay !== undefined && jam.delay !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Demora</span>
                          <span className="text-gray-900 dark:text-white font-bold">
                            {jam.delay === -1 ? "Bloqueado" : `${Math.floor(jam.delay / 60)}m ${jam.delay % 60}s`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Longitud</span>
                        <span className="text-gray-900 dark:text-gray-200">{jam.length} m</span>
                      </div>
                      {jam.roadType && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Vía</span>
                          <span className="text-gray-900 dark:text-gray-200">
                            {getRoadTypeTranslation(jam.roadType)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resumen de situación — datos verídicos del feed + TVT */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-veltrix-border">
          <h3 className="text-xs font-bold text-gray-900 dark:text-veltrix-text mb-2 block uppercase">
            Resumen
          </h3>
          <div className="bg-gray-50 dark:bg-veltrix-bg/50 rounded-lg p-3 border border-gray-100 dark:border-white/5 space-y-1.5">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              • <span className="font-bold">{stats.totalIncidents} incidente{stats.totalIncidents !== 1 ? "s" : ""}</span> reportado{stats.totalIncidents !== 1 ? "s" : ""} en la zona
            </p>
            {stats.criticalIncidents > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400">
                • <span className="font-bold">{stats.criticalIncidents} crítico{stats.criticalIncidents !== 1 ? "s" : ""}</span> (HAZARD / ACCIDENT)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolygonDetail;

import React from "react";
import type { Incident, Polygon } from "../types";
import { Severity } from "../types";
import { getPolygonById } from "../utils/polygonHelpers";
import { getIncidentDescription } from "../utils/wazeTranslations";
import { WazeIcon } from "./WazeIcon";
import { calculateTrustScore } from "../utils/incidentScoring";

interface AlertsPanelProps {
  incidents: Incident[];
  polygons: Polygon[];
  limit?: number;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  incidents,
  polygons,
  limit = 10,
}) => {
  // Ordenar por severidad y timestamp
  const sortedIncidents = [...incidents]
    .sort((a, b) => {
      // Primero por severidad (mayor a menor)
      if (b.severity !== a.severity) {
        return b.severity - a.severity;
      }
      // Luego por timestamp (más reciente primero)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, limit);

  const getSeverityBadge = (severity: Severity) => {
    if (severity >= Severity.CRITICAL) {
      return <span className="badge badge-danger">Crítica</span>;
    } else if (severity >= Severity.HIGH) {
      return (
        <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
          Alta
        </span>
      );
    } else if (severity >= Severity.MEDIUM) {
      return <span className="badge badge-warning">Media</span>;
    }
    return (
      <span className="badge bg-gray-100 dark:bg-veltrix-bg text-gray-700 dark:text-gray-300">
        Baja
      </span>
    );
  };

  const getIncidentTypeLabel = (incident: Incident) => {
    const description = getIncidentDescription(incident.type, incident.subtype);
    return description;
  };

  const getIncidentIcon = (incident: Incident) => {
    return (
      <WazeIcon type={incident.type} subtype={incident.subtype} size="lg" />
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
    return new Date(date).toLocaleDateString("es-AR");
  };

  return (
    <div className="card bg-white dark:bg-veltrix-card dark:border dark:border-veltrix-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Alertas Estratégicas
        </h2>
        <span className="text-sm text-gray-500 dark:text-veltrix-muted">
          {sortedIncidents.length} activas
        </span>
      </div>

      <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
        {sortedIncidents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-veltrix-muted">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">No hay alertas activas</p>
          </div>
        ) : (
          sortedIncidents.map((incident) => {
            const polygon = incident.polygonId
              ? getPolygonById(polygons, incident.polygonId)
              : null;
            const trustScore = calculateTrustScore(incident);

            return (
              <div
                key={incident.id}
                className="border border-gray-200 dark:border-veltrix-border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-veltrix-bg/30 transition-colors bg-white dark:bg-veltrix-card"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIncidentIcon(incident)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {getIncidentTypeLabel(incident)}
                      </h3>
                      {getSeverityBadge(incident.severity)}
                    </div>

                    {/* Trust Score Badge */}
                    <div className="flex items-center gap-2 mt-1 mb-2">
                      <div
                        className={`flex items-center text-xs px-2 py-0.5 rounded ${
                          trustScore.level === "high"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : trustScore.level === "medium"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            : "bg-gray-100 dark:bg-veltrix-bg text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {"⭐".repeat(trustScore.stars)}
                        <span className="ml-1 font-medium">
                          {trustScore.score}/10
                        </span>
                      </div>
                    </div>

                    {incident.street && (
                      <p className="text-xs text-gray-600 dark:text-veltrix-muted mb-1">
                        📍 {incident.street}
                      </p>
                    )}

                    {/* Solo mostrar descripción si no es una key */}
                    {incident.description &&
                      incident.description !== incident.subtype &&
                      !/^[A-Z_]+$/.test(incident.description) && (
                        <p className="text-xs text-gray-500 dark:text-veltrix-muted mb-2 line-clamp-2">
                          {incident.description}
                        </p>
                      )}

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-veltrix-muted">
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {polygon ? polygon.name : "Fuera de polígonos"}
                      </span>
                      <span>{formatTime(incident.timestamp)}</span>
                    </div>

                    {incident.nThumbsUp && incident.nThumbsUp > 0 && (
                      <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-veltrix-muted">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        {incident.nThumbsUp} confirmaciones
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;

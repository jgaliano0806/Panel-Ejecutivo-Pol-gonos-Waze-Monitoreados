import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Incident, TrafficAlert, Polygon, TrafficJam } from "../types";
import {
  getIncidentDescription,
  getSubtypeTranslation,
  getMainTypeTranslation,
  getJamLevelTranslation,
} from "../utils/wazeTranslations";
import { WazeIcon } from "./WazeIcon";
import { iconCacheService } from "../utils/iconCache";
import { MiniMapLibre } from "./map/MiniMapLibre";
import { useCreateAccident } from "../hooks/useRoadAccidents";
import { VirtualizedList } from "./ui/VirtualizedList";

interface EventsListModalProps {
  incidents: Incident[];
  alerts: TrafficAlert[];
  polygons?: Polygon[];
  jams?: TrafficJam[];
  onClose: () => void;
  onEventClick: (
    event: Incident | TrafficAlert,
    type: "incident" | "alert"
  ) => void;
}

export const EventsListModal: React.FC<EventsListModalProps> = ({
  incidents,
  alerts,
  polygons = [],
  jams = [],
  onClose,
  onEventClick,
}) => {
  const [expandedEvent, setExpandedEvent] = useState<{
    id: string;
    type: "incident" | "alert";
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "incidents" | "alerts"
  >("all");
  const createAccident = useCreateAccident();
  const [registeringAccident, setRegisteringAccident] = useState<string | null>(
    null
  );

  const processedIncidents = useMemo(
    () =>
      incidents
        .filter(
          (incident, index, self) =>
            index === self.findIndex((i) => i.id === incident.id)
        )
        .sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity;
          return (b.reliability || 0) - (a.reliability || 0);
        }),
    [incidents]
  );

  const processedAlerts = useMemo(
    () =>
      alerts
        .filter(
          (alert, index, self) =>
            index === self.findIndex((a) => a.id === alert.id)
        )
        .sort((a, b) => {
          const severityOrder: Record<string, number> = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
          };
          const sevA = typeof a.severity === "string" ? a.severity : "low";
          const sevB = typeof b.severity === "string" ? b.severity : "low";
          return (severityOrder[sevB] || 0) - (severityOrder[sevA] || 0);
        }),
    [alerts]
  );

  // Cerrar minimapa con tecla ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && expandedEvent) {
        setExpandedEvent(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [expandedEvent]);

  // Encontrar el evento expandido (incidente o alerta)
  const currentExpandedIncident =
    expandedEvent && expandedEvent.type === "incident"
      ? incidents.find((i) => i.id === expandedEvent.id)
      : null;

  const currentExpandedAlert =
    expandedEvent && expandedEvent.type === "alert"
      ? alerts.find((a) => a.id === expandedEvent.id)
      : null;

  // Obtener coordenadas del evento expandido
  const getEventCoordinates = () => {
    if (currentExpandedIncident) {
      return {
        lat: currentExpandedIncident.location.lat,
        lng: currentExpandedIncident.location.lng,
      };
    }
    if (currentExpandedAlert) {
      // Buscar el polígono para obtener sus coordenadas
      const polygon = polygons.find(
        (p) => p.id === currentExpandedAlert.polygonId
      );
      if (polygon && polygon.geometry && polygon.geometry.coordinates) {
        // Calcular el centro del polígono desde las coordenadas GeoJSON
        const coordinates = polygon.geometry.coordinates[0]; // Primer anillo del polígono
        if (coordinates && coordinates.length > 0) {
          let sumLat = 0;
          let sumLng = 0;
          let count = 0;

          // Sumar todas las coordenadas
          for (const coord of coordinates) {
            if (Array.isArray(coord) && coord.length >= 2) {
              sumLng += coord[0]; // Longitud
              sumLat += coord[1]; // Latitud
              count++;
            }
          }

          if (count > 0) {
            return {
              lat: sumLat / count,
              lng: sumLng / count,
            };
          }
        }
      }
      // Fallback: coordenadas de Córdoba centro
      return { lat: -31.4201, lng: -64.1888 };
    }
    return null;
  };

  const eventCoordinates = getEventCoordinates();
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4)
      return "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-500 text-red-900 dark:text-red-200";
    if (severity >= 3)
      return "bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-500 text-orange-900 dark:text-orange-200";
    if (severity >= 2)
      return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-500 text-yellow-900 dark:text-yellow-200";
    return "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-200";
  };

  const getSeverityLabel = (severity: number) => {
    if (severity >= 4) return "CRÍTICA";
    if (severity >= 3) return "ALTA";
    if (severity >= 2) return "MEDIA";
    return "BAJA";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-veltrix-card rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn border border-gray-200 dark:border-veltrix-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-8 py-6 flex items-center justify-between border-b-4 border-blue-800">
          <div>
            <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
              <WazeIcon type="stats" uiIcon size="xl" />
              Eventos Activos en Tiempo Real
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter("all");
                }}
                className={`px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                  activeFilter === "all"
                    ? "bg-white text-blue-700 shadow-lg scale-105 border-2 border-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                📊 Total: {incidents.length + alerts.length}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter("incidents");
                }}
                className={`px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                  activeFilter === "incidents"
                    ? "bg-white text-orange-700 shadow-lg scale-105 border-2 border-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                <span className="flex items-center gap-2">
                  <WazeIcon type="alert" uiIcon size="sm" />
                  {incidents.length} Incidentes
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilter("alerts");
                }}
                className={`px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                  activeFilter === "alerts"
                    ? "bg-white text-red-700 shadow-lg scale-105 border-2 border-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                <span className="flex items-center gap-2">
                  <WazeIcon type="alert" uiIcon size="sm" />
                  {alerts.length} Alertas
                </span>
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-3 transition-all hover:scale-110 hover:rotate-90"
            title="Cerrar"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-veltrix-bg custom-scrollbar">
          {/* Layout de dos columnas cuando se muestran ambos tipos */}
          {activeFilter === "all" &&
          incidents.length > 0 &&
          alerts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda: Incidentes reportados por usuarios de Waze */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-t-xl shadow-md">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <WazeIcon
                      type="alert"
                      uiIcon
                      size="md"
                      className="text-white"
                    />
                    <span>Incidentes reportados por usuarios de Waze</span>
                    <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                      {incidents.length}
                    </span>
                  </h3>
                </div>
                <div className="bg-white dark:bg-veltrix-card p-6 rounded-b-xl shadow-lg flex-1 overflow-hidden h-[calc(90vh-200px)] border-x border-b border-gray-200 dark:border-veltrix-border">
                  <VirtualizedList
                    items={processedIncidents}
                    estimateSize={200}
                    className="h-full"
                    renderItem={(incident, index) => {
                      const typeDescription = getIncidentDescription(
                        incident.type,
                        incident.subtype
                      );
                      return (
                        <div
                          key={`incident-${incident.id}-${index}`}
                          onClick={() => onEventClick(incident, "incident")}
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
                                </div>
                                <span
                                  className={`px-4 py-2 rounded-full text-xs font-black border-2 shadow-md ${getSeverityColor(
                                    incident.severity
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
                                          incident.location.lng
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
                                    <div>
                                      <span className="text-gray-500 dark:text-veltrix-muted font-semibold text-xs">
                                        Reportado:
                                      </span>
                                      <p className="text-gray-900 dark:text-white font-medium text-xs">
                                        {new Date(
                                          incident.timestamp
                                        ).toLocaleString("es-AR")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedEvent({
                                        id: incident.id,
                                        type: "incident",
                                      });
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
                                  {incident.type?.toLowerCase() ===
                                    "accident" && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (registeringAccident === incident.id)
                                          return;
                                        setRegisteringAccident(incident.id);
                                        try {
                                          await createAccident.mutateAsync({
                                            incident_id: incident.id,
                                            waze_data: incident,
                                            type: incident.type,
                                            subtype: incident.subtype,
                                            severity: incident.severity,
                                            street: incident.street,
                                            location_lat: incident.location.lat,
                                            location_lng: incident.location.lng,
                                            accident_at: new Date(
                                              incident.timestamp
                                            ).toISOString(),
                                          });
                                          alert(
                                            "✅ Siniestro registrado exitosamente en el módulo de siniestros"
                                          );
                                        } catch (error: any) {
                                          console.error(
                                            "Error registrando siniestro:",
                                            error
                                          );
                                          if (
                                            error?.status === 409 ||
                                            error?.isDuplicate
                                          ) {
                                            const existingAccident =
                                              error?.existingAccident;
                                            const accidentId =
                                              existingAccident?.id || "N/A";
                                            const accidentDate =
                                              existingAccident?.accident_at
                                                ? new Date(
                                                    existingAccident.accident_at
                                                  ).toLocaleString("es-AR")
                                                : "N/A";
                                            alert(
                                              `ℹ️ Este siniestro ya está registrado en el módulo.\n\n` +
                                                `ID del registro: ${accidentId}\n` +
                                                `Fecha: ${accidentDate}\n\n` +
                                                `No es necesario registrarlo nuevamente.`
                                            );
                                          } else {
                                            const errorMessage =
                                              error?.message ||
                                              error?.data?.message ||
                                              "Error desconocido";
                                            alert(
                                              `❌ Error al registrar el siniestro:\n\n${errorMessage}`
                                            );
                                          }
                                        } finally {
                                          setRegisteringAccident(null);
                                        }
                                      }}
                                      disabled={
                                        registeringAccident === incident.id
                                      }
                                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                                    >
                                      {registeringAccident === incident.id ? (
                                        <>
                                          <span className="animate-spin">
                                            ⏳
                                          </span>
                                          <span>Registrando...</span>
                                        </>
                                      ) : (
                                        <>
                                          <WazeIcon
                                            type="plus"
                                            uiIcon
                                            size="lg"
                                            iconCache={iconCacheService}
                                          />
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
                                        {incident.nThumbsUp === 1
                                          ? "usuario"
                                          : "usuarios"}
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
                                    "{incident.description}"
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              {/* Columna Derecha: Alertas automaticas de Waze */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-t-xl shadow-md">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <WazeIcon
                      type="alert"
                      uiIcon
                      size="md"
                      className="text-white"
                    />
                    <span>Alertas automaticas de Waze</span>
                    <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                      {alerts.length}
                    </span>
                  </h3>
                </div>
                <div className="bg-white p-6 rounded-b-xl shadow-lg flex-1 overflow-hidden h-[calc(90vh-200px)]">
                  <VirtualizedList
                    items={processedAlerts}
                    estimateSize={200}
                    className="h-full"
                    renderItem={(alert, index) => {
                      const severityConfig = (
                        {
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
                        } as const
                      )[
                        alert.severity as "critical" | "high" | "medium" | "low"
                      ] || {
                        label: "BAJA",
                        color:
                          "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-blue-400 dark:border-blue-500",
                        iconType: "alert",
                      };

                      return (
                        <div
                          key={`alert-${alert.id}-${index}`}
                          onClick={() => onEventClick(alert, "alert")}
                          className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] mb-4 ${severityConfig.color}`}
                        >
                          <div className="flex items-start gap-4">
                            <div>
                              <WazeIcon
                                type={severityConfig.iconType || "alert"}
                                uiIcon
                                size="xl"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h4 className="font-bold text-lg">
                                  {alert.message}
                                </h4>
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
                                    {new Date(alert.timestamp).toLocaleString(
                                      "es-AR"
                                    )}
                                  </span>
                                </div>
                                {alert.data &&
                                  Object.keys(alert.data).length > 0 && (
                                    <div className="mt-2 pt-2 border-t flex gap-3 text-xs">
                                      {alert.data.criticalJamsCount && (
                                        <span className="font-semibold flex items-center gap-1">
                                          <WazeIcon type="jam" size="sm" />
                                          {alert.data.criticalJamsCount} puntos
                                          críticos
                                        </span>
                                      )}
                                      {alert.data.avgDelayMinutes !==
                                        undefined && (
                                        <span className="font-semibold flex items-center gap-1">
                                          <WazeIcon
                                            type="time"
                                            uiIcon
                                            size="sm"
                                          />
                                          +{alert.data.avgDelayMinutes} min
                                          demora
                                        </span>
                                      )}
                                    </div>
                                  )}
                              </div>
                              {/* Botón Ver en Minimapa */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedEvent({
                                    id: alert.id,
                                    type: "alert",
                                  });
                                }}
                                className="w-full mt-3 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
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
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Vista de una sola columna cuando se filtra por tipo específico */}
              {/* Incidentes Section */}
              {incidents.length > 0 &&
                (activeFilter === "all" || activeFilter === "incidents") && (
                  <div className="mb-8">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-t-xl shadow-md">
                      <h3 className="text-xl font-black flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <span>Incidentes reportados por usuarios de Waze</span>
                        <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                          {incidents.length}
                        </span>
                      </h3>
                    </div>
                    <div className="space-y-4 bg-white dark:bg-veltrix-card p-6 rounded-b-xl shadow-lg border border-gray-100 dark:border-veltrix-border">
                      {incidents
                        .filter(
                          (incident, index, self) =>
                            index ===
                            self.findIndex((i) => i.id === incident.id)
                        )
                        .sort((a, b) => {
                          if (b.severity !== a.severity) {
                            return b.severity - a.severity;
                          }
                          return (b.reliability || 0) - (a.reliability || 0);
                        })
                        .map((incident, index) => {
                          const typeDescription = getIncidentDescription(
                            incident.type,
                            incident.subtype
                          );

                          return (
                            <div
                              key={`incident-${incident.id}-${index}`}
                              onClick={() => onEventClick(incident, "incident")}
                              className="border-2 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:border-blue-400"
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
                                      <h4 className="font-black text-gray-900 text-xl mb-1">
                                        {typeDescription}
                                      </h4>
                                    </div>
                                    <span
                                      className={`px-4 py-2 rounded-full text-xs font-black border-2 shadow-md ${getSeverityColor(
                                        incident.severity
                                      )}`}
                                    >
                                      {getSeverityLabel(incident.severity)}
                                    </span>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-white/70 rounded-lg p-4 border border-gray-200">
                                      {incident.street && (
                                        <div className="flex items-start gap-2">
                                          <WazeIcon
                                            type="map"
                                            uiIcon
                                            size="sm"
                                            className="text-blue-600"
                                          />
                                          <div>
                                            <span className="text-gray-500 font-semibold text-xs">
                                              Dirección:
                                            </span>
                                            <p className="text-gray-900 font-medium">
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
                                            <span className="text-gray-500 font-semibold text-xs">
                                              Ciudad:
                                            </span>
                                            <p className="text-gray-900 font-medium">
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
                                          <span className="text-gray-500 font-semibold text-xs">
                                            Coordenadas:
                                          </span>
                                          <p className="text-gray-900 font-mono text-xs font-medium">
                                            {formatCoordinates(
                                              incident.location.lat,
                                              incident.location.lng
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
                                        <div>
                                          <span className="text-gray-500 font-semibold text-xs">
                                            Reportado:
                                          </span>
                                          <p className="text-gray-900 font-medium text-xs">
                                            {new Date(
                                              incident.timestamp
                                            ).toLocaleString("es-AR")}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex gap-3">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedEvent({
                                            id: incident.id,
                                            type: "incident",
                                          });
                                        }}
                                        className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
                                      >
                                        <span className="group-hover:scale-125 transition-transform duration-300">
                                          <WazeIcon
                                            type="map"
                                            uiIcon
                                            size="lg"
                                          />
                                        </span>
                                        <span className="tracking-wide">
                                          Ver Ubicación en Minimapa
                                        </span>
                                        <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
                                          →
                                        </span>
                                      </button>
                                      {incident.type?.toLowerCase() ===
                                        "accident" && (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (
                                              registeringAccident ===
                                              incident.id
                                            )
                                              return;

                                            setRegisteringAccident(incident.id);
                                            try {
                                              await createAccident.mutateAsync({
                                                incident_id: incident.id,
                                                waze_data: incident,
                                                type: incident.type,
                                                subtype: incident.subtype,
                                                severity: incident.severity,
                                                street: incident.street,
                                                location_lat:
                                                  incident.location.lat,
                                                location_lng:
                                                  incident.location.lng,
                                                accident_at: new Date(
                                                  incident.timestamp
                                                ).toISOString(),
                                              });
                                              alert(
                                                "✅ Siniestro registrado exitosamente en el módulo de siniestros"
                                              );
                                            } catch (error: any) {
                                              console.error(
                                                "Error registrando siniestro:",
                                                error
                                              );

                                              // Manejar error 409 (duplicado) de manera amigable
                                              if (
                                                error?.status === 409 ||
                                                error?.isDuplicate
                                              ) {
                                                const existingAccident =
                                                  error?.existingAccident;
                                                const accidentId =
                                                  existingAccident?.id || "N/A";
                                                const accidentDate =
                                                  existingAccident?.accident_at
                                                    ? new Date(
                                                        existingAccident.accident_at
                                                      ).toLocaleString("es-AR")
                                                    : "N/A";

                                                alert(
                                                  `ℹ️ Este siniestro ya está registrado en el módulo.\n\n` +
                                                    `ID del registro: ${accidentId}\n` +
                                                    `Fecha: ${accidentDate}\n\n` +
                                                    `No es necesario registrarlo nuevamente.`
                                                );
                                              } else {
                                                const errorMessage =
                                                  error?.message ||
                                                  error?.data?.message ||
                                                  "Error desconocido";
                                                alert(
                                                  `❌ Error al registrar el siniestro:\n\n${errorMessage}`
                                                );
                                              }
                                            } finally {
                                              setRegisteringAccident(null);
                                            }
                                          }}
                                          disabled={
                                            registeringAccident === incident.id
                                          }
                                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                                        >
                                          {registeringAccident ===
                                          incident.id ? (
                                            <>
                                              <span className="animate-spin">
                                                ⏳
                                              </span>
                                              <span>Registrando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <span>📝</span>
                                              <span>
                                                Registrar en Siniestros
                                              </span>
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {incident.nThumbsUp !== undefined && (
                                    <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300">
                                      <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-3 shadow-md">
                                        <span className="text-3xl">👍</span>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-600 font-semibold">
                                            Confirmado por Wazers
                                          </p>
                                          <p className="text-2xl font-black text-green-700">
                                            {incident.nThumbsUp}{" "}
                                            {incident.nThumbsUp === 1
                                              ? "usuario"
                                              : "usuarios"}
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
                                        "{incident.description}"
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* Alertas automaticas de Waze Section */}
              {alerts.length > 0 &&
                (activeFilter === "all" || activeFilter === "alerts") && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-t-xl shadow-md">
                      <h3 className="text-xl font-black flex items-center gap-3">
                        <span className="text-2xl">🚨</span>
                        <span>Alertas automaticas de Waze</span>
                        <span className="ml-auto bg-white/30 px-3 py-1 rounded-full text-sm font-bold">
                          {alerts.length}
                        </span>
                      </h3>
                    </div>
                    <div className="space-y-4 bg-white p-6 rounded-b-xl shadow-lg">
                      {alerts
                        .filter(
                          (alert, index, self) =>
                            index === self.findIndex((a) => a.id === alert.id)
                        )
                        .sort((a, b) => {
                          const severityOrder = {
                            critical: 4,
                            high: 3,
                            medium: 2,
                            low: 1,
                          };
                          return (
                            (severityOrder[b.severity] || 0) -
                            (severityOrder[a.severity] || 0)
                          );
                        })
                        .map((alert, index) => {
                          const severityConfig = (
                            {
                              critical: {
                                label: "CRÍTICA",
                                color: "bg-red-100 border-red-400 text-red-900",
                                iconType: "critical",
                              },
                              high: {
                                label: "ALTA",
                                color:
                                  "bg-orange-100 border-orange-400 text-orange-900",
                                iconType: "warning",
                              },
                              medium: {
                                label: "MEDIA",
                                color:
                                  "bg-yellow-100 border-yellow-400 text-yellow-900",
                                iconType: "warning",
                              },
                              low: {
                                label: "BAJA",
                                color:
                                  "bg-blue-100 border-blue-400 text-blue-900",
                                iconType: "alert",
                              },
                            } as const
                          )[
                            alert.severity as
                              | "critical"
                              | "high"
                              | "medium"
                              | "low"
                          ] || {
                            label: "BAJA",
                            color: "bg-blue-100 text-blue-900 border-blue-400",
                            iconType: "alert",
                          };

                          return (
                            <div
                              key={`alert-${alert.id}-${index}`}
                              onClick={() => onEventClick(alert, "alert")}
                              className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${severityConfig.color}`}
                            >
                              <div className="flex items-start gap-4">
                                <div>
                                  <WazeIcon
                                    type={severityConfig.iconType}
                                    uiIcon
                                    size="xl"
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <h4 className="font-bold text-lg">
                                      {alert.message}
                                    </h4>
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
                                        <WazeIcon
                                          type="time"
                                          uiIcon
                                          size="sm"
                                        />
                                        Detectada:
                                      </span>
                                      <span>
                                        {new Date(
                                          alert.timestamp
                                        ).toLocaleString("es-AR")}
                                      </span>
                                    </div>
                                    {alert.data &&
                                      Object.keys(alert.data).length > 0 && (
                                        <div className="mt-2 pt-2 border-t flex gap-3 text-xs">
                                          {alert.data.criticalJamsCount && (
                                            <span className="font-semibold">
                                              <span className="flex items-center gap-1">
                                                <WazeIcon
                                                  type="jam"
                                                  size="sm"
                                                />
                                                {alert.data.criticalJamsCount}{" "}
                                                puntos críticos
                                              </span>
                                            </span>
                                          )}
                                          {alert.data.avgDelayMinutes !==
                                            undefined && (
                                            <span className="font-semibold">
                                              ⏱️ +{alert.data.avgDelayMinutes}{" "}
                                              min demora
                                            </span>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedEvent({
                                        id: alert.id,
                                        type: "alert",
                                      });
                                    }}
                                    className="w-full mt-3 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-3 group"
                                  >
                                    <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                                      🗺️
                                    </span>
                                    <span className="tracking-wide">
                                      Ver Ubicación en Minimapa
                                    </span>
                                    <span className="text-2xl group-hover:translate-x-1 transition-transform duration-300">
                                      →
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
            </>
          )}

          {/* Empty State */}
          {((activeFilter === "all" &&
            incidents.length === 0 &&
            alerts.length === 0) ||
            (activeFilter === "incidents" && incidents.length === 0) ||
            (activeFilter === "alerts" && alerts.length === 0)) && (
            <div className="text-center py-20 bg-white rounded-xl shadow-lg">
              <div className="text-8xl mb-6 animate-bounce">✅</div>
              <p className="text-3xl font-black text-gray-700 mb-2">
                {activeFilter === "incidents" && "No hay incidentes activos"}
                {activeFilter === "alerts" && "No hay alertas activas"}
                {activeFilter === "all" && "¡Todo en Orden!"}
              </p>
              <p className="text-lg text-gray-500">
                {activeFilter === "all" &&
                  "No hay eventos activos en este momento"}
                {activeFilter !== "all" &&
                  "Intenta cambiar el filtro para ver otros eventos"}
              </p>
              {activeFilter === "all" && (
                <p className="text-sm text-gray-400 mt-3">
                  Todos los sistemas operando normalmente
                </p>
              )}
            </div>
          )}
        </div>

        {/* Portal para el Modal Flotante del Minimapa - Renderizado fuera del DOM principal */}
        {(currentExpandedIncident || currentExpandedAlert) &&
          eventCoordinates &&
          createPortal(
            <div
              className="fixed inset-0 flex items-center justify-center p-4 animate-fade-in"
              style={{
                zIndex: 99999,
                background: "rgba(0, 0, 0, 0.85)",
                backdropFilter: "blur(10px)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedEvent(null);
              }}
            >
              <div
                className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
                style={{
                  animation: "scaleIn 0.3s ease-out",
                  boxShadow:
                    "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1)",
                  border: "3px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                {(() => {
                  // Determinar si es incidente o alerta
                  const isIncident = !!currentExpandedIncident;

                  let iconType: string;
                  let iconSubtype: string | undefined;
                  let isUIIcon: boolean = false;
                  let typeDescription: string;
                  let eventData: any;

                  if (isIncident && currentExpandedIncident) {
                    iconType = currentExpandedIncident.type;
                    iconSubtype = currentExpandedIncident.subtype;
                    typeDescription = getIncidentDescription(
                      currentExpandedIncident.type,
                      currentExpandedIncident.subtype
                    );
                    eventData = currentExpandedIncident;
                  } else if (currentExpandedAlert) {
                    const severityConfig = {
                      critical: { iconType: "critical", label: "CRÍTICA" },
                      high: { iconType: "warning", label: "ALTA" },
                      medium: { iconType: "warning", label: "MEDIA" },
                      low: { iconType: "alert", label: "BAJA" },
                    }[currentExpandedAlert.severity];
                    iconType = severityConfig.iconType;
                    isUIIcon = true;
                    typeDescription = currentExpandedAlert.message;
                    eventData = currentExpandedAlert;
                  } else {
                    return null;
                  }

                  return (
                    <>
                      {/* Header del Modal */}
                      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white px-8 py-6 relative overflow-hidden">
                        {/* Efecto de brillo animado */}
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                          style={{ animation: "shimmer 3s infinite" }}
                        ></div>

                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="drop-shadow-lg animate-bounce"
                              style={{ animationDuration: "2s" }}
                            >
                              <WazeIcon
                                type={iconType}
                                subtype={iconSubtype}
                                uiIcon={isUIIcon}
                                size="xl"
                              />
                            </div>
                            <div>
                              <h3 className="text-2xl font-black mb-1">
                                {typeDescription}
                              </h3>
                              <div className="flex items-center gap-2">
                                {isIncident && currentExpandedIncident && (
                                  <>
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(
                                        currentExpandedIncident.severity
                                      )} shadow-lg`}
                                    >
                                      {getSeverityLabel(
                                        currentExpandedIncident.severity
                                      )}
                                    </span>
                                    {currentExpandedIncident.nThumbsUp !==
                                      undefined &&
                                      currentExpandedIncident.nThumbsUp > 0 && (
                                        <span className="px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-xs font-bold">
                                          👍 {currentExpandedIncident.nThumbsUp}{" "}
                                          confirmaciones
                                        </span>
                                      )}
                                  </>
                                )}
                                {!isIncident && currentExpandedAlert && (
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                                      currentExpandedAlert.severity ===
                                      "critical"
                                        ? "bg-red-100 border-red-400 text-red-900"
                                        : currentExpandedAlert.severity ===
                                          "high"
                                        ? "bg-orange-100 border-orange-400 text-orange-900"
                                        : currentExpandedAlert.severity ===
                                          "medium"
                                        ? "bg-yellow-100 border-yellow-400 text-yellow-900"
                                        : "bg-blue-100 border-blue-400 text-blue-900"
                                    } shadow-lg`}
                                  >
                                    {currentExpandedAlert.severity ===
                                    "critical"
                                      ? "CRÍTICA"
                                      : currentExpandedAlert.severity === "high"
                                      ? "ALTA"
                                      : currentExpandedAlert.severity ===
                                        "medium"
                                      ? "MEDIA"
                                      : "BAJA"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedEvent(null);
                            }}
                            className="text-white bg-white/10 hover:bg-white/30 rounded-full p-3 transition-all duration-300 hover:scale-125 hover:rotate-90 group backdrop-blur-sm border-2 border-white/30 hover:border-white/60"
                            title="Cerrar minimapa (ESC)"
                          >
                            <svg
                              className="w-8 h-8"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Layout de 2 columnas: Mapa + Info */}
                      <div
                        className="flex-1 overflow-y-auto"
                        style={{ maxHeight: "calc(90vh - 150px)" }}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 h-full">
                          {/* MINIMAPA - 3/5 del espacio */}
                          <div
                            className="lg:col-span-3 relative h-full"
                            style={{ minHeight: "500px" }}
                          >
                            {(() => {
                              // Obtener el polígono asociado
                              const polygonId =
                                isIncident && currentExpandedIncident
                                  ? currentExpandedIncident.polygonId
                                  : currentExpandedAlert?.polygonId;

                              const associatedPolygon = polygonId
                                ? polygons.find((p) => p.id === polygonId)
                                : null;

                              // Filtrar incidentes y jams del polígono
                              const polygonIncidents = polygonId
                                ? incidents.filter(
                                    (i) => i.polygonId === polygonId
                                  )
                                : [];

                              const polygonJams = polygonId
                                ? jams.filter((j) => j.polygonId === polygonId)
                                : [];

                              // Calcular centro del polígono o usar coordenadas del evento
                              let mapCenter: [number, number] = [
                                eventCoordinates.lat,
                                eventCoordinates.lng,
                              ];
                              let mapZoom = 16;

                              if (
                                associatedPolygon &&
                                associatedPolygon.geometry?.coordinates?.[0]
                              ) {
                                const coords =
                                  associatedPolygon.geometry.coordinates[0];
                                const lats = coords.map((c) => c[1]);
                                const lngs = coords.map((c) => c[0]);
                                mapCenter = [
                                  (Math.min(...lats) + Math.max(...lats)) / 2,
                                  (Math.min(...lngs) + Math.max(...lngs)) / 2,
                                ];
                                mapZoom = 14;
                              }

                              // 1. Preparar Polígonos
                              const mapPolygons =
                                associatedPolygon &&
                                associatedPolygon.geometry?.coordinates?.[0]
                                  ? [
                                      {
                                        id: `poly-${associatedPolygon.id}`,
                                        points:
                                          associatedPolygon.geometry.coordinates[0].map(
                                            (c) =>
                                              [c[1], c[0]] as [number, number]
                                          ),
                                        color: "#3b82f6",
                                        fillColor: "#3b82f6",
                                        fillOpacity: 0.2,
                                        weight: 3,
                                      },
                                    ]
                                  : [];

                              // 2. Preparar Marcadores (Incidentes)
                              const incidentMarkers = polygonIncidents.map(
                                (incident) => {
                                  const incidentIconType = incident.type;
                                  const incidentIconSubtype = incident.subtype;
                                  const severity = incident.severity;
                                  const color =
                                    severity >= 4
                                      ? "#dc2626"
                                      : severity >= 3
                                      ? "#ea580c"
                                      : "#fbbf24";

                                  return {
                                    lat: incident.location.lat,
                                    lng: incident.location.lng,
                                    id: `incident-${incident.id}`,
                                    icon: iconCacheService.getIconUrlSync(
                                      incidentIconType,
                                      incidentIconSubtype
                                    ),
                                    color: color,
                                    popup: (
                                      <div className="p-2 min-w-[200px]">
                                        <div className="flex items-center gap-2 mb-2">
                                          <WazeIcon
                                            type={incidentIconType}
                                            subtype={incidentIconSubtype}
                                            size="lg"
                                          />
                                          <div>
                                            <p className="font-black text-base">
                                              {getIncidentDescription(
                                                incident.type,
                                                incident.subtype
                                              )}
                                            </p>
                                            <span
                                              className={`text-xs font-bold ${
                                                incident.severity >= 4
                                                  ? "text-red-600"
                                                  : incident.severity >= 3
                                                  ? "text-orange-600"
                                                  : "text-yellow-600"
                                              }`}
                                            >
                                              {getSeverityLabel(
                                                incident.severity
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        {incident.street && (
                                          <p className="text-sm text-gray-700 mb-1 flex items-center gap-1">
                                            <WazeIcon
                                              type="map"
                                              uiIcon
                                              size="sm"
                                            />
                                            {incident.street}
                                          </p>
                                        )}
                                      </div>
                                    ),
                                  };
                                }
                              );

                              // 3. Preparar Polilíneas (Jams & Road Closures)
                              const mapPolylines: any[] = [];

                              // Agrupar jams por blockingAlertUuid para cierres de ruta
                              const roadClosedGroups = new Map<
                                string,
                                TrafficJam[]
                              >();
                              const normalJams: TrafficJam[] = [];

                              polygonJams.forEach((jam) => {
                                const isRoadClosed =
                                  jam.speed === 0 ||
                                  jam.blockingAlertUuid ||
                                  polygonIncidents.some(
                                    (inc) =>
                                      inc.id === jam.blockingAlertUuid &&
                                      (inc.type.toLowerCase() ===
                                        "roadclosed" ||
                                        inc.type.toLowerCase() ===
                                          "road_closed")
                                  );

                                if (isRoadClosed && jam.blockingAlertUuid) {
                                  if (
                                    !roadClosedGroups.has(jam.blockingAlertUuid)
                                  ) {
                                    roadClosedGroups.set(
                                      jam.blockingAlertUuid,
                                      []
                                    );
                                  }
                                  roadClosedGroups
                                    .get(jam.blockingAlertUuid)!
                                    .push(jam);
                                } else if (isRoadClosed && jam.speed === 0) {
                                  if (
                                    !roadClosedGroups.has(
                                      `speed-zero-${jam.id}`
                                    )
                                  ) {
                                    roadClosedGroups.set(
                                      `speed-zero-${jam.id}`,
                                      []
                                    );
                                  }
                                  roadClosedGroups
                                    .get(`speed-zero-${jam.id}`)!
                                    .push(jam);
                                } else {
                                  normalJams.push(jam);
                                }
                              });

                              // Procesar Road Closures (Capas)
                              roadClosedGroups.forEach((jams, key) => {
                                jams.forEach((jam, idx) => {
                                  if (!jam.line || jam.line.length < 2) return;
                                  const points = jam.line.map(
                                    (p) => [p.y, p.x] as [number, number]
                                  );
                                  const baseId = `rc-${jam.id || idx}`; // fallback id

                                  // 1. Linea base blanca
                                  mapPolylines.push({
                                    id: `${baseId}-base`,
                                    points,
                                    color: "#ffffff",
                                    weight: 10,
                                    opacity: 1,
                                    lineCap: "butt",
                                  });

                                  // 2. Linea roja discontinua
                                  mapPolylines.push({
                                    id: `${baseId}-dashed`,
                                    points,
                                    color: "#dc2626",
                                    weight: 10,
                                    opacity: 1,
                                    lineCap: "butt",
                                    dashArray: [1.5, 1.5],
                                  });

                                  // 3. Borde negro
                                  mapPolylines.push({
                                    id: `${baseId}-border`,
                                    points,
                                    color: "#000000",
                                    weight: 12,
                                    opacity: 0.4,
                                    lineCap: "butt",
                                  });
                                });
                              });

                              // Procesar Normal Jams
                              normalJams.forEach((jam, idx) => {
                                if (!jam.line || jam.line.length < 2) return;
                                const points = jam.line.map(
                                  (p) => [p.y, p.x] as [number, number]
                                );

                                let lineColor;
                                if (jam.speed < 10) lineColor = "#dc2626";
                                else if (jam.speed < 20) lineColor = "#ea580c";
                                else if (jam.speed < 30) lineColor = "#d97706";
                                else lineColor = "#16a34a";

                                mapPolylines.push({
                                  id: `jam-line-${jam.id || idx}`,
                                  points,
                                  color: lineColor,
                                  weight: 6,
                                  opacity: 0.8,
                                  lineCap: "round",
                                  lineJoin: "round",
                                });
                              });

                              // 4. Preparar Marcadores de Jams
                              const jamMarkers = polygonJams.map((jam) => {
                                const jamLevel = jam.level ?? 0;
                                let jamColor: string;
                                if (jam.speed < 10) jamColor = "#dc2626";
                                else if (jam.speed < 20) jamColor = "#ef4444";
                                else if (jam.speed < 30) jamColor = "#f97316";
                                else if (jam.speed < 40) jamColor = "#eab308";
                                else jamColor = "#22c55e";

                                return {
                                  lat: jam.location.lat,
                                  lng: jam.location.lng,
                                  id: `jam-marker-${jam.id}`,
                                  icon: iconCacheService.getIconUrlSync("jam"),
                                  color: jamColor,
                                  popup: (
                                    <div className="p-2 min-w-[200px]">
                                      <p className="font-bold text-base">
                                        {getJamLevelTranslation(jam.level ?? 0)}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Velocidad: {jam.speed} km/h
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Demora: {Math.round(jam.delay / 60)} min
                                      </p>
                                    </div>
                                  ),
                                };
                              });

                              return (
                                <MiniMapLibre
                                  center={mapCenter}
                                  zoom={mapZoom}
                                  height="100%"
                                  polygons={mapPolygons}
                                  polylines={mapPolylines}
                                  markers={[...incidentMarkers, ...jamMarkers]}
                                />
                              );
                            })()}

                            {/* Badge flotante con tipo de evento */}
                            <div className="absolute top-4 left-4 z-10">
                              <div
                                className={`px-4 py-2 rounded-full backdrop-blur-md shadow-xl font-bold text-sm flex items-center gap-2 ${
                                  isIncident &&
                                  currentExpandedIncident?.severity >= 4
                                    ? "bg-red-600/90 text-white"
                                    : isIncident &&
                                      currentExpandedIncident?.severity >= 3
                                    ? "bg-orange-500/90 text-white"
                                    : "bg-blue-600/90 text-white"
                                }`}
                              >
                                <WazeIcon
                                  type={iconType}
                                  subtype={iconSubtype}
                                  uiIcon={isUIIcon}
                                  size="md"
                                />
                                <span>
                                  {isIncident ? "INCIDENTE" : "ALERTA"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* PANEL DE INFORMACIÓN - 2/5 del espacio */}
                          <div className="lg:col-span-2 bg-gradient-to-br from-gray-50 to-blue-50 p-6 overflow-y-auto h-full">
                            <h4 className="font-black text-xl text-gray-800 mb-4 flex items-center gap-2">
                              <WazeIcon type="stats" uiIcon size="lg" />
                              Información Detallada
                            </h4>

                            <div className="space-y-3">
                              {/* Card Ubicación Principal */}
                              {(isIncident &&
                                currentExpandedIncident?.street) ||
                              (!isIncident && currentExpandedAlert) ? (
                                <div className="md:col-span-2 bg-gradient-to-br from-white to-blue-50 rounded-2xl p-5 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                  <div className="flex items-start gap-4">
                                    <WazeIcon type="map" uiIcon size="xl" />
                                    <div className="flex-1">
                                      <p className="text-gray-500 font-bold text-sm mb-2">
                                        UBICACIÓN
                                      </p>
                                      {isIncident &&
                                        currentExpandedIncident?.street && (
                                          <>
                                            <p className="text-gray-900 font-black text-xl mb-1">
                                              {currentExpandedIncident.street}
                                            </p>
                                            {currentExpandedIncident.city && (
                                              <p className="text-gray-600 font-semibold">
                                                {currentExpandedIncident.city}
                                              </p>
                                            )}
                                          </>
                                        )}
                                      {!isIncident && currentExpandedAlert && (
                                        <>
                                          <p className="text-gray-900 font-black text-xl mb-1">
                                            {currentExpandedAlert.location}
                                          </p>
                                          <p className="text-gray-600 font-semibold">
                                            {currentExpandedAlert.polygonName}
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Card Coordenadas */}
                              {eventCoordinates && (
                                <div className="bg-gradient-to-br from-white to-emerald-50 rounded-2xl p-5 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                  <div className="flex items-center gap-3 mb-3">
                                    <WazeIcon type="map" uiIcon size="lg" />
                                    <p className="text-gray-700 font-bold">
                                      COORDENADAS GPS
                                    </p>
                                  </div>
                                  <div className="space-y-2 bg-white/50 rounded-lg p-3">
                                    <div>
                                      <p className="text-gray-500 text-xs font-semibold">
                                        Latitud
                                      </p>
                                      <p className="text-gray-900 font-mono font-bold text-lg">
                                        {eventCoordinates.lat.toFixed(6)}
                                      </p>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2">
                                      <p className="text-gray-500 text-xs font-semibold">
                                        Longitud
                                      </p>
                                      <p className="text-gray-900 font-mono font-bold text-lg">
                                        {eventCoordinates.lng.toFixed(6)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Card Fecha y Hora */}
                              {eventData && (
                                <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl p-5 border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                  <div className="flex items-center gap-3 mb-3">
                                    <WazeIcon type="time" uiIcon size="lg" />
                                    <p className="text-gray-700 font-bold">
                                      FECHA Y HORA
                                    </p>
                                  </div>
                                  <div className="bg-white/50 rounded-lg p-3">
                                    <p className="text-gray-900 font-bold text-base leading-relaxed">
                                      {new Date(
                                        eventData.timestamp
                                      ).toLocaleString("es-AR", {
                                        dateStyle: "full",
                                        timeStyle: "short",
                                      })}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Card Confirmaciones - Solo para incidentes */}
                              {isIncident &&
                                currentExpandedIncident?.nThumbsUp !==
                                  undefined && (
                                  <div className="md:col-span-2 bg-gradient-to-br from-white to-green-50 rounded-2xl p-5 border-2 border-green-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <WazeIcon
                                          type="check"
                                          uiIcon
                                          size="xl"
                                        />
                                        <div>
                                          <p className="text-gray-500 font-bold text-sm mb-1">
                                            CONFIRMADO POR WAZERS
                                          </p>
                                          <p className="text-green-700 font-black text-3xl">
                                            {currentExpandedIncident.nThumbsUp}{" "}
                                            {currentExpandedIncident.nThumbsUp ===
                                            1
                                              ? "usuario"
                                              : "usuarios"}
                                          </p>
                                        </div>
                                      </div>
                                      {currentExpandedIncident.nThumbsUp >
                                        5 && (
                                        <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg">
                                          <p className="font-black text-sm">
                                            ✓ ALTA
                                          </p>
                                          <p className="font-black text-xs">
                                            CONFIANZA
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* ===== INFORMACIÓN ADICIONAL DEL FEED ===== */}

                              {/* Card Confiabilidad y Métricas (INCIDENTES) */}
                              {isIncident && currentExpandedIncident && (
                                <>
                                  {/* Reliability & Confidence */}
                                  {(currentExpandedIncident.reliability !==
                                    undefined ||
                                    currentExpandedIncident.confidence !==
                                      undefined) && (
                                    <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl p-5 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                      <div className="flex items-center gap-3 mb-4">
                                        <WazeIcon
                                          type="stats"
                                          uiIcon
                                          size="lg"
                                        />
                                        <p className="text-gray-700 font-bold">
                                          MÉTRICAS DE CALIDAD
                                        </p>
                                      </div>
                                      <div className="space-y-3">
                                        {currentExpandedIncident.reliability !==
                                          undefined && (
                                          <div className="bg-white/60 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <p className="text-gray-600 font-semibold text-sm">
                                                Confiabilidad
                                              </p>
                                              <p className="text-purple-700 font-black text-xl">
                                                {
                                                  currentExpandedIncident.reliability
                                                }
                                                /10
                                              </p>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                              <div
                                                className="bg-gradient-to-r from-purple-500 to-purple-700 h-2 rounded-full transition-all duration-500"
                                                style={{
                                                  width: `${
                                                    (currentExpandedIncident.reliability /
                                                      10) *
                                                    100
                                                  }%`,
                                                }}
                                              ></div>
                                            </div>
                                          </div>
                                        )}
                                        {currentExpandedIncident.confidence !==
                                          undefined && (
                                          <div className="bg-white/60 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <p className="text-gray-600 font-semibold text-sm">
                                                Nivel de Confianza
                                              </p>
                                              <p className="text-indigo-700 font-black text-xl">
                                                {
                                                  currentExpandedIncident.confidence
                                                }
                                                /10
                                              </p>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                              <div
                                                className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-2 rounded-full transition-all duration-500"
                                                style={{
                                                  width: `${
                                                    (currentExpandedIncident.confidence /
                                                      10) *
                                                    100
                                                  }%`,
                                                }}
                                              ></div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Report Rating */}
                                  {currentExpandedIncident.reportRating !==
                                    undefined && (
                                    <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl p-5 border-2 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                      <div className="flex items-center gap-3 mb-3">
                                        <WazeIcon
                                          type="stats"
                                          uiIcon
                                          size="lg"
                                        />
                                        <div className="flex-1">
                                          <p className="text-gray-500 font-bold text-sm mb-1">
                                            RATING DEL REPORTE
                                          </p>
                                          <div className="flex items-center gap-3">
                                            <p className="text-yellow-700 font-black text-3xl">
                                              {
                                                currentExpandedIncident.reportRating
                                              }
                                            </p>
                                            <div className="flex gap-1">
                                              {Array.from({ length: 10 }).map(
                                                (_, i) => (
                                                  <div
                                                    key={i}
                                                    className={`w-2 h-8 rounded-full ${
                                                      i <
                                                      currentExpandedIncident.reportRating!
                                                        ? "bg-gradient-to-t from-yellow-400 to-yellow-600"
                                                        : "bg-gray-200"
                                                    }`}
                                                  />
                                                )
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Subtipo y Descripción */}
                                  {(currentExpandedIncident.subtype ||
                                    currentExpandedIncident.description) && (
                                    <div className="md:col-span-2 bg-gradient-to-br from-white to-cyan-50 rounded-2xl p-5 border-2 border-cyan-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                      <div className="flex items-start gap-4">
                                        <span className="text-4xl">ℹ️</span>
                                        <div className="flex-1">
                                          <p className="text-gray-500 font-bold text-sm mb-3">
                                            INFORMACIÓN ADICIONAL
                                          </p>
                                          {currentExpandedIncident.subtype && (
                                            <div className="mb-3">
                                              <p className="text-gray-600 font-semibold text-xs mb-1">
                                                Clasificación:
                                              </p>
                                              <p className="text-cyan-800 font-bold text-base">
                                                {getSubtypeTranslation(
                                                  currentExpandedIncident.type,
                                                  currentExpandedIncident.subtype
                                                )}
                                              </p>
                                            </div>
                                          )}
                                          {currentExpandedIncident.description && (
                                            <div className="bg-white/60 rounded-lg p-3">
                                              <p className="text-gray-600 font-semibold text-xs mb-2">
                                                Descripción:
                                              </p>
                                              <p className="text-gray-800 leading-relaxed">
                                                {(() => {
                                                  const desc =
                                                    currentExpandedIncident.description;
                                                  // Si parece un subtype (formato HAZARD_ON_SHOULDER_CAR_STOPPED)
                                                  if (/^[A-Z_]+$/.test(desc)) {
                                                    // Intentar traducir como subtype
                                                    const subtypeTranslation =
                                                      getSubtypeTranslation(
                                                        currentExpandedIncident.type,
                                                        desc
                                                      );
                                                    // Si se tradujo, usarlo; si no, intentar como main type
                                                    if (
                                                      subtypeTranslation !==
                                                      desc
                                                    ) {
                                                      return subtypeTranslation;
                                                    }
                                                  }
                                                  // Intentar como main type
                                                  const mainTranslation =
                                                    getMainTypeTranslation(
                                                      desc.toLowerCase()
                                                    );
                                                  // Si no se tradujo, intentar con el subtype del incidente
                                                  if (
                                                    mainTranslation ===
                                                      desc.toLowerCase() &&
                                                    currentExpandedIncident.subtype
                                                  ) {
                                                    return getSubtypeTranslation(
                                                      currentExpandedIncident.type,
                                                      currentExpandedIncident.subtype
                                                    );
                                                  }
                                                  return mainTranslation !==
                                                    desc.toLowerCase()
                                                    ? mainTranslation
                                                    : desc;
                                                })()}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Card Estado de Reconocimiento (ALERTAS) */}
                              {!isIncident && currentExpandedAlert && (
                                <>
                                  <div className="md:col-span-2 bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-5 border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                    <div className="flex items-start gap-4">
                                      <WazeIcon
                                        type={
                                          currentExpandedAlert.isAcknowledged
                                            ? "check"
                                            : "alert"
                                        }
                                        uiIcon
                                        size="xl"
                                      />
                                      <div className="flex-1">
                                        <p className="text-gray-500 font-bold text-sm mb-3">
                                          ESTADO DE RECONOCIMIENTO
                                        </p>
                                        <div className="space-y-3">
                                          <div
                                            className={`px-4 py-3 rounded-lg ${
                                              currentExpandedAlert.isAcknowledged
                                                ? "bg-green-100 border-2 border-green-300"
                                                : "bg-orange-100 border-2 border-orange-300"
                                            }`}
                                          >
                                            <p
                                              className={`font-black text-lg flex items-center gap-2 ${
                                                currentExpandedAlert.isAcknowledged
                                                  ? "text-green-800"
                                                  : "text-orange-800"
                                              }`}
                                            >
                                              {currentExpandedAlert.isAcknowledged ? (
                                                <>
                                                  <WazeIcon
                                                    type="check"
                                                    uiIcon
                                                    size="sm"
                                                  />
                                                  RECONOCIDA
                                                </>
                                              ) : (
                                                <>
                                                  <WazeIcon
                                                    type="warning"
                                                    uiIcon
                                                    size="sm"
                                                  />
                                                  PENDIENTE DE RECONOCIMIENTO
                                                </>
                                              )}
                                            </p>
                                          </div>
                                          {currentExpandedAlert.isAcknowledged &&
                                            currentExpandedAlert.acknowledgedAt && (
                                              <div className="bg-white/60 rounded-lg p-3 space-y-2">
                                                <div>
                                                  <p className="text-gray-600 font-semibold text-xs">
                                                    Reconocida el:
                                                  </p>
                                                  <p className="text-gray-800 font-bold">
                                                    {new Date(
                                                      currentExpandedAlert.acknowledgedAt
                                                    ).toLocaleString("es-AR", {
                                                      dateStyle: "long",
                                                      timeStyle: "short",
                                                    })}
                                                  </p>
                                                </div>
                                                {currentExpandedAlert.acknowledgedBy && (
                                                  <div>
                                                    <p className="text-gray-600 font-semibold text-xs">
                                                      Por:
                                                    </p>
                                                    <p className="text-gray-800 font-bold">
                                                      {
                                                        currentExpandedAlert.acknowledgedBy
                                                      }
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tipo de Alerta */}
                                  {currentExpandedAlert.type && (
                                    <div className="bg-gradient-to-br from-white to-rose-50 rounded-2xl p-5 border-2 border-rose-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                                      <div className="flex items-center gap-3">
                                        <WazeIcon
                                          type="alert"
                                          uiIcon
                                          size="lg"
                                        />
                                        <div className="flex-1">
                                          <p className="text-gray-500 font-bold text-sm mb-1">
                                            TIPO DE ALERTA
                                          </p>
                                          <p className="text-rose-800 font-black text-lg uppercase">
                                            {(() => {
                                              // Intentar traducir el tipo de alerta
                                              const translated =
                                                getMainTypeTranslation(
                                                  currentExpandedAlert.type.toLowerCase()
                                                );
                                              // Si no se tradujo (devuelve el mismo valor), usar el mensaje de la alerta o una descripción genérica
                                              if (
                                                translated ===
                                                  currentExpandedAlert.type.toLowerCase() ||
                                                translated ===
                                                  currentExpandedAlert.type
                                              ) {
                                                // Intentar extraer información del mensaje
                                                if (
                                                  currentExpandedAlert.message
                                                ) {
                                                  // Si el mensaje contiene información útil, usarla
                                                  return currentExpandedAlert.message
                                                    .split(":")[0]
                                                    .trim();
                                                }
                                                return "Alerta de Tráfico";
                                              }
                                              return translated;
                                            })()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer del Modal */}
                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-8 py-4 border-t-2 border-gray-300">
                          <div className="flex items-center justify-center gap-3">
                            <WazeIcon type="alert" uiIcon size="md" />
                            <p className="text-gray-700 font-semibold text-sm">
                              Haz zoom o mueve el mapa para explorar el área
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>,
            document.body
          )}

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-8 py-4 border-t-2 border-gray-300">
          <div className="flex items-center justify-center gap-3 text-sm text-gray-700">
            <WazeIcon type="alert" uiIcon size="md" />
            <p className="font-semibold">
              <strong className="text-blue-600">Tip:</strong> Haz click en
              cualquier evento para ver su ubicación exacta en el mapa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

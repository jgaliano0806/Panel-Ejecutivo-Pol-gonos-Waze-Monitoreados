import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  useBlockingAnalysis,
  useHistoricalIncidents,
  useWazeData,
  type BlockingAnalysisItem,
  type HistoricalIncident,
} from "../../hooks/useWazeData";
import { expandAndJitterIncidents } from "../../utils/mapUtils";
import { Map } from "../map/Map";
import {
  RefreshCw,
  Search,
  X,
  Calendar,
  History,
  Activity,
} from "lucide-react";
import { EventsCharts } from "./EventsCharts";
import { getIncidentDescription } from "../../utils/wazeTranslations";

export type DataSourceFilter = "current" | "historical" | "all";
export type StatusFilter = "active" | "inactive" | "all";

export const EventsDashboard: React.FC = () => {
  const { data, isLoading, isError, refetch } = useBlockingAnalysis();
  const { polygons, jams, incidents: allIncidents } = useWazeData();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");

  // Estados para filtros interactivos (gráficos)
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Estado para el modal de mapa detallado (tramo afectado)
  const [detailMapState, setDetailMapState] = useState<{
    isOpen: boolean;
    polygonId: string | null;
    zoneName: string;
  } | null>(null);

  // Nuevos filtros de datos históricos y estado
  const [dataSource, setDataSource] = useState<DataSourceFilter>("current");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Hook para datos históricos (solo se activa cuando dataSource incluye históricos)
  const { data: historicalData, isLoading: isLoadingHistorical } =
    useHistoricalIncidents({
      from: dateFrom || undefined,
      to: dateTo || undefined,
      limit: 200,
      enabled: dataSource === "historical" || dataSource === "all",
    });

  // Reuse map modal logic
  const [mapModalData, setMapModalData] = useState<{
    isOpen: boolean;
    locations: Array<{ lat: number; lng: number; id: string }>;
    title: string;
    description: string;
    type: string;
    subtype?: string;
    polygonName: string;
    feed: string;
  } | null>(null);

  // Convertir incidentes históricos al formato BlockingAnalysisItem
  const convertHistoricalToAnalysis = (
    h: HistoricalIncident,
  ): BlockingAnalysisItem => ({
    incident: {
      id: h.incident_id,
      type: h.type,
      subtype: h.subtype || "",
      description: h.type,
      street: h.street || "",
      city: h.city || "",
      severity: h.severity || 1,
      polygonId: h.polygon_id,
      location: { lat: h.latitude || 0, lng: h.longitude || 0 },
      timestamp: new Date(h.first_seen_at), // Convertir a Date
    },
    delay: {
      totalDelaySeconds: (h.estimated_delay_minutes || 0) * 60,
      totalDelayMinutes: h.estimated_delay_minutes || 0,
      breakdown: {
        linkedJamsDelay: 0,
        proximityDelay: 0,
        detourDelay: 0,
        historicalDelta: 0,
      },
      confidence: h.confidence || 50,
      consideredJams: { linked: 0, nearby: 0 }, // Corregido: numbers, no arrays
      primaryMethod: "minimal", // Corregido: usar valor válido del union type
      details: `Histórico - Duración: ${h.duration_minutes || 0} min`,
      dataQuality: "medium",
    },
    linkedJams: h.blocking_jams || 0,
    affectedLength: 0,
    affectedLengthKm: "0.00",
    impactScore: Math.round(
      (h.estimated_delay_minutes || 0) * 2 + (h.blocking_jams || 0) * 10,
    ),
    reportCount: h.n_thumbs_up || 1,
    allLocations: [
      {
        lat:
          typeof h.latitude === "string"
            ? parseFloat(h.latitude)
            : h.latitude || 0,
        lng:
          typeof h.longitude === "string"
            ? parseFloat(h.longitude)
            : h.longitude || 0,
        id: h.incident_id,
      },
    ],
    relatedIncidentIds: [],
    nearbyJams: 0,
    polygonName: h.polygon_name || h.polygon_id,
    polygonGroup: null,
    affectedStreets: h.street ? [h.street] : [],
    // Note: location is already set in incident.location above
  });

  // Combinar y filtrar datos según dataSource
  const combinedAnalyses = useMemo(() => {
    let items: BlockingAnalysisItem[] = [];

    // Agregar datos actuales si corresponde
    if (dataSource === "current" || dataSource === "all") {
      items = [...(data?.analyses || [])];
    }

    // Agregar datos históricos si corresponde
    if (
      (dataSource === "historical" || dataSource === "all") &&
      historicalData
    ) {
      const historicalItems = historicalData.map(convertHistoricalToAnalysis);

      if (dataSource === "all") {
        // Evitar duplicados basándose en incident_id
        const currentIds = new Set(items.map((i: any) => i.incident.id));
        const uniqueHistorical = historicalItems.filter(
          (h: any) => !currentIds.has(h.incident.id),
        );
        items = [...items, ...uniqueHistorical];
      } else {
        items = historicalItems;
      }
    }

    return items;
  }, [data?.analyses, historicalData, dataSource]);

  // 1. Base Data for Charts: Applies Data Source, Date Range, Status, and Search
  // This ensures charts show the correct universe of data based on global controls
  const baseAnalyses = useMemo(() => {
    let items = combinedAnalyses;

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      items = items.filter(
        (a: any) => new Date(a.incident.timestamp) >= fromDate,
      );
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      items = items.filter(
        (a: any) => new Date(a.incident.timestamp) <= toDate,
      );
    }

    // Filter by Search (Global context)
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(
        (a: any) =>
          a.incident.street?.toLowerCase().includes(lower) ||
          a.incident.description?.toLowerCase().includes(lower) ||
          a.incident.type.toLowerCase().includes(lower),
      );
    }

    return items;
  }, [combinedAnalyses, dateFrom, dateTo, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            Cargando datos de eventos...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consultando base de datos y calculando análisis de impacto
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 md:p-12 max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
            Error de Conexión con el Servicio
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            No se pudo establecer conexión con el backend o la base de datos.
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 text-left mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
              Posibles causas:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>El servidor backend no está ejecutándose</li>
              <li>PostgreSQL no está disponible</li>
              <li>Problema de red o conectividad</li>
              <li>Error en el servicio de polling de Waze</li>
            </ul>
          </div>
          <button
            onClick={() => refetch()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  if (!data?.analyses || data.analyses.length === 0) {
    return (
      <div className="p-8 md:p-12 max-w-2xl mx-auto">
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-2">
            No Hay Incidentes Activos
          </h3>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            El sistema está operativo pero no se detectaron eventos en este
            momento.
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 text-left mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
              Esto puede significar:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Las rutas monitoreadas están fluidas ✓</li>
              <li>No hay reportes de usuarios Waze activos</li>
              <li>El servicio de polling está recolectando datos</li>
            </ul>
          </div>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Actualizar Datos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Panel de Inteligencia de Eventos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Monitoreo y análisis de impacto en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar evento o calle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>

          <button
            onClick={() => refetch()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            title="Actualizar datos"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {(selectedType || selectedZone) && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-medium text-gray-500 uppercase">
            Filtros activos:
          </span>
          {selectedType && (
            <button
              onClick={() => setSelectedType(null)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              {selectedType} <X size={14} />
            </button>
          )}
          {selectedZone && (
            <button
              onClick={() => setSelectedZone(null)}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              {selectedZone} <X size={14} />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedType(null);
              setSelectedZone(null);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline ml-2"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Advanced Filters - Datos Históricos y Estado */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Fuente de Datos */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <History size={14} />
              Datos:
            </span>
            <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setDataSource("current")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dataSource === "current"
                    ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Actuales
              </button>
              <button
                onClick={() => setDataSource("historical")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dataSource === "historical"
                    ? "bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Históricos
              </button>
              <button
                onClick={() => setDataSource("all")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dataSource === "all"
                    ? "bg-white dark:bg-zinc-700 text-green-600 dark:text-green-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 hidden md:block"></div>

          {/* Rango de Fechas */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Calendar size={14} />
              Desde:
            </span>
            <input
              type="date"
              aria-label="Fecha inicial"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-xs text-gray-400">-</span>
            <input
              type="date"
              aria-label="Fecha final"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 hidden md:block"></div>

          {/* Estado */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Activity size={14} />
              Estado:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
              aria-label="Filtrar por estado"
              title="Filtrar por estado"
            >
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
              <option value="all">Todos</option>
            </select>
          </div>

          {/* Limpiar Filtros */}
          {(dataSource !== "current" ||
            dateFrom ||
            dateTo ||
            statusFilter !== "active") && (
            <button
              onClick={() => {
                setDataSource("current");
                setDateFrom("");
                setDateTo("");
                setStatusFilter("active");
              }}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline flex items-center gap-1"
            >
              <X size={12} />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Graphical Analysis with Interactivity */}
      <EventsCharts
        analyses={baseAnalyses} // Use baseAnalyses to respect global filters (Source, Date, Search) but ignore interactive ones (Type, Zone)
        selectedType={selectedType}
        onTypeClick={setSelectedType}
        onZoneClick={(zoneName: string) => {
          // 1. Filtrar localmente el listado inferior
          setSelectedZone(zoneName);

          // 2. Buscar el polígono correspondiente para el modal
          const analysis = baseAnalyses.find(
            (a) => a.incident.street === zoneName || a.polygonName === zoneName,
          );

          if (analysis?.incident.polygonId) {
            setDetailMapState({
              isOpen: true,
              polygonId: analysis.incident.polygonId,
              zoneName: zoneName,
            });
          }
        }}
      />

      {/* Modal de Mapa Detallado de Tramo (Premium) */}
      {detailMapState?.isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
            onClick={() => setDetailMapState(null)}
          >
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" />
            <div
              className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden border border-gray-200 dark:border-zinc-800 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900/50 backdrop-blur-sm">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                      <Activity size={24} />
                    </div>
                    Inspección Geográfica: {detailMapState.zoneName}
                  </h3>
                  <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
                    Visualizando tramo pintado y todos los eventos en tiempo
                    real
                  </p>
                </div>
                <button
                  onClick={() => setDetailMapState(null)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Mapa Inmersivo */}
              <div className="flex-1 w-full relative">
                <Map
                  polygons={polygons}
                  incidents={expandAndJitterIncidents(
                    baseAnalyses,
                    detailMapState.zoneName,
                    selectedType,
                    getIncidentDescription,
                  )}
                  jams={jams}
                  selectedPolygon={detailMapState.polygonId} // RESTAURADO para auto-zoom
                  selectedGroup={null}
                  onPolygonClick={() => {}}
                />

                {/* Legend Overlay */}
                <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-black/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/20 z-10 pointer-events-none">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                    Capas Activas
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium dark:text-white">
                      <div className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse" />
                      Tramo {detailMapState.zoneName}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium dark:text-zinc-400">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      Congestión Crítica
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium dark:text-zinc-400">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      Alertas de Usuario
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

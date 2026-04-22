import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useIncidentsModule,
  useIncidentDetail,
  translateIncidentType,
  translateIncidentSubtype,
  Incident,
  IncidentsFilters,
} from "@/hooks/useIncidentsModule";
import { IncidentFilters } from "@/components/incidents/IncidentFilters";
import { IncidentsTable } from "@/components/incidents/IncidentsTable";
import { IncidentDetailModal } from "@/components/incidents/IncidentDetailModal";
import { exportIncidentToPDF } from "@/lib/pdf-export";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePolygonsStatus } from "@/hooks/useWazeData";
import { realCordobaPolygons } from "@/data/mock/realCordobaPolygons";
import {
  Download,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Descarga un string como archivo en el navegador. */
function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Escapa un valor para CSV (envuelve en comillas si tiene comas/saltos). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Calcula duración en minutos entre pubMillis y updatedAt (si inactivo) o ahora. */
function computeDurationMin(incident: Incident): number {
  const end = !incident.isActive && incident.updatedAt
    ? new Date(incident.updatedAt).getTime()
    : Date.now();
  return Math.round((end - incident.pubMillis) / 60_000);
}

/** Obtiene todos los incidentes filtrados sin paginación. */
async function fetchAllIncidents(filters: IncidentsFilters): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.subtype) params.set("subtype", filters.subtype);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.polygonId) params.set("polygonId", filters.polygonId);
  if (filters.isActive !== undefined) params.set("isActive", String(filters.isActive));
  if (filters.search) params.set("search", filters.search);
  params.set("page", "1");
  params.set("limit", "10000");

  const res = await fetch(`${API_URL}/incidents?${params.toString()}`);
  if (!res.ok) throw new Error("Error al obtener incidentes para exportar");
  const data = await res.json();
  return data.incidents as Incident[];
}

/** Convierte un array de incidentes a CSV con todos los campos. */
function incidentsToCsv(incidents: Incident[]): string {
  const headers = [
    "ID",
    "Tipo",
    "Subtipo",
    "Estado",
    "Duración (min)",
    "Calle",
    "Ciudad",
    "País",
    "Latitud",
    "Longitud",
    "Polígono",
    "Confiabilidad",
    "Confianza",
    "Confirmaciones (thumbsUp)",
    "Reportado por",
    "Descripción",
    "Ruta más cercana",
    "Km más cercano",
    "Distancia al Km (m)",
    "Fecha Waze (pub_millis)",
    "Fecha ingreso sistema",
    "Última actualización",
    "Texto TTS",
  ];

  const rows = incidents.map((inc) => {
    const durMin = computeDurationMin(inc);
    return [
      inc.uuid,
      translateIncidentType(inc.type.toUpperCase()),
      inc.subtype ? translateIncidentSubtype(inc.subtype.toUpperCase()) : "",
      inc.isActive ? "Activo" : "Inactivo",
      durMin,
      inc.street || "",
      inc.city || "",
      inc.country || "",
      inc.location.lat,
      inc.location.lng,
      inc.polygonId || "",
      inc.reliability ?? "",
      inc.confidence ?? "",
      inc.thumbsUp ?? 0,
      inc.reportBy || "Anónimo",
      inc.description || "",
      inc.nearestKmRoute || "",
      inc.nearestKmName || "",
      inc.nearestKmDistance != null ? Math.round(inc.nearestKmDistance) : "",
      new Date(inc.pubMillis).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
      new Date(inc.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
      new Date(inc.updatedAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
      inc.ttsText || "",
    ].map(csvCell).join(",");
  });

  return [headers.map(csvCell).join(","), ...rows].join("\r\n");
}

export const IncidentsModule: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const incidentIdFromUrl = searchParams.get("incidentId");
  const [isExporting, setIsExporting] = useState(false);

  const {
    incidents,
    pagination,
    types,
    subtypesByType,
    stats,
    isLoading,
    isLoadingTypes,
    filters,
    updateFilters,
    clearFilters,
    setPage,
  } = useIncidentsModule();

  const { data: incidentFromUrl } = useIncidentDetail(incidentIdFromUrl);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Abrir modal cuando se navega desde el mapa con ?incidentId=uuid
  useEffect(() => {
    if (incidentIdFromUrl && incidentFromUrl) {
      setSelectedIncident(incidentFromUrl);
      setIsDetailModalOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("incidentId");
        return next;
      });
    }
  }, [incidentIdFromUrl, incidentFromUrl, setSearchParams]);

  // Ver detalle
  const handleViewDetail = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  }, []);

  // Ver en mapa
  const handleViewOnMap = useCallback(
    (incident: Incident) => {
      // Navegar al mapa con las coordenadas como parámetro
      navigate(
        `/mapa?lat=${incident.location.lat}&lng=${incident.location.lng}&zoom=16&highlight=${incident.uuid}`,
      );
    },
    [navigate],
  );

  const authUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: backendPolygons } = usePolygonsStatus();

  const handleExportPDF = useCallback(
    async (incident: Incident) => {
      try {
        const userName = authUser
          ? `${authUser.firstName} ${authUser.lastName}`.trim()
          : undefined;
        const bPoly =
          incident.polygonId && backendPolygons
            ? backendPolygons.find((p) => p.id === incident.polygonId)
            : null;
        const localPoly =
          !bPoly && incident.polygonId
            ? realCordobaPolygons.find((p) => p.id === incident.polygonId)
            : null;
        await exportIncidentToPDF(
          incident,
          userName,
          bPoly?.name ?? localPoly?.name,
          bPoly?.group ?? localPoly?.group,
        );
      } catch (error) {
        console.error("Error exportando PDF:", error);
        alert("Error al generar el PDF. Por favor intente nuevamente.");
      }
    },
    [authUser, backendPolygons],
  );

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedIncident(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Módulo de Incidentes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestión y análisis de incidentes de Waze
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission("incidents.export") && (
            <button
              disabled={isExporting}
              onClick={async () => {
                setIsExporting(true);
                try {
                  const all = await fetchAllIncidents(filters);
                  const csv = incidentsToCsv(all);
                  const now = new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }).replace(/\//g, "-");
                  downloadFile(csv, `incidentes-waze-${now}.csv`, "text/csv");
                } catch {
                  alert("Error al exportar. Verifique su conexión e intente nuevamente.");
                } finally {
                  setIsExporting(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isExporting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              {isExporting ? "Exportando..." : "Exportar"}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.summary.total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total de incidentes
                  {stats.summary.oldest
                    ? ` desde el ${new Date(stats.summary.oldest).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.summary.active.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Activos ahora
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pagination?.total.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Resultados filtrados
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.summary.newest
                    ? new Date(stats.summary.newest).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
                    : "N/A"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Último incidente
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <IncidentFilters
        filters={filters}
        types={types}
        subtypesByType={subtypesByType}
        onFilterChange={updateFilters}
        onClearFilters={clearFilters}
        isLoading={isLoadingTypes}
      />

      {/* Tabla */}
      <IncidentsTable
        incidents={incidents}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={setPage}
        onViewDetail={handleViewDetail}
      />

      {/* Modal de detalle */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onViewOnMap={(incident) => {
          handleCloseModal();
          handleViewOnMap(incident);
        }}
        onExportPDF={
          hasPermission("incidents.export") ? handleExportPDF : undefined
        }
      />
    </div>
  );
};

export default IncidentsModule;

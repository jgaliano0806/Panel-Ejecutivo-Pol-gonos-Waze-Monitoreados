import React, { useState, useCallback, memo } from "react";
import {
  Car,
  Cloud,
  Thermometer,
  Wind,
  Eye,
  Droplets,
  Clock,
  MapPin,
  Upload,
  Image as ImageIcon,
  Film,
  X,
  MessageSquare,
  AlertTriangle,
  Navigation2,
  ExternalLink,
  User,
  CheckCircle,
  Star,
  ThumbsUp,
  FileText,
} from "lucide-react";
import {
  useRoadAccidents,
  useRoadAccident,
  useUploadAccidentMedia,
  useCreateAccident,
} from "../hooks/useRoadAccidents";
import { MiniMapLibre } from "../components/map/MiniMapLibre";
import { VirtualizedList } from "../components/ui/VirtualizedList";

import { realCordobaPolygons } from "../data/mock/realCordobaPolygons";
import { usePolygonsStatus } from "../hooks/useWazeData";
import { RoadAccident } from "../hooks/useRoadAccidents";
import { exportAccidentToPDF } from "../lib/pdf-export";
import { useAuthStore } from "../stores/useAuthStore";

function getAccidentSubtypeLabel(subtype?: string): string {
  if (!subtype) return "ACCIDENTE";
  const map: Record<string, string> = {
    ACCIDENT_MINOR: "Accidente Leve",
    ACCIDENT_MAJOR: "Accidente Grave",
    ACCIDENT_CONSTRUCTION: "En Construcción",
    NO_SUBTYPE: "Accidente",
    ROAD_CLOSED_EVENT: "Calle Cerrada",
  };
  return map[subtype] || subtype.replace(/_/g, " ");
}

function getSeverityColor(severity?: number): string {
  if (!severity) return "bg-gray-400";
  if (severity >= 4) return "bg-red-600";
  if (severity === 3) return "bg-orange-500";
  if (severity === 2) return "bg-yellow-500";
  return "bg-blue-500";
}

function getLocationDisplay(acc: RoadAccident): string {
  if (acc.waze_data?.nearestKmName) {
    const route = acc.waze_data.nearestKmRoute
      ? `${acc.waze_data.nearestKmRoute} - `
      : "";
    const km =
      acc.waze_data.nearestKmName.split(" - ").pop() ||
      acc.waze_data.nearestKmName;
    return `${route}${km}`;
  }
  if (acc.street) return acc.street;
  if (acc.description) return acc.description;
  if (acc.polygon_id) {
    const poly = realCordobaPolygons.find((p) => p.id === acc.polygon_id);
    if (poly) return `Accidente en ${poly.name}`;
  }
  return "Ubicación s/d";
}

interface RoadAccidentListItemProps {
  accident: RoadAccident;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const RoadAccidentListItem = memo(function RoadAccidentListItem({
  accident: acc,
  isSelected,
  onSelect,
}: RoadAccidentListItemProps) {
  return (
    <div
      onClick={() => onSelect(acc.id)}
      className={`p-4 border-b border-gray-100 dark:border-veltrix-border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-veltrix-bg/30 ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600 dark:border-l-blue-500"
          : ""
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${getSeverityColor(
            acc.severity,
          )}`}
        >
          {getAccidentSubtypeLabel(acc.subtype)}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(acc.accident_at).toLocaleString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
          })}
        </span>
      </div>
      <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
        {getLocationDisplay(acc)}
      </h3>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex -space-x-1">
          {acc.media && acc.media.length > 0 ? (
            acc.media.slice(0, 3).map((m, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-veltrix-card bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
              >
                {m.file_type === "image" ? (
                  <ImageIcon className="w-3 h-3 text-gray-500 dark:text-gray-300" />
                ) : m.file_type === "video" ? (
                  <Film className="w-3 h-3 text-gray-500 dark:text-gray-300" />
                ) : (
                  <FileText className="w-3 h-3 text-gray-500 dark:text-gray-300" />
                )}
              </div>
            ))
          ) : (
            <span className="text-[10px] text-gray-400 italic">
              Sin archivos
            </span>
          )}
        </div>
        {acc.media && acc.media.length > 0 && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            +{acc.media.length} archivos
          </span>
        )}
      </div>
    </div>
  );
});
RoadAccidentListItem.displayName = "RoadAccidentListItem";

export const RoadAccidentsPage: React.FC = () => {
  const authUser = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const [selectedAccidentId, setSelectedAccidentId] = useState<string | null>(
    null,
  );
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadDocFiles, setUploadDocFiles] = useState<FileList | null>(null);
  const [uploadTab, setUploadTab] = useState<"media" | "docs">("media");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAccident, setNewAccident] = useState({
    location_lat: "",
    location_lng: "",
    street: "",
    polygon_id: "",
    accident_at: new Date().toISOString().slice(0, 16),
  });
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(0);
  const [backfillStats, setBackfillStats] = useState<{
    processed: number;
    total: number;
    successful: number;
    failed: number;
  } | null>(null);

  // Fechas: "to" debe ser fin de día (23:59:59) para incluir accidentes de esa noche
  const { data: accidentsResult, isLoading: listLoading } = useRoadAccidents({
    from: dateRange.from
      ? new Date(`${dateRange.from}T00:00:00.000`).toISOString()
      : undefined,
    to: dateRange.to
      ? new Date(`${dateRange.to}T23:59:59.999`).toISOString()
      : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const accidents = accidentsResult?.data ?? [];
  const totalAccidents = accidentsResult?.total ?? 0;
  const totalPages = Math.ceil(totalAccidents / PAGE_SIZE) || 1;

  // Reset page when filters change
  const handleDateChange = (type: "from" | "to", value: string) => {
    setDateRange((prev) => ({ ...prev, [type]: value }));
    setPage(0);
  };

  const { data: accident, isLoading: detailsLoading } =
    useRoadAccident(selectedAccidentId);

  const { data: backendPolygons } = usePolygonsStatus();

  const uploadMediaMutation = useUploadAccidentMedia();
  const createAccidentMutation = useCreateAccident();

  const handleBackfillWeather = async () => {
    if (isBackfilling) return;

    const confirmed = window.confirm(
      "¿Deseas obtener datos climáticos históricos para todos los accidentes sin información meteorológica?\n\n" +
        "Esto puede tardar varios minutos dependiendo de la cantidad de registros.",
    );

    if (!confirmed) return;

    setIsBackfilling(true);
    setBackfillProgress(0);
    setBackfillStats(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "/api";
      const baseUrl = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;

      // Simular progreso mientras se procesa
      const progressInterval = setInterval(() => {
        setBackfillProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await fetch(`${baseUrl}/accidents/backfill-weather`, {
        method: "POST",
      });

      clearInterval(progressInterval);
      setBackfillProgress(100);

      if (response.ok) {
        const result = await response.json();
        setBackfillStats({
          processed: result.processed,
          total: result.eligible,
          successful: result.successful,
          failed: result.failed,
        });

        // Esperar 2 segundos para mostrar el 100%
        await new Promise((resolve) => setTimeout(resolve, 2000));

        alert(
          `✅ Proceso completado:\n\n` +
            `Total de accidentes: ${result.total}\n` +
            `Sin datos climáticos: ${result.withoutWeather}\n` +
            `Elegibles (últimos 92 días): ${result.eligible}\n` +
            `Procesados: ${result.processed}\n` +
            `Exitosos: ${result.successful}\n` +
            `Fallidos: ${result.failed}`,
        );
        // Refrescar lista
        window.location.reload();
      } else {
        const error = await response.json();
        alert(
          `❌ Error: ${error.message || "No se pudo completar el proceso"}`,
        );
      }
    } catch (error) {
      console.error("Error en backfill:", error);
      alert("❌ Error al procesar la solicitud");
    } finally {
      setIsBackfilling(false);
      setBackfillProgress(0);
      setBackfillStats(null);
    }
  };

  const handleCreateAccident = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(newAccident.location_lat);
    const lng = parseFloat(newAccident.location_lng);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Ingrese coordenadas válidas (latitud y longitud)");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("Coordenadas fuera de rango válido");
      return;
    }
    try {
      await createAccidentMutation.mutateAsync({
        location_lat: lat,
        location_lng: lng,
        street: newAccident.street || undefined,
        polygon_id: newAccident.polygon_id || undefined,
        accident_at: newAccident.accident_at
          ? new Date(newAccident.accident_at).toISOString()
          : undefined,
        type: "ACCIDENT",
        severity: 3,
      });
      setIsCreateOpen(false);
      setNewAccident({
        location_lat: "",
        location_lng: "",
        street: "",
        polygon_id: "",
        accident_at: new Date().toISOString().slice(0, 16),
      });
    } catch (err: any) {
      alert(err?.message || "Error al crear el siniestro");
    }
  };

  const handleUpload = async () => {
    const files = uploadTab === "media" ? uploadFiles : uploadDocFiles;
    if (!selectedAccidentId || !files) return;

    try {
      await uploadMediaMutation.mutateAsync({
        id: selectedAccidentId,
        files,
      });
      if (uploadTab === "media") {
        setUploadFiles(null);
      } else {
        setUploadDocFiles(null);
      }
      setIsUploadOpen(false);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Error al subir los archivos");
    }
  };

  const selectAccident = useCallback((id: string) => {
    setSelectedAccidentId(id);
  }, []);

  const renderAccidentItem = useCallback(
    (acc: RoadAccident) => (
      <RoadAccidentListItem
        accident={acc}
        isSelected={selectedAccidentId === acc.id}
        onSelect={selectAccident}
      />
    ),
    [selectedAccidentId, selectAccident],
  );

  const apiBase = import.meta.env.VITE_API_URL || "/api";
  const MEDIA_BASE_URL = apiBase.endsWith("/api")
    ? apiBase.replace(/\/api$/, "")
    : apiBase;

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 dark:bg-veltrix-bg transition-colors">
      {/* Sidebar: Lista de Accidentes */}
      <div className="w-96 border-r border-gray-200 dark:border-veltrix-border bg-white dark:bg-veltrix-card flex flex-col transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-veltrix-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Car className="w-6 h-6 text-red-600 dark:text-red-500" />
                Siniestros
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {listLoading ? "Cargando..." : `${totalAccidents} total`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBackfillWeather}
                disabled={isBackfilling}
                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                title="Obtener clima histórico para todos los accidentes sin datos"
              >
                <Cloud className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtros de Fecha */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label htmlFor="date-from" className="text-gray-500 block mb-1">
                Desde
              </label>
              <input
                id="date-from"
                title="Fecha desde"
                type="date"
                className="w-full p-2 border rounded dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
                value={dateRange.from}
                onChange={(e) => handleDateChange("from", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="date-to" className="text-gray-500 block mb-1">
                Hasta
              </label>
              <input
                id="date-to"
                title="Fecha hasta"
                type="date"
                className="w-full p-2 border rounded dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
                value={dateRange.to}
                onChange={(e) => handleDateChange("to", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {listLoading ? (
            <div className="p-8 text-center text-gray-400 italic">
              Cargando siniestros...
            </div>
          ) : (
            <VirtualizedList
              items={accidents || []}
              estimateSize={100}
              className="h-full overflow-auto"
              emptyMessage="No hay siniestros registrados."
              renderItem={renderAccidentItem}
            />
          )}
        </div>

        {/* Paginación */}
        <div className="p-3 border-t border-gray-200 dark:border-veltrix-border bg-gray-50 dark:bg-veltrix-bg">
          <div className="flex justify-between items-center gap-2 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || listLoading}
              className="px-3 py-2 bg-white dark:bg-veltrix-card border border-gray-200 dark:border-veltrix-border rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-veltrix-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex flex-col items-center min-w-[120px]">
              <span className="text-gray-600 dark:text-gray-400">
                {totalAccidents === 0
                  ? "Sin resultados"
                  : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, totalAccidents)} de ${totalAccidents}`}
              </span>
              <span className="text-gray-500 dark:text-gray-500 text-[10px]">
                Pág. {page + 1} / {totalPages}
              </span>
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={
                page >= totalPages - 1 || listLoading || totalAccidents === 0
              }
              className="px-3 py-2 bg-white dark:bg-veltrix-card border border-gray-200 dark:border-veltrix-border rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-veltrix-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Content: Detalle y Mapa */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {selectedAccidentId ? (
          detailsLoading ? (
            <div className="m-auto text-gray-400">Cargando detalles...</div>
          ) : accident ? (
            <div className="p-6 space-y-6">
              {/* Header Detalle */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                      {getLocationDisplay(accident)}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold text-white ${getSeverityColor(
                        accident.severity,
                      )}`}
                    >
                      Nivel {accident.severity || "?"}
                    </span>
                  </div>
                  <p className="flex items-center gap-2 text-gray-500 dark:text-veltrix-muted">
                    <MapPin className="w-4 h-4" />
                    Coordenadas: {accident.location_lat.toFixed(5)},{" "}
                    {accident.location_lng.toFixed(5)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {hasPermission("accidents.export") && (
                    <button
                      onClick={() => {
                        if (!accident) return;
                        const bPoly =
                          accident.polygon_id && backendPolygons
                            ? backendPolygons.find(
                                (p) => p.id === accident.polygon_id,
                              )
                            : null;
                        const localPoly =
                          !bPoly && accident.polygon_id
                            ? realCordobaPolygons.find(
                                (p) => p.id === accident.polygon_id,
                              )
                            : null;
                        const pdfUser = authUser
                          ? `${authUser.firstName} ${authUser.lastName}`.trim()
                          : undefined;
                        exportAccidentToPDF(
                          accident,
                          bPoly?.name ?? localPoly?.name,
                          bPoly?.group ?? localPoly?.group,
                          pdfUser,
                        );
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all active:scale-95"
                    >
                      <FileText className="w-4 h-4" />
                      Exportar PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Badges de tipo y estado */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white ${getSeverityColor(accident.severity)}`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  {getAccidentSubtypeLabel(accident.subtype)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Registrado
                </span>
              </div>

              {/* Grid de información detallada */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-veltrix-card border border-gray-100 dark:border-veltrix-border rounded-xl">
                  <MapPin className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ubicación Vial
                    </p>
                    {accident.waze_data?.nearestKmName ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {accident.waze_data.nearestKmRoute ? `${accident.waze_data.nearestKmRoute} - ` : ""}
                          {accident.waze_data.nearestKmName.split(" - ").pop()}
                        </p>
                        {accident.street && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {accident.street}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {accident.street ||
                          `${accident.location_lat.toFixed(5)}, ${accident.location_lng.toFixed(5)}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white dark:bg-veltrix-card border border-gray-100 dark:border-veltrix-border rounded-xl">
                  <Clock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fecha de reporte
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(accident.accident_at).toLocaleString("es-AR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Argentina/Buenos_Aires",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white dark:bg-veltrix-card border border-gray-100 dark:border-veltrix-border rounded-xl">
                  <User className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Reportado por
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {accident.waze_data?.reportBy || "Usuario anónimo"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white dark:bg-veltrix-card border border-gray-100 dark:border-veltrix-border rounded-xl">
                  <MapPin className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Polígono
                    </p>
                    {(() => {
                      const bPoly =
                        accident.polygon_id && backendPolygons
                          ? backendPolygons.find(
                              (p) => p.id === accident.polygon_id,
                            )
                          : null;
                      const localPoly =
                        !bPoly && accident.polygon_id
                          ? realCordobaPolygons.find(
                              (p) => p.id === accident.polygon_id,
                            )
                          : null;
                      const name = bPoly?.name ?? localPoly?.name;
                      const group = bPoly?.group ?? localPoly?.group;
                      return name ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {name}
                          </p>
                          {group && group !== "Sin Grupo" && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {group}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          N/A
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Métricas Waze */}
              <div className="grid grid-cols-3 gap-4">
                <div
                  className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30"
                  title="Experiencia del usuario que reportó el incidente (escala 1-10 del feed Waze)"
                >
                  <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-lg font-bold">
                      {accident.waze_data?.reliability != null
                        ? Number(accident.waze_data.reliability).toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-xs opacity-70">/10</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Experiencia del reportador
                  </p>
                </div>

                <div
                  className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30"
                  title="Nivel de confirmación por la comunidad Waze (escala 1-5 del feed oficial)"
                >
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                    <Star className="w-4 h-4" />
                    <span className="text-lg font-bold">
                      {accident.waze_data?.confidence != null
                        ? Number(accident.waze_data.confidence).toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-xs opacity-70">/5</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Verificado por comunidad
                  </p>
                </div>

                <div
                  className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30"
                  title="Cantidad de usuarios Waze que pasaron por el lugar y confirmaron el reporte"
                >
                  <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-lg font-bold">
                      {accident.waze_data?.nThumbsUp ||
                        accident.waze_data?.thumbsUp ||
                        0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Wazers lo confirmaron
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Minimapa */}
                <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-veltrix-border overflow-hidden h-[350px] relative">
                  <MiniMapLibre
                    center={[accident.location_lat, accident.location_lng]}
                    zoom={15}
                    height="100%"
                    markers={[
                      {
                        lat: accident.location_lat,
                        lng: accident.location_lng,
                        id: accident.id,
                        type: accident.type || "ACCIDENT",
                        subtype: accident.subtype,
                        color: "#ef4444",
                        popup: (
                          <div>
                            <div className="font-bold">
                              {getLocationDisplay(accident)}
                            </div>
                            <div className="text-xs">
                              {accident.subtype || accident.type}
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2 z-10">
                    <a
                      href={`https://www.google.com/maps?q=${accident.location_lat},${accident.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-800/90 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Google Maps
                    </a>
                    <a
                      href={`https://www.waze.com/ul?ll=${accident.location_lat},${accident.location_lng}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-800/90 rounded text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Waze
                    </a>
                  </div>
                </div>

                {/* Información Climática */}
                <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-veltrix-border p-6 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-500" />
                    Condiciones Climáticas al Momento
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                      Open-Meteo
                    </span>
                  </h3>

                  {accident.weather_data &&
                  Object.keys(accident.weather_data).length > 0 ? (
                    <div className="grid grid-cols-2 gap-6 flex-1">
                      <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <Thermometer className="w-8 h-8 text-orange-500" />
                        <div>
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            Temperatura
                          </p>
                          <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                            {accident.weather_data?.temperature_celsius ?? "--"}
                            °C
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <Droplets className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Precipitación
                          </p>
                          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                            {accident.weather_data?.precipitation_mm ?? 0}mm
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <Wind className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Viento
                          </p>
                          <p className="text-xl font-bold text-gray-700 dark:text-gray-200">
                            {accident.weather_data?.wind_speed_kmh ?? "--"} km/h
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <Eye className="w-8 h-8 text-purple-500" />
                        <div>
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            Visibilidad
                          </p>
                          <p className="text-xl font-bold text-purple-700 dark:text-purple-200">
                            {accident.weather_data?.visibility_meters
                              ? (
                                  accident.weather_data.visibility_meters / 1000
                                ).toFixed(1)
                              : "--"}{" "}
                            km
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">
                      No hay datos climáticos vinculados.
                    </div>
                  )}

                  {/* Resumen Meteorológico */}
                  <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-900">
                    <div className="flex items-start gap-3">
                      <Navigation2 className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                          Resumen Meteorológico
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {(() => {
                            const w = accident.weather_data;
                            if (!w || Object.keys(w).length === 0) {
                              return "Sin información meteorológica disponible para este incidente.";
                            }

                            const temp = w.temperature_celsius;
                            const precip = w.precipitation_mm || 0;
                            const wind = w.wind_speed_kmh || 0;
                            const vis = w.visibility_meters
                              ? (w.visibility_meters / 1000).toFixed(1)
                              : null;
                            const desc =
                              w.weather_description || "Condiciones normales";

                            let summary = `Al momento del incidente, ${desc.toLowerCase()}. `;

                            if (temp !== null && temp !== undefined) {
                              summary += `La temperatura era de ${temp}°C. `;
                            }

                            if (precip > 0) {
                              if (precip > 5) {
                                summary += `Se registró lluvia intensa con ${precip}mm de precipitación. `;
                              } else if (precip > 1) {
                                summary += `Había lluvia moderada (${precip}mm). `;
                              } else {
                                summary += `Se detectó precipitación ligera (${precip}mm). `;
                              }
                            }

                            if (wind > 40) {
                              summary += `Vientos fuertes de ${wind} km/h. `;
                            } else if (wind > 20) {
                              summary += `Vientos moderados de ${wind} km/h. `;
                            }

                            if (vis !== null) {
                              if (parseFloat(vis) < 1) {
                                summary += `Visibilidad muy reducida (${vis} km). `;
                              } else if (parseFloat(vis) < 5) {
                                summary += `Visibilidad limitada (${vis} km). `;
                              }
                            }

                            if (w.is_freezing_risk) {
                              summary +=
                                "⚠️ Riesgo de congelamiento detectado.";
                            }

                            return summary;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas y Waze Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-veltrix-border p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    Notas del Operador
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-veltrix-bg border border-gray-100 dark:border-veltrix-border rounded-xl min-h-[100px] text-gray-700 dark:text-gray-300">
                    {accident.operator_notes ||
                      "Sin notas adicionales para este siniestro."}
                  </div>
                </div>
                <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-veltrix-border p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Información Waze
                  </h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-veltrix-muted">
                        ID Incidente:
                      </span>
                      <span className="font-mono text-xs dark:text-gray-400">
                        {accident.incident_id || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-veltrix-muted">
                        Tipo:
                      </span>
                      <span className="font-medium dark:text-gray-300">
                        {accident.type || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-veltrix-muted">
                        Subtipo:
                      </span>
                      <span className="font-medium dark:text-gray-300">
                        {getAccidentSubtypeLabel(accident.subtype)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-veltrix-muted">
                        Confiabilidad:
                      </span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {accident.waze_data?.reliability != null
                          ? `${accident.waze_data.reliability}/10`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-veltrix-muted">
                        Confirmación comunidad:
                      </span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {accident.waze_data?.confidence != null
                          ? `${accident.waze_data.confidence}/5`
                          : "N/A"}
                      </span>
                    </div>
                    {accident.waze_data?.reportBy && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-veltrix-muted">
                          Reportado por:
                        </span>
                        <span className="font-medium dark:text-gray-300">
                          {accident.waze_data.reportBy}
                        </span>
                      </div>
                    )}
                    {accident.description && (
                      <div className="pt-2 border-t border-gray-100 dark:border-veltrix-border mt-2">
                        <span className="text-gray-500 dark:text-veltrix-muted block mb-1">
                          Descripción:
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {accident.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Galería Multimedia */}
              <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-veltrix-border p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  Respaldo Multimedia y Documental (
                  {accident.media?.length || 0})
                </h3>

                {accident.media && accident.media.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {accident.media.map((item, idx) => (
                      <div
                        key={idx}
                        className={`group relative rounded-xl overflow-hidden border border-gray-200 dark:border-veltrix-border shadow-sm ${
                          item.file_type === "document"
                            ? "bg-gray-50 dark:bg-veltrix-bg aspect-[4/3]"
                            : "bg-black aspect-video"
                        }`}
                      >
                        {item.file_type === "image" ? (
                          <img
                            src={`${MEDIA_BASE_URL}${item.file_path}`}
                            alt={item.original_name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : item.file_type === "video" ? (
                          <video
                            src={`${MEDIA_BASE_URL}${item.file_path}`}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <a
                            href={`${MEDIA_BASE_URL}${item.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 hover:bg-gray-100 dark:hover:bg-veltrix-card transition-colors"
                          >
                            <FileText className="w-10 h-10 text-indigo-500" />
                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium text-center truncate max-w-full px-1">
                              {item.original_name || "Documento"}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {Math.round((item.file_size_bytes || 0) / 1024)}{" "}
                              KB
                            </span>
                          </a>
                        )}
                        {item.file_type !== "document" && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-between">
                            <span className="truncate">
                              {item.original_name}
                            </span>
                            <span>
                              {Math.round((item.file_size_bytes || 0) / 1024)}{" "}
                              KB
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-veltrix-border rounded-2xl text-gray-400 dark:text-veltrix-muted">
                    <Upload className="w-12 h-12 mb-3 stroke-1" />
                    <p>No hay archivos cargados para este siniestro.</p>
                    {hasPermission("accidents.create") && (
                      <button
                        onClick={() => {
                          setUploadTab("media");
                          setIsUploadOpen(true);
                        }}
                        className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        Haga clic aquí para subir el primero
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null
        ) : (
          <div className="m-auto flex flex-col items-center text-gray-300 dark:text-veltrix-muted/50">
            <Car className="w-24 h-24 mb-4 stroke-1" />
            <p className="text-xl font-medium">
              Seleccione un siniestro para ver el detalle
            </p>
          </div>
        )}
      </div>

      {/* Modal: Crear siniestro */}
      {isCreateOpen && hasPermission("accidents.create") && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-veltrix-border flex justify-between items-center bg-gray-50 dark:bg-veltrix-bg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Agregar nuevo siniestro
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-veltrix-card rounded-full transition-colors"
                title="Cerrar"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateAccident} className="p-6 space-y-4">
              <div>
                <label htmlFor="lat-input" className="block text-sm font-medium text-gray-700 dark:text-veltrix-muted mb-1">
                  Latitud *
                </label>
                <input
                  id="lat-input"
                  title="Latitud"
                  type="text"
                  inputMode="decimal"
                  required
                  value={newAccident.location_lat}
                  onChange={(e) =>
                    setNewAccident((p) => ({
                      ...p,
                      location_lat: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
                  placeholder="-31.42"
                />
              </div>
              <div>
                <label htmlFor="lng-input" className="block text-sm font-medium text-gray-700 dark:text-veltrix-muted mb-1">
                  Longitud *
                </label>
                <input
                  id="lng-input"
                  title="Longitud"
                  type="text"
                  inputMode="decimal"
                  required
                  value={newAccident.location_lng}
                  onChange={(e) =>
                    setNewAccident((p) => ({
                      ...p,
                      location_lng: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
                  placeholder="-64.19"
                />
              </div>
              <div>
                <label htmlFor="street-input" className="block text-sm font-medium text-gray-700 dark:text-veltrix-muted mb-1">
                  Calle (opcional)
                </label>
                <input
                  id="street-input"
                  title="Calle"
                  type="text"
                  value={newAccident.street}
                  onChange={(e) =>
                    setNewAccident((p) => ({ ...p, street: e.target.value }))
                  }
                  className="w-full p-2 border rounded dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
                  placeholder="Ej: Av. Colón"
                />
              </div>
              <div>
                <label htmlFor="polygon-select" className="block text-sm font-medium text-gray-700 dark:text-veltrix-muted mb-1">
                  Polígono (opcional)
                </label>
                <select
                  id="polygon-select"
                  title="Seleccionar polígono"
                  value={newAccident.polygon_id}
                  onChange={(e) =>
                    setNewAccident((p) => ({
                      ...p,
                      polygon_id: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
                >
                  <option value="">Ninguno</option>
                  {realCordobaPolygons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="datetime-input" className="block text-sm font-medium text-gray-700 dark:text-veltrix-muted mb-1">
                  Fecha y hora
                </label>
                <input
                  id="datetime-input"
                  title="Fecha y hora del accidente"
                  type="datetime-local"
                  value={newAccident.accident_at}
                  onChange={(e) =>
                    setNewAccident((p) => ({
                      ...p,
                      accident_at: e.target.value,
                    }))
                  }
                  className="w-full p-2 border rounded dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={createAccidentMutation.isPending}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {createAccidentMutation.isPending
                  ? "Creando…"
                  : "Crear siniestro"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Multimedia y Documental */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-veltrix-border flex justify-between items-center bg-gray-50 dark:bg-veltrix-bg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Respaldo Multimedia y Documental
              </h3>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadFiles(null);
                  setUploadDocFiles(null);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-veltrix-card rounded-full transition-colors"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-veltrix-border">
              <button
                onClick={() => setUploadTab("media")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                  uploadTab === "media"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Multimedia
                {uploadFiles && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 rounded-full">
                    {uploadFiles.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setUploadTab("docs")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                  uploadTab === "docs"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <FileText className="w-4 h-4" />
                Documentación
                {uploadDocFiles && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 rounded-full">
                    {uploadDocFiles.length}
                  </span>
                )}
              </button>
            </div>

            <div className="p-6">
              {uploadTab === "media" ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-veltrix-muted mb-3">
                      Adjunte fotos o videos como respaldo visual del siniestro.
                    </p>
                    <div
                      className="border-2 border-dashed border-gray-300 dark:border-veltrix-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                      onClick={() =>
                        document.getElementById("file-upload-media")?.click()
                      }
                    >
                      <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-veltrix-muted font-medium">
                        {uploadFiles
                          ? `${uploadFiles.length} archivos seleccionados`
                          : "Arrastre archivos aquí o haga clic"}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        Imágenes (JPG, PNG) o Videos (MP4) — Máx. 50 MB
                      </p>
                      <input
                        type="file"
                        id="file-upload-media"
                        title="Seleccionar archivos multimedia"
                        className="hidden"
                        multiple
                        accept="image/*,video/*"
                        onChange={(e) => setUploadFiles(e.target.files)}
                      />
                    </div>
                  </div>

                  {uploadFiles && (
                    <div className="mb-4 space-y-1.5 max-h-36 overflow-y-auto">
                      {Array.from(uploadFiles).map((f, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg text-xs dark:text-gray-300"
                        >
                          <div className="flex items-center gap-2">
                            {f.type.startsWith("video/") ? (
                              <Film className="w-3 h-3" />
                            ) : (
                              <ImageIcon className="w-3 h-3" />
                            )}
                            <span className="truncate max-w-[250px]">
                              {f.name}
                            </span>
                          </div>
                          <span className="text-gray-400">
                            {(f.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    disabled={!uploadFiles || uploadMediaMutation.isPending}
                    onClick={handleUpload}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:shadow-none transition-all active:scale-[0.98]"
                  >
                    {uploadMediaMutation.isPending
                      ? "Subiendo..."
                      : "Subir Multimedia"}
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-veltrix-muted mb-3">
                      Adjunte documentos como actas, informes o partes
                      oficiales.
                    </p>
                    <div
                      className="border-2 border-dashed border-gray-300 dark:border-veltrix-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all"
                      onClick={() =>
                        document.getElementById("file-upload-docs")?.click()
                      }
                    >
                      <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-veltrix-muted font-medium">
                        {uploadDocFiles
                          ? `${uploadDocFiles.length} documentos seleccionados`
                          : "Arrastre documentos aquí o haga clic"}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        PDF, Word (DOC/DOCX) o Excel (XLS/XLSX) — Máx. 50 MB
                      </p>
                      <input
                        type="file"
                        id="file-upload-docs"
                        title="Seleccionar documentos"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(e) => setUploadDocFiles(e.target.files)}
                      />
                    </div>
                  </div>

                  {uploadDocFiles && (
                    <div className="mb-4 space-y-1.5 max-h-36 overflow-y-auto">
                      {Array.from(uploadDocFiles).map((f, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2 bg-gray-50 dark:bg-veltrix-bg rounded-lg text-xs dark:text-gray-300"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[250px]">
                              {f.name}
                            </span>
                          </div>
                          <span className="text-gray-400">
                            {(f.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    disabled={!uploadDocFiles || uploadMediaMutation.isPending}
                    onClick={handleUpload}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:shadow-none transition-all active:scale-[0.98]"
                  >
                    {uploadMediaMutation.isPending
                      ? "Subiendo..."
                      : "Subir Documentación"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Progreso de Backfill */}
      {isBackfilling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-veltrix-card rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-300 border border-gray-100 dark:border-veltrix-border">
            <div className="flex flex-col items-center">
              {/* Loader Circular SVG con animación mejorada */}
              <div className="relative w-40 h-40 mb-6">
                {/* Círculo de fondo con sombra */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 opacity-50"></div>

                <svg className="transform -rotate-90 w-40 h-40 relative z-10">
                  {/* Círculo de fondo */}
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                    fill="none"
                    className="dark:stroke-gray-700"
                  />
                  {/* Círculo de progreso con gradiente */}
                  <defs>
                    <linearGradient
                      id="progressGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="url(#progressGradient)"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 70 * (1 - backfillProgress / 100)
                    }`}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  />
                </svg>

                {/* Porcentaje en el centro con animación */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white transition-all duration-300">
                    {Math.round(backfillProgress)}%
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    completado
                  </span>
                </div>

                {/* Efecto de pulso */}
                <div className="absolute inset-0 rounded-full border-4 border-blue-400 opacity-20 animate-ping [animation-duration:2s]"></div>
              </div>

              {/* Texto de estado */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Obteniendo datos climáticos
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                Procesando accidentes históricos...
              </p>

              {/* Estadísticas si están disponibles */}
              {backfillStats && (
                <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-veltrix-bg dark:to-veltrix-card rounded-xl p-4 space-y-2 border border-gray-200 dark:border-veltrix-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-veltrix-muted">
                      Procesados:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {backfillStats.processed} / {backfillStats.total}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-veltrix-muted">
                      Exitosos:
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ✓ {backfillStats.successful}
                    </span>
                  </div>
                  {backfillStats.failed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-veltrix-muted">
                        Fallidos:
                      </span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        ✗ {backfillStats.failed}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje de espera con animación */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Este proceso puede tardar varios minutos
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

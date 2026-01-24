import React, { useState } from "react";
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
  Plus,
  X,
  MessageSquare,
  AlertTriangle,
  Navigation2,
} from "lucide-react";
import {
  useRoadAccidents,
  useRoadAccident,
  useUploadAccidentMedia,
} from "../hooks/useRoadAccidents";
import { MiniMapLibre } from "../components/map/MiniMapLibre";
import { VirtualizedList } from "../components/ui/VirtualizedList";

export const RoadAccidentsPage: React.FC = () => {
  const [selectedAccidentId, setSelectedAccidentId] = useState<string | null>(
    null,
  );
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(0);
  const [backfillStats, setBackfillStats] = useState<{
    processed: number;
    total: number;
    successful: number;
    failed: number;
  } | null>(null);

  const { data: accidents, isLoading: listLoading } = useRoadAccidents();
  const { data: accident, isLoading: detailsLoading } =
    useRoadAccident(selectedAccidentId);

  const uploadMediaMutation = useUploadAccidentMedia();

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
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

      // Simular progreso mientras se procesa
      const progressInterval = setInterval(() => {
        setBackfillProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await fetch(
        `${API_URL}/api/accidents/backfill-weather`,
        {
          method: "POST",
        },
      );

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

  const handleUpload = async () => {
    if (!selectedAccidentId || !uploadFiles) return;

    try {
      await uploadMediaMutation.mutateAsync({
        id: selectedAccidentId,
        files: uploadFiles,
      });
      setIsUploadOpen(false);
      setUploadFiles(null);
    } catch (error) {
      console.error("Error uploading media:", error);
      alert("Error al subir los archivos");
    }
  };

  const getSeverityColor = (severity?: number) => {
    if (!severity) return "bg-gray-400";
    if (severity >= 4) return "bg-red-600";
    if (severity === 3) return "bg-orange-500";
    if (severity === 2) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 dark:bg-veltrix-bg transition-colors">
      {/* Sidebar: Lista de Accidentes */}
      <div className="w-96 border-r border-gray-200 dark:border-veltrix-border bg-white dark:bg-veltrix-card flex flex-col transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-veltrix-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Car className="w-6 h-6 text-red-600 dark:text-red-500" />
              Siniestros Viales
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleBackfillWeather}
                disabled={isBackfilling}
                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                title="Obtener clima histórico para todos los accidentes sin datos"
              >
                <Cloud className="w-5 h-5" />
              </button>
              <button className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-veltrix-muted">
            Gestión de siniestros y respaldo multimedia
          </p>
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
              renderItem={(acc) => (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccidentId(acc.id)}
                  className={`p-4 border-b border-gray-100 dark:border-veltrix-border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-veltrix-bg/30 ${
                    selectedAccidentId === acc.id
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
                      {acc.subtype || acc.type}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(acc.accident_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                    {acc.street || "Ubicación desconocida"}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex -space-x-1">
                      {acc.media?.length > 0 ? (
                        acc.media.slice(0, 3).map((m, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 border-white dark:border-veltrix-card bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
                          >
                            {m.file_type === "image" ? (
                              <ImageIcon className="w-3 h-3 text-gray-500 dark:text-gray-300" />
                            ) : (
                              <Film className="w-3 h-3 text-gray-500 dark:text-gray-300" />
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          Sin archivos
                        </span>
                      )}
                    </div>
                    {acc.media?.length > 0 && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        +{acc.media.length} archivos
                      </span>
                    )}
                  </div>
                </div>
              )}
            />
          )}
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
                      {accident.street || "Calle Desconocida"}
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
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Subir Respaldo
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Minimapa */}
                <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-veltrix-border overflow-hidden h-[350px]">
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
                        color: "#ef4444", // red-500
                        popup: (
                          <div>
                            <div className="font-bold">{accident.street}</div>
                            <div className="text-xs">
                              {accident.subtype || accident.type}
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
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
                        Confiabilidad:
                      </span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {accident.waze_data?.reliability || "N/A"}/10
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Galería Multimedia */}
              <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-veltrix-border p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  Respaldo Multimedia ({accident.media?.length || 0})
                </h3>

                {accident.media && accident.media.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {accident.media.map((item, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden bg-black border border-gray-200 dark:border-veltrix-border aspect-video shadow-sm"
                      >
                        {item.file_type === "image" ? (
                          <img
                            src={`${API_URL}${item.file_path}`}
                            alt={item.original_name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <video
                            src={`${API_URL}${item.file_path}`}
                            className="w-full h-full object-cover"
                            controls
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-between">
                          <span className="truncate">{item.original_name}</span>
                          <span>
                            {Math.round((item.file_size_bytes || 0) / 1024)} KB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-veltrix-border rounded-2xl text-gray-400 dark:text-veltrix-muted">
                    <Upload className="w-12 h-12 mb-3 stroke-1" />
                    <p>
                      No hay archivos multimedia cargados para este siniestro.
                    </p>
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Haga clic aquí para subir el primero
                    </button>
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

      {/* Modal: Upload */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white dark:bg-veltrix-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-veltrix-border flex justify-between items-center bg-gray-50 dark:bg-veltrix-bg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Subir Archivos
              </h3>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-veltrix-card rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-8">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-veltrix-muted mb-2">
                  Seleccione imágenes o videos del siniestro
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-veltrix-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                >
                  <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-veltrix-muted font-medium">
                    {uploadFiles
                      ? `${uploadFiles.length} archivos seleccionados`
                      : "Arrastre archivos aquí o haga clic"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                    Imágenes (JPG, PNG) o Videos (MP4)
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => setUploadFiles(e.target.files)}
                  />
                </div>
              </div>

              {uploadFiles && (
                <div className="mb-6 space-y-2 max-h-40 overflow-y-auto">
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
                        <span className="truncate max-w-[200px]">{f.name}</span>
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
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:shadow-none transition-all active:scale-[0.98]"
              >
                {uploadMediaMutation.isPending
                  ? "Subiendo..."
                  : "Iniciar Carga"}
              </button>
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
                    className="transition-all duration-500 ease-out drop-shadow-lg"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
                    }}
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
                <div
                  className="absolute inset-0 rounded-full border-4 border-blue-400 opacity-20 animate-ping"
                  style={{ animationDuration: "2s" }}
                ></div>
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
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
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

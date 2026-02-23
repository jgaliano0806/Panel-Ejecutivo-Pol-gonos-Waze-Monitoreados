import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, FileSpreadsheet } from "lucide-react";
import { realCordobaPolygons } from "../../data/mock/realCordobaPolygons";
import { VirtualizedList } from "../ui/VirtualizedList";
import { TruncatedText } from "../common/TruncatedText";
import { PolygonMapEditorInline } from "./PolygonMapEditorInline";

interface PolygonData {
  id: string;
  name: string;
  feedUrl: string;
  tvtFeedUrl?: string;
  group?: string;
  is_active?: boolean;
  coordinates?: {
    lat: number;
    lon: number;
  };
  geometry?: {
    type: string;
    coordinates: number[][][];
  };
}

// API base URL (VITE_API_URL ya incluye /api)
const API_URL = import.meta.env.VITE_API_URL || "/api";

function calculateCenterFromGeometry(
  geometry: any,
): { lat: number; lon: number } | null {
  if (!geometry?.coordinates?.[0]) return null;
  const coords = geometry.coordinates[0];
  let latSum = 0,
    lonSum = 0,
    count = 0;
  coords.forEach((coord: number[]) => {
    lonSum += coord[0];
    latSum += coord[1];
    count++;
  });
  return count ? { lat: latSum / count, lon: lonSum / count } : null;
}

interface PolygonGroup {
  id: number;
  name: string;
  sort_order: number;
  is_active?: boolean;
}

interface PolygonFormProps {
  polygon: PolygonData | null;
  formData: PolygonData;
  onSave: (polygon: PolygonData) => void;
  onCancel: () => void;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onFieldChange: (field: string, value: any) => void;
  onGeometryFromMap?: (
    geometry: GeoJSON.Polygon,
    coordinates: { lat: number; lon: number },
  ) => void;
  onGeometryValidationError?: (message: string) => void;
  onGeometryAutoAdjusted?: (message: string) => void;
  onValidateForm: () => boolean;
  polygons: PolygonData[];
  otherPolygonsForMap: Array<{ id: string; geometry: GeoJSON.Polygon }>;
  groups: PolygonGroup[];
  darkMode?: boolean;
}

const PolygonFormModal: React.FC<PolygonFormProps> = ({
  polygon,
  formData,
  onSave,
  onCancel,
  errors,
  touched,
  onFieldChange,
  onGeometryFromMap,
  onGeometryValidationError,
  onGeometryAutoAdjusted,
  onValidateForm,
  polygons,
  otherPolygonsForMap,
  groups,
  darkMode = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    if (onValidateForm()) onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-veltrix-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h2 className="text-xl font-bold">
            {polygon ? "Editar Polígono" : "Nuevo Polígono"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => onFieldChange("id", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  errors.id && touched.id
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="P001, P002, etc."
                required
              />
              {errors.id && touched.id && (
                <p className="text-red-500 text-xs mt-1">{errors.id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  errors.name && touched.name
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Ej: A-019 -8, RP E53 -2"
                required
              />
              {errors.name && touched.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grupo
              </label>
              <select
                value={formData.group || ""}
                onChange={(e) =>
                  onFieldChange("group", e.target.value || undefined)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  errors.group && touched.group
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <option value="">Sin grupo</option>
                {formData.group &&
                  !groups.some((g) => g.name === formData.group) && (
                    <option value={formData.group}>{formData.group}</option>
                  )}
                {groups.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
              {errors.group && touched.group && (
                <p className="text-red-500 text-xs mt-1">{errors.group}</p>
              )}
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="polygon-active"
                checked={formData.is_active ?? true}
                onChange={(e) => onFieldChange("is_active", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="polygon-active"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Activo
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feed URL (Incidentes) <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.feedUrl}
                onChange={(e) => onFieldChange("feedUrl", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  errors.feedUrl && touched.feedUrl
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="https://..."
                required
              />
              {errors.feedUrl && touched.feedUrl && (
                <p className="text-red-500 text-xs mt-1">{errors.feedUrl}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TVT Feed URL (Opcional)
              </label>
              <input
                type="url"
                value={formData.tvtFeedUrl || ""}
                onChange={(e) =>
                  onFieldChange("tvtFeedUrl", e.target.value || undefined)
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  errors.tvtFeedUrl && touched.tvtFeedUrl
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="https://..."
              />
              {errors.tvtFeedUrl && touched.tvtFeedUrl && (
                <p className="text-red-500 text-xs mt-1">{errors.tvtFeedUrl}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Geometría GeoJSON (Opcional)
              </label>
              <textarea
                value={
                  typeof formData.geometry === "string"
                    ? formData.geometry
                    : formData.geometry
                      ? JSON.stringify(formData.geometry, null, 2)
                      : ""
                }
                onChange={(e) => onFieldChange("geometry", e.target.value)}
                placeholder='{"type": "Polygon", "coordinates": [[[lng1, lat1], [lng2, lat2], ...]]}'
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  errors.geometry && touched.geometry
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                rows={6}
              />
              <div className="mt-1">
                {errors.geometry && touched.geometry ? (
                  <p className="text-red-500 text-xs">{errors.geometry}</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Al ingresar geometría GeoJSON válida, las coordenadas del
                    centro se calculan automáticamente
                  </p>
                )}
              </div>
              {onGeometryFromMap &&
                (() => {
                  const geom =
                    typeof formData.geometry === "string"
                      ? (() => {
                          try {
                            return formData.geometry
                              ? (JSON.parse(
                                  formData.geometry,
                                ) as GeoJSON.Polygon)
                              : null;
                          } catch {
                            return null;
                          }
                        })()
                      : ((formData.geometry as GeoJSON.Polygon | undefined) ??
                        null);
                  const hasValidGeom =
                    geom?.coordinates?.[0] && geom.coordinates[0].length >= 3;
                  return hasValidGeom ? (
                    <div className="mt-3">
                      <PolygonMapEditorInline
                        geometry={geom!}
                        otherPolygons={otherPolygonsForMap}
                        excludeId={formData.id}
                        darkMode={darkMode}
                        height="280px"
                        onGeometryChange={(g) => {
                          const center = calculateCenterFromGeometry(g);
                          onGeometryFromMap(g, center || { lat: 0, lon: 0 });
                        }}
                        onValidationError={onGeometryValidationError}
                        onGeometryAutoAdjusted={onGeometryAutoAdjusted}
                      />
                    </div>
                  ) : null;
                })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Latitud Centro {formData.geometry ? "(Calculada)" : ""}
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.coordinates?.lat?.toFixed(4) || ""}
                onChange={(e) =>
                  onFieldChange("coordinates", {
                    lat: parseFloat(e.target.value) || 0,
                    lon: formData.coordinates?.lon || 0,
                  })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  formData.geometry
                    ? "bg-gray-50 dark:bg-veltrix-bg/50 cursor-not-allowed"
                    : errors.coordinates && touched.coordinates
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                }`}
                readOnly={!!formData.geometry}
                min="-90"
                max="90"
              />
              {errors.coordinates &&
                touched.coordinates &&
                !formData.geometry && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.coordinates}
                  </p>
                )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Longitud Centro {formData.geometry ? "(Calculada)" : ""}
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.coordinates?.lon?.toFixed(4) || ""}
                onChange={(e) =>
                  onFieldChange("coordinates", {
                    lat: formData.coordinates?.lat || 0,
                    lon: parseFloat(e.target.value) || 0,
                  })
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white ${
                  formData.geometry
                    ? "bg-gray-50 dark:bg-veltrix-bg/50 cursor-not-allowed"
                    : errors.coordinates && touched.coordinates
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                }`}
                readOnly={!!formData.geometry}
                min="-180"
                max="180"
              />
              {errors.coordinates &&
                touched.coordinates &&
                !formData.geometry && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.coordinates}
                  </p>
                )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-veltrix-bg rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <div className="relative inline-block">
              <button
                type="submit"
                disabled={Object.keys(errors).some((k) => errors[k] !== "")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {polygon ? "Actualizar" : "Crear"}
              </button>
              {Object.keys(errors).some((k) => errors[k] !== "") && (
                <div
                  className="absolute inset-0 cursor-not-allowed rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const msg = Object.entries(errors)
                      .filter(([, v]) => v)
                      .map(([, v]) => v)
                      .join("\n");
                    alert(`Corrija los siguientes errores:\n\n${msg}`);
                  }}
                  title="Haga clic para ver los errores"
                />
              )}
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

const PolygonManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [polygons, setPolygons] = useState<PolygonData[]>([]);
  const [groups, setGroups] = useState<PolygonGroup[]>([]);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingPolygon, setEditingPolygon] = useState<PolygonData | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [showGeoJsonModal, setShowGeoJsonModal] = useState(false);
  const [selectedGeoJson, setSelectedGeoJson] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<"name" | "group">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const visiblePolygons = useMemo(
    () => polygons.filter((p) => p.id !== "UNKNOWN"),
    [polygons],
  );

  const otherPolygonsForMap = useMemo(() => {
    return visiblePolygons
      .map((p) => {
        const geom = p.geometry?.coordinates
          ? p.geometry
          : (realCordobaPolygons.find((m: any) => m.id === p.id) as any)
              ?.geometry;
        return geom ? { id: p.id, geometry: geom as GeoJSON.Polygon } : null;
      })
      .filter(
        (p): p is { id: string; geometry: GeoJSON.Polygon } => p !== null,
      );
  }, [visiblePolygons]);

  const sortedPolygons = useMemo(() => {
    const arr = [...visiblePolygons];
    arr.sort((a, b) => {
      const av = (sortBy === "name" ? a.name : a.group || "").toLowerCase();
      const bv = (sortBy === "name" ? b.name : b.group || "").toLowerCase();
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [visiblePolygons, sortBy, sortDir]);

  const toggleSort = (col: "name" | "group") => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedPolygons.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedPolygons.map((p) => p.id)));
    }
  };

  const getToExport = useCallback(() => {
    return selectedIds.size > 0
      ? sortedPolygons.filter((p) => selectedIds.has(p.id))
      : sortedPolygons;
  }, [sortedPolygons, selectedIds]);

  const escapeCsv = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n"))
      return `"${v.replace(/"/g, '""')}"`;
    return v;
  };

  const exportCSV = useCallback(() => {
    const toExport = getToExport();
    const headers = [
      "id",
      "name",
      "group",
      "feedUrl",
      "tvtFeedUrl",
      "lat",
      "lon",
      "geometry",
    ];
    const rows = toExport.map((p) => {
      const geom = p.geometry ?? getPolygonGeometry(p.id);
      const geoStr = geom ? JSON.stringify(geom) : "";
      const lat = p.coordinates?.lat ?? "";
      const lon = p.coordinates?.lon ?? "";
      return [
        escapeCsv(p.id),
        escapeCsv(p.name),
        escapeCsv(p.group ?? ""),
        escapeCsv(p.feedUrl ?? ""),
        escapeCsv(p.tvtFeedUrl ?? ""),
        lat,
        lon,
        escapeCsv(geoStr),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `poligonos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSelectedIds(new Set());
  }, [getToExport]);

  const exportExcel = useCallback(() => {
    const toExport = getToExport();
    const cols = [
      "id",
      "name",
      "group",
      "feedUrl",
      "tvtFeedUrl",
      "lat",
      "lon",
      "geometry",
    ];
    const tr = (row: string[]) =>
      "<tr>" +
      row
        .map(
          (c) =>
            `<td>${String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`,
        )
        .join("") +
      "</tr>";
    const headerRow = tr(cols);
    const dataRows = toExport.map((p) => {
      const geom = p.geometry ?? getPolygonGeometry(p.id);
      const geoStr = geom ? JSON.stringify(geom) : "";
      return tr([
        p.id,
        p.name,
        p.group ?? "",
        p.feedUrl ?? "",
        p.tvtFeedUrl ?? "",
        String(p.coordinates?.lat ?? ""),
        String(p.coordinates?.lon ?? ""),
        geoStr,
      ]);
    });
    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table><thead>' +
      headerRow +
      "</thead><tbody>" +
      dataRows.join("") +
      "</tbody></table></body></html>";
    const blob = new Blob(["\ufeff" + html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `poligonos-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
    setSelectedIds(new Set());
  }, [getToExport]);

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/polygon-groups`);
      if (res.ok) setGroups(await res.json());
    } catch (e) {
      console.error("Error cargando grupos:", e);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) {
      const n = sortedPolygons.length;
      el.indeterminate = n > 0 && selectedIds.size > 0 && selectedIds.size < n;
    }
  }, [selectedIds.size, sortedPolygons.length]);

  // Función para obtener geometría completa desde mock data
  const getPolygonGeometry = (polygonId: string) => {
    const mockPolygon = realCordobaPolygons.find(
      (p: any) => p.id === polygonId,
    );
    return mockPolygon?.geometry || null;
  };

  // Validaciones
  const validateField = (field: string, value: any): string => {
    const formData = editingPolygon || {
      id: "",
      name: "",
      feedUrl: "",
      tvtFeedUrl: "",
      group: "",
      coordinates: { lat: 0, lon: 0 },
    };

    switch (field) {
      case "id":
        if (!value || value.trim() === "") return "ID es requerido";
        if (!/^P\d{3}$/.test(value))
          return "ID debe tener formato PXXX (ej: P001)";
        if (!editingPolygon && polygons.some((p) => p.id === value))
          return "Este ID ya existe";
        if (
          editingPolygon &&
          editingPolygon.id !== value &&
          polygons.some((p) => p.id === value)
        )
          return "Este ID ya existe";
        return "";

      case "name":
        if (!value || value.trim() === "") return "Nombre es requerido";
        if (value.trim().length < 3)
          return "Nombre debe tener al menos 3 caracteres";
        return "";

      case "feedUrl":
        if (!value || value.trim() === "") return "Feed URL es requerido";
        try {
          new URL(value);
        } catch {
          return "Debe ser una URL válida (https://...)";
        }
        return "";

      case "tvtFeedUrl":
        if (value && value.trim() !== "") {
          try {
            new URL(value);
          } catch {
            return "Debe ser una URL válida (https://...)";
          }
        }
        return "";

      case "group":
        // Grupo es opcional, sin validaciones específicas
        return "";

      case "geometry": {
        let geom = value;
        if (typeof value === "string") {
          if (!value.trim()) return "";
          try {
            geom = JSON.parse(value);
          } catch {
            return "JSON inválido";
          }
        }
        if (geom?.type === "Polygon" && geom?.coordinates?.[0]) {
          if (geom.coordinates[0].length < 3)
            return "Debe tener al menos 3 vértices";
          return "";
        }
        if (geom) return "Debe ser un Polygon GeoJSON válido";
        return "";
      }

      case "coordinates":
        if (!formData.geometry) {
          // Solo validar si no hay geometría
          if (value?.lat !== undefined && (value.lat < -90 || value.lat > 90)) {
            return "Latitud debe estar entre -90 y 90";
          }
          if (
            value?.lon !== undefined &&
            (value.lon < -180 || value.lon > 180)
          ) {
            return "Longitud debe estar entre -180 y 180";
          }
        }
        return "";

      default:
        return "";
    }
  };

  const validateForm = (): boolean => {
    const formData = editingPolygon || {
      id: "",
      name: "",
      feedUrl: "",
      tvtFeedUrl: "",
      group: "",
      coordinates: { lat: 0, lon: 0 },
    };

    const newErrors: Record<string, string> = {};

    // Validar todos los campos
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, (formData as any)[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validar al abrir el formulario para mostrar errores iniciales
  useEffect(() => {
    if (showForm && editingPolygon) {
      validateForm();
    }
  }, [showForm, editingPolygon?.id]);

  // Función para validar y parsear GeoJSON
  const parseGeoJsonGeometry = (geoJsonText: string) => {
    try {
      const geometry = JSON.parse(geoJsonText);
      if (
        geometry.type === "Polygon" &&
        geometry.coordinates &&
        geometry.coordinates[0]
      ) {
        return geometry;
      }
      throw new Error("Geometría inválida");
    } catch (error) {
      throw new Error("JSON inválido o geometría no válida");
    }
  };

  // Cargar polígonos desde el backend
  useEffect(() => {
    fetchPolygons();
  }, []);

  const normalizePolygon = (p: any): PolygonData => ({
    id: p.id,
    name: p.name,
    group: p.group,
    feedUrl: p.feed_url ?? p.feedUrl ?? "",
    tvtFeedUrl: p.tvt_feed_url ?? p.tvtFeedUrl ?? "",
    is_active: p.is_active ?? true,
    coordinates: p.coordinates,
    geometry: p.geometry,
  });

  const fetchPolygons = async () => {
    try {
      const response = await fetch(`${API_URL}/polygons/all?_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setPolygons(Array.isArray(data) ? data.map(normalizePolygon) : []);
      }
    } catch (error) {
      console.error("Error al cargar polígonos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (polygon: PolygonData) => {
    // Si no tiene geometría pero existe en mock data, cargarla
    let polygonToEdit = { ...polygon };
    if (!polygon.geometry) {
      const mockGeometry = getPolygonGeometry(polygon.id);
      if (mockGeometry) {
        polygonToEdit.geometry = mockGeometry;
        // Recalcular centro si es necesario
        const center = calculateCenterFromGeometry(mockGeometry);
        if (center) {
          polygonToEdit.coordinates = center;
        }
      }
    }

    setEditingPolygon(polygonToEdit);
    setShowForm(true);
    setTouched({});
    setErrors({});
  };

  const handleNew = () => {
    setEditingPolygon(null);
    setShowForm(true);
    setErrors({});
    setTouched({});
  };

  const handleDelete = async (polygonId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este polígono?"))
      return;

    try {
      const response = await fetch(`${API_URL}/polygons/${polygonId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["polygons"] });
        setPolygons(polygons.filter((p) => p.id !== polygonId));
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Error al eliminar el polígono");
      }
    } catch (error) {
      console.error("Error al eliminar polígono:", error);
      alert("Error al eliminar el polígono");
    }
  };

  const handleSave = async (polygonData: PolygonData) => {
    try {
      const isNew =
        !polygonData.id ||
        polygons.find((p) => p.id === polygonData.id) === undefined;
      const method = isNew ? "POST" : "PUT";
      const url = isNew
        ? `${API_URL}/polygons`
        : `${API_URL}/polygons/${polygonData.id}`;

      const payload = {
        id: polygonData.id,
        name: polygonData.name,
        group: polygonData.group,
        feed_url: polygonData.feedUrl,
        tvt_feed_url: polygonData.tvtFeedUrl,
        coordinates: polygonData.coordinates,
        geometry: polygonData.geometry,
        is_active: polygonData.is_active ?? true,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["polygons"] });
        await fetchPolygons();
        setShowForm(false);
        setEditingPolygon(null);
      } else {
        alert("Error al guardar el polígono");
      }
    } catch (error) {
      console.error("Error al guardar polígono:", error);
      alert("Error al guardar el polígono");
    }
  };

  const handleGeometryFromMap = useCallback(
    (geometry: GeoJSON.Polygon, coordinates: { lat: number; lon: number }) => {
      setEditingPolygon((prev) =>
        prev ? { ...prev, geometry, coordinates } : prev,
      );
      setErrors((prev) => ({ ...prev, geometry: "" }));
    },
    [],
  );

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600 dark:text-veltrix-muted">
            Cargando polígonos...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Gestión de Polígonos
          </h2>
          <p className="text-sm text-gray-600 dark:text-veltrix-muted mt-1">
            Administra los feeds de Waze asociados a cada polígono
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="p-2 rounded-lg border border-gray-300 dark:border-veltrix-border text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-veltrix-bg/50 transition-colors"
            title={
              selectedIds.size > 0
                ? "Exportar seleccionados como CSV"
                : "Exportar todos como CSV"
            }
          >
            <FileText className="w-5 h-5" />
          </button>
          <button
            onClick={exportExcel}
            className="p-2 rounded-lg border border-gray-300 dark:border-veltrix-border text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-veltrix-bg/50 transition-colors"
            title={
              selectedIds.size > 0
                ? "Exportar seleccionados como Excel"
                : "Exportar todos como Excel"
            }
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuevo Polígono
          </button>
        </div>
      </div>

      <>
        <div className="border border-gray-100 dark:border-veltrix-border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-veltrix-card">
          {/* Header - Grid Layout */}
          <div className="grid grid-cols-[48px_minmax(150px,2fr)_minmax(120px,1.5fr)_minmax(150px,2fr)_120px_120px_100px] bg-gray-50 dark:bg-veltrix-bg border-b divide-x divide-gray-200 dark:divide-veltrix-border dark:border-veltrix-border text-sm font-semibold text-gray-900 dark:text-white">
            <div className="px-2 py-3 flex items-center justify-center">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={
                  sortedPolygons.length > 0 &&
                  selectedIds.size === sortedPolygons.length
                }
                onChange={toggleSelectAll}
                className="rounded border-gray-300 dark:border-veltrix-border"
                title={
                  selectedIds.size === sortedPolygons.length
                    ? "Desmarcar todos"
                    : "Marcar todos"
                }
              />
            </div>
            <button
              onClick={() => toggleSort("name")}
              className="px-4 py-3 text-left flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-veltrix-bg/50 transition-colors"
            >
              Nombre
              {sortBy === "name" && (
                <span className="text-blue-600 dark:text-blue-400">
                  {sortDir === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
            <div className="px-4 py-3 flex items-center justify-between gap-1">
              <button
                onClick={() => toggleSort("group")}
                className="flex-1 text-left flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-veltrix-bg/50 transition-colors -m-1 p-1 rounded"
              >
                Grupo
                {sortBy === "group" && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowGroupsModal(true)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-veltrix-bg/50"
                title="Gestionar catálogo de grupos"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
            <div className="px-4 py-3">Feed URL</div>
            <div className="px-4 py-3">Centro</div>
            <div className="px-4 py-3">Geometría</div>
            <div className="px-4 py-3 text-center">Acciones</div>
          </div>

          {/* Virtualized Body */}
          <div className="h-[600px]">
            <VirtualizedList
              items={sortedPolygons}
              estimateSize={80}
              renderItem={(polygon: PolygonData) => (
                <div className="grid grid-cols-[48px_minmax(150px,2fr)_minmax(120px,1.5fr)_minmax(150px,2fr)_120px_120px_100px] divide-x divide-gray-100 dark:divide-veltrix-border border-b border-gray-100 dark:border-veltrix-border hover:bg-gray-50 dark:hover:bg-veltrix-bg/30 transition-colors items-center text-sm bg-white dark:bg-veltrix-card text-gray-900 dark:text-white">
                  <div className="px-2 py-3 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(polygon.id)}
                      onChange={() => toggleSelect(polygon.id)}
                      className="rounded border-gray-300 dark:border-veltrix-border"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate">
                    {polygon.name}
                  </div>
                  <div className="px-4 py-3 text-gray-600 dark:text-veltrix-muted truncate">
                    {polygon.group || "-"}
                  </div>
                  <div className="px-4 py-3 text-gray-900 dark:text-white">
                    <TruncatedText
                      text={polygon.feedUrl}
                      maxLength={40}
                      showCopyButton={true}
                      className="text-xs"
                    />
                    {polygon.tvtFeedUrl && (
                      <div className="mt-1">
                        <TruncatedText
                          text={polygon.tvtFeedUrl}
                          maxLength={40}
                          showCopyButton={true}
                          className="text-xs text-blue-600 dark:text-blue-400"
                        />
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 text-xs text-gray-500 dark:text-veltrix-muted">
                    {polygon.coordinates ? (
                      <div>
                        <div>{polygon.coordinates.lat.toFixed(4)}</div>
                        <div>{polygon.coordinates.lon.toFixed(4)}</div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </div>
                  <div className="px-4 py-3 text-xs text-gray-500 dark:text-veltrix-muted">
                    {(() => {
                      const geometry = getPolygonGeometry(polygon.id);
                      if (geometry) {
                        const coordsCount =
                          geometry.coordinates[0]?.length || 0;
                        return (
                          <div className="space-y-1">
                            <div className="text-green-600 dark:text-veltrix-success font-medium">
                              ✅ GeoJSON
                            </div>
                            <div className="text-gray-600 dark:text-veltrix-muted">
                              {coordsCount} ptos
                            </div>
                            <button
                              onClick={() => {
                                setSelectedGeoJson({
                                  polygon: polygon,
                                  geometry: geometry,
                                });
                                setShowGeoJsonModal(true);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-[10px] underline"
                              title="Ver geometría GeoJSON completa"
                            >
                              Ver
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div className="space-y-1">
                            <div className="text-orange-600 dark:text-veltrix-warning font-medium">
                              ⚠️ No Geo
                            </div>
                            <div className="text-gray-400 dark:text-veltrix-muted text-[10px]">
                              Centro only
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <div className="px-4 py-3 flex justify-center">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(polygon)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(polygon.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>

        {visiblePolygons.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-veltrix-muted">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-veltrix-border"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm text-gray-600 dark:text-veltrix-muted">
              No hay polígonos configurados
            </p>
            <button
              onClick={handleNew}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear primer polígono
            </button>
          </div>
        )}
      </>

      {showForm && (
        <PolygonFormModal
          polygon={editingPolygon}
          formData={
            editingPolygon || {
              id: "",
              name: "",
              feedUrl: "",
              tvtFeedUrl: "",
              group: "",
              is_active: true,
              coordinates: { lat: 0, lon: 0 },
            }
          }
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingPolygon(null);
          }}
          errors={errors}
          touched={touched}
          onFieldChange={(field, value) => {
            let parsedValue = value;
            if (
              field === "geometry" &&
              typeof value === "string" &&
              value.trim()
            ) {
              try {
                const parsed = JSON.parse(value);
                if (
                  parsed?.type === "Polygon" &&
                  parsed?.coordinates?.[0]?.length >= 3
                ) {
                  parsedValue = parsed;
                  const center = calculateCenterFromGeometry(parsed);
                  setEditingPolygon((prev) => ({
                    ...(prev || {
                      id: "",
                      name: "",
                      feedUrl: "",
                      tvtFeedUrl: "",
                      group: "",
                      is_active: true,
                      coordinates: { lat: 0, lon: 0 },
                    }),
                    geometry: parsed,
                    coordinates: center || { lat: 0, lon: 0 },
                  }));
                  setErrors((prev) => ({ ...prev, geometry: "" }));
                  setTouched((prev) => ({ ...prev, geometry: true }));
                  return;
                }
              } catch {
                /* mantener value como string */
              }
            }
            const newFormData = editingPolygon
              ? { ...editingPolygon, [field]: parsedValue }
              : {
                  id: "",
                  name: "",
                  feedUrl: "",
                  tvtFeedUrl: "",
                  group: "",
                  is_active: true,
                  coordinates: { lat: 0, lon: 0 },
                  [field]: parsedValue,
                };
            if (editingPolygon) {
              setEditingPolygon(newFormData);
            }
            const error = validateField(field, parsedValue);
            setErrors((prev) => ({ ...prev, [field]: error }));
            setTouched((prev) => ({ ...prev, [field]: true }));
          }}
          onValidateForm={validateForm}
          polygons={polygons}
          otherPolygonsForMap={otherPolygonsForMap}
          groups={groups}
          onGeometryFromMap={handleGeometryFromMap}
          onGeometryValidationError={(msg) =>
            setErrors((prev) => ({ ...prev, geometry: msg }))
          }
          onGeometryAutoAdjusted={(msg) => {
            setErrors((prev) => ({ ...prev, geometry: "" }));
            alert(msg);
          }}
          darkMode={document.documentElement.classList.contains("dark")}
        />
      )}

      {/* Modal para mostrar GeoJSON */}
      {showGeoJsonModal && selectedGeoJson && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowGeoJsonModal(false)}
        >
          <div
            className="bg-white dark:bg-veltrix-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-veltrix-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Geometría GeoJSON - {selectedGeoJson.polygon.name}
                  </h2>
                  <p className="text-green-100 text-sm mt-1">
                    ID: {selectedGeoJson.polygon.id} •{" "}
                    {selectedGeoJson.geometry.coordinates[0]?.length || 0}{" "}
                    coordenadas
                  </p>
                </div>
                <button
                  onClick={() => setShowGeoJsonModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 dark:bg-veltrix-bg rounded-lg p-4 max-h-96 overflow-y-auto custom-scrollbar">
                <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectedGeoJson.geometry, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(selectedGeoJson.geometry, null, 2),
                    );
                    alert("GeoJSON copiado al portapapeles");
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mr-2"
                >
                  Copiar GeoJSON
                </button>
                <button
                  onClick={() => setShowGeoJsonModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal Gestionar catálogo de grupos */}
      {showGroupsModal && (
        <GroupsCatalogModal
          groups={groups}
          onClose={() => setShowGroupsModal(false)}
          onRefresh={() => {
            fetchGroups();
            fetchPolygons();
          }}
          apiUrl={API_URL}
        />
      )}
    </div>
  );
};

function GroupsCatalogModal({
  groups,
  onClose,
  onRefresh,
  apiUrl,
}: {
  groups: PolygonGroup[];
  onClose: () => void;
  onRefresh: () => void;
  apiUrl: string;
}) {
  const [newName, setNewName] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/polygon-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), is_active: newActive }),
      });
      if (res.ok) {
        setNewName("");
        setNewActive(true);
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Error al crear");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/polygon-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), is_active: editActive }),
      });
      if (res.ok) {
        setEditingId(null);
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Error al actualizar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (
      !confirm(
        `¿Eliminar el grupo "${name}"? Los polígonos quedarán sin grupo.`,
      )
    )
      return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/polygon-groups/${id}`, {
        method: "DELETE",
      });
      if (res.ok) onRefresh();
      else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Error al eliminar");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-veltrix-card rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-veltrix-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 dark:border-veltrix-border flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Catálogo de grupos
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-veltrix-bg rounded"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nuevo grupo"
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-veltrix-bg dark:border-veltrix-border dark:text-white"
            />
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Activo
              </span>
            </label>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {groups.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-veltrix-bg"
              >
                {editingId === g.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded dark:bg-veltrix-card dark:border-veltrix-border dark:text-white min-w-0"
                      autoFocus
                    />
                    <label className="flex items-center gap-1 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Activo
                      </span>
                    </label>
                    <button
                      onClick={() => handleUpdate(g.id)}
                      disabled={saving}
                      className="px-2 py-1 text-sm bg-green-600 text-white rounded"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-sm text-gray-600"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate">{g.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.name);
                        setEditActive(g.is_active ?? true);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                      title="Editar"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(g.id, g.name)}
                      disabled={saving}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      title="Eliminar"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default PolygonManagement;

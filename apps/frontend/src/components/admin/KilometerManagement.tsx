import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  useKilometers,
  useKilometerMutations,
  type KilometerMarker,
} from "../../hooks/useKilometers";
import { useAdminToast } from "../../hooks/useAdminToast";
import { useQuery } from "@tanstack/react-query";

// Fetch polygon groups para el selector
interface PolygonGroup {
  id: number;
  name: string;
  is_active: boolean;
}
const API_URL = import.meta.env.VITE_API_URL || "/api";
const fetchGroups = async (): Promise<PolygonGroup[]> => {
  const res = await fetch(`${API_URL}/polygon-groups`);
  if (!res.ok) return [];
  return res.json();
};

// ─── Formulario Modal ─────────────────────────────────────

interface KmFormData {
  name: string;
  latitude: string;
  longitude: string;
  route_name: string;
  polygon_group_id: string;
  is_active: boolean;
}

const emptyForm: KmFormData = {
  name: "",
  latitude: "",
  longitude: "",
  route_name: "",
  polygon_group_id: "",
  is_active: true,
};

interface KmFormModalProps {
  marker: KilometerMarker | null;
  onSave: (data: KmFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const KmFormModal: React.FC<KmFormModalProps> = ({
  marker,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [form, setForm] = useState<KmFormData>(
    marker
      ? {
          name: marker.name,
          latitude: String(marker.latitude),
          longitude: String(marker.longitude),
          route_name: marker.route_name || "",
          polygon_group_id: marker.polygon_group_id
            ? String(marker.polygon_group_id)
            : "",
          is_active: marker.is_active,
        }
      : { ...emptyForm },
  );

  const { data: groups = [] } = useQuery({
    queryKey: ["polygon-groups"],
    queryFn: fetchGroups,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "El nombre es obligatorio";
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90)
      errs.latitude = "Latitud inválida (-90 a 90)";
    if (isNaN(lng) || lng < -180 || lng > 180)
      errs.longitude = "Longitud inválida (-180 a 180)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSave(form);
  };

  const fieldClass = (field: string) =>
    `w-full px-3 py-2 rounded-lg bg-white/[0.06] border ${
      errors[field]
        ? "border-red-500 focus:ring-red-500/50"
        : "border-white/[0.1] focus:ring-blue-500/50"
    } text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/[0.1]"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin size={20} className="text-blue-400" />
            {marker ? "Editar Ubicación" : "Nueva Ubicación Vial"}
          </h3>
          <button
            onClick={onCancel}
            title="Cerrar"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Km 14.5"
              className={fieldClass("name")}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Latitud *
              </label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="-31.4201"
                className={fieldClass("latitude")}
              />
              {errors.latitude && (
                <p className="text-red-400 text-xs mt-1">{errors.latitude}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Longitud *
              </label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) =>
                  setForm({ ...form, longitude: e.target.value })
                }
                placeholder="-64.1888"
                className={fieldClass("longitude")}
              />
              {errors.longitude && (
                <p className="text-red-400 text-xs mt-1">{errors.longitude}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Grupo de Polígonos *
            </label>
            <select
              value={form.polygon_group_id}
              onChange={(e) =>
                setForm({ ...form, polygon_group_id: e.target.value })
              }
              title="Seleccionar grupo de polígonos"
              className={fieldClass("polygon_group_id")}
            >
              <option value="">— Seleccionar grupo —</option>
              {groups
                .filter((g) => g.is_active)
                .map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Ruta (opcional)
            </label>
            <input
              type="text"
              value={form.route_name}
              onChange={(e) => setForm({ ...form, route_name: e.target.value })}
              placeholder="Ej: RN36, E55, Autopista CBA-Rosario"
              className={fieldClass("route_name")}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-300">Estado:</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                form.is_active
                  ? "bg-green-600/30 text-green-400 border border-green-500/30"
                  : "bg-gray-700/50 text-gray-400 border border-gray-600/30"
              }`}
            >
              {form.is_active ? (
                <ToggleRight size={16} />
              ) : (
                <ToggleLeft size={16} />
              )}
              {form.is_active ? "Activo" : "Inactivo"}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {marker ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────

const KilometerManagement: React.FC = () => {
  const { data: markers = [], isLoading, error } = useKilometers();
  const { createMutation, updateMutation, deleteMutation } =
    useKilometerMutations();
  const toast = useAdminToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingMarker, setEditingMarker] = useState<KilometerMarker | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);

  // Filtrar y buscar
  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      const matchesSearch =
        !searchTerm ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.route_name &&
          m.route_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.group_name &&
          m.group_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        filterActive === "all" ||
        (filterActive === "active" && m.is_active) ||
        (filterActive === "inactive" && !m.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [markers, searchTerm, filterActive]);

  const stats = useMemo(() => {
    const total = markers.length;
    const active = markers.filter((m) => m.is_active).length;
    return { total, active, inactive: total - active };
  }, [markers]);

  const handleNew = useCallback(() => {
    setEditingMarker(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((marker: KilometerMarker) => {
    setEditingMarker(marker);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(
    async (formData: KmFormData) => {
      try {
        const payload = {
          name: formData.name.trim(),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          route_name: formData.route_name.trim() || null,
          polygon_group_id: formData.polygon_group_id
            ? parseInt(formData.polygon_group_id, 10)
            : null,
          is_active: formData.is_active,
        };

        if (editingMarker) {
          await updateMutation.mutateAsync({
            id: editingMarker.id,
            data: payload,
          });
          toast.success("Hito actualizado correctamente");
        } else {
          await createMutation.mutateAsync(payload);
          toast.success("Hito creado correctamente");
        }
        setShowModal(false);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error desconocido";
        toast.error(message);
      }
    },
    [editingMarker, createMutation, updateMutation, toast],
  );

  const handleToggleActive = useCallback(
    async (marker: KilometerMarker) => {
      try {
        await updateMutation.mutateAsync({
          id: marker.id,
          data: { is_active: !marker.is_active },
        });
        toast.success(marker.is_active ? "Hito desactivado" : "Hito activado");
      } catch {
        toast.error("Error al cambiar estado del hito");
      }
    },
    [updateMutation, toast],
  );

  const handleDelete = useCallback(
    async (marker: KilometerMarker) => {
      if (!confirm(`¿Eliminar "${marker.name}" permanentemente?`)) return;
      try {
        await deleteMutation.mutateAsync(marker.id);
        toast.success("Hito eliminado correctamente");
      } catch {
        toast.error("Error al eliminar hito");
      }
    },
    [deleteMutation, toast],
  );

  if (error) {
    return (
      <div className="p-8 flex items-center gap-3 text-red-400">
        <AlertCircle size={20} />
        <span>Error al cargar ubicación vial</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="text-blue-500" size={24} />
            Ubicación Vial
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {stats.total} ubicaciones · {stats.active} activas · {stats.inactive}{" "}
            inactivos
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
        >
          <Plus size={18} />
          Agregar Hito
        </button>
      </div>

      {/* Controles de filtro */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o ruta..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100/80 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
          />
        </div>

        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.1]">
          {(["all", "active", "inactive"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActive(filter)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                filterActive === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100/80 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              {filter === "all"
                ? "Todos"
                : filter === "active"
                  ? "Activos"
                  : "Inactivos"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : filteredMarkers.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <MapPin size={48} className="mx-auto mb-3 opacity-30" />
          <p>No se encontraron ubicaciones viales</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/[0.08]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.04]">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Latitud
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Longitud
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Ruta
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Grupo
                </th>
                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Estado
                </th>
                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
              {filteredMarkers.map((marker) => (
                <tr
                  key={marker.id}
                  className={`hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors ${
                    !marker.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    {marker.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {marker.latitude.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {marker.longitude.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {marker.route_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {marker.group_name ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                        {marker.group_name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        marker.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {marker.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(marker)}
                        title="Editar"
                        className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(marker)}
                        title={marker.is_active ? "Desactivar" : "Activar"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          marker.is_active
                            ? "hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                            : "hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {marker.is_active ? (
                          <ToggleLeft size={14} />
                        ) : (
                          <ToggleRight size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(marker)}
                        title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contador */}
      {filteredMarkers.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-right">
          Mostrando {filteredMarkers.length} de {markers.length} ubicaciones
        </p>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <KmFormModal
            marker={editingMarker}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KilometerManagement;

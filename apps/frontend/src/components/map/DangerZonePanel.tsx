import React, { useState, useEffect } from "react";
import { X, Save, Trash2, AlertTriangle, Shield, ShieldAlert, ShieldOff, Pencil } from "lucide-react";
import {
  useDangerZoneStore,
  polygonRingToOpenDrawingPoints,
} from "@/stores/useDangerZoneStore";
import { isClosedRingSimple } from "@/utils/dangerZonePolygon";
import { useCreateDangerZone, useUpdateDangerZone, useDeleteDangerZone } from "@/hooks/useDangerZones";
import { useAdminToast } from "@/hooks/useAdminToast";
import type { DangerZoneSeverity, DangerZoneUpdateInput } from "@panel-waze/types";
import { cn } from "@/lib/utils";

type SeverityStyle = {
  value: DangerZoneSeverity;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  selectedBorder: string;
  selectedBg: string;
};

const SEVERITY_OPTIONS: SeverityStyle[] = [
  {
    value: "high",
    label: "Alta",
    icon: <Shield className="h-4 w-4" />,
    iconColor: "text-yellow-400",
    selectedBorder: "border-yellow-400 ring-2 ring-yellow-400/40",
    selectedBg: "bg-yellow-400/10",
  },
  {
    value: "critical",
    label: "Crítica",
    icon: <ShieldAlert className="h-4 w-4" />,
    iconColor: "text-orange-500",
    selectedBorder: "border-orange-500 ring-2 ring-orange-500/50",
    selectedBg: "bg-orange-500/10",
  },
  {
    value: "extreme",
    label: "Extrema",
    icon: <ShieldOff className="h-4 w-4" />,
    iconColor: "text-red-500",
    selectedBorder: "border-red-500 ring-2 ring-red-500/60",
    selectedBg: "bg-red-500/10",
  },
];

const PROTOCOL_PRESETS = [
  "Despachar grúa pesada inmediatamente",
  "Notificar a Policía Caminera",
  "Despachar ambulancia + grúa",
  "Notificar a Defensa Civil",
  "Activar protocolo de corte de ruta",
  "Enviar patrulla de inspección",
];

export const DangerZonePanel: React.FC = () => {
  const selectedZone = useDangerZoneStore((s) => s.selectedZone);
  const showPanel = useDangerZoneStore((s) => s.showPanel);
  const tempGeometry = useDangerZoneStore((s) => s.tempGeometry);
  const isDrawing = useDangerZoneStore((s) => s.isDrawing);
  const drawingPoints = useDangerZoneStore((s) => s.drawingPoints);
  const reset = useDangerZoneStore((s) => s.reset);
  const setShowPanel = useDangerZoneStore((s) => s.setShowPanel);
  const setDrawing = useDangerZoneStore((s) => s.setDrawing);
  const clearDrawingPoints = useDangerZoneStore((s) => s.clearDrawingPoints);
  const setTempGeometryStore = useDangerZoneStore((s) => s.setTempGeometry);
  const finishDangerZoneDrawing = useDangerZoneStore(
    (s) => s.finishDangerZoneDrawing,
  );

  const toast = useAdminToast();
  const createMutation = useCreateDangerZone();
  const updateMutation = useUpdateDangerZone();
  const deleteMutation = useDeleteDangerZone();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<DangerZoneSeverity>("high");
  const [protocol, setProtocol] = useState("");

  // El color ya no lo elige el usuario; se deriva de la severidad
  // (amarillo / naranja / rojo) para que la criticidad sea consistente
  // en panel, listado y mapa.
  const SEVERITY_HEX: Record<DangerZoneSeverity, string> = {
    high: "#FACC15",
    critical: "#F97316",
    extreme: "#EF4444",
  };
  const color = SEVERITY_HEX[severity];

  const isEditing = !!selectedZone;

  useEffect(() => {
    if (selectedZone) {
      setName(selectedZone.name);
      setDescription(selectedZone.description || "");
      setSeverity(selectedZone.severity);
      setProtocol(selectedZone.protocol);
    } else {
      setName("");
      setDescription("");
      setSeverity("high");
      setProtocol("");
    }
  }, [selectedZone]);

  if (!showPanel) return null;

  /**
   * Si el usuario quedó con el editor abierto (Redibujar perímetro) y olvidó
   * pulsar "Finalizar", cerramos el polígono por él antes de guardar. Así el
   * PUT incluye `geometria` y la forma se persiste.
   */
  const ensureTempGeometryFromDrawing = (): GeoJSON.Polygon | null => {
    if (tempGeometry) return tempGeometry as GeoJSON.Polygon;
    if (!isDrawing) return null;
    if (drawingPoints.length < 3) return null;
    if (!isClosedRingSimple(drawingPoints)) return null;
    const ok = finishDangerZoneDrawing();
    if (!ok) return null;
    return useDangerZoneStore.getState().tempGeometry;
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    // Editor abierto sin polígono válido → avisar y no enviar
    if (isDrawing && !tempGeometry) {
      if (drawingPoints.length < 3) {
        toast.warning(
          "Polígono incompleto",
          "Coloca al menos 3 vértices antes de guardar.",
        );
        return;
      }
      if (!isClosedRingSimple(drawingPoints)) {
        toast.warning(
          "Polígono inválido",
          "El perímetro se cruza a sí mismo. Ajusta los vértices antes de guardar.",
        );
        return;
      }
    }

    const effectiveGeometry = ensureTempGeometryFromDrawing();

    try {
      if (isEditing && selectedZone) {
        const input: DangerZoneUpdateInput = {
          name,
          description,
          severity,
          protocol,
          color,
        };
        if (effectiveGeometry) {
          input.geometry = effectiveGeometry;
        }
        await updateMutation.mutateAsync({ id: selectedZone.id, input });
        toast.success(
          "Modificación registrada",
          effectiveGeometry
            ? `La zona «${name.trim()}» y su perímetro se actualizaron.`
            : `La zona «${name.trim()}» se actualizó correctamente.`,
        );
      } else if (effectiveGeometry) {
        await createMutation.mutateAsync({
          name,
          description,
          severity,
          protocol,
          color,
          geometry: effectiveGeometry,
        });
        toast.success(
          "Alta registrada",
          `La zona «${name.trim()}» se creó correctamente.`,
        );
      } else {
        toast.warning(
          "Falta el perímetro",
          "Dibuja el polígono en el mapa (clic derecho → crear zona) antes de guardar.",
        );
        return;
      }
      reset();
    } catch (e) {
      toast.error(
        "No se pudo guardar",
        e instanceof Error ? e.message : "Error desconocido",
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedZone) return;
    if (
      !confirm(
        "¿Eliminar definitivamente esta zona peligrosa? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    const zoneName = selectedZone.name;
    try {
      await deleteMutation.mutateAsync(selectedZone.id);
      toast.success("Baja registrada", `La zona «${zoneName}» se eliminó correctamente.`);
      reset();
    } catch (e) {
      toast.error(
        "No se pudo eliminar",
        e instanceof Error ? e.message : "Error desconocido",
      );
    }
  };

  const handleStartRedraw = () => {
    setTempGeometryStore(null);
    if (selectedZone?.geometry) {
      const ring = polygonRingToOpenDrawingPoints(selectedZone.geometry);
      if (ring.length >= 3) {
        setDrawing(true, ring);
        return;
      }
    }
    clearDrawingPoints();
    setDrawing(true);
  };

  const handleClose = () => { reset(); setShowPanel(false); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="absolute top-4 right-4 z-50 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-red-600 text-white">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold text-sm">{isEditing ? "Editar zona peligrosa" : "Nueva zona peligrosa"}</span>
        </div>
        <button onClick={handleClose} title="Cerrar panel" className="p-1 hover:bg-red-700 rounded transition-colors"><X className="h-4 w-4" /></button>
      </div>

      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {isEditing && (
          <button
            type="button"
            onClick={handleStartRedraw}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            Redibujar perímetro en el mapa
          </button>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre de la zona *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Villa la Tela" className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Detalles adicionales..." className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition resize-none" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Severidad *</label>
          <div className="flex gap-2">
            {SEVERITY_OPTIONS.map((opt) => {
              const isSel = severity === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                    isSel
                      ? cn(opt.selectedBorder, opt.selectedBg)
                      : "border-gray-200 dark:border-slate-600 hover:border-gray-300",
                  )}
                >
                  <span className={opt.iconColor}>{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Protocolo de acción *</label>
          <textarea value={protocol} onChange={(e) => setProtocol(e.target.value)} rows={2} placeholder="Protocolo a seguir..." className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition resize-none" />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {PROTOCOL_PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setProtocol((prev) => (prev ? prev + "\n" : "") + p)} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-gray-600 dark:text-gray-300">{p}</button>
            ))}
          </div>
        </div>

      </div>

      {tempGeometry && !isDrawing && (
        <div className="px-4 py-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-100 dark:border-amber-900/50">
          Perímetro listo en el mapa. Pulsa <strong>Guardar</strong> para enviarlo al servidor.
        </div>
      )}
      {isDrawing && (
        <div className="px-4 py-2 text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-100 dark:border-blue-900/50">
          Editando perímetro en el mapa ({drawingPoints.length}{" "}
          {drawingPoints.length === 1 ? "vértice" : "vértices"}). Al pulsar{" "}
          <strong>Guardar</strong> se cierra y envía automáticamente.
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex gap-2">
        {isEditing && (
          <button type="button" onClick={handleDelete} disabled={deleteMutation.isPending} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Eliminar zona">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={handleClose} className="flex-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
        <button type="button" onClick={handleSave} disabled={!name.trim() || isSaving} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
          <Save className="h-4 w-4" />
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
};

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  EyeOff,
  Navigation as NavIcon,
  Trash2,
  Edit3,
} from "lucide-react";
import { useDangerZones, useDeleteDangerZone } from "@/hooks/useDangerZones";
import { useDangerZoneStore } from "@/stores/useDangerZoneStore";
import { DangerZone } from "@panel-waze/types";
import { cn } from "@/lib/utils";

const SEVERITY_BADGES: Record<string, { label: string; cls: string }> = {
  high: { label: "Alta", cls: "bg-orange-500/20 text-orange-300" },
  critical: { label: "Crítica", cls: "bg-red-500/20 text-red-300" },
  extreme: { label: "Extrema", cls: "bg-red-700/20 text-red-200" },
};

export const DangerZoneListPanel: React.FC = () => {
  const { data: dangerZones = [] } = useDangerZones();
  const deleteMutation = useDeleteDangerZone();
  const selectZone = useDangerZoneStore((s) => s.selectZone);
  const toggleZoneVisibility = useDangerZoneStore((s) => s.toggleZoneVisibility);
  const hiddenZoneIds = useDangerZoneStore((s) => s.hiddenZoneIds);
  const hoveredZoneId = useDangerZoneStore((s) => s.hoveredZoneId);
  const setHoveredZone = useDangerZoneStore((s) => s.setHoveredZone);
  const selectedZone = useDangerZoneStore((s) => s.selectedZone);

  const handleFlyTo = useCallback(
    (zone: DangerZone) => {
      selectZone(zone);
      // Disparar evento custom para que MapLibreMap haga flyTo
      window.dispatchEvent(
        new CustomEvent("dangerzone:flyto", {
          detail: { zoneId: zone.id, geometry: zone.geometry },
        }),
      );
    },
    [selectZone],
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-[290px] max-h-[min(70vh,540px)] flex flex-col bg-[#1E1E2E]/95 backdrop-blur-xl text-white rounded-2xl overflow-hidden border border-white/5 shadow-2xl pointer-events-auto"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
        <Shield className="text-red-500 shrink-0" size={20} />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-sm tracking-tight">Zonas peligrosas</h2>
          <p className="text-[10px] text-gray-500 leading-tight">
            Clic derecho en el mapa para crear
          </p>
        </div>
        <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
          {dangerZones.length}
        </span>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 custom-scrollbar">
        {dangerZones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Shield className="text-gray-600 mb-2" size={32} />
            <p className="text-[11px] text-gray-500 italic leading-relaxed">
              No hay zonas peligrosas. Usa clic derecho en el mapa para crear
              una.
            </p>
          </div>
        ) : (
          dangerZones.map((zone) => {
            const isHidden = hiddenZoneIds.has(zone.id);
            const isHovered = hoveredZoneId === zone.id;
            const isSelected = selectedZone?.id === zone.id;
            const badge = SEVERITY_BADGES[zone.severity] || SEVERITY_BADGES.high;

            return (
              <div
                key={zone.id}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                className={cn(
                  "group flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all duration-200",
                  isSelected
                    ? "bg-red-500/15 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                    : isHovered
                      ? "bg-white/10 border-white/15"
                      : "bg-white/5 border-white/5 hover:border-white/10",
                  isHidden && "opacity-50",
                )}
              >
                {/* Fila superior: color + nombre + severidad */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10"
                    style={{
                      backgroundColor: zone.color || "#ef4444",
                      boxShadow: `0 0 8px ${zone.color || "#ef4444"}40`,
                    }}
                  />
                  <span className="text-xs font-semibold truncate flex-1">
                    {zone.name}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                      badge.cls,
                    )}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Fila de acciones */}
                <div className="flex items-center gap-1">
                  {/* Toggle visibilidad individual (show/hide como Google Maps) */}
                  <button
                    type="button"
                    onClick={() => toggleZoneVisibility(zone.id)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all text-[10px] flex items-center gap-1",
                      isHidden
                        ? "bg-gray-700/50 text-gray-500 hover:text-gray-300"
                        : "bg-white/5 text-green-400 hover:bg-white/10",
                    )}
                    title={isHidden ? "Mostrar en mapa" : "Ocultar del mapa"}
                  >
                    {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span className="hidden group-hover:inline">
                      {isHidden ? "Mostrar" : "Visible"}
                    </span>
                  </button>

                  {/* Ir a la zona (flyTo) */}
                  <button
                    type="button"
                    onClick={() => handleFlyTo(zone)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 rounded-lg transition-colors"
                    title="Centrar mapa en esta zona"
                  >
                    <NavIcon size={10} />
                    Ir a zona
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => selectZone(zone)}
                    className="p-1.5 hover:bg-white/10 text-gray-500 hover:text-blue-400 rounded-lg transition-all"
                    title="Editar zona"
                  >
                    <Edit3 size={12} />
                  </button>

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`¿Eliminar zona "${zone.name}"?`))
                        await deleteMutation.mutateAsync(zone.id);
                    }}
                    className="p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition-all"
                    title="Eliminar zona"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

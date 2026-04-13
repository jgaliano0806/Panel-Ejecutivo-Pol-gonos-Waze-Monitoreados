import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map,
  Layers,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { useDangerZoneStore } from "../../stores/useDangerZoneStore";
import { WazeOMeter } from "../dashboard/WazeOMeter";
import type { Polygon } from "../../types";
import { getPolygonGroups } from "../../utils/polygonHelpers";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  action?: () => void;
  color?: string;
}

interface MapSidebarProps {
  onLayerToggle: (layer: string, enabled: boolean) => void;
  showWazeIncidents: boolean;
  jams: any[]; // TrafficJam array for WazeOMeter
  // Props para filtros de polígonos
  polygons?: Polygon[];
  selectedPolygon?: string | null;
  selectedGroup?: string | null;
  onPolygonChange?: (polygonId: string | null) => void;
  onGroupChange?: (group: string | null) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const MapSidebar = ({
  onLayerToggle,
  showWazeIncidents,
  jams,
  // Props de filtros de polígonos
  polygons = [],
  selectedPolygon = null,
  selectedGroup = null,
  onPolygonChange,
  onGroupChange,
  expanded,
  onExpandedChange,
}: MapSidebarProps) => {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = expanded ?? internalExpanded;
  const showZones = useDangerZoneStore((s) => s.showZones);
  const toggleZonesVisibility = useDangerZoneStore((s) => s.toggleZonesVisibility);

  const toggleExpanded = () => {
    const newValue = !isExpanded;
    if (onExpandedChange) {
      onExpandedChange(newValue);
    } else {
      setInternalExpanded(newValue);
    }
  };

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(["layers", "polygon-filters"]),
  );

  // Calcular grupos únicos desde los polígonos reales
  const polygonGroups = useMemo(
    () => getPolygonGroups(polygons).sort(),
    [polygons],
  );

  const filteredPolygons = useMemo(() => {
    if (selectedGroup) {
      return polygons
        .filter((p) => p.group === selectedGroup)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return polygons.sort((a, b) => a.name.localeCompare(b.name));
  }, [polygons, selectedGroup]);

  const menuItems: MenuItem[] = [
    {
      id: "layers",
      label: "Capas del Mapa",
      icon: <Layers size={20} />,
      children: [
        {
          id: "waze",
          label: "Incidentes Waze",
          icon: <Map size={18} />,
          action: () => onLayerToggle("waze", !showWazeIncidents),
          color: "green",
        },
        {
          id: "danger-zones-layer",
          label: "Zonas peligrosas",
          icon: showZones ? <Eye size={18} /> : <EyeOff size={18} />,
          action: () => toggleZonesVisibility(),
          color: "red",
        },
      ],
    },
  ];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 300 : 72 }}
      className="h-full bg-[#1E1E2E]/95 backdrop-blur-xl text-white flex flex-col z-10 shadow-2xl rounded-2xl overflow-hidden border border-white/5"
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between">
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layers className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight">Controles</span>
          </motion.div>
        )}
        <button
          onClick={toggleExpanded}
          aria-label={isExpanded ? "Contraer controles del mapa" : "Expandir controles del mapa"}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors duration-300 text-gray-400 hover:text-white touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E2E]"
        >
          {isExpanded ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
      </div>

      {/* Estado de la Red Vial - Compacto */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <WazeOMeter jams={jams} />
        </div>
      )}

      {/* Menu Items (Solo visible cuando está expandido) */}
      {isExpanded ? (
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <div key={item.id} className="mb-2">
              <button
                onClick={() => {
                  if (item.children) {
                    toggleMenu(item.id);
                  } else {
                    item.action?.();
                  }
                }}
                aria-expanded={item.children ? expandedMenus.has(item.id) : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl
                  transition-colors duration-300 relative overflow-hidden group
                  touch-manipulation focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400
                  ${
                    expandedMenus.has(item.id)
                      ? "bg-white/5 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                {/* Active Indicator Line */}
                {expandedMenus.has(item.id) && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"
                  />
                )}

                <span
                  className={`transition-colors ${expandedMenus.has(item.id) ? "text-blue-400" : "group-hover:text-blue-400"}`}
                >
                  {item.icon}
                </span>

                {/* Texto y Flecha siempre visibles aquí porque el nav entero se oculta si colapsado */}
                <span className="flex-1 text-left text-sm font-medium">
                  {item.label}
                </span>
                {item.children &&
                  (expandedMenus.has(item.id) ? (
                    <ChevronDown size={16} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-500" />
                  ))}
              </button>

              {/* Submenu */}
              <AnimatePresence>
                {item.children && expandedMenus.has(item.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-4 pl-3 border-l border-white/5 mt-1 space-y-1"
                  >
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={child.action}
                        aria-label={child.id === "waze" ? `Incidentes Waze, ${showWazeIncidents ? "activado" : "desactivado"}` : child.label}
                        aria-pressed={child.id === "waze" ? showWazeIncidents : undefined}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-400 hover:text-white group touch-manipulation focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                      >
                        <span className="group-hover:text-blue-400 transition-colors" aria-hidden>
                          {child.icon}
                        </span>
                        <span>{child.label}</span>
                        {/* Switch Toggle Style for Active/Inactive */}
                        {child.id === "waze" && (
                          <div
                            className={`ml-auto w-8 h-4 rounded-full flex items-center padding-0.5 transition-colors ${showWazeIncidents ? "bg-blue-500 justify-end" : "bg-gray-700 justify-start"}`}
                            aria-hidden
                          >
                            <motion.div
                              layout
                              className="w-3 h-3 bg-white rounded-full mx-0.5"
                            />
                          </div>
                        )}
                        {child.id === "danger-zones-layer" && (
                          <div
                            className={`ml-auto w-8 h-4 rounded-full flex items-center padding-0.5 transition-colors ${showZones ? "bg-red-500 justify-end" : "bg-gray-700 justify-start"}`}
                            aria-hidden
                          >
                            <motion.div
                              layout
                              className="w-3 h-3 bg-white rounded-full mx-0.5"
                            />
                          </div>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Filtros de Polígonos */}
          {onPolygonChange && onGroupChange && polygons.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => toggleMenu("polygon-filters")}
                aria-label="Filtros de polígonos"
                aria-expanded={expandedMenus.has("polygon-filters")}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl
                  transition-colors duration-300 relative overflow-hidden group
                  touch-manipulation focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400
                  ${
                    expandedMenus.has("polygon-filters")
                      ? "bg-white/5 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                {expandedMenus.has("polygon-filters") && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"
                  />
                )}
                <span
                  className={`transition-colors ${expandedMenus.has("polygon-filters") ? "text-blue-400" : "group-hover:text-blue-400"}`}
                >
                  <Filter size={20} />
                </span>

                <span className="flex-1 text-left text-sm font-medium">
                  Filtros
                </span>
                {(selectedPolygon || selectedGroup) && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 mr-2"></span>
                )}
                {expandedMenus.has("polygon-filters") ? (
                  <ChevronDown size={16} className="text-gray-500" />
                ) : (
                  <ChevronRight size={16} className="text-gray-500" />
                )}
              </button>

              <AnimatePresence>
                {expandedMenus.has("polygon-filters") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-2 mt-2"
                  >
                    <div className="bg-black/20 rounded-xl p-3 space-y-3">
                      {/* Filtro por Grupo */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 px-1">
                          Grupo
                        </label>
                        <select
                          aria-label="Filtrar por Grupo"
                          value={selectedGroup || ""}
                          onChange={(e) => {
                            const value = e.target.value || null;
                            onGroupChange?.(value);
                            onPolygonChange?.(null);
                          }}
                          className="w-full px-3 py-2 bg-[#12121a] border border-white/10 text-gray-200 rounded-lg text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                        >
                          <option value="">Todos</option>
                          {polygonGroups.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filtro por Polígono */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 px-1">
                          Polígono
                        </label>
                        <select
                          aria-label="Filtrar por Polígono"
                          value={selectedPolygon || ""}
                          onChange={(e) => {
                            const value = e.target.value || null;
                            onPolygonChange?.(value);
                          }}
                          className="w-full px-3 py-2 bg-[#12121a] border border-white/10 text-gray-200 rounded-lg text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors"
                        >
                          <option value="">Todos</option>
                          {filteredPolygons.map((polygon) => (
                            <option key={polygon.id} value={polygon.id}>
                              {polygon.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Contador y botón limpiar */}
                      <div className="flex items-center justify-between px-1 pt-1">
                        <span className="text-[10px] text-gray-500">
                          {filteredPolygons.length} resultados
                        </span>
                        {(selectedPolygon || selectedGroup) && (
                          <button
                            onClick={() => {
                              onPolygonChange?.(null);
                              onGroupChange?.(null);
                            }}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium hover:underline"
                          >
                            Limpiar todo
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>
      ) : (
        /* Collapsed Icons - NOW IS THE ONLY CONTENT WHEN COLLAPSED */
        <div className="flex flex-col items-center gap-4 py-4 mt-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.children?.[0]?.action?.() ?? item.action?.()}
              aria-label={item.id === "layers" ? `Capas del mapa, Incidentes Waze ${showWazeIncidents ? "activado" : "desactivado"}` : item.label}
              className={`
                p-3 rounded-xl transition-colors duration-300 group relative
                touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                ${expandedMenus.has(item.id) ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-400 hover:bg-white/10 hover:text-white"}
              `}
            >
              {item.icon}
              {item.id === "layers" && showWazeIncidents && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-400 rounded-full border border-[#1E1E2E]" aria-hidden />
              )}
            </button>
          ))}
          <button
            onClick={() => {
              if (!isExpanded) (onExpandedChange ?? setInternalExpanded)(true);
              toggleMenu("polygon-filters");
            }}
            aria-label="Filtros de polígonos"
            className={`
                p-3 rounded-xl transition-colors duration-300 group relative
                touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                ${expandedMenus.has("polygon-filters") ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-400 hover:bg-white/10 hover:text-white"}
              `}
          >
            <Filter size={20} />
            {(selectedPolygon || selectedGroup) && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-400 rounded-full border border-[#1E1E2E]"></span>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
};

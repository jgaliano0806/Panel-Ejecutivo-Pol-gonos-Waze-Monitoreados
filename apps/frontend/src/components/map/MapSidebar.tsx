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
} from "lucide-react";
import { WazeOMeter } from "../dashboard/WazeOMeter";
import type { Polygon } from "../../types";
import { getPolygonGroups } from "../../utils/polygonHelpers";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  action?: () => void;
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
}: MapSidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(["layers", "polygon-filters"]),
  );

  // Calcular grupos únicos desde los polígonos reales
  const polygonGroups = useMemo(
    () => getPolygonGroups(polygons).sort(),
    [polygons]
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
      animate={{ width: isExpanded ? 280 : 64 }}
      className="h-full bg-gray-900 dark:bg-veltrix-card text-white flex flex-col shadow-xl z-10"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800 dark:border-veltrix-border flex items-center justify-between">
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <Layers className="text-blue-400" size={24} />
            <span className="font-bold text-lg">Controles</span>
          </motion.div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-800 dark:hover:bg-veltrix-bg rounded-lg transition-colors"
        >
          {isExpanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Estado de la Red Vial - Compacto */}
      {isExpanded && (
        <div className="px-2 pb-2">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <WazeOMeter jams={jams} />
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => {
                if (item.children) {
                  toggleMenu(item.id);
                } else {
                  item.action?.();
                }
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors mb-1
                ${
                  expandedMenus.has(item.id)
                    ? "bg-gray-800 dark:bg-veltrix-bg"
                    : "hover:bg-gray-800 dark:hover:bg-veltrix-bg"
                }
              `}
            >
              <span className="text-gray-400">{item.icon}</span>
              {isExpanded && (
                <>
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.children &&
                    (expandedMenus.has(item.id) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    ))}
                </>
              )}
            </button>

            {/* Submenu */}
            <AnimatePresence>
              {isExpanded && item.children && expandedMenus.has(item.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 overflow-hidden"
                >
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={child.action}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-veltrix-bg transition-colors text-sm text-gray-300"
                    >
                      <span className="text-gray-500">{child.icon}</span>
                      <span>{child.label}</span>
                      {/* Indicador de activo */}
                      {child.id === "waze" && showWazeIncidents && (
                        <span className="ml-auto w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Filtros de Polígonos - Solo si hay callbacks definidos */}
        {onPolygonChange && onGroupChange && polygons.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-800 dark:border-veltrix-border">
            <button
              onClick={() => toggleMenu("polygon-filters")}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-colors mb-1
                ${
                  expandedMenus.has("polygon-filters")
                    ? "bg-gray-800 dark:bg-veltrix-bg"
                    : "hover:bg-gray-800 dark:hover:bg-veltrix-bg"
                }
              `}
            >
              <span className="text-gray-400">
                <Filter size={20} />
              </span>
              {isExpanded && (
                <>
                  <span className="flex-1 text-left text-sm">Filtros</span>
                  {(selectedPolygon || selectedGroup) && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  )}
                  {expandedMenus.has("polygon-filters") ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </>
              )}
            </button>

            <AnimatePresence>
              {isExpanded && expandedMenus.has("polygon-filters") && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-2"
                >
                  <div className="space-y-3 py-2">
                    {/* Filtro por Grupo */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 px-1">
                        Grupo de Rutas
                      </label>
                      <select
                        value={selectedGroup || ""}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          onGroupChange(value);
                          onPolygonChange(null);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 dark:bg-veltrix-bg border border-gray-700 dark:border-veltrix-border text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Todos los grupos</option>
                        {polygonGroups.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro por Polígono */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 px-1">
                        Polígono
                      </label>
                      <select
                        value={selectedPolygon || ""}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          onPolygonChange(value);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 dark:bg-veltrix-bg border border-gray-700 dark:border-veltrix-border text-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <option value="">Todos los polígonos</option>
                        {filteredPolygons.map((polygon) => (
                          <option key={polygon.id} value={polygon.id}>
                            {polygon.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Contador y botón limpiar */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-gray-500">
                        {filteredPolygons.length} de {polygons.length}
                      </span>
                      {(selectedPolygon || selectedGroup) && (
                        <button
                          onClick={() => {
                            onPolygonChange(null);
                            onGroupChange(null);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Limpiar
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

      {/* Collapsed Icons */}
      {!isExpanded && (
        <div className="flex flex-col items-center gap-2 p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="p-3 hover:bg-gray-800 dark:hover:bg-veltrix-bg rounded-lg transition-colors text-gray-400 hover:text-white"
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

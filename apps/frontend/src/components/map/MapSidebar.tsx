import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Map,
  Layers,
  Calendar,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  AlertTriangle,
  Car,
} from "lucide-react";
import { WazeOMeter } from "../dashboard/WazeOMeter";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: MenuItem[];
  action?: () => void;
}

interface MapSidebarProps {
  onLayerToggle: (layer: string, enabled: boolean) => void;
  onFilterChange: (filter: {
    mode: "day" | "month" | "year";
    date: Date;
  }) => void;
  onViewModeChange: (mode: "active" | "historical") => void;
  showRACAccidents: boolean;
  showWazeIncidents: boolean;
  showTraffic?: boolean;
  racViewMode: "active" | "historical";
  dateFilter: { mode: "day" | "month" | "year"; date: Date };
  jams: any[]; // TrafficJam array for WazeOMeter
}

export const MapSidebar = ({
  onLayerToggle,
  onFilterChange,
  onViewModeChange,
  showRACAccidents,
  showWazeIncidents,
  showTraffic = true,
  racViewMode,
  dateFilter,
  jams,
}: MapSidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(["layers"]),
  );
  const [searchQuery, setSearchQuery] = useState("");

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
        },
        {
          id: "rac",
          label: "Accidentes RAC",
          icon: <AlertTriangle size={18} />,
          action: () => onLayerToggle("rac", !showRACAccidents),
        },
        {
          id: "traffic",
          label: "Tráfico",
          icon: <Car size={18} />,
          action: () => onLayerToggle("traffic", !showTraffic),
        },
      ],
    },
    // Solo mostrar período histórico cuando Accidentes RAC está activo
    ...(showRACAccidents
      ? [
          {
            id: "date-filters",
            label: "Período Histórico",
            icon: <Calendar size={20} />,
            children: [
              {
                id: "day",
                label: "Por día",
                icon: <Calendar size={18} />,
                action: () =>
                  onFilterChange({ mode: "day", date: dateFilter.date }),
              },
              {
                id: "month",
                label: "Por mes",
                icon: <Calendar size={18} />,
                action: () =>
                  onFilterChange({ mode: "month", date: dateFilter.date }),
              },
              {
                id: "year",
                label: "Por año",
                icon: <Calendar size={18} />,
                action: () =>
                  onFilterChange({ mode: "year", date: dateFilter.date }),
              },
            ],
          },
        ]
      : []),
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

  const formatDateInput = (
    date: Date,
    mode: "day" | "month" | "year",
  ): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    switch (mode) {
      case "day":
        return `${year}-${month}-${day}`;
      case "month":
        return `${year}-${month}`;
      case "year":
        return String(year);
    }
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

      {/* Search */}
      {isExpanded && (
        <div className="p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-3 py-2 bg-gray-800 dark:bg-veltrix-bg border border-gray-700 dark:border-veltrix-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>
      )}

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
                      {child.id === "rac" && showRACAccidents && (
                        <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                      {child.id === "traffic" && showTraffic && (
                        <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                      {/* Indicador de modo seleccionado */}
                      {child.id === "active" && racViewMode === "active" && (
                        <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                      {child.id === "historical" &&
                        racViewMode === "historical" && (
                          <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      {/* Indicador de filtro de fecha seleccionado */}
                      {child.id === dateFilter.mode &&
                        item.id === "date-filters" && (
                          <span className="ml-auto w-2 h-2 bg-purple-500 rounded-full"></span>
                        )}
                    </button>
                  ))}
                  {/* Date Filter Input - Solo mostrar en modo histórico */}
                  {item.id === "date-filters" &&
                    showRACAccidents &&
                    racViewMode === "historical" && (
                      <div className="px-3 py-2 space-y-2">
                        <label className="text-xs text-gray-400">
                          Seleccionar fecha:
                        </label>
                        <input
                          type={
                            dateFilter.mode === "day"
                              ? "date"
                              : dateFilter.mode === "month"
                                ? "month"
                                : "number"
                          }
                          value={formatDateInput(
                            dateFilter.date,
                            dateFilter.mode,
                          )}
                          onChange={(e) => {
                            const newDate =
                              dateFilter.mode === "year"
                                ? new Date(parseInt(e.target.value), 0, 1)
                                : new Date(e.target.value);
                            if (!isNaN(newDate.getTime())) {
                              onFilterChange({ ...dateFilter, date: newDate });
                            }
                          }}
                          min={dateFilter.mode === "year" ? "2020" : undefined}
                          max={
                            dateFilter.mode === "year"
                              ? new Date().getFullYear().toString()
                              : undefined
                          }
                          className="w-full px-2 py-1.5 bg-gray-800 dark:bg-veltrix-bg border border-gray-700 dark:border-veltrix-border rounded text-xs text-white"
                        />
                      </div>
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
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

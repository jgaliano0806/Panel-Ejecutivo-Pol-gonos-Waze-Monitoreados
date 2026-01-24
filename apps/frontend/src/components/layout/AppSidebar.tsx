import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Map,
  AlertTriangle,
  Layers,
  Car,
  Calendar,
  BarChart3,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

import { useNotificationStore } from "@/stores/useNotificationStore";
import { Bell } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  // Determinar item activo basado en la ruta actual
  const getActiveItem = () => {
    if (location.pathname === "/" || location.pathname === "/dashboard")
      return "home";
    if (location.pathname === "/mapa") return "map";
    if (location.pathname === "/riesgos") return "risk";
    if (location.pathname === "/alertas") return "alerts";
    if (location.pathname === "/siniestros") return "accidents";
    if (location.pathname === "/notificaciones") return "notifications";
    if (location.pathname === "/historial") return "history";
    if (location.pathname === "/estadisticas") return "stats";
    if (location.pathname === "/admin") return "admin";
    return "home";
  };

  const activeItem = getActiveItem();

  const navItems: NavItem[] = [
    {
      id: "home",
      label: "Inicio",
      icon: <Home size={20} />,
      path: "/dashboard",
    },
    {
      id: "map",
      label: "Mapa y Zonas",
      icon: <Map size={20} />,
      path: "/mapa",
    },
    {
      id: "risk",
      label: "Análisis de Riesgos",
      icon: <AlertTriangle size={20} />,
      path: "/riesgos",
    },
    {
      id: "alerts",
      label: "Alertas y Eventos",
      icon: <Layers size={20} />,
      path: "/alertas",
    },
    {
      id: "notifications",
      label: "Notificaciones",
      icon: <Bell size={20} />,
      path: "/notificaciones",
    },
    {
      id: "accidents",
      label: "Siniestros Viales",
      icon: <Car size={20} />,
      path: "/siniestros",
    },
    {
      id: "history",
      label: "Historial",
      icon: <Calendar size={20} />,
      path: "/historial",
    },
    {
      id: "stats",
      label: "Estadísticas",
      icon: <BarChart3 size={20} />,
      path: "/estadisticas",
    },
    {
      id: "admin",
      label: "Administración",
      icon: <Settings size={20} />,
      path: "/admin",
    },
  ];

  const handleNavigation = (item: NavItem) => {
    navigate(item.path);
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 240 : 64 }}
      className="h-full bg-gray-900 dark:bg-veltrix-card text-white flex flex-col shadow-xl border-r border-gray-800 dark:border-veltrix-border z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800 dark:border-veltrix-border flex items-center justify-between">
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PW</span>
            </div>
            <div>
              <div className="font-bold text-sm">Panel Ejecutivo</div>
              <div className="text-xs text-gray-400">Waze Monitoreados</div>
            </div>
          </motion.div>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-800 dark:hover:bg-veltrix-bg rounded-lg transition-colors"
        >
          {isExpanded ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2 mt-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item)}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 relative
              transition-all duration-200
              ${
                activeItem === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "hover:bg-gray-800 dark:hover:bg-veltrix-bg text-gray-300 hover:text-white"
              }
            `}
          >
            <span
              className={
                activeItem === item.id ? "text-white" : "text-gray-400"
              }
            >
              {item.icon}
            </span>
            {isExpanded && (
              <>
                <span className="flex-1 text-left text-sm font-medium">
                  {item.label}
                </span>
                {item.id === "notifications" && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {activeItem === item.id && <ChevronRight size={16} />}
              </>
            )}
            {!isExpanded && item.id === "notifications" && unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-800 dark:border-veltrix-border">
          <div className="text-xs text-gray-500 text-center">
            v1.0.0 • Panel Waze
          </div>
        </div>
      )}
    </motion.div>
  );
};

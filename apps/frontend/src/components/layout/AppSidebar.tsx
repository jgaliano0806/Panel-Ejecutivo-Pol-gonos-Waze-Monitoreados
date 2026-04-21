import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Map,
  Car,
  Settings,
  ChevronRight,
  Menu,
  X,
  Bell,
  FileSearch,
  LogOut,
  Shield,
} from "lucide-react";

import { useNotificationStore } from "@/stores/useNotificationStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { ROUTE_PERMISSIONS } from "@/config/routePermissions";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiredPermission: string;
}

export const AppSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isExpanded, setExpanded } = useSidebarStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { user, logout, hasPermission } = useAuthStore();

  // Determinar item activo basado en la ruta actual
  const getActiveItem = () => {
    if (location.pathname === "/" || location.pathname === "/dashboard")
      return "home";
    if (location.pathname === "/mapa") return "map";
    if (location.pathname === "/riesgos") return "risk";
    if (location.pathname === "/siniestros") return "accidents";
    if (location.pathname === "/notificaciones") return "notifications";
    if (location.pathname === "/zonas-peligrosas") return "danger-zones";
    if (location.pathname === "/incidentes") return "incidents";
    if (location.pathname === "/admin") return "admin";
    return "home";
  };

  const activeItem = getActiveItem();

  const allNavItems: NavItem[] = [
    {
      id: "map",
      label: "Mapa y Zonas",
      icon: <Map size={20} />,
      path: "/mapa",
      requiredPermission: ROUTE_PERMISSIONS.mapa,
    },
    // {
    //   id: "risk",
    //   label: "Análisis de Riesgos",
    //   icon: <AlertTriangle size={20} />,
    //   path: "/riesgos",
    //   requiredPermission: ROUTE_PERMISSIONS.riesgos,
    // },
    {
      id: "notifications",
      label: "Notificaciones",
      icon: <Bell size={20} />,
      path: "/notificaciones",
      requiredPermission: ROUTE_PERMISSIONS.notificaciones,
    },
    {
      id: "danger-zones",
      label: "Módulo de zonas peligrosas",
      icon: <Shield size={20} />,
      path: "/zonas-peligrosas",
      requiredPermission: ROUTE_PERMISSIONS.mapa,
    },
    {
      id: "incidents",
      label: "Módulo Incidentes",
      icon: <FileSearch size={20} />,
      path: "/incidentes",
      requiredPermission: ROUTE_PERMISSIONS.incidentes,
    },
    {
      id: "accidents",
      label: "Siniestros Viales",
      icon: <Car size={20} />,
      path: "/siniestros",
      requiredPermission: ROUTE_PERMISSIONS.siniestros,
    },
    {
      id: "admin",
      label: "Administración",
      icon: <Settings size={20} />,
      path: "/admin",
      requiredPermission: ROUTE_PERMISSIONS.admin,
    },
  ];

  const navItems = allNavItems.filter((item) =>
    hasPermission(item.requiredPermission),
  );

  const handleNavigation = (item: NavItem) => {
    navigate(item.path);
  };

  const clearNotifications = useNotificationStore(
    (state) => state.clearNotifications,
  );

  const handleLogout = async () => {
    clearNotifications();
    await logout();
    navigate("/login");
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
              <div className="font-bold text-sm">Panel Waze RAC</div>
              <div className="text-xs text-gray-400">Waze Monitoreados</div>
            </div>
          </motion.div>
        )}
        <button
          onClick={() => setExpanded(!isExpanded)}
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

      {/* Footer — Sesión activa */}
      <div className="p-3 border-t border-gray-800 dark:border-veltrix-border">
        {user && isExpanded ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/perfil")}
              className="flex items-center gap-2 flex-1 min-w-0 p-1 -m-1 rounded-lg hover:bg-gray-800 dark:hover:bg-veltrix-bg transition-colors"
              title="Ver perfil"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={`${window.location.origin}${user.avatarUrl}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {user.roles.map((r) => r.name).join(", ") || "Sin rol"}
                </div>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : user ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => navigate("/perfil")}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all"
              title="Ver perfil"
            >
              {user.avatarUrl ? (
                <img
                  src={`${window.location.origin}${user.avatarUrl}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  {user.firstName[0]}
                  {user.lastName[0]}
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          isExpanded && (
            <div className="text-xs text-gray-500 text-center">
              v1.0.0 • Panel Waze
            </div>
          )
        )}
      </div>
    </motion.div>
  );
};

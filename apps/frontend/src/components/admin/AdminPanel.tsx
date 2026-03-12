import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Database,
  Users,
  FileText,
  MapPin,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import PolygonManagement from "./PolygonManagement";
import CatalogManagement from "./CatalogManagement";
import UserManagement from "./UserManagement";
import SystemSettings from "./SystemSettings";
import KilometerManagement from "./KilometerManagement";
import { AdminToastProvider } from "../../hooks/useAdminToast";

type AdminSection =
  | "polygons"
  | "catalogs"
  | "users"
  | "kilometers"
  | "settings";

interface AdminSectionConfig {
  id: AdminSection;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
}

const adminSections: AdminSectionConfig[] = [
  {
    id: "polygons",
    label: "Polígonos Waze",
    icon: Database,
    description: "Gestión de polígonos y feeds de Waze",
    color: "from-blue-600 to-blue-700",
  },
  {
    id: "catalogs",
    label: "Catálogos",
    icon: FileText,
    description: "Tipos y subtipos de incidentes, configuraciones del sistema",
    color: "from-green-600 to-green-700",
  },
  {
    id: "users",
    label: "Usuarios & Perfiles",
    icon: Users,
    description: "Gestión de usuarios, roles y permisos",
    color: "from-purple-600 to-purple-700",
  },
  {
    id: "kilometers",
    label: "Hitos Kilométricos",
    icon: MapPin,
    description: "Puntos de referencia de rutas en el mapa",
    color: "from-cyan-600 to-cyan-700",
  },
  {
    id: "settings",
    label: "Configuración Sistema",
    icon: Settings,
    description: "Parámetros generales y configuraciones avanzadas",
    color: "from-gray-600 to-gray-700",
  },
];

const AdminPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>("polygons");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderActiveSection = () => {
    switch (activeSection) {
      case "polygons":
        return <PolygonManagement />;
      case "catalogs":
        return <CatalogManagement />;
      case "users":
        return <UserManagement />;
      case "kilometers":
        return <KilometerManagement />;
      case "settings":
        return <SystemSettings />;
      default:
        return <PolygonManagement />;
    }
  };

  const activeConfig = adminSections.find((s) => s.id === activeSection)!;

  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 via-green-50/20 to-yellow-50/30 dark:from-veltrix-bg dark:via-veltrix-bg dark:to-veltrix-bg transition-colors duration-300">
        <div className="max-w-[1900px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                Panel de Administración
              </h1>
              <p className="text-sm text-gray-600 dark:text-veltrix-muted hidden sm:block">
                Gestión completa del sistema de monitoreo Waze
              </p>
            </div>
            {/* Botón hamburguesa solo en mobile */}
            <button
              className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-veltrix-card border border-gray-200 dark:border-veltrix-border shadow-sm text-gray-700 dark:text-gray-300 text-sm font-medium"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              <span>{activeConfig.label}</span>
            </button>
          </div>

          {/* Mobile nav drawer */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden mb-4 bg-white dark:bg-veltrix-card rounded-xl shadow-lg border border-transparent dark:border-veltrix-border/50"
              >
                <div className="p-3 space-y-1">
                  {adminSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          setActiveSection(section.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-all duration-200 flex items-center gap-3 ${
                          isActive
                            ? `bg-gradient-to-r ${section.color} text-white shadow-md`
                            : "bg-gray-50 dark:bg-veltrix-bg/30 hover:bg-gray-100 dark:hover:bg-veltrix-bg/50 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <Icon size={18} className={isActive ? "text-white" : "text-gray-500 dark:text-gray-400"} />
                        <span className={`font-medium text-sm ${isActive ? "text-white" : "text-gray-900 dark:text-white"}`}>
                          {section.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Sidebar de navegación — visible solo en lg+ */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="bg-white dark:bg-veltrix-card rounded-xl shadow-lg p-6 sticky top-8 border border-transparent dark:border-veltrix-border/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Módulos
                </h2>

                <div className="space-y-2">
                  {adminSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                      <motion.button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                          isActive
                            ? `bg-gradient-to-r ${section.color} text-white shadow-lg`
                            : "bg-gray-50 dark:bg-veltrix-bg/30 hover:bg-gray-100 dark:hover:bg-veltrix-bg/50 text-gray-700 dark:text-gray-300 hover:shadow-md"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            size={20}
                            className={
                              isActive
                                ? "text-white"
                                : "text-gray-600 dark:text-gray-400"
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-medium truncate ${
                                isActive
                                  ? "text-white"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {section.label}
                            </div>
                            <div
                              className={`text-sm mt-1 line-clamp-2 ${
                                isActive
                                  ? "text-blue-100"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {section.description}
                            </div>
                          </div>
                          <ChevronRight
                            size={16}
                            className={`flex-shrink-0 transition-transform ${
                              isActive
                                ? "text-white rotate-90"
                                : "text-gray-400 group-hover:translate-x-1"
                            }`}
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="lg:col-span-9">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-veltrix-card rounded-xl shadow-lg min-h-[400px] sm:min-h-[600px] border border-transparent dark:border-veltrix-border/50"
              >
                {renderActiveSection()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </AdminToastProvider>
  );
};

export default AdminPanel;

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Database,
  Users,
  Shield,
  FileText,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import PolygonManagement from "./PolygonManagement";
import CatalogManagement from "./CatalogManagement";
import UserManagement from "./UserManagement";
import SSOConfiguration from "./SSOConfiguration";
import SystemSettings from "./SystemSettings";

type AdminSection =
  | "polygons"
  | "catalogs"
  | "users"
  | "sso"
  | "settings"
  | "reports";

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
    id: "sso",
    label: "Autenticación SSO",
    icon: Shield,
    description: "Configuración de login con Microsoft y Google",
    color: "from-orange-600 to-orange-700",
  },
  {
    id: "settings",
    label: "Configuración Sistema",
    icon: Settings,
    description: "Parámetros generales y configuraciones avanzadas",
    color: "from-gray-600 to-gray-700",
  },
  {
    id: "reports",
    label: "Reportes",
    icon: BarChart3,
    description: "Estadísticas y reportes del sistema",
    color: "from-indigo-600 to-indigo-700",
  },
];

const AdminPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>("polygons");

  const renderActiveSection = () => {
    switch (activeSection) {
      case "polygons":
        return <PolygonManagement />;
      case "catalogs":
        return <CatalogManagement />;
      case "users":
        return <UserManagement />;
      case "sso":
        return <SSOConfiguration />;
      case "settings":
        return <SystemSettings />;
      case "reports":
        return (
          <div className="p-8 text-center text-gray-500 dark:text-veltrix-muted">
            Reportes - Próximamente
          </div>
        );
      default:
        return <PolygonManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 via-green-50/20 to-yellow-50/30 dark:from-veltrix-bg dark:via-veltrix-bg dark:to-veltrix-bg transition-colors duration-300">
      <div className="max-w-[1900px] mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Panel de Administración
          </h1>
          <p className="text-gray-600 dark:text-veltrix-muted">
            Gestión completa del sistema de monitoreo Waze
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar de navegación */}
          <div className="col-span-3">
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
                        <div className="flex-1">
                          <div
                            className={`font-medium ${
                              isActive
                                ? "text-white"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {section.label}
                          </div>
                          <div
                            className={`text-sm mt-1 ${
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
                          className={`transition-transform ${
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
          <div className="col-span-9">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-veltrix-card rounded-xl shadow-lg min-h-[600px] border border-transparent dark:border-veltrix-border/50"
            >
              {renderActiveSection()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

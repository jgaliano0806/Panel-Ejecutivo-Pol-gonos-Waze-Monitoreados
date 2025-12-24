import React from 'react';
import { motion } from 'framer-motion';
import { Home, Map, AlertCircle, History, BarChart3, ShieldAlert, Car } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export type ViewType = 'home' | 'map' | 'events' | 'history' | 'stats' | 'risks' | 'accidents';

interface ModernNavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  criticalAlertsCount?: number;
}

export const ModernNavigation: React.FC<ModernNavigationProps> = ({
  currentView,
  onViewChange,
  criticalAlertsCount = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'home' as ViewType,
      label: 'Inicio',
      icon: Home,
      color: 'from-primary-600 to-primary-700',
      path: '/',
    },
    {
      id: 'map' as ViewType,
      label: 'Mapa y Zonas',
      icon: Map,
      color: 'from-primary-500 to-primary-600',
      path: '/mapa',
    },
    {
      id: 'risks' as ViewType,
      label: 'Análisis de Riesgos',
      icon: ShieldAlert,
      color: 'from-red-500 to-red-600',
      path: '/riesgos',
    },
    {
      id: 'events' as ViewType,
      label: 'Alertas y Eventos',
      icon: AlertCircle,
      color: 'from-warning-400 to-warning-500',
      badge: criticalAlertsCount > 0 ? criticalAlertsCount : undefined,
      path: '/alertas',
    },
    {
      id: 'accidents' as ViewType,
      label: 'Siniestros Viales',
      icon: Car,
      color: 'from-orange-600 to-red-600',
      path: '/siniestros',
    },
    {
      id: 'history' as ViewType,
      label: 'Historial',
      icon: History,
      color: 'from-blue-500 to-blue-600',
      path: '/historial',
    },
    {
      id: 'stats' as ViewType,
      label: 'Estadísticas',
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      path: '/estadisticas',
    },
  ];

  // Determinar la vista actual basada en la URL
  const getActiveView = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') return 'home';
    if (location.pathname === '/mapa') return 'map';
    if (location.pathname === '/riesgos') return 'risks';
    if (location.pathname === '/alertas') return 'events';
    if (location.pathname === '/siniestros') return 'accidents';
    if (location.pathname === '/historial') return 'history';
    if (location.pathname === '/estadisticas') return 'stats';
    return currentView;
  };

  const activeView = getActiveView();

  const handleTabClick = (tab: typeof tabs[0]) => {
    onViewChange(tab.id);
    navigate(tab.path);
  };

  return (
    <nav className="bg-gradient-to-r from-white via-gray-50 to-white border-b-4 border-yellow-400 shadow-xl sticky top-[96px] z-30 backdrop-blur-sm">
      <div className="max-w-[1900px] mx-auto px-8">
        <div className="flex space-x-3 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "relative py-4 px-8 font-bold text-sm flex items-center gap-3 transition-all duration-300 rounded-t-xl",
                  isActive
                    ? "text-primary-700 bg-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
                )}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Icon con gradiente en activo */}
                <motion.div
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-300 shadow-md",
                    isActive
                      ? `bg-gradient-to-br ${tab.color}`
                      : "bg-gradient-to-br from-gray-100 to-gray-200"
                  )}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-white" : "text-gray-600"
                  )} />
                </motion.div>

                {/* Label */}
                <span className={cn(
                  "text-base",
                  isActive && "font-black"
                )}>{tab.label}</span>

                {/* Badge de alertas */}
                {tab.badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Badge variant="critical" size="sm" className="shadow-lg shadow-red-500/30">
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {tab.badge}
                      </motion.span>
                    </Badge>
                  </motion.div>
                )}

                {/* Barra inferior animada */}
                {isActive && (
                  <motion.div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-1.5 rounded-t-full shadow-lg",
                      `bg-gradient-to-r ${tab.color}`
                    )}
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Glow effect en hover */}
                {isActive && (
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-t-xl",
                      `bg-gradient-to-br ${tab.color}`
                    )}
                    animate={{
                      opacity: [0.05, 0.15, 0.05],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                )}

                {/* Shine effect */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-t-xl overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ['-200%', '200%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                    />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

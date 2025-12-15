import React from 'react';
import { motion } from 'framer-motion';
import { Home, Map, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

type ViewType = 'home' | 'map' | 'events';

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
  const tabs = [
    {
      id: 'home' as ViewType,
      label: 'Inicio',
      icon: Home,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'map' as ViewType,
      label: 'Mapa y Zonas',
      icon: Map,
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'events' as ViewType,
      label: 'Alertas y Eventos',
      icon: AlertCircle,
      color: 'from-red-500 to-pink-500',
      badge: criticalAlertsCount > 0 ? criticalAlertsCount : undefined,
    },
  ];

  return (
    <nav className="bg-white border-b-2 border-gray-200 shadow-md sticky top-[88px] z-30">
      <div className="max-w-[1850px] mx-auto px-6">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={cn(
                  "relative py-4 px-6 font-bold text-sm flex items-center gap-3 transition-all duration-200",
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                )}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Icon con gradiente en activo */}
                <div className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isActive 
                    ? `bg-gradient-to-br ${tab.color} shadow-lg`
                    : "bg-gray-100"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-white" : "text-gray-600"
                  )} />
                </div>

                {/* Label */}
                <span>{tab.label}</span>

                {/* Badge de alertas */}
                {tab.badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Badge variant="critical" size="sm">
                      {tab.badge}
                    </Badge>
                  </motion.div>
                )}

                {/* Barra inferior animada */}
                {isActive && (
                  <motion.div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-1 rounded-t-full",
                      `bg-gradient-to-r ${tab.color}`
                    )}
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Glow effect en hover */}
                {isActive && (
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-lg opacity-20",
                      `bg-gradient-to-br ${tab.color}`
                    )}
                    animate={{
                      opacity: [0.1, 0.3, 0.1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

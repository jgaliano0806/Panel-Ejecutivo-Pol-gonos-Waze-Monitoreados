import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GlobalKPIs, AlertStats, Incident, TrafficAlert } from '../../types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Construction, MapPin } from 'lucide-react';
import { EventsListModal } from '../EventsListModal';

interface ModernExecutiveSummaryProps {
  kpis: GlobalKPIs;
  alertStats?: AlertStats;
  totalPolygons: number;
  criticalPolygons: number;
  incidents?: Incident[];
  alerts?: TrafficAlert[];
  onEventSelect?: (incident: Incident) => void;
}

export const ModernExecutiveSummary: React.FC<ModernExecutiveSummaryProps> = ({
  kpis,
  alertStats,
  totalPolygons,
  criticalPolygons,
  incidents = [],
  alerts = [],
  onEventSelect,
}) => {
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const handleEventClick = (event: Incident | TrafficAlert, type: 'incident' | 'alert') => {
    setShowEventsModal(false);
    if (type === 'incident' && onEventSelect) {
      onEventSelect(event as Incident);
    }
  };

  // Calcular totales reales
  const totalEvents = incidents.length + (alerts.length || 0);
  const criticalIncidents = incidents.filter(i => i.severity >= 4).length;
  const criticalAlerts = (alerts || []).filter(a => a.severity === 'critical').length;
  const totalCritical = criticalIncidents + criticalAlerts;

  const metrics = [
    {
      id: 'fluidity',
      label: 'Fluidez del Sistema',
      value: `${kpis.fluidityPercentage}%`,
      numericValue: kpis.fluidityPercentage,
      subtext: `${totalPolygons - criticalPolygons} de ${totalPolygons} polígonos`,
      icon: Target,
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      trend: kpis.trends?.fluidityChange || 0,
      isClickable: false,
    },
    {
      id: 'events',
      label: 'Eventos Activos',
      value: totalEvents,
      numericValue: totalEvents,
      subtext: totalCritical > 0 
        ? `${totalCritical} críticos activos`
        : `${incidents.length} incidentes • ${alerts.length || 0} alertas`,
      icon: AlertTriangle,
      gradient: totalCritical > 0 ? 'from-red-500 via-pink-500 to-rose-500' : 'from-green-500 via-emerald-500 to-teal-500',
      bgGradient: totalCritical > 0 ? 'from-red-50 to-pink-50' : 'from-green-50 to-emerald-50',
      trend: kpis.trends?.incidentsChange || 0,
      isClickable: true,
      pulse: totalCritical > 0,
    },
    {
      id: 'incidents',
      label: 'Incidentes de Waze',
      value: incidents.length,
      numericValue: incidents.length,
      subtext: `${criticalIncidents} críticos • ${incidents.filter(i => i.severity >= 3).length} altos`,
      icon: AlertTriangle,
      gradient: criticalIncidents > 0 ? 'from-orange-500 via-red-500 to-pink-500' : 'from-yellow-500 via-orange-500 to-amber-500',
      bgGradient: criticalIncidents > 0 ? 'from-orange-50 to-red-50' : 'from-yellow-50 to-orange-50',
      trend: 0,
      isClickable: true,
      pulse: criticalIncidents > 0,
    },
    {
      id: 'critical',
      label: 'Polígonos Críticos',
      value: criticalPolygons,
      numericValue: criticalPolygons,
      subtext: `${((criticalPolygons / totalPolygons) * 100).toFixed(0)}% del total`,
      icon: MapPin,
      gradient: 'from-purple-500 via-indigo-500 to-blue-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      trend: 0,
      isClickable: false,
    },
  ];

  // Container animation
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Card animation
  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-black text-white flex items-center gap-3">
                <span className="text-4xl">📊</span>
                Resumen Ejecutivo
              </h2>
              <p className="text-blue-100 text-sm mt-1 font-medium">
                Monitoreo en tiempo real
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-right"
            >
              <div className="text-xs text-blue-100 font-semibold">Actualizado</div>
              <div className="text-sm text-white font-bold">
                {new Date().toLocaleTimeString('es-AR')}
              </div>
            </motion.div>
          </div>
        </div>

        <CardContent className="p-6">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const hasEvents = incidents.length > 0 || alerts.length > 0;
              const isClickable = metric.isClickable && hasEvents;

              return (
                <motion.div
                  key={metric.id}
                  variants={item}
                  whileHover={isClickable ? { scale: 1.05, y: -5 } : {}}
                  onHoverStart={() => setHoveredCard(index)}
                  onHoverEnd={() => setHoveredCard(null)}
                  onClick={() => isClickable && setShowEventsModal(true)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300",
                    `bg-gradient-to-br ${metric.bgGradient}`,
                    "border-2 border-transparent",
                    hoveredCard === index && "border-primary-400 shadow-2xl",
                    !isClickable && "cursor-default"
                  )}
                >
                  {/* Efecto de brillo en hover */}
                  <AnimatePresence>
                    {hoveredCard === index && isClickable && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.6 }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icono con gradiente */}
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      className={cn(
                        "p-3 rounded-xl bg-gradient-to-br shadow-lg",
                        `${metric.gradient}`
                      )}
                      animate={{
                        rotate: hoveredCard === index ? 360 : 0,
                      }}
                      transition={{ duration: 0.6 }}
                    >
                      <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </motion.div>

                    {metric.pulse && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Badge variant="critical" size="sm">
                          CRÍTICO
                        </Badge>
                      </motion.div>
                    )}
                  </div>

                  {/* Valor principal */}
                  <div className="mb-2">
                    <motion.div
                      className="text-5xl font-black text-gray-900"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 20,
                        delay: index * 0.1 
                      }}
                    >
                      {metric.value}
                    </motion.div>
                  </div>

                  {/* Label */}
                  <div className="text-sm font-bold text-gray-700 mb-1">
                    {metric.label}
                  </div>

                  {/* Subtext */}
                  <div className="text-xs text-gray-600 font-medium mb-3">
                    {metric.subtext}
                  </div>

                  {/* Tendencia */}
                  {metric.trend !== 0 && (
                    <motion.div
                      className={cn(
                        "flex items-center gap-1 text-xs font-bold",
                        metric.trend > 0 ? "text-green-600" : "text-red-600"
                      )}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      {metric.trend > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {Math.abs(metric.trend)}%
                    </motion.div>
                  )}

                  {/* Indicador de clickeable */}
                  {isClickable && (
                    <AnimatePresence>
                      {hoveredCard === index && (
                        <motion.div
                          className="absolute bottom-3 left-0 right-0 text-center"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                        >
                          <span className="text-xs font-black text-primary-600">
                            👆 Click para detalles
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Indicadores adicionales */}
          <motion.div
            className="mt-8 pt-6 border-t-2 border-dashed border-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="text-xs text-gray-600 font-semibold mb-2">Tendencia Fluidez</div>
                <div className={cn(
                  "text-2xl font-black flex items-center justify-center gap-2",
                  kpis.trends?.fluidityChange && kpis.trends.fluidityChange > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}>
                  {kpis.trends?.fluidityChange && kpis.trends.fluidityChange > 0 ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <TrendingDown className="w-6 h-6" />
                  )}
                  {Math.abs(kpis.trends?.fluidityChange || 0)}%
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                <div className="text-xs text-gray-600 font-semibold mb-2">Tendencia Incidentes</div>
                <div className={cn(
                  "text-2xl font-black flex items-center justify-center gap-2",
                  kpis.trends?.incidentsChange && kpis.trends.incidentsChange < 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}>
                  {kpis.trends?.incidentsChange && kpis.trends.incidentsChange > 0 ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <TrendingDown className="w-6 h-6" />
                  )}
                  {Math.abs(kpis.trends?.incidentsChange || 0)}%
                </div>
              </div>
              
              <div className={cn(
                "rounded-xl p-4 border-2",
                kpis.fluidityPercentage >= 70 
                  ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                  : kpis.fluidityPercentage >= 50
                  ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300"
                  : "bg-gradient-to-br from-red-50 to-pink-50 border-red-300"
              )}>
                <div className="text-xs text-gray-600 font-semibold mb-2">Estado General</div>
                <div className="text-2xl font-black">
                  {kpis.fluidityPercentage >= 70 ? '✅ Óptimo' :
                   kpis.fluidityPercentage >= 50 ? '⚠️ Moderado' : '🚨 Crítico'}
                </div>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      {/* Modal de Eventos */}
      {showEventsModal && (
        <EventsListModal
          incidents={incidents}
          alerts={alerts}
          onClose={() => setShowEventsModal(false)}
          onEventClick={handleEventClick}
        />
      )}
    </>
  );
};

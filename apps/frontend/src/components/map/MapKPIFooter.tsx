import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { GlobalKPIs, Incident, TrafficAlert, Polygon } from "../../types";
import { useAllTvtMetrics } from "../../hooks/useWazeData";

import { Target, AlertTriangle, Car, Users } from "lucide-react";
import { cn } from "../../lib/utils";

interface MapKPIFooterProps {
  kpis: GlobalKPIs;
  totalPolygons: number;
  criticalPolygons: number;
  incidents?: Incident[];
  alerts?: TrafficAlert[];
  polygons?: Polygon[];
}

export const MapKPIFooter: React.FC<MapKPIFooterProps> = ({
  kpis,
  incidents = [],
  alerts = [],
}) => {
  const navigate = useNavigate();

  const { data: tvtData } = useAllTvtMetrics();
  const totalWazers = useMemo(
    () =>
      Math.round(
        tvtData?.reduce((sum, m) => sum + (Number(m.wazersCount) || 0), 0) || 0,
      ),
    [tvtData],
  );

  const totalEvents = useMemo(
    () => incidents.length + alerts.length,
    [incidents.length, alerts.length],
  );

  const criticalIncidents = useMemo(
    () => incidents.filter((i) => i.severity >= 4).length,
    [incidents],
  );
  const criticalAlerts = useMemo(
    () => alerts.filter((a) => a.severity === "critical").length,
    [alerts],
  );
  const totalCritical = useMemo(
    () => criticalIncidents + criticalAlerts,
    [criticalIncidents, criticalAlerts],
  );

  // Accidentes Waze en vivo (type === "accident") — no confundir con
  // kpis.roadAccidents que son siniestros RAC registrados manualmente.
  const wazeAccidents = useMemo(
    () => incidents.filter((i) => i.type === "accident"),
    [incidents],
  );
  const wazeAccidentsCritical = useMemo(
    () => wazeAccidents.filter((i) => i.severity >= 4).length,
    [wazeAccidents],
  );

  const metrics: Array<{
    id: string;
    label: string;
    value: string | number;
    icon: typeof Target;
    status: string;
    active: boolean;
    path?: string;
  }> = [
    {
      id: "fluidity",
      label: "FLUIDEZ",
      value: `${kpis.fluidityPercentage}%`,
      icon: Target,
      status: "primary",
      active: false,
    },
    {
      id: "events",
      label: "EVENTOS",
      value: totalEvents,
      icon: AlertTriangle,
      status: totalCritical > 0 ? "critical" : "primary",
      active: totalCritical > 0,
    },
    {
      id: "incidents",
      label: "ACCIDENTES",
      value: wazeAccidents.length,
      icon: Car,
      status: wazeAccidentsCritical > 0 ? "warning" : "primary",
      active: wazeAccidentsCritical > 0,
      path: "/siniestros",
    },
    {
      id: "tvt",
      label: "WAZERS",
      value: totalWazers,
      icon: Users,
      status: "primary",
      active: false,
    },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-auto max-w-[90%] px-4 pointer-events-none">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 p-3 pointer-events-auto flex items-center justify-center gap-6 md:gap-10 overflow-x-auto select-none"
        role="group"
        aria-label="Indicadores del mapa"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          // Mapa de colores compacto
          const colors = {
            primary:
              "text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/20",
            critical:
              "text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20",
            warning:
              "text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/20",
          };
          const colorClass =
            colors[metric.status as keyof typeof colors] || colors.primary;

          const content = (
            <>
              <div className={cn("p-2 rounded-xl", colorClass)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                  {metric.label}
                </span>
                <span className="text-xl font-black font-mono tabular-nums leading-none text-gray-800 dark:text-gray-100">
                  {metric.value}
                </span>
              </div>
            </>
          );

          if (!metric.path) {
            return (
              <div
                key={metric.id}
                className="flex items-center gap-3 min-w-max px-2 py-1 cursor-default pointer-events-auto"
                aria-label={`${metric.label}: ${metric.value}`}
              >
                {content}
              </div>
            );
          }

          return (
            <button
              key={metric.id}
              type="button"
              className="flex items-center gap-3 min-w-max cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded-lg transition-colors border-none bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50 touch-manipulation pointer-events-auto"
              onClick={() => navigate(metric.path!)}
              title={`Ver detalle de ${metric.label}`}
              aria-label={`Ver detalle de ${metric.label}: ${metric.value}`}
            >
              {content}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};

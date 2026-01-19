import React, { useState, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type {
  GlobalKPIs,
  AlertStats,
  Incident,
  TrafficAlert,
  Polygon,
  TrafficJam,
} from "../../types";
import { IncidentType } from "../../types";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  MapPin,
  Car,
  ArrowRight,
} from "lucide-react";
import { EventsListModal } from "../EventsListModal";
import { NETWORK_CONFIG } from "../../config/constants";

const RAC_GROUPS = NETWORK_CONFIG.racGroups;

interface ModernExecutiveSummaryProps {
  kpis: GlobalKPIs;
  alertStats?: AlertStats;
  totalPolygons: number;
  criticalPolygons: number;
  incidents?: Incident[];
  alerts?: TrafficAlert[];
  polygons?: Polygon[];
  jams?: TrafficJam[];
  onEventSelect?: (incident: Incident) => void;
}

export const ModernExecutiveSummary = memo<ModernExecutiveSummaryProps>(
  ({
    kpis,
    alertStats: _alertStats,
    totalPolygons,
    criticalPolygons,
    incidents = [],
    alerts = [],
    polygons = [],
    jams = [],
    onEventSelect,
  }) => {
    const navigate = useNavigate();
    const [showEventsModal, setShowEventsModal] = useState(false);
    const [modalFilter, setModalFilter] = useState<"all" | "rac-accidents">(
      "all"
    );
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const handleEventClick = useCallback(
      (event: Incident | TrafficAlert, type: "incident" | "alert") => {
        setShowEventsModal(false);
        if (type === "incident" && onEventSelect) {
          onEventSelect(event as Incident);
        }
      },
      [onEventSelect]
    );

    const totalEvents = useMemo(
      () => incidents.length + alerts.length,
      [incidents.length, alerts.length]
    );
    const criticalIncidents = useMemo(
      () => incidents.filter((i) => i.severity >= 4).length,
      [incidents]
    );
    const criticalAlerts = useMemo(
      () => alerts.filter((a) => a.severity === "critical").length,
      [alerts]
    );
    const totalCritical = useMemo(
      () => criticalIncidents + criticalAlerts,
      [criticalIncidents, criticalAlerts]
    );

    const racAccidents = useMemo(() => {
      const racPolygonIds = polygons
        .filter((p) => RAC_GROUPS.includes(p.group))
        .map((p) => p.id);
      return incidents.filter(
        (i) =>
          i.type === IncidentType.ACCIDENT &&
          i.polygonId &&
          racPolygonIds.includes(i.polygonId)
      );
    }, [incidents, polygons]);

    const metrics = [
      {
        id: "fluidity",
        label: "FLUIDEZ DEL SISTEMA",
        value: `${kpis.fluidityPercentage}%`,
        subtext: `${
          totalPolygons - criticalPolygons
        }/${totalPolygons} polígonos fluidos`,
        icon: Target,
        color: "#556ee6", // Veltrix Primary Blue
        trend: kpis.trends?.fluidityChange || 0,
        isClickable: false,
      },
      {
        id: "events",
        label: "EVENTOS ACTIVOS",
        value: totalEvents,
        subtext:
          totalCritical > 0
            ? `${totalCritical} críticos activos`
            : "Sistema nominal",
        icon: AlertTriangle,
        color: totalCritical > 0 ? "#f46a6a" : "#556ee6", // Red if critical, else Blue
        trend: kpis.trends?.incidentsChange || 0,
        isClickable: true,
        pulse: totalCritical > 0,
      },
      {
        id: "incidents",
        label: "ACCIDENTES RAC",
        value: kpis.roadAccidents || 0,
        subtext: `${kpis.roadAccidentsCritical || 0} críticos`,
        icon: Car,
        color: (kpis.roadAccidentsCritical || 0) > 0 ? "#f1b44c" : "#556ee6", // Yellow/Blue
        trend: 0,
        isClickable: true,
        pulse: (kpis.roadAccidentsCritical || 0) > 0,
      },
      {
        id: "critical",
        label: "RIESGOS CRÍTICOS",
        value: criticalPolygons,
        subtext: "Tramos con scoring alto",
        icon: MapPin,
        color: "#556ee6",
        trend: 0,
        isClickable: true,
      },
    ];

    const container = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const item = {
      hidden: { opacity: 0, y: 20 },
      show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100 },
      },
    };

    return (
      <>
        {/* Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const hasEvents = incidents.length > 0 || alerts.length > 0;
            const isClickable =
              metric.id === "critical"
                ? metric.isClickable
                : metric.isClickable && hasEvents;

            return (
              <motion.div
                key={metric.id}
                variants={item}
                whileHover={
                  isClickable
                    ? {
                        y: -5,
                        boxShadow:
                          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      }
                    : {}
                }
                onHoverStart={() => setHoveredCard(index)}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={() => {
                  if (metric.id === "critical" && isClickable)
                    navigate("/riesgos");
                  else if (metric.id === "incidents" && isClickable)
                    navigate("/siniestros");
                  else if (isClickable) {
                    setModalFilter("all");
                    setShowEventsModal(true);
                  }
                }}
                className={cn(
                  "relative rounded-xl p-5 text-white shadow-lg overflow-hidden transition-all duration-300",
                  isClickable ? "cursor-pointer" : "cursor-default"
                )}
                style={{ backgroundColor: metric.color }}
              >
                {/* Background Glow Effect */}
                {isClickable && hoveredCard === index && (
                  <motion.div
                    className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-0.5">
                        {metric.label}
                      </div>
                      <div className="text-2xl font-bold font-mono tracking-tight">
                        {metric.value}
                      </div>
                    </div>
                  </div>

                  {/* Trend Badge */}
                  {metric.trend !== 0 && (
                    <Badge
                      className={cn(
                        "ml-auto px-2 py-0.5 text-xs font-bold border-0",
                        metric.trend > 0
                          ? "bg-green-400/30 text-white"
                          : "bg-red-400/30 text-white"
                      )}
                    >
                      {metric.trend > 0 ? "+" : ""}
                      {metric.trend}%
                    </Badge>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-end pt-3 border-t border-white/10 mt-2">
                  <div className="text-xs font-medium opacity-75 truncate max-w-[85%] pr-2">
                    {metric.subtext}
                  </div>
                  {isClickable && (
                    <ArrowRight className="h-4 w-4 text-white/80" />
                  )}
                </div>

                {/* Pulse effect for critical */}
                {metric.pulse && (
                  <motion.div
                    className="absolute top-0 right-0 w-3 h-3 bg-white rounded-full translate-x-1/2 -translate-y-1/2"
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Modal de Eventos */}
        {showEventsModal && (
          <EventsListModal
            incidents={
              modalFilter === "rac-accidents" ? racAccidents : incidents
            }
            alerts={modalFilter === "rac-accidents" ? [] : alerts}
            polygons={polygons}
            jams={jams}
            onClose={() => setShowEventsModal(false)}
            onEventClick={handleEventClick}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.kpis.fluidityPercentage === nextProps.kpis.fluidityPercentage &&
      prevProps.kpis.activeIncidents === nextProps.kpis.activeIncidents &&
      prevProps.totalPolygons === nextProps.totalPolygons &&
      prevProps.criticalPolygons === nextProps.criticalPolygons &&
      prevProps.incidents?.length === nextProps.incidents?.length &&
      prevProps.alerts?.length === nextProps.alerts?.length
    );
  }
);

ModernExecutiveSummary.displayName = "ModernExecutiveSummary";

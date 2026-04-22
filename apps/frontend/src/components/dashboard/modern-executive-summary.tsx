import React, { useState, useMemo, useCallback, memo } from "react";
import { motion } from "framer-motion";
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
import { AlertTriangle, Target, MapPin, Car } from "lucide-react";
import { EventsListModal } from "../alerts/EventsListModal";
import { StatCard } from "../common/StatCard";

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
    totalPolygons: _totalPolygons,
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
      "all",
    );
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const handleEventClick = useCallback(
      (event: Incident | TrafficAlert, type: "incident" | "alert") => {
        setShowEventsModal(false);
        if (type === "incident" && onEventSelect) {
          onEventSelect(event as Incident);
        }
      },
      [onEventSelect],
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

    const racAccidents = useMemo(() => {
      // Consideramos a todos los accidentes con polígono como parte de la RAC
      // ya que la configuración viene del backend con los polígonos activos
      const racPolygonIds = polygons.map((p) => p.id);
      return incidents.filter(
        (i) =>
          i.type === IncidentType.ACCIDENT &&
          i.polygonId &&
          racPolygonIds.includes(i.polygonId),
      );
    }, [incidents, polygons]);

    const metrics = [
      {
        id: "fluidity",
        label: "FLUIDEZ DEL SISTEMA",
        value: `${kpis.fluidityPercentage}%`,
        subtext: "Tramos libres de congestión",
        icon: Target,
        status: "primary",
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
        status: totalCritical > 0 ? "critical" : "primary",
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
        status: (kpis.roadAccidentsCritical || 0) > 0 ? "warning" : "primary",
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
        status: "primary",
        trend: 0,
        isClickable: true,
      },
    ];

    const container = {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const _item = {
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
            const _Icon = metric.icon;
            const hasEvents = incidents.length > 0 || alerts.length > 0;
            const isClickable =
              metric.id === "critical"
                ? metric.isClickable
                : metric.isClickable && hasEvents;

            return (
              <div
                key={metric.id}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <StatCard
                  label={metric.label}
                  value={metric.value}
                  subtext={metric.subtext}
                  icon={metric.icon}
                  trend={metric.trend}
                  status={metric.status as any}
                  interactive={isClickable}
                  active={hoveredCard === index}
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
                  // className="text-white" // ELIMINADO: Deja que StatCard maneje el color de texto según el status (bg-primary -> text-primary-foreground)
                />
              </div>
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
  },
);

ModernExecutiveSummary.displayName = "ModernExecutiveSummary";

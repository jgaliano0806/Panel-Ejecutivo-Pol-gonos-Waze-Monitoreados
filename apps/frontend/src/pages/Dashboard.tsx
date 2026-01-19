import React, {
  useState,
  useMemo,
  lazy,
  Suspense,
  useCallback,
  useEffect,
} from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useWazeData } from "../hooks/useWazeData";
import type { GlobalKPIs } from "../types";
import { PolygonState, IncidentType, Severity } from "../types";
import { ModernHeader } from "../components/layout/modern-header";
import {
  ModernNavigation,
  type ViewType,
} from "../components/layout/modern-navigation";
import { AppSidebar } from "../components/layout/AppSidebar";
import Filters from "../components/Filters";
import Footer from "../components/Footer";
import PolygonDetail from "../components/PolygonDetail";
import { BlockingIncidents } from "../components/BlockingIncidents";
import { AlertsBadge } from "../components/AlertsBadge";
import { WazeOMeter } from "../components/WazeOMeter";
import { useHistoricalData, useTrends } from "../hooks/useWazeData";
import { Map } from "../components/Map";

// Lazy loading (otros componentes)
// const Map = lazy(() => import("../components/Map")); // REMOVIDO - causaba conflictos con Suspense
const TrendsChart = lazy(() =>
  import("../components/TrendsChart").then((m) => ({ default: m.TrendsChart }))
);
const GroupTrafficComparison = lazy(() =>
  import("../components/GroupTrafficComparison").then((m) => ({
    default: m.GroupTrafficComparison,
  }))
);
const AdminPanel = lazy(() => import("../components/AdminPanel"));
const PolygonManagement = lazy(() => import("../components/PolygonManagement"));
const ModernExecutiveSummary = lazy(() =>
  import("../components/dashboard/modern-executive-summary").then((m) => ({
    default: m.ModernExecutiveSummary,
  }))
);
const TopCriticalDashboard = lazy(() =>
  import("../components/TopCriticalDashboard").then((m) => ({
    default: m.TopCriticalDashboard,
  }))
);
const WeatherAlertsPanel = lazy(() =>
  import("../components/weather/WeatherAlertsPanel").then((m) => ({
    default: m.WeatherAlertsPanel,
  }))
);

// Fallback de carga con soporte Dark Mode estilo Veltrix
const LoadingFallback = ({ message = "Cargando..." }: { message?: string }) => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
    <span className="text-gray-600 dark:text-veltrix-muted">{message}</span>
  </div>
);

const LazyWrapper = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <Suspense fallback={fallback || <LoadingFallback />}>{children}</Suspense>
);

const Dashboard: React.FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const {
    polygons,
    incidents,
    jams,
    alerts,
    alertStats,
    isLoading,
    isError,
    lastUpdate,
    globalKPIs: backendKPIs,
  } = useWazeData();
  const historicalData = useHistoricalData(24);
  useTrends();
  const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("home");
  const [singlePolygonMode, setSinglePolygonMode] = useState(false);

  useEffect(() => {
    React.startTransition(() => {
      if (location.pathname === "/" || location.pathname === "/dashboard") {
        setCurrentView("home");
      } else if (location.pathname === "/mapa") {
        setCurrentView("map");
      } else if (location.pathname === "/alertas") {
        setCurrentView("events");
      } else if (location.pathname === "/admin") {
        setCurrentView("admin");
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    const state = location.state as {
      selectedPolygonId?: string;
      filterType?: string;
    } | null;
    if (state?.selectedPolygonId) {
      React.startTransition(() => {
        setSelectedPolygon(state.selectedPolygonId ?? null);
        setSelectedGroup(null);
        setSinglePolygonMode(true);
        setCurrentView("map");
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const globalKPIs: GlobalKPIs = useMemo(() => {
    if (backendKPIs) return backendKPIs;
    const totalPolygons = polygons.length;
    let fluidPolygons = 0;
    let criticalPolygons = 0;
    for (const p of polygons) {
      if (p.state === PolygonState.LOW) fluidPolygons++;
      if (p.state === PolygonState.HIGH) criticalPolygons++;
    }
    let constructions = 0;
    for (const inc of incidents) {
      if (
        inc.type === IncidentType.CONSTRUCTION &&
        inc.severity >= Severity.HIGH
      ) {
        constructions++;
      }
    }
    return {
      fluidityPercentage:
        totalPolygons > 0
          ? Math.round((fluidPolygons / totalPolygons) * 100)
          : 0,
      activeIncidents: incidents.length,
      criticalPolygons,
      activeConstructions: constructions,
      trends: { fluidityChange: 0, incidentsChange: 0 },
    };
  }, [polygons, incidents, backendKPIs]);

  const handlePolygonChange = useCallback(
    (id: string | null) => {
      React.startTransition(() => {
        setSelectedPolygon(id);
        if (singlePolygonMode) {
          setSinglePolygonMode(false);
        }
      });
    },
    [singlePolygonMode]
  );

  const handleGroupChange = useCallback((group: string | null) => {
    React.startTransition(() => {
      setSelectedGroup(group);
    });
  }, []);

  const handleCloseDetail = useCallback(() => {
    React.startTransition(() => {
      setSelectedPolygon(null);
      setSinglePolygonMode(false);
    });
  }, []);

  const handleEventSelect = useCallback((incident: any) => {
    if (incident.polygonId) {
      React.startTransition(() => {
        setSelectedPolygon(incident.polygonId);
        setCurrentView("map");
      });
    }
  }, []);

  const handleRefreshAll = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const filteredPolygons = useMemo(() => {
    if (singlePolygonMode && selectedPolygon) {
      return polygons.filter((p) => p.id === selectedPolygon);
    }
    if (!selectedGroup) return polygons;
    return polygons.filter((p) => p.group === selectedGroup);
  }, [polygons, selectedGroup, singlePolygonMode, selectedPolygon]);

  const filteredIncidents = useMemo(() => {
    if (singlePolygonMode && selectedPolygon) {
      return incidents.filter((i) => i.polygonId === selectedPolygon);
    }
    return incidents;
  }, [incidents, singlePolygonMode, selectedPolygon]);

  const filteredJams = useMemo(() => {
    if (singlePolygonMode && selectedPolygon) {
      return jams.filter((j) => j.polygonId === selectedPolygon);
    }
    return jams;
  }, [jams, singlePolygonMode, selectedPolygon]);

  const selectedPolygonData = useMemo(() => {
    if (!selectedPolygon) return null;
    return polygons.find((p) => p.id === selectedPolygon) || null;
  }, [selectedPolygon, polygons]);

  const allGroups = useMemo(() => {
    const groups = new Set(polygons.map((p) => p.group));
    return Array.from(groups);
  }, [polygons]);

  const criticalPolygonsCount = useMemo(() => {
    return polygons.filter(
      (p) => p.trafficMetrics && p.trafficMetrics.congestionIndex >= 60
    ).length;
  }, [polygons]);

  const renderContent = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="space-y-4">
            <LazyWrapper>
              <ModernExecutiveSummary
                kpis={globalKPIs}
                alertStats={alertStats}
                totalPolygons={polygons.length}
                criticalPolygons={criticalPolygonsCount}
                incidents={incidents}
                alerts={alerts}
                polygons={polygons}
                jams={jams}
                onEventSelect={handleEventSelect}
              />
            </LazyWrapper>

            {historicalData.data && historicalData.data.length > 0 && (
              <Suspense
                fallback={<LoadingFallback message="Cargando gráficos..." />}
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-veltrix-text mb-3">
                    📈 Evolución (últimas 24 horas)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TrendsChart
                      snapshots={historicalData.data}
                      metric="avgSpeed"
                      title="Velocidad Promedio"
                      unit="km/h"
                    />
                    <TrendsChart
                      snapshots={historicalData.data}
                      metric="totalJams"
                      title="Puntos de Congestión"
                    />
                  </div>
                </div>
              </Suspense>
            )}

            <Suspense
              fallback={<LoadingFallback message="Cargando comparativa..." />}
            >
              <GroupTrafficComparison polygons={polygons} groups={allGroups} />
            </Suspense>
          </div>
        );

      case "map":
        return (
          <div className="space-y-4">
            {singlePolygonMode && selectedPolygonData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary-50 dark:bg-veltrix-card border-2 border-primary-300 dark:border-veltrix-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-veltrix-bg rounded-lg">
                    <svg
                      className="w-5 h-5 text-primary-600 dark:text-primary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-primary-900 dark:text-veltrix-text">
                      Visualizando: {selectedPolygonData.name}
                    </p>
                    <p className="text-sm text-primary-700 dark:text-veltrix-muted">
                      {selectedPolygonData.group} • {filteredIncidents.length}{" "}
                      incidentes • {filteredJams.length} atascos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSinglePolygonMode(false);
                    setSelectedPolygon(null);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-all flex items-center gap-2"
                >
                  Volver
                </button>
              </motion.div>
            )}

            {!singlePolygonMode && (
              <Filters
                polygons={polygons}
                selectedPolygon={selectedPolygon}
                selectedGroup={selectedGroup}
                onPolygonChange={handlePolygonChange}
                onGroupChange={handleGroupChange}
              />
            )}

            <div
              className={`grid gap-4 ${
                selectedPolygonData
                  ? "grid-cols-1 lg:grid-cols-10"
                  : "grid-cols-1"
              }`}
            >
              <div
                className={selectedPolygonData ? "lg:col-span-7" : "col-span-1"}
              >
                <Map
                  polygons={filteredPolygons}
                  incidents={incidents}
                  jams={jams}
                  selectedPolygon={selectedPolygon}
                  selectedGroup={selectedGroup}
                  onPolygonClick={handlePolygonChange}
                />
              </div>

              {selectedPolygonData && (
                <div className="lg:col-span-3">
                  <div className="bg-white dark:bg-veltrix-card rounded-xl shadow-lg h-[600px] overflow-hidden flex flex-col border border-transparent dark:border-veltrix-border">
                    <PolygonDetail
                      polygon={selectedPolygonData}
                      incidents={filteredIncidents}
                      jams={filteredJams}
                      onClose={handleCloseDetail}
                    />
                  </div>
                </div>
              )}
            </div>

            <GroupTrafficComparison polygons={polygons} groups={allGroups} />
          </div>
        );

      case "events":
        return (
          <div className="space-y-4">
            <BlockingIncidents />
          </div>
        );

      case "admin":
        return (
          <LazyWrapper
            fallback={
              <LoadingFallback message="Cargando panel de administración..." />
            }
          >
            <AdminPanel />
          </LazyWrapper>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-veltrix-bg flex items-center justify-center transition-colors duration-500">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-veltrix-muted font-medium">
            Cargando información de tráfico...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-veltrix-bg flex items-center justify-center transition-colors duration-500">
        <div className="text-center">
          <div className="w-16 h-16 text-red-500 mx-auto mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-veltrix-text mb-2">
            Error al cargar información
          </h2>
          <p className="text-gray-600 dark:text-veltrix-muted">
            No se pudieron obtener los datos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar de Navegación Global */}
      <AppSidebar />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 via-green-50/20 to-yellow-50/30 dark:from-veltrix-bg dark:via-[#1e2330] dark:to-veltrix-bg transition-colors duration-500">
          {/* Background Pattern */}
          <div className="fixed inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <ModernHeader lastUpdate={lastUpdate} onRefresh={handleRefreshAll} />

          <main className="relative w-full px-6 py-6">
            {alertStats &&
              alertStats.bySeverity.critical > 0 &&
              currentView !== "events" && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <AlertsBadge
                    stats={alertStats}
                    onClick={() => setCurrentView("events")}
                  />
                </motion.div>
              )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {renderContent()}
            </motion.div>
          </main>

          <Footer />
          <LazyWrapper>
            <WeatherAlertsPanel />
          </LazyWrapper>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, {
  useState,
  useMemo,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useWazeData } from "../hooks/useWazeData";
import { useGlobalRealtime } from "../hooks/useWazeRealtime";
import type { GlobalKPIs } from "../types";
import { PolygonState, IncidentType, Severity } from "../types";
import { ModernHeader } from "../components/layout/modern-header";
import { type ViewType } from "../components/layout/modern-navigation";
import { AppSidebar } from "../components/layout/AppSidebar";
import { useSidebarStore } from "../stores/useSidebarStore";
import Filters from "../components/common/Filters";
import Footer from "../components/layout/Footer";
import PolygonDetail from "../components/dashboard/PolygonDetail";
import { AlertsBadge } from "../components/alerts/AlertsBadge";
import { WazeOMeter } from "../components/dashboard/WazeOMeter";
import { MapKPIFooter } from "../components/map/MapKPIFooter";
import { MapSidebar } from "../components/map/MapSidebar";
import { useHistoricalData, useTrends } from "../hooks/useWazeData";
import { initializeAudio } from "../lib/tts-service";
import { Map } from "../components/map/Map";
// GlobalNotifications ahora está dentro del componente Map

// Lazy loading (otros componentes)
// const Map = lazy(() => import("../components/Map")); // REMOVIDO - causaba conflictos con Suspense
const TrendsChart = lazy(() =>
  import("../components/dashboard/TrendsChart").then((m) => ({
    default: m.TrendsChart,
  })),
);
const GroupTrafficComparison = lazy(() =>
  import("../components/dashboard/GroupTrafficComparison").then((m) => ({
    default: m.GroupTrafficComparison,
  })),
);
const AdminPanel = lazy(() => import("../components/admin/AdminPanel"));
const PolygonManagement = lazy(
  () => import("../components/admin/PolygonManagement"),
);
const ModernExecutiveSummary = lazy(() =>
  import("../components/dashboard/modern-executive-summary").then((m) => ({
    default: m.ModernExecutiveSummary,
  })),
);
const TopCriticalDashboard = lazy(() =>
  import("../components/dashboard/TopCriticalDashboard").then((m) => ({
    default: m.TopCriticalDashboard,
  })),
);
const WeatherAlertsPanel = lazy(() =>
  import("../components/weather/WeatherAlertsPanel").then((m) => ({
    default: m.WeatherAlertsPanel,
  })),
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setExpanded: setSidebarExpandedStore } = useSidebarStore();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const hasCollapsedForMap = useRef(false);
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
  // Invalidar caches de React Query cuando el backend emite waze:data_updated
  // Dashboard NO está envuelto en AppLayout, así que necesita su propio listener
  useGlobalRealtime();
  // useRealtimeNotifications ya se ejecuta en AppLayout - no duplicar aquí
  const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Inicializar vista basada en la ruta actual para evitar renderizados innecesarios de 'home'
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const path = window.location.pathname;
    if (path === "/mapa") return "map";
    if (path === "/admin") return "admin";
    return "home";
  });

  const [singlePolygonMode, setSinglePolygonMode] = useState(false);
  const [focusIncidentId, setFocusIncidentId] = useState<string | null>(null);
  const [focusIncidentData, setFocusIncidentData] = useState<any | null>(null);
  const [showWazeIncidents, setShowWazeIncidents] = useState(true);

  const handleLayerToggle = useCallback((layer: string, enabled: boolean) => {
    if (layer === "waze") {
      setShowWazeIncidents(enabled);
    }
  }, []);

  // Sincronizar vista con cambios de ruta (ej: botones de atrás/adelante del navegador)
  useEffect(() => {
    const path = location.pathname;
    let newView: ViewType = "home";
    if (path === "/mapa") newView = "map";
    else if (path === "/admin") newView = "admin";

    if (newView !== currentView) {
      React.startTransition(() => {
        setCurrentView(newView);
      });
    }

    // Colapsar sidebar al entrar a la vista de mapa (solo una vez por sesión de navegación)
    if (path === "/mapa" && !hasCollapsedForMap.current) {
      setIsSidebarExpanded(false);
      hasCollapsedForMap.current = true;
    } else if (path !== "/mapa") {
      // Resetear el flag cuando salimos del mapa
      hasCollapsedForMap.current = false;
    }
  }, [location.pathname, currentView]);

  useEffect(() => {
    const state = location.state as {
      selectedPolygonId?: string;
      focusEventId?: string;
      forcedIncident?: any;
      filterType?: string;
      showJams?: boolean;
      highlightTraffic?: boolean;
    } | null;

    if (state) {
      console.log("🔍 Dashboard received state:", state);
      React.startTransition(() => {
        if (state.selectedPolygonId) {
          console.log("✅ Setting selectedPolygon:", state.selectedPolygonId);
          setSelectedPolygon(state.selectedPolygonId ?? null);
          setSelectedGroup(null);
          setSinglePolygonMode(true);
        }
        if (state.focusEventId) {
          console.log("✅ Setting focusEventId:", state.focusEventId);
          setFocusIncidentId(state.focusEventId);
        }
        if (state.forcedIncident) {
          console.log("✅ Setting forcedIncident data");
          setFocusIncidentData(state.forcedIncident);
        }
        // Log para mostrar jams/tráfico
        if (state.showJams || state.highlightTraffic) {
          console.log(
            "🚗 Mostrando tráfico/jams del polígono:",
            state.selectedPolygonId,
          );
        }
        // Asegurar que vamos al mapa si hay intención de enfocar
        if (state.selectedPolygonId || state.focusEventId) {
          setCurrentView("map");
        }
      });
      // Limpiar el state para evitar re-ejecución pero mantener la navegación
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Manejar parámetros de URL para "Ver en el mapa" desde el módulo de incidentes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const zoom = searchParams.get("zoom");
    const highlight = searchParams.get("highlight");

    if (lat && lng) {
      console.log("🗺️ Navegando a coordenadas desde URL:", {
        lat,
        lng,
        zoom,
        highlight,
      });

      React.startTransition(() => {
        // Cambiar a vista de mapa
        setCurrentView("map");

        // Si hay un ID de incidente para resaltar
        if (highlight) {
          setFocusIncidentId(highlight);

          // Crear datos de incidente temporal para forzar el enfoque
          setFocusIncidentData({
            uuid: highlight,
            location: {
              x: parseFloat(lng),
              y: parseFloat(lat),
            },
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
          });
        }
      });

      // Limpiar los parámetros de URL después de procesarlos
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.search, location.pathname]);

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
    [singlePolygonMode],
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
      (p) => p.trafficMetrics && p.trafficMetrics.congestionIndex >= 60,
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

            {/* <Suspense
              fallback={<LoadingFallback message="Cargando comparativa..." />}
            >
              <GroupTrafficComparison polygons={polygons} groups={allGroups} />
            </Suspense> */}
          </div>
        );

      case "map":
        return (
          <div className="h-full flex flex-col relative">
            {/* Banner de polígono seleccionado (modo single polygon) */}
            {singlePolygonMode && selectedPolygonData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`absolute top-4 z-20 bg-primary-50 dark:bg-veltrix-card border-2 border-primary-300 dark:border-veltrix-border rounded-xl p-4 flex items-center justify-between shadow-lg transition-all duration-300 pointer-events-none
                  ${
                    isSidebarExpanded
                      ? "left-[340px] right-[420px]"
                      : "left-4 right-[420px]"
                  } [&>*]:pointer-events-auto`}
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

            {/* Los filtros ahora están en el sidebar - ya no flotantes */}

            <div className="flex h-full overflow-hidden relative">
              {/* Sidebar de filtros y capas - Overlay Flotante */}
              <div className="absolute left-4 top-4 bottom-4 z-[1002] pointer-events-none flex flex-col justify-center">
                <div className="pointer-events-auto h-auto max-h-full shadow-2xl rounded-2xl overflow-hidden">
                  <MapSidebar
                    onLayerToggle={handleLayerToggle}
                    showWazeIncidents={showWazeIncidents}
                    jams={jams}
                    polygons={polygons}
                    selectedPolygon={selectedPolygon}
                    selectedGroup={selectedGroup}
                    onPolygonChange={handlePolygonChange}
                    onGroupChange={handleGroupChange}
                    expanded={isSidebarExpanded}
                    onExpandedChange={setIsSidebarExpanded}
                  />
                </div>
              </div>

              {/* Contenedor del Mapa - Ocupa todo el espacio */}
              <div
                className={`relative h-full flex-1 w-full transition-all duration-300 ${
                  selectedPolygonData ? "lg:mr-[400px]" : ""
                }`}
              >
                <Suspense
                  fallback={<LoadingFallback message="Cargando mapa base..." />}
                >
                  <Map
                    polygons={filteredPolygons}
                    incidents={filteredIncidents}
                    jams={filteredJams}
                    selectedPolygon={selectedPolygon}
                    selectedGroup={selectedGroup}
                    selectedIncidentId={focusIncidentId}
                    forcedIncident={focusIncidentData}
                    onPolygonClick={handlePolygonChange}
                    className="rounded-none"
                    // Props para filtros en el sidebar del mapa
                    allPolygons={polygons}
                    onPolygonChange={handlePolygonChange}
                    onGroupChange={handleGroupChange}
                    showWazeIncidents={showWazeIncidents}
                  />
                  {/* Footer de KPIs Flotante */}
                  <MapKPIFooter
                    kpis={globalKPIs}
                    totalPolygons={polygons.length}
                    criticalPolygons={criticalPolygonsCount}
                    incidents={incidents}
                    alerts={alerts}
                    polygons={polygons}
                  />
                </Suspense>
              </div>

              {/* Sidebar de Detalle de Polígono (Panel Derecho) */}
              {selectedPolygonData && (
                <div className="absolute right-0 top-0 h-full w-[400px] border-l border-gray-200 dark:border-veltrix-border bg-white dark:bg-veltrix-card z-[1001] shadow-2xl overscroll-contain">
                  <div className="h-full overflow-y-auto overscroll-contain custom-scrollbar">
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
    <div
      className="flex h-screen w-full bg-gray-50 dark:bg-[#121212] overflow-hidden"
      onClickCapture={() => initializeAudio()}
      onPointerDownCapture={() => initializeAudio()}
    >
      {/* Sidebar de Navegación Global - Siempre visible */}
      <AppSidebar />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col h-full relative">
        <div
          className={`h-full flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 via-green-50/20 to-yellow-50/30 dark:from-veltrix-bg dark:via-[#1e2330] dark:to-veltrix-bg transition-colors duration-500`}
        >
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

          {currentView !== "map" && (
            <ModernHeader
              lastUpdate={lastUpdate}
              onRefresh={handleRefreshAll}
            />
          )}

          <main
            className={`relative w-full flex-1 flex flex-col ${
              currentView === "map"
                ? "p-0 h-full overflow-hidden"
                : "px-6 py-6 overflow-y-auto"
            }`}
          >
            {alertStats &&
              alertStats.bySeverity.critical > 0 &&
              currentView !== "map" && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <AlertsBadge
                    stats={alertStats}
                    onClick={() => navigate("/incidentes")}
                  />
                </motion.div>
              )}

            <motion.div
              className={`flex-1 flex flex-col ${currentView === "map" ? "h-full" : ""}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {renderContent()}
            </motion.div>
          </main>
          {/* GlobalNotifications ahora está dentro del componente Map */}
          {currentView !== "map" && <Footer />}
          <LazyWrapper>
            <WeatherAlertsPanel />
          </LazyWrapper>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

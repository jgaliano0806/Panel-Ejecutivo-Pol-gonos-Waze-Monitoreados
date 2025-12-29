import React, { useState, useMemo, lazy, Suspense, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useWazeData } from '../hooks/useWazeData';
import type { GlobalKPIs } from '../types';
import { PolygonState, IncidentType, Severity } from '../types';
import { ModernHeader } from '../components/layout/modern-header';
import { ModernNavigation, type ViewType } from '../components/layout/modern-navigation';
import Filters from '../components/Filters';
import Footer from '../components/Footer';
import PolygonDetail from '../components/PolygonDetail';
import { BlockingIncidents } from '../components/BlockingIncidents';
// import { AlertsMonitor } from '../components/AlertsMonitor'; // OCULTADO
import { AlertsBadge } from '../components/AlertsBadge';
// AdminPanel is lazy loaded below
import { WazeOMeter } from '../components/WazeOMeter';
import { useHistoricalData, useTrends } from '../hooks/useWazeData';

// =====================================================
// 🚀 LAZY LOADING DE COMPONENTES PESADOS PARA MEJOR PERFORMANCE
// =====================================================

// Componentes principales del dashboard
const Map = lazy(() => import('../components/Map'));
const TrendsChart = lazy(() => import('../components/TrendsChart').then(m => ({ default: m.TrendsChart })));
const GroupTrafficComparison = lazy(() => import('../components/GroupTrafficComparison').then(m => ({ default: m.GroupTrafficComparison })));

// Componentes de administración (cargados solo cuando se necesitan)
const AdminPanel = lazy(() => import('../components/AdminPanel'));
const PolygonManagement = lazy(() => import('../components/PolygonManagement'));

// Componentes de reportes pesados
const ModernExecutiveSummary = lazy(() => import('../components/dashboard/modern-executive-summary').then(m => ({ default: m.ModernExecutiveSummary })));
const TopCriticalDashboard = lazy(() => import('../components/TopCriticalDashboard').then(m => ({ default: m.TopCriticalDashboard })));

// Componentes de clima (pueden ser pesados por las animaciones)
const WeatherAlertsPanel = lazy(() => import('../components/weather/WeatherAlertsPanel').then(m => ({ default: m.WeatherAlertsPanel })));

// Componente de fallback para loading
const LoadingFallback = ({ message = "Cargando..." }: { message?: string }) => (
    <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
        <span className="text-gray-600">{message}</span>
    </div>
);

// Wrapper para lazy loading con error boundary
const LazyWrapper = ({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) => (
    <Suspense fallback={fallback || <LoadingFallback />}>
        {children}
    </Suspense>
);

const Dashboard: React.FC = () => {
    const location = useLocation();
    const queryClient = useQueryClient();
    const { polygons, incidents, jams, alerts, alertStats, isLoading, isError, lastUpdate, globalKPIs: backendKPIs } = useWazeData();
    const historicalData = useHistoricalData(24);
    useTrends(); // Disponible para uso futuro
    const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<ViewType>('home');
    const [singlePolygonMode, setSinglePolygonMode] = useState(false); // Modo de tramo único desde RiskDashboard

    // Sincronizar vista con URL
    useEffect(() => {
        if (location.pathname === '/' || location.pathname === '/dashboard') {
            setCurrentView('home');
        } else if (location.pathname === '/mapa') {
            setCurrentView('map');
        } else if (location.pathname === '/alertas') {
            setCurrentView('events');
        } else if (location.pathname === '/admin') {
            setCurrentView('admin');
        }
    }, [location.pathname]);

    // Procesar navegación desde RiskDashboard (polígono y filtro seleccionado)
    useEffect(() => {
        const state = location.state as { selectedPolygonId?: string; filterType?: string } | null;
        if (state?.selectedPolygonId) {
            setSelectedPolygon(state.selectedPolygonId);
            setSelectedGroup(null); // No filtrar por grupo
            setSinglePolygonMode(true); // Activar modo de tramo único
            setCurrentView('map'); // Cambiar a vista de mapa
            // Limpiar el state para evitar re-selección en navegaciones futuras
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Usar KPIs del backend
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
            if (inc.type === IncidentType.CONSTRUCTION && inc.severity >= Severity.HIGH) {
                constructions++;
            }
        }

        return {
            fluidityPercentage: totalPolygons > 0 ? Math.round((fluidPolygons / totalPolygons) * 100) : 0,
            activeIncidents: incidents.length,
            criticalPolygons,
            activeConstructions: constructions,
            trends: { fluidityChange: 0, incidentsChange: 0 },
        };
    }, [polygons, incidents, backendKPIs]);

    // Handlers memoizados para evitar re-renders innecesarios
    const handlePolygonChange = useCallback((id: string | null) => {
        setSelectedPolygon(id);
        // Si cambia manualmente, desactivar modo tramo único
        if (singlePolygonMode) {
            setSinglePolygonMode(false);
        }
    }, [singlePolygonMode]);

    const handleGroupChange = useCallback((group: string | null) => {
        setSelectedGroup(group);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setSelectedPolygon(null);
        setSinglePolygonMode(false); // Desactivar modo tramo único
    }, []);

    const handleEventSelect = useCallback((incident: any) => {
        if (incident.polygonId) {
            setSelectedPolygon(incident.polygonId);
            setCurrentView('map');
        }
    }, []);

    // Función para forzar actualización de todos los feeds
    const handleRefreshAll = useCallback(async () => {
        // Invalidar todas las queries para forzar refetch
        await queryClient.invalidateQueries();
    }, [queryClient]);

    const filteredPolygons = useMemo(() => {
        // Modo tramo único: solo mostrar el polígono seleccionado
        if (singlePolygonMode && selectedPolygon) {
            return polygons.filter(p => p.id === selectedPolygon);
        }
        // Modo normal: filtrar por grupo si está seleccionado
        if (!selectedGroup) return polygons;
        return polygons.filter(p => p.group === selectedGroup);
    }, [polygons, selectedGroup, singlePolygonMode, selectedPolygon]);

    // Filtrar incidentes y jams según modo
    const filteredIncidents = useMemo(() => {
        if (singlePolygonMode && selectedPolygon) {
            return incidents.filter(i => i.polygonId === selectedPolygon);
        }
        return incidents;
    }, [incidents, singlePolygonMode, selectedPolygon]);

    const filteredJams = useMemo(() => {
        if (singlePolygonMode && selectedPolygon) {
            return jams.filter(j => j.polygonId === selectedPolygon);
        }
        return jams;
    }, [jams, singlePolygonMode, selectedPolygon]);

    const selectedPolygonData = useMemo(() => {
        if (!selectedPolygon) return null;
        return polygons.find(p => p.id === selectedPolygon) || null;
    }, [selectedPolygon, polygons]);

    const allGroups = useMemo(() => {
        const groups = new Set(polygons.map(p => p.group));
        return Array.from(groups);
    }, [polygons]);

    const criticalPolygonsCount = useMemo(() => {
        return polygons.filter(p => p.trafficMetrics && p.trafficMetrics.congestionIndex >= 60).length;
    }, [polygons]);

    // Renderizado por vista
    const renderContent = () => {
        switch (currentView) {
            case 'home':
                return (
                    <div className="space-y-4">
                        {/* Resumen Ejecutivo Moderno */}
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

                        {/* Grid Principal: Top Críticos + Estado de Red */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <LazyWrapper>
                                <TopCriticalDashboard
                                    polygons={polygons}
                                    incidents={incidents}
                                    limit={5}
                                    onPolygonClick={handlePolygonChange}
                                />
                            </LazyWrapper>
                            <WazeOMeter jams={jams} />
                        </div>

                        {/* Tendencias (últimas 24h) */}
                        {historicalData.data && historicalData.data.length > 0 && (
                            <Suspense fallback={
                                <div className="card h-64 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
                                        <p className="mt-2 text-sm text-gray-600">Cargando gráficos...</p>
                                    </div>
                                </div>
                            }>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">
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

                        {/* Comparativa por Grupo */}
                        <Suspense fallback={
                            <div className="card h-64 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
                                    <p className="mt-2 text-sm text-gray-600">Cargando comparativa...</p>
                                </div>
                            </div>
                        }>
                            <GroupTrafficComparison
                                polygons={polygons}
                                groups={allGroups}
                            />
                        </Suspense>
                    </div>
                );

            case 'map':
                return (
                    <div className="space-y-4">
                        {/* Indicador de modo tramo único */}
                        {singlePolygonMode && selectedPolygonData && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-primary-50 border-2 border-primary-300 rounded-xl p-4 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-100 rounded-lg">
                                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-primary-900">
                                            Visualizando: {selectedPolygonData.name}
                                        </p>
                                        <p className="text-sm text-primary-700">
                                            {selectedPolygonData.group} • {filteredIncidents.length} incidentes • {filteredJams.length} atascos
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
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                    Ver todos los tramos
                                </button>
                            </motion.div>
                        )}

                        {/* Filtros - Solo mostrar si no estamos en modo tramo único */}
                        {!singlePolygonMode && (
                            <Filters
                                polygons={polygons}
                                selectedPolygon={selectedPolygon}
                                selectedGroup={selectedGroup}
                                onPolygonChange={handlePolygonChange}
                                onGroupChange={handleGroupChange}
                            />
                        )}

                        {/* Mapa con Panel de Detalle integrado */}
                        <div className={`grid gap-4 ${selectedPolygonData ? 'grid-cols-1 lg:grid-cols-10' : 'grid-cols-1 xl:grid-cols-4'}`}>
                            {/* Estado de Red - Solo visible si no hay polígono seleccionado */}
                            {!selectedPolygonData && (
                                <div className="xl:col-span-1">
                                    <WazeOMeter jams={jams} />
                                </div>
                            )}

                            {/* Mapa - 70% cuando hay detalle, 100% si no */}
                            <div className={selectedPolygonData ? 'lg:col-span-7' : 'xl:col-span-3'}>
                                <Suspense fallback={
                                    <div className="card h-[600px] flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
                                            <p className="mt-2 text-sm text-gray-600">Cargando mapa...</p>
                                        </div>
                                    </div>
                                }>
                                    <Map
                                        polygons={filteredPolygons}
                                        incidents={filteredIncidents}
                                        jams={filteredJams}
                                        selectedPolygon={selectedPolygon}
                                        selectedGroup={selectedGroup}
                                        onPolygonClick={handlePolygonChange}
                                    />
                                </Suspense>
                            </div>

                            {/* Panel de Detalle - 30% cuando está seleccionado */}
                            {selectedPolygonData && (
                                <div className="lg:col-span-3">
                                    <div className="bg-white rounded-xl shadow-lg h-[600px] overflow-hidden flex flex-col">
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

                        {/* Análisis por Grupo */}
                        <GroupTrafficComparison
                            polygons={polygons}
                            groups={allGroups}
                        />
                    </div>
                );

            case 'events':
                return (
                    <div className="space-y-4">
                        {/* Monitor de Alertas automaticas de Waze - OCULTADO */}
                        {/* <AlertsMonitor alerts={alerts} /> */}

                        {/* Incidentes que Bloquean el Tráfico - Ahora con cálculo mejorado de demoras */}
                        <BlockingIncidents />
                    </div>
                );

            case 'admin':
                return (
                    <LazyWrapper fallback={<LoadingFallback message="Cargando panel de administración..." />}>
                        <AdminPanel />
                    </LazyWrapper>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Cargando información de tráfico...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <svg className="w-16 h-16 text-danger mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar información</h2>
                    <p className="text-gray-600">No se pudieron obtener los datos del sistema de monitoreo.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 via-green-50/20 to-yellow-50/30">
            {/* Decorative Background Pattern */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                    backgroundSize: '32px 32px'
                }} />
            </div>

            {/* Header Moderno */}
            <ModernHeader lastUpdate={lastUpdate} onRefresh={handleRefreshAll} />

            {/* Navegación Moderna */}
            <ModernNavigation
                currentView={currentView}
                onViewChange={setCurrentView}
                criticalAlertsCount={alertStats?.bySeverity.critical}
            />

            {/* Main Content */}
            <main className="relative max-w-[1900px] mx-auto px-8 py-8 z-10">
                {/* Badge de Alertas (solo si hay críticas) */}
                {alertStats && alertStats.bySeverity.critical > 0 && currentView !== 'events' && (
                    <motion.div
                        className="mb-6"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <AlertsBadge
                            stats={alertStats}
                            onClick={() => setCurrentView('events')}
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
    );
};

export default Dashboard;

import React, { useState, useMemo, lazy, Suspense, useCallback, memo } from 'react';
import { useWazeData } from '../hooks/useWazeData';
import type { GlobalKPIs } from '../types';
import { PolygonState, IncidentType, Severity } from '../types';
import Header from '../components/Header';
import { ModernHeader } from '../components/layout/modern-header';
import { ModernNavigation } from '../components/layout/modern-navigation';
import Filters from '../components/Filters';
import Footer from '../components/Footer';
import PolygonDetail from '../components/PolygonDetail';
import { BlockingIncidents } from '../components/BlockingIncidents';
import { AlertsMonitor } from '../components/AlertsMonitor';
import { AlertsBadge } from '../components/AlertsBadge';
import { WazeOMeter } from '../components/WazeOMeter';
import { ModernExecutiveSummary } from '../components/dashboard/modern-executive-summary';
import { TopCriticalDashboard } from '../components/TopCriticalDashboard';
import { useHistoricalData, useTrends } from '../hooks/useWazeData';

// Lazy load de componentes pesados
const Map = lazy(() => import('../components/Map'));
const TrendsChart = lazy(() => import('../components/TrendsChart').then(m => ({ default: m.TrendsChart })));
const GroupTrafficComparison = lazy(() => import('../components/GroupTrafficComparison').then(m => ({ default: m.GroupTrafficComparison })));

const Dashboard: React.FC = () => {
    const { polygons, incidents, jams, alerts, alertStats, isLoading, isError, lastUpdate, globalKPIs: backendKPIs } = useWazeData();
    const historicalData = useHistoricalData(24);
    const trendsData = useTrends();
    const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [currentView, setCurrentView] = useState<'home' | 'map' | 'events'>('home');

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

    const handlePolygonChange = useCallback((id: string | null) => {
        setSelectedPolygon(id);
    }, []);

    const handleGroupChange = useCallback((group: string | null) => {
        setSelectedGroup(group);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setSelectedPolygon(null);
    }, []);

    const filteredPolygons = useMemo(() => {
        if (!selectedGroup) return polygons;
        return polygons.filter(p => p.group === selectedGroup);
    }, [polygons, selectedGroup]);

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
                        <ModernExecutiveSummary
                            kpis={globalKPIs}
                            alertStats={alertStats}
                            totalPolygons={polygons.length}
                            criticalPolygons={criticalPolygonsCount}
                            incidents={incidents}
                            alerts={alerts}
                            polygons={polygons}
                            onEventSelect={(incident) => {
                                // Cambiar a vista de mapa y seleccionar el polígono del incidente
                                if (incident.polygonId) {
                                    setSelectedPolygon(incident.polygonId);
                                    setCurrentView('map');
                                }
                            }}
                        />

                        {/* Grid Principal: Top Críticos + Estado de Red */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <TopCriticalDashboard
                                polygons={polygons}
                                incidents={incidents}
                                limit={5}
                                onPolygonClick={handlePolygonChange}
                            />
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
                        {/* Filtros */}
                        <Filters
                            polygons={polygons}
                            selectedPolygon={selectedPolygon}
                            selectedGroup={selectedGroup}
                            onPolygonChange={handlePolygonChange}
                            onGroupChange={handleGroupChange}
                        />

                        {/* Mapa con Estado */}
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                            {/* Estado de Red */}
                            <div className="xl:col-span-1">
                                <WazeOMeter jams={jams} />
                            </div>

                            {/* Mapa */}
                            <div className="xl:col-span-3">
                                <Suspense fallback={
                                    <div className="card h-[700px] flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
                                            <p className="mt-2 text-sm text-gray-600">Cargando mapa...</p>
                                        </div>
                                    </div>
                                }>
                                    <Map
                                        polygons={filteredPolygons}
                                        incidents={incidents}
                                        jams={jams}
                                        selectedPolygon={selectedPolygon}
                                        onPolygonClick={handlePolygonChange}
                                    />
                                </Suspense>
                            </div>
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
                        {/* Monitor de Alertas del Sistema */}
                        <AlertsMonitor alerts={alerts} />

                        {/* Incidentes que Bloquean el Tráfico */}
                        <BlockingIncidents incidents={incidents} jams={jams} />
                    </div>
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/20 to-green-50/20">
            {/* Header Moderno */}
            <ModernHeader lastUpdate={lastUpdate} />

            {/* Navegación Moderna */}
            <ModernNavigation
                currentView={currentView}
                onViewChange={setCurrentView}
                criticalAlertsCount={alertStats?.bySeverity.critical}
            />

            {/* Main Content */}
            <main className="max-w-[1850px] mx-auto px-4 py-6">
                {/* Badge de Alertas (solo si hay críticas) */}
                {alertStats && alertStats.bySeverity.critical > 0 && currentView !== 'events' && (
                    <div className="mb-4">
                        <AlertsBadge
                            stats={alertStats}
                            onClick={() => setCurrentView('events')}
                        />
                    </div>
                )}

                {renderContent()}

                {/* Panel de Detalle (modal lateral) */}
                {selectedPolygonData && (
                    <div
                        className="fixed inset-0 z-50 flex justify-end bg-black/50"
                        onClick={handleCloseDetail}
                    >
                        <div
                            className="w-full max-w-2xl h-full bg-white shadow-2xl p-6 overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <PolygonDetail
                                polygon={selectedPolygonData}
                                incidents={incidents}
                                jams={jams}
                                onClose={handleCloseDetail}
                            />
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Dashboard;

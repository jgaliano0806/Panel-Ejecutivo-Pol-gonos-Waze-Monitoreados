import React, { useState, useMemo, lazy, Suspense, useCallback } from 'react';
import { useWazeData } from '../hooks/useWazeData';
import type { GlobalKPIs } from '../types';
import { PolygonState, IncidentType, Severity } from '../types';
import Header from '../components/Header';
import KPICards from '../components/KPICards';
import Filters from '../components/Filters';
import AlertsPanel from '../components/AlertsPanel';
import Footer from '../components/Footer';
import PolygonDetail from '../components/PolygonDetail';
import { GroupStats } from '../components/GroupStats';
import { TopCritical } from '../components/TopCritical';

// Lazy load del mapa para mejor performance inicial
const Map = lazy(() => import('../components/Map'));

const Dashboard: React.FC = () => {
    const { polygons, incidents, jams, isLoading, isError, lastUpdate, globalKPIs: backendKPIs } = useWazeData();
    const [selectedPolygon, setSelectedPolygon] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

    // Usar KPIs del backend si están disponibles, sino calcular
    const globalKPIs: GlobalKPIs = useMemo(() => {
        if (backendKPIs) return backendKPIs;

        // Fallback: calcular KPIs en el frontend (más eficiente hacerlo en backend)
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
            fluidityPercentage: totalPolygons > 0
                ? Math.round((fluidPolygons / totalPolygons) * 100)
                : 0,
            activeIncidents: incidents.length,
            criticalPolygons,
            activeConstructions: constructions,
            trends: {
                fluidityChange: 0,
                incidentsChange: 0,
            },
        };
    }, [polygons, incidents, backendKPIs]);

    // Callbacks memoizados para evitar re-renders de componentes hijos
    const handlePolygonChange = useCallback((id: string | null) => {
        setSelectedPolygon(id);
    }, []);

    const handleGroupChange = useCallback((group: string | null) => {
        setSelectedGroup(group);
    }, []);

    const handleCloseDetail = useCallback(() => {
        setSelectedPolygon(null);
    }, []);

    // Filtrar polígonos según selección
    const filteredPolygons = useMemo(() => {
        if (!selectedGroup) return polygons;
        return polygons.filter(p => p.group === selectedGroup);
    }, [polygons, selectedGroup]);

    // Obtener polígono seleccionado
    const selectedPolygonData = useMemo(() => {
        if (!selectedPolygon) return null;
        return polygons.find(p => p.id === selectedPolygon) || null;
    }, [selectedPolygon, polygons]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Cargando datos de Waze...</p>
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
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar datos</h2>
                    <p className="text-gray-600">No se pudieron obtener los datos de Waze. Usando datos mock.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <Header lastUpdate={lastUpdate} />

            {/* Main Content - Optimizado para Full HD */}
            <main className="max-w-[1850px] mx-auto px-4 py-4">
                {/* KPIs */}
                <div className="mb-4">
                    <KPICards kpis={globalKPIs} />
                </div>

                {/* Filtros */}
                <div className="mb-4">
                    <Filters
                        polygons={polygons}
                        selectedPolygon={selectedPolygon}
                        selectedGroup={selectedGroup}
                        onPolygonChange={handlePolygonChange}
                        onGroupChange={handleGroupChange}
                    />
                </div>

                {/* Grid principal: Mapa + Alertas - Mapa 90% del ancho */}
                <div className="grid grid-cols-1 xl:grid-cols-10 gap-4 mb-4">
                    {/* Mapa - 90% del ancho en pantallas grandes */}
                    <div className="xl:col-span-9">
                        <Suspense fallback={
                            <div className="card h-[850px] flex items-center justify-center">
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

                    {/* Panel de Alertas - 10% del ancho */}
                    <div className="xl:col-span-1">
                        <AlertsPanel incidents={incidents} polygons={polygons} limit={15} />
                    </div>
                </div>

                {/* Panel de Detalle del Polígono (si hay uno seleccionado) */}
                {selectedPolygonData && (
                    <div className="mb-4">
                        <PolygonDetail
                            polygon={selectedPolygonData}
                            incidents={incidents}
                            jams={jams}
                            onClose={handleCloseDetail}
                        />
                    </div>
                )}

                {/* Sección de Estadísticas por Grupo y Top Críticos */}
                {(backendKPIs?.groupStats || backendKPIs?.topCritical) && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                        {/* Estadísticas por Grupo */}
                        {backendKPIs?.groupStats && backendKPIs.groupStats.length > 0 && (
                            <GroupStats stats={backendKPIs.groupStats} />
                        )}
                        
                        {/* Top Polígonos Críticos */}
                        {backendKPIs?.topCritical && (
                            <TopCritical 
                                polygons={backendKPIs.topCritical} 
                                onPolygonClick={handlePolygonChange}
                            />
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default Dashboard;

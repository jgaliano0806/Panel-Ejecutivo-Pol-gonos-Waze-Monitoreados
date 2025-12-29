import React, { memo } from 'react';
import type { GlobalKPIs } from '../types';
import KPICard from './KPICard';

interface KPICardsProps {
    kpis: GlobalKPIs;
}

/**
 * Componente KPICards optimizado - Usa componentes individuales memoizados
 */
const KPICards: React.FC<KPICardsProps> = memo(({ kpis }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fluidez */}
            <KPICard
                title="Nivel de Fluidez"
                value={`${kpis.fluidityPercentage}%`}
                trend={kpis.trends.fluidityChange !== 0 ? {
                    value: kpis.trends.fluidityChange,
                    label: "% vs ayer",
                    isPositive: kpis.trends.fluidityChange > 0
                } : undefined}
                icon={
                    <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                }
                iconBgColor="bg-success-light/20"
            />

            {/* Incidentes Activos */}
            <KPICard
                title="Incidentes Activos"
                value={kpis.activeIncidents}
                trend={kpis.trends.incidentsChange !== 0 ? {
                    value: kpis.trends.incidentsChange,
                    label: " vs ayer",
                    isPositive: kpis.trends.incidentsChange < 0 // Menos incidentes es positivo
                } : undefined}
                icon={
                    <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                }
                iconBgColor="bg-warning-light/20"
            />

            {/* Polígonos Críticos */}
            <KPICard
                title="Polígonos Críticos"
                value={kpis.criticalPolygons}
                subtitle="de 66 totales"
                icon={
                    <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                }
                iconBgColor="bg-danger-light/20"
            />

            {/* Atascos Activos o Obras Activas */}
            {kpis.activeJams !== undefined ? (
                <KPICard
                    title="Atascos Activos"
                    value={kpis.activeJams}
                    subtitle="congestiones viales"
                    icon={
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    iconBgColor="bg-orange-500/20"
                />
            ) : (
                <KPICard
                    title="Obras con Impacto Alto"
                    value={kpis.activeConstructions}
                    subtitle="desvíos recomendados"
                    icon={
                        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    }
                    iconBgColor="bg-primary-500/20"
                />
            )}
        </div>
    );
});

KPICards.displayName = 'KPICards';

export default KPICards;

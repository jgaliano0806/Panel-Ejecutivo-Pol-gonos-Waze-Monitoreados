import React from 'react';
import { useLocation } from 'react-router-dom';
import { ModernHeader } from './modern-header';
import { ModernNavigation, type ViewType } from './modern-navigation';
import Footer from '../Footer';
import { WeatherAlertsPanel } from '../weather/WeatherAlertsPanel';

interface AppLayoutProps {
    children: React.ReactNode;
    lastUpdate?: Date;
    onRefresh?: () => void;
    criticalAlertsCount?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    lastUpdate,
    onRefresh,
    criticalAlertsCount = 0,
}) => {
    const location = useLocation();

    // Determinar la vista actual basada en la URL
    const getCurrentView = (): ViewType => {
        if (location.pathname === '/' || location.pathname === '/dashboard') return 'home';
        if (location.pathname === '/mapa') return 'map';
        if (location.pathname === '/riesgos') return 'risks';
        if (location.pathname === '/alertas') return 'events';
        if (location.pathname === '/siniestros') return 'accidents';
        if (location.pathname === '/historial') return 'history';
        if (location.pathname === '/estadisticas') return 'stats';
        return 'home';
    };

    const currentView = getCurrentView();

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
            <ModernHeader lastUpdate={lastUpdate || new Date()} onRefresh={onRefresh} />

            {/* Navegación Moderna */}
            <ModernNavigation
                currentView={currentView}
                onViewChange={() => {}} // La navegación se maneja por URL
                criticalAlertsCount={criticalAlertsCount}
            />

            {/* Main Content */}
            <main className="relative max-w-[1900px] mx-auto px-8 py-8 z-10">
                {children}
            </main>

            {/* Footer */}
            <Footer />

            {/* Panel de Alertas Climáticas */}
            <WeatherAlertsPanel />
        </div>
    );
};


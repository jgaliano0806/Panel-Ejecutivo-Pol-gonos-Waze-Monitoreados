import React from "react";
import { useLocation } from "react-router-dom";
import { ModernHeader } from "./modern-header";
import { AppSidebar } from "./AppSidebar";
import Footer from "./Footer";
import { WeatherAlertsPanel } from "../weather/WeatherAlertsPanel";
import { useSyncMapNotifications } from "@/hooks/useSyncMapNotifications";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useEffect } from "react";

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
  useSyncMapNotifications(); // Sync active map alerts to store

  // Listen for socket notifications (Audio + EventBus)
  useRealtimeNotifications();

  // Hydrate history on mount
  const fetchHistory = useNotificationStore((state) => state.fetchHistory);
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 via-green-50/20 to-yellow-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Decorative Background Pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>
      {/* Sidebar de Navegación Global */}
      <AppSidebar />
      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Moderno */}
        <ModernHeader
          lastUpdate={lastUpdate || new Date()}
          onRefresh={onRefresh}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto relative">
          <div className="max-w-[1900px] mx-auto px-8 py-8 z-10">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
      {/* Panel de Alertas Climáticas */}
      <WeatherAlertsPanel />
    </div>
  );
};

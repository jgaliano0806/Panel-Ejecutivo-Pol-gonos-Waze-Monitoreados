import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./router";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CACHE_CONFIG } from "./config/constants";
// Inicializar caché de iconos de Waze
import { iconCache } from "./utils/iconCache";
// Inicializar caché de traducciones desde catálogo BD
import { preloadTranslationsCache } from "./hooks/useCatalogTranslations";

import { KilometerStoreHydrator } from "./components/KilometerStoreHydrator";
import { AdminToastProvider } from "./hooks/useAdminToast";

// Configurar React Query client con valores de constantes centralizadas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: CACHE_CONFIG.queryCache,
  },
});

// Pre-cargar iconos comunes de Waze para mejorar rendimiento
iconCache.preloadCommonIcons();

// Pre-cargar traducciones desde el catálogo de BD
// Esto permite que las traducciones estén disponibles inmediatamente
preloadTranslationsCache();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary name="Aplicación" showHomeButton>
      <QueryClientProvider client={queryClient}>
        <AdminToastProvider>
          <KilometerStoreHydrator />
          <RouterProvider router={router} />
        </AdminToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

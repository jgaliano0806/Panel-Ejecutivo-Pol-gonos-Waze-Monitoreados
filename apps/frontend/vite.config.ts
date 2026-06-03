import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const BACKEND_PORT = 3001;
  const backendUrl = `http://127.0.0.1:${BACKEND_PORT}`;

  // Permite compilar con un base path personalizado para ambientes como /preprod/.
  // En producción normal se omite (queda "/"). En pre-producción se pasa
  // VITE_BASE_URL=/preprod/ como ARG en el Dockerfile.
  const base = process.env.VITE_BASE_URL || "/";

  return {
    plugins: [react()],
    base,
    cacheDir: "node_modules/.vite_fix", // Force new cache directory
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      // Force resolution from root node_modules for hoisted packages
      dedupe: ["react", "react-dom", "recharts"],
    },

    // Configuración del servidor de desarrollo
    server: {
      host: true,
      port: 5180,
      strictPort: false,
      fs: {
        strict: false,
      },
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/socket.io": {
          target: `ws://127.0.0.1:${BACKEND_PORT}`,
          ws: true,
          rewriteWsOrigin: true,
        },
        // Tiles: enrutar TODO /tiles al backend (no directo a CARTO/OSM).
        // Así en dev se usa el proxy inteligente del backend (tileProxy.routes.ts):
        // caché en disco + rotación de subdominios a/b/c/d + fallback a ESRI Gray.
        // El backend ya expone /tiles/carto-dark/:z/:x/:y.png, /tiles/carto-light/...,
        // /tiles/osm/... → no hace falta reescribir el path.
        "/tiles": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },

    // Eliminar console.log/debug y debugger en builds de producción (mantiene warn/error)
    esbuild: {
      pure:
        mode === "production"
          ? ["console.log", "console.debug", "console.info"]
          : [],
      drop: mode === "production" ? ["debugger"] : [],
    },

    // Configuración de build para producción
    build: {
      target: "es2022",
      outDir: "dist",
      sourcemap: mode === "development",
      minify: "esbuild",
      // Optimizaciones de tree shaking
      rollupOptions: {
        output: {
          // Splitting de vendors para cachear mejor en browser y reducir initial bundle.
          // IMPORTANTE: devolver `undefined` para deps no clasificadas deja que Rollup las
          // asigne al chunk que las importa, evitando chunks circulares (vendor <-> react-vendor).
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id))
              return "react-vendor";
            if (id.includes("react-router")) return "react-vendor";
            if (id.includes("@tanstack/react-query")) return "query-vendor";
            if (id.includes("@tanstack/react-virtual")) return "query-vendor";
            if (id.includes("@radix-ui")) return "radix-vendor";
            if (id.includes("framer-motion")) return "motion-vendor";
            if (id.includes("recharts") || id.includes("d3-")) return "chart-vendor";
            if (id.includes("maplibre-gl") || id.includes("react-map-gl"))
              return "maplibre-vendor";
            if (id.includes("leaflet")) return "leaflet-vendor";
            if (id.includes("@turf")) return "turf-vendor";
            if (id.includes("jspdf") || id.includes("html2canvas"))
              return "export-vendor";
            if (id.includes("socket.io-client")) return "socket-vendor";
            if (id.includes("lucide-react")) return "icons-vendor";
            return undefined;
          },
          // Optimizaciones adicionales
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];
            if (
              /\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")
            ) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/\.(css)$/i.test(assetInfo.name || "")) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
        },
        // Leaflet se bundlea localmente (no CDN externo)
      },
      // Límite de chunk para advertencias
      chunkSizeWarningLimit: 500,
      // Optimizaciones adicionales
      cssCodeSplit: true,
      reportCompressedSize: true,
      // Optimización de assets
      assetsInlineLimit: 4096, // Inline assets menores a 4KB
    },

    // Plugins adicionales para análisis (solo en modo analyze)
    ...(mode === "analyze"
      ? {
          plugins: [
            react(),
            visualizer({
              filename: "dist/bundle-analysis.html",
              open: true,
              gzipSize: true,
              brotliSize: true,
            }),
          ],
        }
      : {
          plugins: [react()],
        }),

    // Optimización de dependencias
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "framer-motion",
        "recharts",
        "@turf/turf",
        "fast-deep-equal",
        "maplibre-gl",
      ],
      esbuildOptions: {
        target: "es2022",
      },
    },

    // Preview server (para probar build de producción)
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const BACKEND_PORT = 3001;
  const backendUrl = `http://127.0.0.1:${BACKEND_PORT}`;

  return {
    plugins: [react()],
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
        "/tiles/osm": {
          target: "https://tile.openstreetmap.org",
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/tiles\/osm/, ""),
        },
        "/tiles/carto-dark": {
          target: "https://a.basemaps.cartocdn.com",
          changeOrigin: true,
          rewrite: (tilePath: string) =>
            tilePath.replace(/^\/tiles\/carto-dark/, "/dark_matter"),
        },
        "/tiles/carto-light": {
          target: "https://a.basemaps.cartocdn.com",
          changeOrigin: true,
          rewrite: (tilePath: string) =>
            tilePath.replace(/^\/tiles\/carto-light/, "/light_all"),
        },
      },
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
          /* manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "query-vendor": ["@tanstack/react-query"],
            "ui-vendor": ["framer-motion", "lucide-react"],
            "chart-vendor": ["recharts"],
            "radix-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-tooltip",
            ],
          }, */
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

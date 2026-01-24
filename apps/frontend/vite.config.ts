import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    cacheDir: "node_modules/.vite_fix", // Force new cache directory
    root: process.cwd(),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // Force resolution from root node_modules for hoisted packages
      dedupe: ["react", "react-dom", "recharts", "@turf/turf"],
    },

    // Configuración del servidor de desarrollo
    server: {
      host: "127.0.0.1",
      port: 5180,
      strictPort: false, // Allow fallback if 5180 is taken
      // Habilita el fallback de historial para SPA routing
      fs: {
        strict: false,
      },
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3002",
          changeOrigin: true,
        },
      },
    },

    // Configuración de build para producción
    build: {
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
        // Exclusiones para tree shaking
        external: ["leaflet"],
      },
      // Límite de chunk para advertencias
      chunkSizeWarningLimit: 500,
      // Optimizaciones adicionales
      cssCodeSplit: true,
      reportCompressedSize: true,
      target: "esnext",
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
      include: ["react", "react-dom", "react-router-dom", "framer-motion"],
      exclude: ["@turf/turf", "recharts"], // Bypass optimization for Turf and Recharts
    },

    // Preview server (para probar build de producción)
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});

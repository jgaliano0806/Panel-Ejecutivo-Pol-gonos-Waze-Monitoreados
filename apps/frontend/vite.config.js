var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var BACKEND_PORT = 3001;
    var backendUrl = "http://127.0.0.1:".concat(BACKEND_PORT);
    return __assign(__assign({ plugins: [react()], cacheDir: "node_modules/.vite_fix", resolve: {
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
                    target: "ws://127.0.0.1:".concat(BACKEND_PORT),
                    ws: true,
                    rewriteWsOrigin: true,
                },
                "/tiles/osm": {
                    target: "https://tile.openstreetmap.org",
                    changeOrigin: true,
                    rewrite: function (path) { return path.replace(/^\/tiles\/osm/, ""); },
                },
                "/tiles/carto-dark": {
                    target: "https://a.basemaps.cartocdn.com",
                    changeOrigin: true,
                    rewrite: function (tilePath) {
                        return tilePath.replace(/^\/tiles\/carto-dark/, "/rastertiles/dark_all");
                    },
                },
                "/tiles/carto-light": {
                    target: "https://a.basemaps.cartocdn.com",
                    changeOrigin: true,
                    rewrite: function (tilePath) {
                        return tilePath.replace(/^\/tiles\/carto-light/, "/rastertiles/light_all");
                    },
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
                    assetFileNames: function (assetInfo) {
                        var _a;
                        var info = ((_a = assetInfo.name) === null || _a === void 0 ? void 0 : _a.split(".")) || [];
                        var ext = info[info.length - 1];
                        if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || "")) {
                            return "assets/images/[name]-[hash][extname]";
                        }
                        if (/\.(css)$/i.test(assetInfo.name || "")) {
                            return "assets/css/[name]-[hash][extname]";
                        }
                        return "assets/[name]-[hash][extname]";
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
        } }, (mode === "analyze"
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
        })), { 
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
        } });
});

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    root: process.cwd(),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // Configuración del servidor de desarrollo
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      // Habilita el fallback de historial para SPA routing
      fs: {
        strict: false,
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },

    // Configuración de build para producción
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'esbuild',
      // Optimizaciones de tree shaking
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks para mejor caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'query-vendor': ['@tanstack/react-query'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'chart-vendor': ['recharts'],
            'map-vendor': ['leaflet', 'react-leaflet'],
            'radix-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
            ],
            // Chunks específicos de la aplicación
            'admin-chunk': [
              './src/components/AdminPanel',
              './src/components/admin/CatalogManagement',
              './src/components/admin/UserManagement',
              './src/components/admin/SSOConfiguration',
              './src/components/admin/SystemSettings'
            ],
            'dashboard-chunk': [
              './src/components/dashboard/modern-executive-summary',
              './src/components/TopCriticalDashboard',
              './src/components/TrendsChart',
              './src/components/GroupTrafficComparison'
            ],
          },
          // Optimizaciones adicionales
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/\.(css)$/i.test(assetInfo.name || '')) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
        // Exclusiones para tree shaking
        external: [],
      },
      // Límite de chunk para advertencias
      chunkSizeWarningLimit: 500,
      // Optimizaciones adicionales
      cssCodeSplit: true,
      reportCompressedSize: true,
      target: 'esnext',
      // Optimización de assets
      assetsInlineLimit: 4096, // Inline assets menores a 4KB
    },

    // Plugins adicionales para análisis (solo en modo analyze)
    ...(mode === 'analyze' ? {
    plugins: [
      react(),
        visualizer({
          filename: 'dist/bundle-analysis.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ]
    } : {
      plugins: [react()]
    }),

    // Optimización de dependencias
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'framer-motion',
        'recharts',
      ],
    },

    // Preview server (para probar build de producción)
    preview: {
      port: 4173,
      strictPort: true,
    },
  }
})

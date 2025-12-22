import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks para mejor caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'query-vendor': ['@tanstack/react-query'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'chart-vendor': ['recharts'],
            'radix-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
            ],
          },
        },
      },
      // Límite de chunk para advertencias
      chunkSizeWarningLimit: 500,
    },

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

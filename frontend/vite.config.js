import path from 'node:path'
import process from 'node:process'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  root: process.cwd(),
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    sourcemap: process.env.VITE_BUILD_SOURCEMAPS === 'true',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (/[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/.test(id)) {
            return 'react-vendor'
          }

          if (/[\\/]node_modules[\\/]axios[\\/]/.test(id)) {
            return 'http-vendor'
          }

          if (/[\\/]node_modules[\\/](laravel-echo|pusher-js)[\\/]/.test(id)) {
            return 'realtime'
          }

          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(process.cwd(), 'src/test/setup.js')],
    testTimeout: 10000,
    hookTimeout: 10000,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: path.resolve(process.cwd(), 'coverage'),
      reporter: ['text', 'text-summary', 'html', 'lcov', 'cobertura'],
      include: [
        'src/api/auth.js',
        'src/api/reservations.js',
        'src/api/stories.js',
        'src/contexts/AuthContext.jsx',
        'src/contexts/ToastContext.jsx',
        'src/hooks/useAuth.js',
        'src/hooks/useAnimalsMarketplace.js',
        'src/hooks/useProductsMarketplace.js',
        'src/lib/appConfig.js',
        'src/services/marketplace/**/*.js',
        'src/features/marketplace/**/*.js',
        'src/components/feed/PostCard.jsx',
        'src/components/marketplace/**/*.jsx',
        'src/layouts/Layout.jsx',
        'src/pages/LoginPage.jsx',
        'src/pages/ReservationsPage.jsx',
        'src/pages/AnimalsMarketplacePage.jsx',
        'src/pages/ProductsMarketplacePage.jsx',
      ],
      exclude: [
        'src/**/*.test.js',
        'src/**/*.test.jsx',
        'src/test/**',
      ],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
  },
})

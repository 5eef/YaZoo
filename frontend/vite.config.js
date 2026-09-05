import path from 'node:path'
import process from 'node:process'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  root: process.cwd(),
  cacheDir: path.resolve(process.cwd(), '.vite-cache'),
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/sanctum': 'http://127.0.0.1:8000',
      '/broadcasting': 'http://127.0.0.1:8000',
      '/storage': 'http://127.0.0.1:8000',
    },
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
    // Full-source V8 instrumentation is materially slower on Windows CI hosts.
    // Keep the limit bounded while avoiding false negatives from cold coverage runs.
    testTimeout: 20000,
    hookTimeout: 20000,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: path.resolve(process.cwd(), 'coverage'),
      reporter: ['text', 'text-summary', 'html', 'lcov', 'cobertura'],
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.test.js',
        'src/**/*.test.jsx',
        'src/test/**',
        'src/main.jsx',
      ],
      thresholds: {
        branches: 20,
        functions: 25,
        lines: 30,
        statements: 30,
      },
    },
  },
})

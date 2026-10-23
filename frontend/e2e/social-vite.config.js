import config from '../vite.config.js'

// Keep the isolated health probe on the same API as this fixture's requests.
export default {
  ...config,
  server: { ...config.server, proxy: Object.fromEntries(['/api', '/health', '/sanctum', '/storage', '/broadcasting'].map(path => [path, 'http://127.0.0.1:8012'])) },
}

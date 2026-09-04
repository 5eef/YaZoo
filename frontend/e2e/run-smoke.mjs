import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import process from 'node:process'
import { spawn } from 'node:child_process'

const baseURL = process.env.E2E_BASE_URL ?? await reserveLocalBaseURL()
const apiURL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api'
const forwardedArgs = process.argv.slice(2)
const vitePort = new URL(baseURL).port

const vite = spawn(
  process.execPath,
  ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', vitePort, '--strictPort'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_API_URL: apiURL,
      VITE_GOOGLE_AUTH_ENABLED: 'false',
      VITE_REALTIME_ENABLED: 'false',
      VITE_MONITORING_ENABLED: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
)

vite.stdout.on('data', (chunk) => process.stdout.write(chunk))
vite.stderr.on('data', (chunk) => process.stderr.write(chunk))

try {
  await waitForHttp(baseURL, 120_000)

  const result = await runPlaywright(forwardedArgs)
  process.exitCode = result
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  vite.kill()
}

function runPlaywright(args) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['./node_modules/@playwright/test/cli.js', 'test', ...args],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          E2E_BASE_URL: baseURL,
          E2E_API_URL: apiURL,
          E2E_SKIP_WEBSERVER: 'true',
        },
        stdio: 'inherit',
        windowsHide: true,
      },
    )

    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const client = url.startsWith('https:') ? https : http
      const request = client.get(url, (response) => {
        response.resume()
        resolve()
      })

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`E2E server did not become ready at ${url}`))
          return
        }

        setTimeout(attempt, 500)
      })

      request.setTimeout(2_000, () => {
        request.destroy()
      })
    }

    attempt()
  })
}

function reserveLocalBaseURL() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to reserve a local E2E port.')))
        return
      }

      server.close(() => resolve(`http://127.0.0.1:${address.port}`))
    })
  })
}

import { getBroadcastAuthUrl, getRealtimeConfig, isRealtimeEnabled } from './appConfig'

let echoInstance = null
let echoLoadPromise = null
let echoGeneration = 0
let realtimeStatus = isRealtimeEnabled() ? 'idle' : 'disabled'

const BROADCAST_AUTH_TIMEOUT_MS = 10000

const channelSubscriptions = new Map()
const statusListeners = new Set()

function notifyStatusListeners() {
  statusListeners.forEach((listener) => listener(realtimeStatus))
}

function setRealtimeStatus(nextStatus) {
  if (realtimeStatus === nextStatus) {
    return
  }

  realtimeStatus = nextStatus
  notifyStatusListeners()
}

function mapConnectionState(state) {
  if (state === 'connected') {
    return 'connected'
  }

  if (state === 'connecting' || state === 'initialized') {
    return 'connecting'
  }

  if (state === 'unavailable' || state === 'failed') {
    return 'error'
  }

  return 'idle'
}

function bindConnectionEvents(echo) {
  const connection = echo?.connector?.pusher?.connection

  if (!connection) {
    return
  }

  connection.bind('state_change', ({ current }) => {
    setRealtimeStatus(mapConnectionState(current))
  })

  connection.bind('error', () => {
    setRealtimeStatus('error')
  })

  if (connection.state) {
    setRealtimeStatus(mapConnectionState(connection.state))
  }
}

function createAuthorizer(channel) {
  return {
    authorize: async (socketId, callback) => {
      const abortController = new AbortController()
      const timeoutId = globalThis.setTimeout(
        () => abortController.abort(),
        BROADCAST_AUTH_TIMEOUT_MS,
      )

      try {
        const response = await fetch(getBroadcastAuthUrl(), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Broadcast auth ${response.status}`)
        }

        callback(null, await response.json())
      } catch (error) {
        setRealtimeStatus('error')
        callback(error, null)
      } finally {
        globalThis.clearTimeout(timeoutId)
      }
    },
  }
}

async function ensureEcho() {
  if (!isRealtimeEnabled()) {
    setRealtimeStatus('disabled')
    return null
  }

  const config = getRealtimeConfig()

  if (!config.key) {
    setRealtimeStatus('error')
    return null
  }

  if (echoInstance) {
    return echoInstance
  }

  if (echoLoadPromise) {
    return echoLoadPromise
  }

  const generation = echoGeneration
  const loadPromise = createEcho(config)
  echoLoadPromise = loadPromise

  try {
    const loadedEcho = await loadPromise
    if (generation !== echoGeneration) {
      loadedEcho.disconnect()
      return null
    }

    echoInstance = loadedEcho
    return echoInstance
  } catch {
    setRealtimeStatus('error')
    return null
  } finally {
    if (echoLoadPromise === loadPromise) {
      echoLoadPromise = null
    }
  }
}

async function createEcho(config) {
  const [{ default: Echo }, { default: Pusher }] = await Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ])

  if (typeof globalThis.document !== 'undefined') {
    globalThis.Pusher = Pusher
  }

  setRealtimeStatus('connecting')

  const echo = new Echo({
    broadcaster: 'pusher',
    key: config.key,
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authorizer: createAuthorizer,
  })

  bindConnectionEvents(echo)

  return echo
}

export function subscribeRealtimeStatus(listener) {
  statusListeners.add(listener)
  listener(realtimeStatus)

  void ensureEcho()

  return () => {
    statusListeners.delete(listener)
  }
}

export function subscribeToPrivateChannel(channelName, eventName, handler) {
  let active = true
  let channel = null
  let channelConnection = null
  const eventKey = `.${eventName}`

  void ensureEcho().then((echo) => {
    if (!active || !echo) return

    channelConnection = echo
    channel = echo.private(channelName)
    channel.listen(eventKey, handler)
    channelSubscriptions.set(channelName, (channelSubscriptions.get(channelName) ?? 0) + 1)
  })

  return () => {
    active = false
    if (!channel) return

    channel.stopListening(eventKey, handler)

    const remainingListeners = (channelSubscriptions.get(channelName) ?? 1) - 1

    if (remainingListeners <= 0) {
      channelSubscriptions.delete(channelName)
      channelConnection?.leaveChannel(`private-${channelName}`)
      return
    }

    channelSubscriptions.set(channelName, remainingListeners)
  }
}

export function getCurrentSocketId() {
  return echoInstance?.socketId?.() ?? null
}

export function disconnectRealtime() {
  echoGeneration += 1

  if (!echoInstance) {
    setRealtimeStatus(isRealtimeEnabled() ? 'idle' : 'disabled')
    return
  }

  for (const channelName of channelSubscriptions.keys()) {
    echoInstance.leaveChannel(`private-${channelName}`)
  }

  channelSubscriptions.clear()
  echoInstance.disconnect()
  echoInstance = null
  echoLoadPromise = null
  setRealtimeStatus(isRealtimeEnabled() ? 'idle' : 'disabled')
}

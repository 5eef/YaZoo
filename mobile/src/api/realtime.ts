// Pusher protocol v7 over React Native's built-in WebSocket; no native module.
export type RealtimeEvent = { channel: string; event: string; data: unknown };
type Options = {
  url: string;
  origin?: string;
  channels: string[];
  authorize: (socketId: string, channel: string) => Promise<{ auth: string }>;
  receive: (event: RealtimeEvent) => void;
  status: (connected: boolean) => void;
  resync: () => void;
};

function connectionId(payload: unknown): string {
  const value = payload && typeof payload === 'object' && 'socket_id' in payload ? payload.socket_id : null;
  if (typeof value !== 'string' || !/^\d{1,20}\.\d{1,20}$/.test(value)) throw new Error('Invalid connection identifier');
  return value;
}

export function connectRealtime(options: Options): () => void {
  let stopped = false;
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let attempts = 0;
  let lastActivity = Date.now();
  const subscribed = new Set<string>();
  function connect() {
    if (stopped) return;
    subscribed.clear();
    // RN 0.86 supports a third headers argument; DOM lib declarations omit it.
    const NativeWebSocket = WebSocket as unknown as {
      new (url: string, protocols: null, options?: { headers: Record<string, string> }): WebSocket;
    };
    const current = new NativeWebSocket(options.url, null, options.origin ? { headers: { origin: options.origin } } : undefined);
    socket = current;
    const live = () => !stopped && socket === current;
    const send = (event: string, data: unknown) => {
      if (live() && current.readyState === 1) current.send(JSON.stringify({ event, data }));
    };
    current.onmessage = async ({ data }) => {
      if (!live() || typeof data !== 'string') return;
      lastActivity = Date.now();
      try {
        const frame = JSON.parse(data);
        const payload = typeof frame.data === 'string' ? JSON.parse(frame.data) : frame.data;
        if (frame.event === 'pusher:connection_established') {
          const socketId = connectionId(payload);
          for (const channel of options.channels) {
            const auth = await options.authorize(socketId, channel);
            if (!live()) return;
            send('pusher:subscribe', { channel, auth: auth.auth });
          }
          if (heartbeat) clearInterval(heartbeat);
          heartbeat = setInterval(() => {
            if (!live()) return;
            if (Date.now() - lastActivity > 90000) current.close();
            else send('pusher:ping', {});
          }, 25000);
        } else if (frame.event === 'pusher:ping') send('pusher:pong', {});
        else if (frame.event === 'pusher_internal:subscription_succeeded') {
          if (!options.channels.includes(frame.channel)) return;
          subscribed.add(frame.channel);
          if (subscribed.size === options.channels.length) {
            attempts = 0;
            options.status(true);
            options.resync();
          }
        } else if (frame.event === 'pusher:error') current.close();
        else if (subscribed.has(frame.channel)) options.receive({ channel: frame.channel, event: frame.event, data: payload });
      } catch { if (live()) current.close(); }
    };
    current.onerror = () => { if (live()) current.close(); };
    current.onclose = () => {
      if (heartbeat) clearInterval(heartbeat);
      if (!live()) return;
      options.status(false);
      retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)) + Math.random() * 500);
    };
  }
  connect();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    if (heartbeat) clearInterval(heartbeat);
    socket?.close();
    options.status(false);
  };
}

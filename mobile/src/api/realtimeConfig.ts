export function realtimeUrl(): string | null {
  if (process.env.EXPO_PUBLIC_REALTIME_ENABLED !== 'true') return null;
  const key = process.env.EXPO_PUBLIC_REVERB_APP_KEY;
  const host = process.env.EXPO_PUBLIC_REVERB_HOST;
  if (!key || !host || !/^[a-zA-Z0-9.-]+$/.test(host)) return null;
  return `wss://${host}:443/app/${encodeURIComponent(key)}?protocol=7&client=yazoo-native&version=2.0&flash=false`;
}

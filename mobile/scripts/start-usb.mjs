import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// USB-only development defaults. Distributed builds must supply their HTTPS API.
for (const port of [8000, 8081]) {
  const result = spawnSync('adb', ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
const cli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));
const metro = spawn(process.execPath, ['--dns-result-order=ipv4first', '--max-old-space-size=6144', cli, 'start', '--dev-client', '--localhost'], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api' },
});
metro.on('exit', code => process.exit(code || 0));

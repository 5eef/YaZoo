import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const defaultSdk = process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'Android/Sdk')
  : path.join(os.homedir(), 'Android/Sdk');
const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || defaultSdk;
if (!path.isAbsolute(sdk)) throw new Error('Android SDK location must be absolute');
const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
if (!fs.existsSync(adb)) throw new Error('Set ANDROID_SDK_ROOT to the installed Android SDK');

// USB-only development defaults. Distributed builds must supply their HTTPS API.
for (const port of [8000, 8081]) {
  const result = spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
const cli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));
const metro = spawn(process.execPath, ['--dns-result-order=ipv4first', '--max-old-space-size=6144', cli, 'start', '--dev-client', '--localhost'], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api' },
});
metro.on('exit', code => process.exit(code || 0));

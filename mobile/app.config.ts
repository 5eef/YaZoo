import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withGradleProperties } from 'expo/config-plugins';
export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile === 'production' || profile === 'preview') {
    if (config.android?.package !== 'com.yazoo.pilot' || !Number.isInteger(config.android?.versionCode) || (config.android?.versionCode ?? 0) < 1 || !/^\d+\.\d+\.\d+$/.test(config.version ?? '')) {
      throw new Error('Distributed YaZoo builds require the stable package, a positive versionCode and a release version');
    }
    if (process.env.YAZOO_SIGNING_MODE === 'validation') throw new Error('Unsigned validation is forbidden for distributed builds');
    const value = process.env.EXPO_PUBLIC_API_URL;
    let url: URL;
    try { url = new URL(value || ''); } catch { throw new Error('EXPO_PUBLIC_API_URL must be a real HTTPS API for distributed builds'); }
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /^[\d.]+$/.test(host) || host.startsWith('[') || /^(localhost|127\.|0\.|10\.|192\.168\.|\[::1\])/.test(host) || /\.(test|invalid|example|localhost)$/.test(host) || /(^|\.)example\.(com|org|net)$/.test(host)) {
      throw new Error('EXPO_PUBLIC_API_URL must be a real HTTPS API for distributed builds');
    }
    if (url.href.replace(/\/+$/, '') !== 'https://yazoo-showcase.pages.dev/api') {
      throw new Error('Distributed YaZoo builds require the official Cloudflare API');
    }
  }
  return withGradleProperties({ ...config, name: config.name || 'YaZoo', slug: config.slug || 'yazoo-pilot' }, mod => {
    const properties = { 'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1536m', 'org.gradle.workers.max': '2' };
    mod.modResults = mod.modResults.filter(item => item.type !== 'property' || !(item.key in properties));
    for (const [key, value] of Object.entries(properties)) mod.modResults.push({ type: 'property', key, value });
    return mod;
  });
};

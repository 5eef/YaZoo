export function resolveMediaUrl(value: string | null | undefined, base: string) {
  if (!value) return undefined;
  try {
    const origin = new URL(base);
    const path = !value.startsWith('/') && !/^[a-z][a-z0-9+.-]*:/i.test(value)
      ? `/${/^(storage|api\/media)\//.test(value) ? '' : 'storage/'}${value}` : value;
    const url = new URL(path, `${origin.origin}/`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    const local = ['localhost', '127.0.0.1', '10.0.2.2'];
    if (local.includes(url.hostname) && local.includes(origin.hostname)) return `${origin.origin}${url.pathname}${url.search}${url.hash}`;
    return url.href;
  } catch { return undefined; }
}

import type { Session } from './session';

export function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const session = value as Session;
  return typeof session.token === 'string' && session.token.trim().length > 0
    && Number.isSafeInteger(session.user?.id) && session.user.id > 0
    && typeof session.user.name === 'string' && typeof session.user.email === 'string'
    && typeof session.expires_at === 'string' && Date.parse(session.expires_at) > Date.now();
}

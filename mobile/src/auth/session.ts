import * as SecureStore from 'expo-secure-store';
import { isSession } from './validation';
export type User = { id: number; name: string; email: string | null; city?: string; preferredLocale?: string; avatar?: string; bio?: string; coverPhoto?: string };
export type Session = { token: string; user: User; expires_at: string };
const KEY = 'yazoo-native-session';
export async function readSession(): Promise<Session | null> {
  const stored = await SecureStore.getItemAsync(KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Session;
    if (!isSession(value)) { await clearSession(); return null; }
    return value;
  } catch { await clearSession(); return null; }
}
export const saveSession = (value: Session) => SecureStore.setItemAsync(KEY, JSON.stringify(value));
export const clearSession = () => SecureStore.deleteItemAsync(KEY);

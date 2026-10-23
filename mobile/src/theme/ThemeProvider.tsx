import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { BrandLoading } from '../components/auth/BrandLoading';
import { themes, resolveTheme, type ThemePreference } from './tokens';

const ThemeContext = createContext<{ colors: typeof themes.light; preference: ThemePreference; isDark: boolean; setPreference: (value: ThemePreference) => Promise<void> }>({ colors: themes.light, preference: 'system', isDark: false, setPreference: async () => {} });
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setValue] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const resolved = resolveTheme(preference, system);
  const colors = themes[resolved];
  useEffect(() => { void SecureStore.getItemAsync('yazoo-native-theme').then(saved => { if (saved === 'light' || saved === 'dark') setValue(saved); }).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => { void SystemUI.setBackgroundColorAsync(colors.page).catch(() => {}); }, [colors.page]);
  async function setPreference(value: ThemePreference) { await SecureStore.setItemAsync('yazoo-native-theme', value); setValue(value); }
  return <ThemeContext.Provider value={{ colors, preference, isDark: resolved === 'dark', setPreference }}><StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />{ready ? children : <BrandLoading backgroundColor={colors.page} />}</ThemeContext.Provider>;
}

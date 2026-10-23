// Source of truth: frontend/src/index.css (--yz-*), navigation and profile cards.
export const palette = { brand: '#7c3aed', strong: '#6d28d9', soft: '#a855f7', accent: '#d8b4fe', lavender: '#c4b5fd', white: '#ffffff' };
export const themes = {
  light: { page: '#faf7ff', surface: '#ffffff', form: '#ffffff', muted: '#f5f0ff', border: '#e9d5ff', text: '#2f1b45', secondary: '#6b5b7b', danger: '#991b1b', brandText: '#6d28d9' },
  dark: { page: '#10091a', surface: '#160d24', form: '#120a1d', muted: '#211134', border: '#403153', text: '#f7efff', secondary: '#c9bddd', danger: '#fda4af', brandText: '#c4b5fd' },
};
export type Colors = typeof themes.light;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { input: 16, action: 20, dock: 24, header: 26, card: 28 };
export const typography = { title: 24, heading: 20, body: 16, caption: 13 };
export const cardShadow = { shadowColor: palette.brand, shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 };
export type ThemePreference = 'system' | 'light' | 'dark';
export function resolveTheme(preference: ThemePreference, system: string | null | undefined) { return preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference; }

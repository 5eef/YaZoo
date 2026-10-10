import type { Locale } from './messages';

export function deviceLocale(languageCode?: string | null): Locale {
  const language = languageCode?.toLowerCase().split(/[-_]/)[0];
  return language === 'ar' || language === 'en' ? language : 'fr';
}

// A guest follows the phone; an existing session keeps its explicit preference.
export function startupLocale(languageCode: string | null | undefined, saved: string | null, authenticated: boolean): Locale {
  return deviceLocale(authenticated && saved ? saved : languageCode);
}

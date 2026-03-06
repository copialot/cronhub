import { createContext, useContext, useCallback } from 'react';
import { locales, type Locale } from '../i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key) => key,
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function createT(locale: Locale) {
  const messages = locales[locale];
  return (key: string): string => messages[key] || key;
}

export function useT() {
  const { t } = useLocale();
  return useCallback(t, [t]);
}

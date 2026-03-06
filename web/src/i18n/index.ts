import en from './en';
import zhCN from './zh-CN';
import zhTW from './zh-TW';

export type Locale = 'en' | 'zh-CN' | 'zh-TW';

export const locales: Record<Locale, Record<string, string>> = {
  'en': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

export const localeLabels: Record<Locale, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

export function detectLocale(): Locale {
  const saved = localStorage.getItem('cronhub-locale');
  if (saved && saved in locales) return saved as Locale;

  const lang = navigator.language;
  if (lang.startsWith('zh')) {
    if (lang === 'zh-TW' || lang === 'zh-HK' || lang === 'zh-Hant') return 'zh-TW';
    return 'zh-CN';
  }
  return 'en';
}

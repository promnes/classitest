import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Lazy-load translation files: only the active language is loaded on demand,
// saving ~90 KB from the initial bundle for unused languages.
const translationLoaders: Record<string, () => Promise<any>> = {
  ar: () => import('./locales/ar.json').then(m => m.default),
  en: () => import('./locales/en.json').then(m => m.default),
  pt: () => import('./locales/pt.json').then(m => m.default),
};

// Custom lazy backend plugin for i18next
const LazyBackend = {
  type: 'backend' as const,
  init() {},
  read(language: string, namespace: string, callback: (err: any, data: any) => void) {
    const loader = translationLoaders[language];
    if (loader) {
      loader()
        .then((data) => callback(null, data))
        .catch((err) => callback(err, null));
    } else {
      callback(new Error(`No loader for ${language}`), null);
    }
  },
};

const detectedLng = localStorage.getItem('i18nextLng') || 'ar';
const initialLng = detectedLng in translationLoaders ? detectedLng : 'ar';

i18n
  .use(LazyBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ar',
    lng: initialLng,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    partialBundledLanguages: true,
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

if (typeof window !== 'undefined') {
  const savedLng = localStorage.getItem('i18nextLng') || 'ar';
  document.documentElement.dir = savedLng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = savedLng;
}

export default i18n;

/** Map i18n language code to the proper Intl locale string */
export function getDateLocale(): string {
  const map: Record<string, string> = { ar: "ar-EG", en: "en-US", pt: "pt-BR" };
  return map[i18n.language] || "en-US";
}

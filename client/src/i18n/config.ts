import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from './locales/ar.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

const resources = {
  ar: { translation: ar },
  en: { translation: en },
  pt: { translation: pt },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    lng: localStorage.getItem('i18nextLng') || 'ar',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
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

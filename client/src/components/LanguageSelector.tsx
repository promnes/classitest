import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Globe, ChevronDown, Check } from "lucide-react";

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "ar", name: "العربية", nativeName: "العربية" },
    { code: "en", name: "English", nativeName: "English" },
    { code: "pt", name: "Português", nativeName: "Português" },
  ];

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = langCode;
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
          isDark
            ? "bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
            : "bg-white hover:bg-gray-100 text-gray-800 border-2 border-purple-300"
        }`}
        data-testid="button-language-toggle"
      >
        <Globe className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-bold">{currentLang.nativeName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-12 right-0 min-w-max rounded-xl shadow-2xl z-50 overflow-hidden border-2 ${
            isDark
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-purple-300"
          }`}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all ${
                i18n.language === lang.code
                  ? isDark
                    ? "bg-purple-600 text-white font-bold"
                    : "bg-purple-100 text-purple-800 font-bold"
                  : isDark
                    ? "text-gray-200 hover:bg-gray-700"
                    : "text-gray-800 hover:bg-gray-50"
              }`}
              data-testid={`button-language-${lang.code}`}
            >
              <div>
                <p className="font-semibold text-sm">{lang.name}</p>
                <p className="text-xs opacity-70">{lang.nativeName}</p>
              </div>
              {i18n.language === lang.code && (
                <Check className="w-5 h-5 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

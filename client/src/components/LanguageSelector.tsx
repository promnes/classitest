import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Globe, ChevronDown, Check } from "lucide-react";

type MenuPosition = {
  top: number;
  left?: number;
  right?: number;
};

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, right: 0 });

  const languages = [
    { code: "ar", name: "العربية", nativeName: "العربية" },
    { code: "en", name: "English", nativeName: "English" },
    { code: "pt", name: "Português", nativeName: "Português" },
    { code: "es", name: "Español", nativeName: "Español" },
    { code: "fr", name: "Français", nativeName: "Français" },
    { code: "de", name: "Deutsch", nativeName: "Deutsch" },
    { code: "tr", name: "Türkçe", nativeName: "Türkçe" },
    { code: "ru", name: "Русский", nativeName: "Русский" },
    { code: "zh", name: "中文", nativeName: "中文" },
    { code: "hi", name: "हिन्दी", nativeName: "हिन्दी" },
  ];

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = toggleButtonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const isRTL = document.documentElement.dir === "rtl";
      const nextTop = rect.bottom + 8;

      if (isRTL) {
        setMenuPosition({ top: nextTop, left: rect.left });
      } else {
        setMenuPosition({ top: nextTop, right: window.innerWidth - rect.right });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const targetNode = e.target as Node;
      const clickedOutsideTrigger = containerRef.current && !containerRef.current.contains(targetNode);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(targetNode);

      if (clickedOutsideTrigger && clickedOutsideMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = langCode;
    setIsOpen(false);
  };

  return (
    <div className="relative z-[9999]" ref={containerRef}>
      <button
        ref={toggleButtonRef}
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

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={menuPosition}
          className={`fixed min-w-max rounded-xl shadow-2xl z-[10000] overflow-hidden border-2 ${
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
        </div>,
        document.body
      )}
    </div>
  );
};

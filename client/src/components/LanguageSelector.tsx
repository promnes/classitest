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
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`group flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl font-semibold transition-all duration-200 border ${
          isDark
            ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-700"
            : "bg-white hover:bg-indigo-50 text-gray-800 border-indigo-100 shadow-sm"
        }`}
        data-testid="button-language-toggle"
      >
        <Globe className={`w-4.5 h-4.5 ${isDark ? "text-slate-300" : "text-indigo-600"}`} />
        <span className="hidden sm:inline text-sm font-bold tracking-tight">{currentLang.nativeName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-slate-500"}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={menuPosition}
          role="menu"
          className={`fixed min-w-max rounded-2xl shadow-2xl z-[10000] overflow-hidden border backdrop-blur-md ${
            isDark
              ? "bg-slate-900/98 border-slate-700"
              : "bg-white/98 border-indigo-100"
          }`}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              role="menuitemradio"
              aria-checked={i18n.language === lang.code}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-all ${
                i18n.language === lang.code
                  ? isDark
                    ? "bg-indigo-500/20 text-indigo-200 font-bold"
                    : "bg-indigo-50 text-indigo-700 font-bold"
                  : isDark
                    ? "text-gray-200 hover:bg-slate-800"
                    : "text-gray-800 hover:bg-indigo-50/60"
              }`}
              data-testid={`button-language-${lang.code}`}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">{lang.name}</p>
                <p className="text-xs opacity-70 leading-tight">{lang.nativeName}</p>
              </div>
              {i18n.language === lang.code && (
                <Check className="w-4.5 h-4.5 ml-auto" />
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

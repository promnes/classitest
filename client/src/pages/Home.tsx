import React, { useEffect, useRef, useCallback, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { Download, Gamepad2, Star, Sparkles, BookOpen, Trophy } from "lucide-react";

const SlidingAdsCarousel = lazy(() => import("@/components/SlidingAdsCarousel").then(m => ({ default: m.SlidingAdsCarousel })));
const PinEntry = lazy(() => import("@/components/PinEntry").then(m => ({ default: m.PinEntry })));

export const Home = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [familyCode, setFamilyCode] = useState<string | null>(() => localStorage.getItem("familyCode") || null);
  // Compute showLanding synchronously to avoid CLS flash
  const [showLanding, setShowLanding] = useState(() => {
    if (localStorage.getItem("familyCode")) return false;
    if (localStorage.getItem("token")) return false;
    if (localStorage.getItem("childToken")) return false;
    try {
      const saved = localStorage.getItem("savedChildren");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    if (localStorage.getItem("rememberedChild")) return false;
    return true;
  });
  const libraryRef = new URLSearchParams(window.location.search).get("libraryRef")?.trim();
  const parentAuthPath = libraryRef
    ? `/parent-auth?libraryRef=${encodeURIComponent(libraryRef)}`
    : "/parent-auth";

  // Hidden parent access: 5 taps on logo
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      navigate(parentAuthPath);
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1500);
  }, [navigate, parentAuthPath]);

  // Handle redirects for logged-in users (navigation must happen in useEffect)
  useEffect(() => {
    if (familyCode) return; // PIN mode handled by render
    const parentToken = localStorage.getItem("token");
    if (parentToken) {
      navigate("/parent-dashboard");
      return;
    }
    const childToken = localStorage.getItem("childToken");
    if (childToken) {
      navigate("/child-games");
      return;
    }
    const savedChildren = localStorage.getItem("savedChildren");
    if (savedChildren) {
      try {
        const parsed = JSON.parse(savedChildren);
        if (Array.isArray(parsed) && parsed.length > 0) {
          navigate("/child-link");
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    const rememberedChild = localStorage.getItem("rememberedChild");
    if (rememberedChild) {
      navigate("/child-link");
      return;
    }
  }, [navigate, familyCode]);

  // If familyCode exists, show PIN entry screen
  if (familyCode) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-purple-400 via-pink-300 to-yellow-200" />}>
        <PinEntry
          familyCode={familyCode}
          onSwitchAccount={() => {
            // Clear all session data when switching accounts
            localStorage.removeItem("familyCode");
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("childToken");
            localStorage.removeItem("childId");
            localStorage.removeItem("deviceTrusted");
            setFamilyCode(null);
            setShowLanding(true);
          }}
        />
      </Suspense>
    );
  }

  // Don't render landing until checks are done
  if (!showLanding) {
    return <div className="min-h-screen bg-gradient-to-b from-purple-400 via-pink-300 to-yellow-200" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-400 via-pink-300 to-yellow-200 relative overflow-hidden">
      {/* Floating decorations */}
      <div className="absolute top-8 left-8 animate-bounce">
        <Star className="w-8 h-8 text-yellow-400 drop-shadow-lg" fill="currentColor" />
      </div>
      <div className="absolute top-20 right-12 animate-pulse">
        <Sparkles className="w-6 h-6 text-pink-400" />
      </div>
      <div className="absolute bottom-32 left-12 animate-bounce" style={{ animationDelay: "0.3s" }}>
        <Gamepad2 className="w-10 h-10 text-purple-500 drop-shadow-lg" />
      </div>
      <div className="absolute bottom-20 right-8 animate-pulse" style={{ animationDelay: "0.5s" }}>
        <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-lg" fill="currentColor" />
      </div>
      <div className="absolute top-40 left-1/4 animate-bounce" style={{ animationDelay: "0.7s" }}>
        <BookOpen className="w-7 h-7 text-blue-400 drop-shadow-lg" />
      </div>

      {/* Header - minimal kid-friendly */}
      <header className="p-4 flex justify-end items-center gap-2 relative z-10">
        <LanguageSelector />
        <PWAInstallButton variant="compact" />
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="px-3 py-2 bg-white/80 hover:bg-white text-gray-900 rounded-full font-semibold transition-all shadow-md text-lg"
          title="Toggle theme"
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </header>

      {/* Hero - Kid-friendly */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        {/* Logo with hidden parent access (5 taps) */}
        <button
          onClick={handleLogoTap}
          className="mb-2 focus:outline-none"
          aria-label="Classify"
          type="button"
        >
          <img 
            src="/logo.webp" 
            alt="Classify" 
            width={128}
            height={128}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="h-28 w-28 md:h-36 md:w-36 rounded-full shadow-2xl border-4 border-yellow-400 object-cover hover:scale-105 transition-transform"
          />
        </button>
        <p className="text-xs text-purple-500/60 mb-4">
          {t("fiveClickHint")}
        </p>
        
        <h1 className="text-5xl md:text-7xl font-bold text-center bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-3">
          Classify
        </h1>
        <p className="text-2xl font-bold text-center text-purple-700 mb-2">
          {t("welcome")}
        </p>
        <p className="text-lg text-center text-purple-600/80 mb-10">
          {t("letsPlay")}
        </p>

        {/* Single CTA: Start Playing */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => navigate("/child-link")}
            className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-2xl rounded-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3 shadow-xl"
          >
            <Gamepad2 className="w-8 h-8" />
            {t("startPlaying")}
          </button>

          {/* Download App */}
          <a
            href="/apps/classify-app-latest.apk"
            download="Classify-latest.apk"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl shadow-lg transition-all hover:scale-[1.01] font-bold text-lg bg-white/80 hover:bg-white text-purple-700"
          >
            <Download className="w-6 h-6" />
            <span>{t("downloadApp")}</span>
          </a>
          <a
            href="/apps/classify-googleplay-latest.aab"
            download="classify-googleplay-latest.aab"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-2xl shadow-md transition-all hover:scale-[1.01] font-semibold text-base bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="w-5 h-5" />
            <span>Google Play AAB</span>
          </a>
          <p className="text-center text-sm text-purple-500/70">
            {t("home.apkInfo")}
          </p>
        </div>
      </main>

      {/* Ads Section — reserve min-height to prevent CLS */}
      <div className="content-defer">
        <Suspense fallback={<div className="min-h-[12rem]" />}>
          <SlidingAdsCarousel audience="all" variant="home" isDark={isDark} />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-purple-600/70 relative z-10 content-defer">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigate("/privacy-policy"); }} className="hover:underline text-sm"><span aria-hidden="true">🔒</span> {t("home.privacy")}</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); navigate("/terms"); }} className="hover:underline text-sm"><span aria-hidden="true">📋</span> {t("home.terms")}</a>
          <a href="/child-safety" onClick={(e) => { e.preventDefault(); navigate("/child-safety"); }} className="hover:underline text-sm"><span aria-hidden="true">👶</span> {i18n.language === "ar" ? "سلامة الأطفال" : "Child Safety"}</a>
          <a href="/refund-policy" onClick={(e) => { e.preventDefault(); navigate("/refund-policy"); }} className="hover:underline text-sm"><span aria-hidden="true">💰</span> {i18n.language === "ar" ? "الاسترداد" : "Refunds"}</a>
        </div>
        <div className="mb-3">
          <a href="/legal" onClick={(e) => { e.preventDefault(); navigate("/legal"); }} className="text-xs hover:underline opacity-80"><span aria-hidden="true">⚖️</span> {i18n.language === "ar" ? "المركز القانوني" : "Legal Center"}</a>
        </div>
        <p className="text-xs opacity-70">© {new Date().getFullYear()} Classify by Proomnes. {t("home.allRightsReserved")}</p>
      </footer>
    </div>
  );
};

import React, { useEffect, useRef, useCallback, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { Download, Gamepad2, Star, Sparkles, BookOpen, Trophy, ShoppingBag, UserPlus, ShieldCheck, EllipsisVertical } from "lucide-react";

const SlidingAdsCarousel = lazy(() => import("@/components/SlidingAdsCarousel").then(m => ({ default: m.SlidingAdsCarousel })));
const PinEntry = lazy(() => import("@/components/PinEntry").then(m => ({ default: m.PinEntry })));

export const Home = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const isRTL = i18n.language === "ar";
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
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

  useEffect(() => {
    if (!showHeaderMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showHeaderMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setShowHeaderMenu(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    <div
      className="min-h-screen flex flex-col relative overflow-hidden text-slate-900"
      style={{
        fontFamily: '"Baloo 2","Cairo","Segoe UI",sans-serif',
        background:
          "radial-gradient(1200px 520px at 80% -10%, rgba(59,130,246,0.28), transparent), radial-gradient(900px 520px at 8% 20%, rgba(249,115,22,0.20), transparent), linear-gradient(180deg, #b18df0 0%, #e8a4d4 50%, #f2d2a7 100%)",
      }}
    >
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

      {/* Header */}
      <header className="p-4 md:p-5 flex justify-end items-center gap-2 relative z-10">
        <button
          onClick={() => navigate("/child-store")}
          className="hidden md:inline-flex bg-orange-500 hover:bg-orange-600 text-white rounded-full px-3 py-2 font-semibold shadow-md items-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ShoppingBag className="w-4 h-4" />
          {t("store.title", "المتجر")}
        </button>
        <div className="hidden md:block">
          <LanguageSelector />
        </div>
        <div className="hidden md:block">
          <PWAInstallButton variant="compact" />
        </div>
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="hidden md:inline-flex px-3 py-2 bg-white/80 hover:bg-white text-gray-900 rounded-full font-semibold transition-all shadow-md text-lg"
          title="Toggle theme"
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => navigate("/child-store")}
            aria-label={t("store.title", "المتجر")}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-md transition-all duration-200 hover:scale-[1.05] active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label={t("common.more", "المزيد")}
            aria-haspopup="menu"
            aria-expanded={showHeaderMenu}
            aria-controls="home-mobile-actions-menu"
            onClick={() => setShowHeaderMenu((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-white/80 border border-white/60 text-violet-700 inline-flex items-center justify-center shadow-md transition-all duration-200 hover:bg-white hover:scale-[1.05] active:scale-95"
          >
            <EllipsisVertical className="w-5 h-5" />
          </button>
        </div>

        <button
          aria-label={t("common.close", "إغلاق")}
          aria-hidden={!showHeaderMenu}
          className={`md:hidden fixed inset-0 z-20 bg-black/20 transition-opacity duration-200 ${showHeaderMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setShowHeaderMenu(false)}
        />

        <div
          id="home-mobile-actions-menu"
          role="menu"
          aria-hidden={!showHeaderMenu}
          className={`md:hidden absolute top-full mt-2 ${isRTL ? "left-4" : "right-4"} z-30 w-[min(13rem,calc(100vw-0.75rem))] rounded-2xl border border-white/55 bg-white/95 backdrop-blur-xl shadow-2xl p-2 ${isRTL ? "origin-top-left" : "origin-top-right"} transition-all duration-200 ${showHeaderMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
        >
          <div
            style={{ transitionDelay: showHeaderMenu ? "35ms" : "0ms" }}
            className={`px-1 pb-2 transition-all duration-200 ${showHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          >
            <LanguageSelector />
          </div>

          <div className="h-px bg-violet-200/70 my-1" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              toggleTheme();
              setShowHeaderMenu(false);
            }}
            style={{ transitionDelay: showHeaderMenu ? "70ms" : "0ms" }}
            className={`w-full rounded-xl px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 transition-all duration-200 text-start ${showHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          >
            {isDark ? t("home.lightMode", "الوضع الفاتح") : t("home.darkMode", "الوضع الداكن")}
          </button>

          <div
            style={{ transitionDelay: showHeaderMenu ? "105ms" : "0ms" }}
            className={`px-1 pt-2 transition-all duration-200 ${showHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
          >
            <PWAInstallButton variant="compact" className="w-full justify-center" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 px-4 pt-2 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-8 md:pt-6 relative z-10">
        <section className="w-full max-w-6xl mx-auto grid lg:grid-cols-[1.02fr_0.98fr] gap-4">
          <div className="rounded-3xl border border-white/45 bg-white/35 backdrop-blur-xl shadow-2xl p-5 md:p-7">
            <button
              onClick={handleLogoTap}
              className="mb-2 focus:outline-none mx-auto block"
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
                className="h-28 w-28 md:h-36 md:w-36 rounded-full shadow-2xl border-4 border-yellow-400 object-cover hover:scale-105 transition-transform"
              />
            </button>

            <p className="text-xs md:text-sm font-black tracking-wide text-purple-900/95 mb-3 bg-white/70 px-3 py-1 rounded-full shadow-sm w-fit mx-auto">
              {t("fiveClickHint")}
            </p>

            <h1 className="text-5xl md:text-6xl font-black text-center bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 bg-clip-text text-transparent mb-2">
              Classify
            </h1>

            <p className="text-base md:text-lg font-bold text-center text-violet-800 mb-1">
              {t("selectAccountType")}
            </p>
            <p className="text-lg text-center text-violet-700/90 mb-6">
              {t("letsPlay")}
            </p>

            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
              <div className="rounded-2xl border border-white/60 bg-white/60 px-2 py-3 text-center">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 mx-auto text-amber-500 mb-1" />
                <p className="text-[11px] md:text-xs font-bold text-violet-900">{t("rewards")}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/60 px-2 py-3 text-center">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 mx-auto text-cyan-600 mb-1" />
                <p className="text-[11px] md:text-xs font-bold text-violet-900">{t("gamesAndTasks")}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/60 px-2 py-3 text-center">
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 mx-auto text-emerald-600 mb-1" />
                <p className="text-[11px] md:text-xs font-bold text-violet-900">{t("growthTree")}</p>
              </div>
            </div>

            
          </div>

          <div className="rounded-3xl border border-white/45 bg-white/45 backdrop-blur-xl shadow-2xl p-5 md:p-7">
            <p className="text-sm font-black text-violet-800 mb-3">{t("orChoose")}</p>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/child-link")}
                className="w-full rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 text-start shadow-lg hover:shadow-xl transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs opacity-90">{t("existingChild")}</p>
                    <p className="font-black text-lg">{t("haveAccountLogin")}</p>
                  </div>
                  <Gamepad2 className="w-6 h-6 shrink-0" />
                </div>
              </button>

              <button
                onClick={() => navigate(parentAuthPath)}
                className="w-full rounded-2xl border border-violet-200 bg-white text-violet-700 p-4 text-start shadow-md hover:shadow-lg transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs opacity-75">{t("newChild")}</p>
                    <p className="font-extrabold text-lg">{t("createNewAccount")}</p>
                  </div>
                  <UserPlus className="w-6 h-6 shrink-0" />
                </div>
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <a
                href="/apps/classify-app-latest.apk"
                download="Classify-latest.apk"
                className="flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-2xl shadow-md transition-all hover:scale-[1.01] font-bold text-lg bg-white/90 hover:bg-white text-purple-700"
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

              <p className="text-center text-sm text-purple-700/75">{t("home.apkInfo")}</p>
            </div>
          </div>
        </section>
      </main>

      {/* Ads Section — reserve min-height to prevent CLS */}
      <div className="content-defer">
        <Suspense fallback={<div className="min-h-[12rem]" />}>
          <SlidingAdsCarousel audience="all" variant="home" isDark={isDark} />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-purple-600/70 relative z-10 content-defer">
        <p className="text-xs opacity-70">© {new Date().getFullYear()} Classify by Proomnes. {t("home.allRightsReserved")}</p>
      </footer>

      <div
        className="fixed inset-x-4 z-20 md:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => navigate("/child-link")}
          className="w-full min-h-12 py-3.5 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black text-base rounded-2xl shadow-2xl ring-1 ring-white/40 backdrop-blur-sm flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <Gamepad2 className="w-5 h-5" />
          {t("startPlaying")}
        </button>
      </div>
    </div>
  );
};

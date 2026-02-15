import React, { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { SlidingAdsCarousel } from "@/components/SlidingAdsCarousel";
import { PinEntry } from "@/components/PinEntry";
import { Download, Gamepad2, Star, Sparkles, BookOpen, Trophy } from "lucide-react";

export const Home = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(false);
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

  // Check for familyCode or existing sessions
  useEffect(() => {
    // If familyCode exists, always show PIN entry (shared device mode)
    const storedFamilyCode = localStorage.getItem("familyCode");
    if (storedFamilyCode) {
      setFamilyCode(storedFamilyCode);
      return;
    }
    // If already logged in as parent, go to dashboard
    const parentToken = localStorage.getItem("token");
    if (parentToken) {
      navigate("/parent-dashboard");
      return;
    }
    // If child already logged in, go to games
    const childToken = localStorage.getItem("childToken");
    if (childToken) {
      navigate("/child-games");
      return;
    }
    // If saved children exist (legacy), redirect to child-link
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
    // Show landing page
    setShowLanding(true);
  }, [navigate]);

  // If familyCode exists, show PIN entry screen
  if (familyCode) {
    return (
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
          className="mb-6 focus:outline-none"
          aria-label="Classify"
          type="button"
        >
          <img 
            src="/logo.jpg" 
            alt="Classify" 
            width={128}
            height={128}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="h-28 w-28 md:h-36 md:w-36 rounded-full shadow-2xl border-4 border-yellow-400 object-cover animate-bounce"
          />
        </button>
        
        <h1 className="text-5xl md:text-7xl font-bold text-center bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-3">
          Classify
        </h1>
        <p className="text-2xl font-bold text-center text-purple-700 mb-2">
          {t("welcome")}
        </p>
        <p className="text-lg text-center text-purple-600/80 mb-10">
          {t("letsPlay") || "هيا نلعب ونتعلم! 🎮"}
        </p>

        {/* Single CTA: Start Playing */}
        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => navigate("/child-link")}
            className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-2xl rounded-2xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3 shadow-xl"
          >
            <Gamepad2 className="w-8 h-8" />
            {t("startPlaying") || "ابدأ اللعب! 🚀"}
          </button>

          {/* Download App */}
          <a
            href="/classify-app.apk"
            download="Classify.apk"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl shadow-lg transition-all hover:scale-[1.01] font-bold text-lg bg-white/80 hover:bg-white text-purple-700"
          >
            <Download className="w-6 h-6" />
            <span>📱 {t("downloadApp")}</span>
          </a>
          <p className="text-center text-sm text-purple-500/70">
            Android APK • 6 MB
          </p>
        </div>
      </main>

      {/* Ads Section */}
      <SlidingAdsCarousel audience="all" variant="home" isDark={isDark} />

      {/* Footer */}
      <footer className="text-center py-6 text-purple-600/70 relative z-10">
        <div className="flex justify-center gap-6 mb-4">
          <button onClick={() => navigate("/privacy")} className="hover:underline text-sm">
            🔒 Privacy
          </button>
          <button onClick={() => navigate("/terms")} className="hover:underline text-sm">
            📋 Terms
          </button>
        </div>
        <p className="text-xs opacity-70">© 2024 Classify by proomnes. All rights reserved.</p>
      </footer>
    </div>
  );
};

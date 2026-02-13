import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

// ===== Home Ads Carousel (public, no auth) =====
function HomeAdsCarousel({ isDark }: { isDark: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: adsData } = useQuery<any[]>({
    queryKey: ["/api/ads", "all"],
    queryFn: async () => {
      const res = await fetch("/api/ads?audience=all");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const adsList = Array.isArray(adsData) ? adsData : [];

  // Auto-rotate every 5s
  useEffect(() => {
    if (adsList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % adsList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [adsList.length]);

  // Track view
  useEffect(() => {
    const ad = adsList[currentIndex];
    if (ad) {
      fetch(`/api/ads/${ad.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [currentIndex, adsList]);

  const handleClick = useCallback((ad: any) => {
    fetch(`/api/ads/${ad.id}/click`, { method: "POST" }).catch(() => {});
    if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
    }
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % adsList.length);
  }, [adsList.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + adsList.length) % adsList.length);
  }, [adsList.length]);

  if (adsList.length === 0) return null;

  const currentAd = adsList[currentIndex];

  return (
    <section className={`px-4 py-10 ${isDark ? "bg-gray-800/50" : "bg-white/10"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? "bg-amber-500/20" : "bg-white/20"}`}>
            <Megaphone className={`h-5 w-5 ${isDark ? "text-amber-400" : "text-yellow-300"}`} />
          </div>
          <h2 className="text-2xl font-bold text-white">إعلانات</h2>
          {adsList.length > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/70 mr-2">
              {currentIndex + 1}/{adsList.length}
            </span>
          )}
        </div>

        {/* Card */}
        <div
          className={`relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer group ring-1 ${isDark ? "bg-gray-800 ring-gray-700" : "bg-white/90 backdrop-blur ring-white/20"}`}
          onClick={() => handleClick(currentAd)}
        >
          {currentAd.imageUrl ? (
            <div className="relative">
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="w-full h-48 sm:h-60 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6">
                <h3 className="text-white font-bold text-xl leading-tight drop-shadow-md">{currentAd.title}</h3>
                <p className="text-white/80 text-sm mt-1.5 line-clamp-2">{currentAd.content}</p>
                {currentAd.linkUrl && (
                  <div className="flex items-center gap-1.5 mt-2 text-white/60 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    <span>عرض التفاصيل</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`p-8 ${isDark ? "" : ""}`}>
              <h3 className={`font-bold text-xl ${isDark ? "text-white" : "text-gray-900"}`}>{currentAd.title}</h3>
              <p className={`text-sm mt-2 leading-relaxed line-clamp-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {currentAd.content}
              </p>
              {currentAd.linkUrl && (
                <div className={`flex items-center gap-1.5 mt-3 text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                  <ExternalLink className="h-3 w-3" />
                  <span>عرض التفاصيل</span>
                </div>
              )}
            </div>
          )}

          {/* Nav Arrows */}
          {adsList.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {adsList.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {adsList.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "w-7 bg-yellow-400"
                    : "w-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export const Home = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const libraryRef = new URLSearchParams(window.location.search).get("libraryRef")?.trim();
  const parentAuthPath = libraryRef
    ? `/parent-auth?libraryRef=${encodeURIComponent(libraryRef)}`
    : "/parent-auth";

  return (
    <div className={`min-h-screen flex flex-col ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"
        : "bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700"
    }`}>
      {/* Header */}
      <header className="p-4 md:p-6 bg-gradient-to-r from-purple-700 to-purple-800 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src="/logo.jpg" 
                alt="Classify" 
                width={56}
                height={56}
                decoding="async"
                loading="eager"
                className="h-14 w-14 rounded-full shadow-lg border-4 border-yellow-400 object-cover"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
                ✓
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wider">Classify</h1>
              <p className="text-sm text-purple-200 font-semibold">by proomnes 🚀</p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <LanguageSelector />
            <PWAInstallButton 
              variant="default" 
              size="default"
              showText={true}
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-4 py-2 font-semibold shadow-md hover:shadow-lg"
            />
            <button
              onClick={toggleTheme}
              type="button"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-full font-semibold transition-all shadow-md hover:shadow-lg text-lg"
              title="Toggle theme"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="flex items-center gap-6 mb-4">
          <img 
            src="/logo.jpg" 
            alt="Classify Logo" 
            width={128}
            height={128}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="h-24 w-24 md:h-32 md:w-32 rounded-full shadow-2xl border-4 border-yellow-400 object-cover animate-bounce"
          />
          <h1 className={`text-4xl md:text-6xl font-bold text-center ${
            isDark ? "text-white" : "text-white"
          }`}>
            Classify
          </h1>
        </div>
        <p className={`text-2xl font-bold text-center mb-4 ${
          isDark ? "text-blue-400" : "text-blue-100"
        }`}>
          {t("welcome")}
        </p>
        <p className={`text-lg text-center mb-12 ${
          isDark ? "text-gray-300" : "text-blue-100"
        }`}>
          {t("smartParentalControl")}
        </p>

        {/* Account Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          {/* Parent - Red Card */}
          <button
            onClick={() => navigate(parentAuthPath)}
            className={`${
              isDark ? "bg-red-900 hover:bg-red-800" : "bg-white hover:shadow-xl"
            } rounded-2xl p-8 shadow-lg transition-all hover:-translate-y-1 border-4 border-red-500`}
          >
            <div className="text-6xl mb-4">👨‍💼</div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-red-300" : "text-red-600"}`}>
              {t("parentTitle")}
            </h2>
            <p className={isDark ? "text-red-200" : "text-red-700"}>{t("manageChildTasks")}</p>
          </button>

          {/* Child - Green Card */}
          <button
            onClick={() => navigate("/child-link")}
            className={`${
              isDark ? "bg-green-900 hover:bg-green-800" : "bg-white hover:shadow-xl"
            } rounded-2xl p-8 shadow-lg transition-all hover:-translate-y-1 border-4 border-green-500`}
          >
            <div className="text-6xl mb-4">👧</div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-green-300" : "text-green-600"}`}>
              {t("childTitle")}
            </h2>
            <p className={isDark ? "text-green-200" : "text-green-700"}>{t("gamesAndTasks")}</p>
          </button>
        </div>
      </main>

      {/* Ads Section */}
      <HomeAdsCarousel isDark={isDark} />

      {/* Footer */}
      <footer className={`text-center py-6 ${isDark ? "text-gray-300" : "text-purple-100"}`}>
        <div className="flex justify-center gap-6 mb-4">
          <button onClick={() => navigate("/privacy")} className="hover:underline text-sm">
            🔒 Privacy
          </button>
          <button onClick={() => navigate("/terms")} className="hover:underline text-sm">
            📋 Terms
          </button>
        </div>
        <p className="text-xs opacity-70">© 2024 Classify by proomnes. All rights reserved. v1.0.0</p>
      </footer>
    </div>
  );
};

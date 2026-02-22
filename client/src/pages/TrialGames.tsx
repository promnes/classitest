import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { Gamepad2, Star, Play, Lock, ArrowLeft, X, Loader2, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const TRIAL_STORAGE_KEY = "classify_trial_games_played";

interface Game {
  id: string;
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  pointsPerPlay: number;
  isActive: boolean;
}

function getTriedGames(): string[] {
  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markGameAsTried(embedUrl: string) {
  const tried = getTriedGames();
  if (!tried.includes(embedUrl)) {
    tried.push(embedUrl);
    localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(tried));
  }
}

export const TrialGames = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [triedGames, setTriedGames] = useState<string[]>(getTriedGames());
  const isRTL = i18n.language === "ar";

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["trial-games"],
    queryFn: async () => {
      const res = await fetch("/api/games");
      const json = await res.json();
      return json?.data || json || [];
    },
  });

  // Check if all games are tried — redirect to login
  useEffect(() => {
    if (!games || games.length === 0) return;
    const allTried = games.every((g) => triedGames.includes(g.embedUrl));
    if (allTried) {
      navigate("/child-link");
    }
  }, [games, triedGames, navigate]);

  // Listen for GAME_COMPLETE from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin && e.origin !== "null") return;
      if (e.data?.type === "GAME_COMPLETE") {
        setGameCompleted(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handlePlayGame = (game: Game) => {
    if (triedGames.includes(game.embedUrl)) return;
    setSelectedGame(game);
    setGameCompleted(false);
    setIframeLoading(true);
    setShowLoginPrompt(false);
  };

  const handleCloseGame = () => {
    if (selectedGame) {
      markGameAsTried(selectedGame.embedUrl);
      setTriedGames(getTriedGames());
    }
    setSelectedGame(null);
    setGameCompleted(false);
    setIframeLoading(false);
    setShowLoginPrompt(true);
  };

  const availableGames = games?.filter((g) => !triedGames.includes(g.embedUrl)) ?? [];
  const triedCount = games ? games.filter((g) => triedGames.includes(g.embedUrl)).length : 0;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-purple-600 via-blue-600 to-cyan-500"}`}>
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-lg bg-white/10 border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/child-link")}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-6 h-6" />
              {t("trialGames.title")}
            </h1>
            <p className="text-white/70 text-xs mt-0.5">
              {t("trialGames.subtitle")}
            </p>
          </div>
          <button
            onClick={() => navigate("/child-link")}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold flex items-center gap-1 hover:scale-105 transition-transform"
          >
            <LogIn className="w-3.5 h-3.5" />
            {t("trialGames.login")}
          </button>
        </div>
      </div>

      {/* Trial info banner */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className={`${isDark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50/90 border-yellow-300"} border rounded-2xl px-4 py-3 text-center`}>
          <p className={`text-sm font-medium ${isDark ? "text-yellow-300" : "text-yellow-800"}`}>
            ⭐ {t("trialGames.info")}
          </p>
          {games && games.length > 0 && (
            <p className={`text-xs mt-1 ${isDark ? "text-yellow-400/70" : "text-yellow-600"}`}>
              {t("trialGames.progress", { tried: triedCount, total: games.length })}
            </p>
          )}
        </div>
      </div>

      {/* Games grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {games?.map((game, index) => {
              const isTried = triedGames.includes(game.embedUrl);
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={!isTried ? { y: -4, scale: 1.03 } : {}}
                  onClick={() => !isTried && handlePlayGame(game)}
                  className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl overflow-hidden shadow-md transition-transform relative ${
                    isTried ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"
                  }`}
                >
                  {/* Tried overlay */}
                  {isTried && (
                    <div className="absolute inset-0 z-10 bg-black/40 flex flex-col items-center justify-center rounded-xl">
                      <Lock className="w-8 h-8 text-white/80 mb-1" />
                      <p className="text-white text-xs font-bold">{t("trialGames.alreadyTried")}</p>
                    </div>
                  )}

                  <div className={`aspect-[4/3] ${isDark ? "bg-gray-700" : "bg-purple-100"} flex items-center justify-center relative overflow-hidden`}>
                    {game.thumbnailUrl ? (
                      <img src={game.thumbnailUrl} alt={game.title} className="w-full h-full object-cover" />
                    ) : game.embedUrl === "/games/memory-match.html" ? (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-5xl drop-shadow-lg">🧠</span>
                      </div>
                    ) : game.embedUrl === "/games/math-challenge.html" ? (
                      <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <span className="text-5xl drop-shadow-lg">🔢</span>
                      </div>
                    ) : game.embedUrl === "/games/gem-kingdom.html" ? (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-5xl drop-shadow-lg">💎</span>
                      </div>
                    ) : (
                      <Gamepad2 className="w-12 h-12 text-purple-400" />
                    )}
                    {!isTried && (
                      <div className="absolute top-2 left-2 bg-orange-500/90 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        {t("trialGames.freePlay")}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className={`font-bold text-sm mb-1 truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                      {game.title}
                    </h3>
                    {game.description && (
                      <p className={`text-xs mb-2 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {game.description}
                      </p>
                    )}
                    <div
                      className={`w-full px-3 py-2 font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs ${
                        isTried
                          ? "bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      }`}
                    >
                      {isTried ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          {t("trialGames.played")}
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          {t("trialGames.tryNow")}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Sign up CTA at bottom */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/child-link")}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-xl transition-all flex items-center gap-3 mx-auto"
          >
            <LogIn className="w-6 h-6" />
            {t("trialGames.loginFull")}
          </button>
        </div>
      </div>

      {/* Game iframe modal */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col z-50">
          <div className={`flex items-center justify-between px-4 py-2 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shrink-0`}>
            <h3 className={`text-lg font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
              {selectedGame.title}
            </h3>
            <div className="flex items-center gap-3 shrink-0">
              <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-bold">
                {t("trialGames.trialMode")}
              </span>
              <button
                onClick={handleCloseGame}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-black relative min-h-0">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">{t("childGames.loadingGame")}</p>
                </div>
              </div>
            )}
            <iframe
              src={`${selectedGame.embedUrl}${selectedGame.embedUrl.includes("?") ? "&" : "?"}lang=${i18n.language}&trial=1`}
              className="w-full h-full border-0"
              allowFullScreen
              title={selectedGame.title}
              onLoad={() => setIframeLoading(false)}
            />
          </div>

          <div className={`px-4 py-3 flex flex-col items-center gap-2 shrink-0 ${isDark ? "bg-gray-800" : "bg-white"}`}>
            {gameCompleted ? (
              <div className="text-center">
                <p className={`text-sm font-bold mb-2 ${isDark ? "text-green-400" : "text-green-600"}`}>
                  🎉 {t("trialGames.greatJob")}
                </p>
                <button
                  onClick={handleCloseGame}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 mx-auto transition-all"
                >
                  <LogIn className="w-5 h-5" />
                  {t("trialGames.loginToSave")}
                </button>
              </div>
            ) : (
              <p className={`text-sm animate-pulse ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                🎮 {t("trialGames.playing")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Login prompt overlay — shown after closing a trial game */}
      <AnimatePresence>
        {showLoginPrompt && !selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: "spring", damping: 20 }}
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-3">🌟</div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("trialGames.loginPrompt.title")}
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("trialGames.loginPrompt.message")}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/child-link")}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  <LogIn className="w-5 h-5" />
                  {t("trialGames.loginPrompt.loginBtn")}
                </button>
                {availableGames.length > 0 && (
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className={`w-full py-3 ${isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"} font-bold text-sm rounded-2xl transition-all`}
                  >
                    {t("trialGames.loginPrompt.tryAnother", { count: availableGames.length })}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrialGames;

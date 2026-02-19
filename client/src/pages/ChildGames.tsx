import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import { GrowthTree } from "@/components/GrowthTree";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { useChildAuth } from "@/hooks/useChildAuth";
import { Gamepad2, Star, Gift, Bell, ShoppingBag, X, Trophy, Play, BookOpen, TrendingUp, LogOut, TreePine, Settings, User, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Game {
  id: string;
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  pointsPerPlay: number;
  isActive: boolean;
}

export const ChildGames = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { logout, isLoggingOut, handleAuthError } = useChildAuth();
  const token = localStorage.getItem("childToken");
  const queryClient = useQueryClient();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showReward, setShowReward] = useState<{ points: number; total: number } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [gameResult, setGameResult] = useState<{ score: number; total: number } | null>(null);

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/games", { headers });
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: childInfo, isLoading: isChildInfoLoading } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleAuthError();
        throw new Error("Unauthorized");
      }
      if (!res.ok) {
        throw new Error("Failed to load child info");
      }
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
  });

  // Listen for game completion messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'GAME_COMPLETE' && typeof e.data.score === 'number') {
        setGameResult({ score: e.data.score, total: e.data.total || 10 });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const completeGameMutation = useMutation({
    mutationFn: async ({ gameId, score, totalQuestions }: { gameId: string; score?: number; totalQuestions?: number }) => {
      const res = await fetch("/api/child/complete-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameId, score, totalQuestions }),
      });
      if (!res.ok) {
        throw new Error("Failed to complete game");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["child-info"] });
      const d = data?.data || data;
      setShowReward({ points: d.pointsEarned, total: d.newTotalPoints });
      setSelectedGame(null);
      setGameResult(null);
      setTimeout(() => setShowReward(null), 3000);
    },
  });

  if (!token || isChildInfoLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
        <div className="text-center">
          <Loader2 className={`w-10 h-10 animate-spin mx-auto mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`} />
          <p className={isDark ? "text-gray-300" : "text-gray-600"}>{t("loading") || "جاري التحقق..."}</p>
        </div>
      </div>
    );
  }

  const handlePlayGame = (game: Game) => {
    setSelectedGame(game);
    setGameResult(null);
  };

  const handleCompleteGame = () => {
    if (selectedGame && gameResult) {
      completeGameMutation.mutate({
        gameId: selectedGame.id,
        score: gameResult.score,
        totalQuestions: gameResult.total,
      });
    }
  };

  const isRTL = i18n.language === 'ar';

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-purple-900 to-indigo-900" : "bg-gradient-to-br from-purple-400 to-purple-600"} p-4`} dir={isRTL ? "rtl" : "ltr"}>
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}
      
      <div className="max-w-6xl mx-auto mb-8 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="cursor-pointer" onClick={() => navigate("/child-profile")}>
            <Avatar className={`w-12 h-12 border-2 ${isDark ? "border-purple-300" : "border-white/70"} shadow-lg`}>
              <AvatarImage src={childInfo?.avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-lg font-bold">
                {childInfo?.name?.charAt(0) || "؟"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {isRTL ? `مرحباً ${childInfo?.name || ""} 👋` : `Hi ${childInfo?.name || ""} 👋`}
            </h1>
            <p className="text-white text-opacity-80 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              {t("pointsLabel")} {childInfo?.totalPoints || 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <LanguageSelector />
          <PWAInstallButton 
            variant="outline" 
            size="sm" 
            showText={false}
            className="bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-400 rounded-xl px-4 py-3"
          />
          <ChildNotificationBell />
          <button
            onClick={() => navigate("/child-gifts")}
            className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg transition-all"
            data-testid="button-child-gifts"
          >
            <Gift className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/child-store")}
            className="px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
            data-testid="button-child-store"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/child-settings")}
            className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl shadow-lg transition-all"
            data-testid="button-child-settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-all"
            data-testid="button-child-logout"
            disabled={isLoggingOut}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 max-w-sm w-full text-center`}
            >
              <LogOut className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`} />
              <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("logoutTitle")}
              </h2>
              <p className={`mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {t("logoutConfirmMessage")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className={`flex-1 px-4 py-3 ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} font-bold rounded-xl transition-all`}
                  data-testid="button-cancel-logout"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                  data-testid="button-confirm-logout"
                >
                  {isLoggingOut ? t("loggingOutProgress") : t("confirmLogout")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Growth Tree Section */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <GrowthTree />
          </div>
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className={`p-6 rounded-2xl ${isDark ? "bg-gray-800/80" : "bg-white/80"} backdrop-blur-sm shadow-lg`}>
              <div className="flex items-center gap-3 mb-4">
                <TreePine className="w-8 h-8 text-green-500" />
                <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("child.yourJourney")}
                </h2>
              </div>
              <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {t("child.growthTreeDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games?.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl overflow-hidden shadow-lg cursor-pointer`}
              data-testid={`game-card-${game.id}`}
            >
              <div className={`aspect-video ${isDark ? "bg-gray-700" : "bg-purple-200"} flex items-center justify-center relative overflow-hidden`}>
                {game.thumbnailUrl ? (
                  <img src={game.thumbnailUrl} alt={game.title} className="w-full h-full object-cover" />
                ) : (
                  <Gamepad2 className="w-20 h-20 text-purple-500" />
                )}
                <div className="absolute top-3 left-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  +{game.pointsPerPlay}
                </div>
              </div>
              <div className="p-5">
                <h3 className={`font-bold text-xl mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {game.title}
                </h3>
                {game.description && (
                  <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {game.description}
                  </p>
                )}
                <motion.button 
                  onClick={() => handlePlayGame(game)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                  data-testid={`button-play-${game.id}`}
                >
                  <Play className="w-5 h-5" />
                  {t("playNow")}
                </motion.button>
              </div>
            </motion.div>
          ))}
          
          {(!games || games.length === 0) && (
            <div className="col-span-full text-center py-12">
              <Gamepad2 className="w-24 h-24 mx-auto mb-4 text-white opacity-50" />
              <p className="text-white text-xl">{t("noGamesAvailable")}</p>
              <p className="text-white text-opacity-70 mt-2">{t("gamesComingSoon")}</p>
            </div>
          )}
        </div>
      )}

      {selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden`}>
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                {selectedGame.title}
              </h3>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  +{selectedGame.pointsPerPlay} {t("pointsEarned")}
                </span>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                  data-testid="button-close-game"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={selectedGame.embedUrl}
                className="w-full h-full"
                allowFullScreen
                title={selectedGame.title}
              />
            </div>
            <div className="p-4 flex flex-col items-center gap-3">
              {gameResult ? (
                <>
                  <p className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    🎯 {isRTL ? `نتيجتك: ${gameResult.score} من ${gameResult.total}` : `Your score: ${gameResult.score}/${gameResult.total}`}
                  </p>
                  <button
                    onClick={handleCompleteGame}
                    disabled={completeGameMutation.isPending}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all"
                    data-testid="button-complete-game"
                  >
                    {completeGameMutation.isPending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Trophy className="w-5 h-5" />
                        {t("finishedGame")}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <p className={`text-sm animate-pulse ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  🎮 {isRTL ? "أكمل اللعبة للحصول على النقاط..." : "Complete the game to earn points..."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showReward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-8 rounded-3xl shadow-2xl"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  <Trophy className="w-16 h-16 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">{t("wellDone")}</h2>
                <motion.p 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl"
                >
                  {t("earnedPoints", { points: showReward.points })}
                </motion.p>
                <p className="text-lg opacity-90">{t("totalPoints", { total: showReward.total })}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import { GrowthTree } from "@/components/GrowthTree";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { useChildAuth } from "@/hooks/useChildAuth";
import { Gamepad2, Star, Gift, Bell, ShoppingBag, X, Trophy, Play, BookOpen, TrendingUp, LogOut, Settings, User, Loader2, Share2, Link2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const token = localStorage.getItem("childToken");
  const queryClient = useQueryClient();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showReward, setShowReward] = useState<{ points: number; total: number } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [gameResult, setGameResult] = useState<{ score: number; total: number } | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [gameShared, setGameShared] = useState(false);
  const [sharedGameData, setSharedGameData] = useState<{ gameName: string; score: number; stars: number } | null>(null);

  // Refs for stable access in postMessage handler
  const selectedGameRef = useRef<Game | null>(null);
  useEffect(() => { selectedGameRef.current = selectedGame; }, [selectedGame]);
  const langRef = useRef(i18n.language);
  useEffect(() => { langRef.current = i18n.language; }, [i18n.language]);

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/games", { headers });
      const json = await res.json();
      return json?.data || json || [];
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

  // Listen for game completion & share messages from iframe (origin-validated)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Validate origin: only accept messages from our own domain
      const allowedOrigin = window.location.origin;
      if (e.origin !== allowedOrigin && e.origin !== 'null') return;
      if (e.data?.type === 'GAME_COMPLETE' && typeof e.data.score === 'number') {
        const score = Math.max(0, Math.min(e.data.score, 10000)); // clamp
        const total = Math.max(1, Math.min(e.data.total || 10, 10000));
        setGameResult({ score, total });
      }
      // Handle achievement sharing to child profile — rich game card post (share once per session)
      if (e.data?.type === 'SHARE_ACHIEVEMENT' && token) {
        const { game, level, score, stars, world } = e.data;
        const currentGame = selectedGameRef.current;
        if (!currentGame) return;

        (async () => {
          try {
            // Check if this game result was already shared in this session
            const postsRes = await fetch("/api/child/posts", {
              headers: { Authorization: `Bearer ${token}` },
            });
            let previousScore: number | null = null;
            let alreadySharedThisGame = false;
            if (postsRes.ok) {
              const postsJson = await postsRes.json();
              const posts = postsJson.data || postsJson || [];
              for (const p of posts) {
                if (p.content?.startsWith('###GAME_SHARE###')) {
                  try {
                    const jsonStr = p.content.replace('###GAME_SHARE###', '').replace('###END_GAME_SHARE###', '');
                    const shareData = JSON.parse(jsonStr);
                    if (shareData.gameUrl === currentGame.embedUrl) {
                      // Found existing share for this game — update score tracking but don't re-post
                      if (shareData.score === (score || 0)) {
                        alreadySharedThisGame = true;
                      }
                      if (previousScore === null) previousScore = shareData.score;
                      break;
                    }
                  } catch {}
                }
              }
            }

            if (alreadySharedThisGame) {
              // Already shared this exact result — just show social sharing buttons
              const isAr = langRef.current === 'ar';
              setGameShared(true);
              setSharedGameData({ gameName: currentGame.title, score: score || 0, stars: stars || 0 });
              toast({
                title: isAr ? '📱 شارك إنجازك!' : '📱 Share your achievement!',
                description: isAr ? 'تم النشر مسبقاً — استخدم أزرار المشاركة أدناه' : 'Already posted — use share buttons below',
              });
              return;
            }

            // Determine game emoji
            const gameEmoji = currentGame.embedUrl.includes('memory') ? '🧠' :
                              currentGame.embedUrl.includes('math') ? '🔢' : '🎮';

            // Generate motivational text
            const isAr = langRef.current === 'ar';
            let motivationalText = '';
            if ((stars || 0) >= 3) motivationalText = isAr ? 'ممتاز! أداء رائع! 🏆' : 'Excellent! Amazing performance! 🏆';
            else if ((stars || 0) >= 2) motivationalText = isAr ? 'عمل رائع! استمر! 🎉' : 'Great job! Keep going! 🎉';
            else if ((stars || 0) >= 1) motivationalText = isAr ? 'جيد! حاول مرة أخرى للأفضل 💪' : 'Good! Try again for better! 💪';
            else motivationalText = isAr ? 'لا تستسلم! حاول مرة أخرى 💪' : "Don't give up! Try again! 💪";

            // Build rich post content
            const gameShareData = {
              gameId: currentGame.id,
              gameName: currentGame.title,
              gameEmoji,
              gameUrl: currentGame.embedUrl,
              thumbnailUrl: currentGame.thumbnailUrl,
              score: score || 0,
              stars: stars || 0,
              level: level || 1,
              world: world || 1,
              previousScore,
              motivationalText,
            };

            const content = `###GAME_SHARE###${JSON.stringify(gameShareData)}###END_GAME_SHARE###`;

            await fetch("/api/child/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ content, mediaUrls: [], mediaTypes: [] }),
            });

            // Track that we shared this game
            setGameShared(true);
            setSharedGameData({ gameName: currentGame.title, score: score || 0, stars: stars || 0 });

            // Show success toast
            toast({
              title: isAr ? '✅ تم النشر!' : '✅ Posted!',
              description: isAr ? 'تم مشاركة إنجازك — شاركه مع أصدقائك!' : 'Achievement shared — share it with friends!',
            });
          } catch {}
        })();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [token, toast]);

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
      setMutationError(null);
      setTimeout(() => setShowReward(null), 3000);
    },
    onError: (error: Error) => {
      const msg = error.message || "";
      if (msg.includes("Daily play limit")) {
        setMutationError(t("childGames.dailyLimitReached"));
      } else {
        setMutationError(t("childGames.errorTryAgain"));
      }
      setTimeout(() => setMutationError(null), 4000);
    },
  });

  // Close game modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedGame) {
        setSelectedGame(null);
        setGameResult(null);
        setMutationError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGame]);

  // Auto-play game from URL params (from shared game post play button)
  useEffect(() => {
    if (!games || games.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const autoPlayUrl = params.get('autoPlay');
    if (autoPlayUrl) {
      const game = games.find(g => g.embedUrl === autoPlayUrl || g.embedUrl.includes(autoPlayUrl));
      if (game) {
        setSelectedGame(game);
        setGameResult(null);
        setMutationError(null);
        setIframeLoading(true);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [games]);

  if (!token || isChildInfoLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
        <div className="text-center">
          <Loader2 className={`w-10 h-10 animate-spin mx-auto mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`} />
          <p className={isDark ? "text-gray-300" : "text-gray-600"}>{t("childGames.checking")}</p>
        </div>
      </div>
    );
  }

  const handlePlayGame = (game: Game) => {
    setSelectedGame(game);
    setGameResult(null);
    setMutationError(null);
    setIframeLoading(true);
    setGameShared(false);
    setSharedGameData(null);
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
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900" : "bg-gradient-to-br from-purple-400 via-purple-500 to-indigo-500"} p-3 sm:p-4`} dir={isRTL ? "rtl" : "ltr"}>
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}
      
      <div className="max-w-6xl mx-auto mb-4 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => navigate("/child-profile")} role="button" tabIndex={0} aria-label="Go to profile" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/child-profile"); } }}>
            <Avatar className={`w-10 h-10 border-2 ${isDark ? "border-purple-300" : "border-white/70"} shadow-lg`}>
              <AvatarImage src={childInfo?.avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-base font-bold">
                {childInfo?.name?.charAt(0) || "؟"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t("childGames.greeting", { name: childInfo?.name || "" })}
            </h1>
            <p className="text-white text-opacity-80 flex items-center gap-1.5 text-sm">
              <Star className="w-4 h-4 text-yellow-400" />
              {t("pointsLabel")} {childInfo?.totalPoints || 0}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <LanguageSelector />
          <PWAInstallButton 
            variant="outline" 
            size="sm" 
            showText={false}
            className="bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-400 rounded-xl px-3 py-2.5"
          />
          <ChildNotificationBell />
          <button
            onClick={() => navigate("/child-gifts")}
            className="px-3 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-md transition-all"
            data-testid="button-child-gifts"
          >
            <Gift className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/child-store")}
            className="px-3 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
            data-testid="button-child-store"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/child-settings")}
            className="px-3 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl shadow-md transition-all"
            data-testid="button-child-settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all"
            data-testid="button-child-logout"
            disabled={isLoggingOut}
          >
            <LogOut className="w-4 h-4" />
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
      <div className="max-w-6xl mx-auto mb-6">
        <GrowthTree />
      </div>

      {/* Games Section Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-white/80" />
          <h2 className="text-xl font-bold text-white">{t("gamesLabel") || t("gamesAndTasks")}</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {games?.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.03 }}
              onClick={() => handlePlayGame(game)}
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl overflow-hidden shadow-md cursor-pointer active:scale-95 transition-transform`}
              data-testid={`game-card-${game.id}`}
            >
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
                ) : (
                  <Gamepad2 className="w-12 h-12 text-purple-400" />
                )}
                <div className="absolute top-2 left-2 bg-yellow-500/90 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  +{game.pointsPerPlay}
                </div>
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
                  className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t("playNow")}
                </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col z-50">
          <div className={`flex items-center justify-between px-4 py-2 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shrink-0`}>
              <h3 className={`text-lg font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                {selectedGame.title}
              </h3>
              <div className="flex items-center gap-3 shrink-0">
                <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  +{selectedGame.pointsPerPlay} {t("pointsEarned")}
                </span>
                <button
                  onClick={() => { setSelectedGame(null); setGameResult(null); setMutationError(null); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                  data-testid="button-close-game"
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
                src={`${selectedGame.embedUrl}${selectedGame.embedUrl.includes('?') ? '&' : '?'}lang=${i18n.language}`}
                className="w-full h-full border-0"
                allowFullScreen
                title={selectedGame.title}
                onLoad={() => setIframeLoading(false)}
                {...(!selectedGame.embedUrl.startsWith("/") ? { sandbox: "allow-scripts allow-same-origin allow-popups" } : {})}
              />
          </div>
          <div className={`px-4 py-2 flex flex-col items-center gap-2 shrink-0 ${isDark ? "bg-gray-800" : "bg-white"}`}>
              {mutationError && (
                <div className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-center">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">{mutationError}</p>
                </div>
              )}
              {gameResult ? (
                <>
                  <p className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    🎯 {t("childGames.yourScore", { score: gameResult.score, total: gameResult.total })}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
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
                  </div>
                  {/* Social sharing buttons */}
                  {gameShared && sharedGameData && (
                    <div className="w-full mt-2">
                      <p className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        <Share2 className="w-3.5 h-3.5 inline-block ltr:mr-1 rtl:ml-1" />
                        {t("childGames.shareOnSocial")}
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* WhatsApp */}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`🎮 ${sharedGameData.gameName} — ${t("childGames.scored")} ${sharedGameData.score} ${"⭐".repeat(sharedGameData.stars)} ${window.location.origin}/child-games`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.553 4.11 1.518 5.84L0 24l6.336-1.652A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.892 0-3.684-.516-5.253-1.485l-.377-.224-3.91 1.02 1.04-3.794-.246-.392A9.778 9.778 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818S21.818 6.577 21.818 12s-4.395 9.818-9.818 9.818z"/></svg>
                          WhatsApp
                        </a>
                        {/* Facebook */}
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(`🎮 ${sharedGameData.gameName} — ${sharedGameData.score} ${"⭐".repeat(sharedGameData.stars)}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          Facebook
                        </a>
                        {/* Twitter/X */}
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎮 ${sharedGameData.gameName} — ${t("childGames.scored")} ${sharedGameData.score} ${"⭐".repeat(sharedGameData.stars)}`)}&url=${encodeURIComponent(window.location.origin)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          X
                        </a>
                        {/* Copy Link */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/child-games`);
                            toast({
                              title: isRTL ? '📋 تم نسخ الرابط!' : '📋 Link copied!',
                            });
                          }}
                          className={`px-3 py-2 ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-500 hover:bg-gray-600"} text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors`}
                        >
                          <Link2 className="w-4 h-4" />
                          {isRTL ? 'نسخ' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className={`text-sm animate-pulse ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  🎮 {t("childGames.completeForPoints")}
                </p>
              )}
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

import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { 
  Star, 
  Trophy, 
  Target, 
  Zap, 
  Gift, 
  Calendar, 
  TrendingUp,
  Gamepad2,
  ChevronLeft,
  Flame
} from "lucide-react";

interface ProgressData {
  currentPoints: number;
  tasksCompleted: number;
  totalTasks: number;
  successRate: number;
  pointsPerDay: number;
  speedLevel: string;
  daysSinceJoined: number;
  pendingGiftsCount: number;
  claimedGiftsCount: number;
  activeGoalsCount: number;
  closestGoal: { progress: number; pointsNeeded: number } | null;
  nextMilestone: number;
  milestoneProgress: number;
  motivationalMessage: string;
}

const getSpeedLevelConfig = (t: any): Record<string, { label: string; color: string; icon: JSX.Element }> => ({
  superfast: { label: t("progress.superfast"), color: "from-purple-500 to-pink-500", icon: <Flame className="w-6 h-6" /> },
  fast: { label: t("progress.fast"), color: "from-green-500 to-emerald-500", icon: <Zap className="w-6 h-6" /> },
  moderate: { label: t("progress.moderate"), color: "from-blue-500 to-cyan-500", icon: <TrendingUp className="w-6 h-6" /> },
  slow: { label: t("progress.slow"), color: "from-yellow-500 to-orange-500", icon: <Star className="w-6 h-6" /> },
});

export const ChildProgress = (): JSX.Element => {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("childToken");

  const { data: progressData, isLoading } = useQuery<{ success: boolean; data: ProgressData }>({
    queryKey: ["child-progress"],
    queryFn: async () => {
      const res = await fetch("/api/child/progress", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
  });

  const progress = progressData?.data;
  const speedLevelConfig = getSpeedLevelConfig(t);
  const speedConfig = progress ? speedLevelConfig[progress.speedLevel] || speedLevelConfig.slow : speedLevelConfig.slow;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-indigo-900 to-purple-900" : "bg-gradient-to-br from-blue-400 to-purple-500"} p-4 md:p-8`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              {t("progress.myProgress")}
            </h1>
            <p className="text-white text-opacity-80">
              {t("progress.hello")} {childInfo?.name || ""}! {t("progress.seeAchievements")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ChildNotificationBell />
            <button
              onClick={() => navigate("/child-games")}
              className={`px-6 py-3 ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-white bg-opacity-30 hover:bg-opacity-40"} text-white font-bold rounded-xl transition-all flex items-center gap-2`}
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
              رجوع
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
          </div>
        ) : progress ? (
          <div className="space-y-6">
            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-3xl p-6 shadow-xl`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${speedConfig.color} flex items-center justify-center text-white shadow-lg`}>
                  {speedConfig.icon}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>مستوى السرعة</p>
                  <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    {speedConfig.label}
                  </h2>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    {progress.pointsPerDay}
                  </p>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>نقطة/يوم</p>
                </div>
              </div>
              <div className={`p-4 rounded-2xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
                <p className={`text-lg text-center font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                  {progress.motivationalMessage}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-5 text-center shadow-lg`}>
                <Star className="w-10 h-10 mx-auto mb-2 text-yellow-500" />
                <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {progress.currentPoints}
                </p>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>نقطة</p>
              </div>
              <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-5 text-center shadow-lg`}>
                <Trophy className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {progress.tasksCompleted}
                </p>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>مهمة منجزة</p>
              </div>
              <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-5 text-center shadow-lg`}>
                <Gift className="w-10 h-10 mx-auto mb-2 text-pink-500" />
                <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {progress.claimedGiftsCount}
                </p>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>هدية مستلمة</p>
              </div>
              <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-5 text-center shadow-lg`}>
                <Calendar className="w-10 h-10 mx-auto mb-2 text-blue-500" />
                <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {progress.daysSinceJoined}
                </p>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>يوم</p>
              </div>
            </div>

            <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-3xl p-6 shadow-xl`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  الهدف القادم
                </h3>
                <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold">
                  {progress.nextMilestone} نقطة
                </span>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {progress.currentPoints} / {progress.nextMilestone}
                  </span>
                  <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {progress.milestoneProgress}%
                  </span>
                </div>
                <div className={`h-4 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progress.milestoneProgress, 100)}%` }}
                  />
                </div>
              </div>
              <p className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                باقي {progress.nextMilestone - progress.currentPoints} نقطة للوصول للهدف!
              </p>
            </div>

            {progress.closestGoal && (
              <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-3xl p-6 shadow-xl`}>
                <div className="flex items-center gap-4 mb-4">
                  <Target className="w-8 h-8 text-purple-500" />
                  <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                    أقرب هدية
                  </h3>
                </div>
                <div className="mb-4">
                  <div className={`h-4 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress.closestGoal.progress, 100)}%` }}
                    />
                  </div>
                </div>
                <p className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {progress.closestGoal.progress}% - باقي {progress.closestGoal.pointsNeeded} نقطة
                </p>
              </div>
            )}

            {progress.pendingGiftsCount > 0 && (
              <button
                onClick={() => navigate("/child-gifts")}
                className="w-full p-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:shadow-lg transition-all"
                data-testid="button-pending-gifts"
              >
                <Gift className="w-6 h-6" />
                لديك {progress.pendingGiftsCount} هدية في انتظارك!
              </button>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate("/child-games")}
                className="p-5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-bold flex flex-col items-center gap-2 hover:shadow-lg transition-all"
                data-testid="button-games"
              >
                <Gamepad2 className="w-10 h-10" />
                العب واكسب
              </button>
              <button
                onClick={() => navigate("/child-gifts")}
                className="p-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold flex flex-col items-center gap-2 hover:shadow-lg transition-all"
                data-testid="button-gifts"
              >
                <Gift className="w-10 h-10" />
                هداياي
              </button>
            </div>
          </div>
        ) : (
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-12 text-center`}>
            <Trophy className={`w-20 h-20 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
            <h3 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
              ابدأ رحلتك!
            </h3>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mb-6`}>
              العب الألعاب وأنجز المهام لتكسب النقاط!
            </p>
            <button
              onClick={() => navigate("/child-games")}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              data-testid="button-start"
            >
              ابدأ الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildProgress;

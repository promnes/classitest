import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Gift,
  Trophy,
  BookOpen,
  User,
  Star,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface NavItem {
  id: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  path: string;
  color: string;
}

export function ChildBottomNav({ activeTab }: { activeTab?: string }) {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("childToken");
  const [showOnboardingHint, setShowOnboardingHint] = useState(() => {
    return localStorage.getItem("child_ui_onboarding_seen") !== "1";
  });
  const [calmMode, setCalmMode] = useState(() => {
    return localStorage.getItem("child_ui_calm_mode") === "1";
  });

  useEffect(() => {
    const syncCalmMode = () => setCalmMode(localStorage.getItem("child_ui_calm_mode") === "1");
    window.addEventListener("storage", syncCalmMode);
    window.addEventListener("child-ui-mode-changed", syncCalmMode as EventListener);
    return () => {
      window.removeEventListener("storage", syncCalmMode);
      window.removeEventListener("child-ui-mode-changed", syncCalmMode as EventListener);
    };
  }, []);

  const motionConfig = useMemo(
    () => ({
      tapScale: calmMode ? 0.96 : 0.85,
      iconScale: calmMode ? 1.06 : 1.15,
      springStiffness: calmMode ? 220 : 300,
      springDamping: calmMode ? 28 : 22,
      indicatorStiffness: calmMode ? 280 : 400,
      indicatorDamping: calmMode ? 34 : 30,
    }),
    [calmMode]
  );

  const { data: childInfo } = useQuery<any>({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    staleTime: 30000,
  });

  const { data: childTasks } = useQuery<any[]>({
    queryKey: ["/api/child/tasks"],
    queryFn: async () => {
      const res = await fetch("/api/child/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: !!token,
    staleTime: 30000,
  });

  const pendingTasks = useMemo(
    () => (Array.isArray(childTasks) ? childTasks.filter((task: any) => task.status === "pending").length : 0),
    [childTasks]
  );
  const completedTasks = useMemo(
    () => (Array.isArray(childTasks) ? childTasks.filter((task: any) => task.status === "completed").length : 0),
    [childTasks]
  );
  const totalPoints = Number(childInfo?.totalPoints || 0);
  const pointsToNextStar = 100 - (totalPoints % 100 || 100);

  const resolveActiveTabFromPath = (path: string): string => {
    if (path.startsWith("/child-tasks")) return "tasks";
    if (path.startsWith("/child-gifts") || path.startsWith("/child-store")) return "gifts";
    if (path.startsWith("/child-progress") || path.startsWith("/child-rewards")) return "progress";
    if (
      path.startsWith("/child-profile") ||
      path.startsWith("/child-public-profile") ||
      path.startsWith("/child-settings") ||
      path.startsWith("/child-notifications") ||
      path.startsWith("/child-discover")
    ) {
      return "profile";
    }
    return "games";
  };

  const resolvedActiveTab = resolveActiveTabFromPath(location || "");
  const currentTab = activeTab && ["games", "tasks", "gifts", "progress", "profile"].includes(activeTab)
    ? activeTab
    : resolvedActiveTab;

  const companionMessage = useMemo(() => {
    if (showOnboardingHint) {
      return t("childNav.onboardingHint", { defaultValue: "اضغط على أيقونة للانتقال السريع 🚀" });
    }

    if (currentTab === "tasks" && pendingTasks > 0) {
      return t("childNav.pendingTasksHint", {
        defaultValue: `عندك ${pendingTasks} مهمة تنتظرك! ✍️`,
      });
    }

    if (currentTab === "progress") {
      return t("childNav.progressHint", {
        defaultValue: `باقي ${pointsToNextStar} نقطة للنجمة التالية ⭐`,
      });
    }

    if (currentTab === "gifts") {
      return t("childNav.giftsHint", { defaultValue: "افتح هدية جديدة اليوم 🎁" });
    }

    if (currentTab === "profile") {
      return t("childNav.profileHint", { defaultValue: "شارك إنجازاتك مع أصدقائك 🌟" });
    }

    return t("childNav.gamesHint", { defaultValue: "جاهز لمغامرة جديدة؟ 🎮" });
  }, [showOnboardingHint, currentTab, pendingTasks, pointsToNextStar, t]);

  const dismissOnboarding = () => {
    setShowOnboardingHint(false);
    localStorage.setItem("child_ui_onboarding_seen", "1");
  };

  const navItems: NavItem[] = [
    {
      id: "games",
      icon: <Gamepad2 className="w-5 h-5" />,
      activeIcon: <Gamepad2 className="w-5 h-5 fill-current" />,
      label: t("childNav.games", "ألعاب"),
      path: "/child-games",
      color: "text-purple-500",
    },
    {
      id: "tasks",
      icon: <BookOpen className="w-5 h-5" />,
      activeIcon: <BookOpen className="w-5 h-5 fill-current" />,
      label: t("childNav.tasks", "مهام"),
      path: "/child-tasks",
      color: "text-blue-500",
    },
    {
      id: "gifts",
      icon: <Gift className="w-5 h-5" />,
      activeIcon: <Gift className="w-5 h-5 fill-current" />,
      label: t("childNav.gifts", "هدايا"),
      path: "/child-gifts",
      color: "text-pink-500",
    },
    {
      id: "progress",
      icon: <Trophy className="w-5 h-5" />,
      activeIcon: <Trophy className="w-5 h-5 fill-current" />,
      label: t("childNav.progress", "تقدمي"),
      path: "/child-progress",
      color: "text-amber-500",
    },
    {
      id: "profile",
      icon: <User className="w-5 h-5" />,
      activeIcon: <User className="w-5 h-5 fill-current" />,
      label: t("childNav.profile", "ملفي"),
      path: "/child-profile",
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto px-3 pb-1 mb-1">
        <motion.div
          initial={{ opacity: 0, y: calmMode ? 6 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: calmMode ? 0.2 : 0.35 }}
          className={`rounded-2xl px-3 py-2 border shadow-lg ${
            isDark ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-white"
          } backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                {t("childNav.dailyProgress", { defaultValue: "تقدمك اليوم" })}
              </p>
              <p className={`text-[11px] truncate ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t("childNav.dailyProgressText", {
                  defaultValue: `${completedTasks} منجز - ${pendingTasks} متبقي`,
                })}
              </p>
            </div>
            <div className={`text-[11px] px-2 py-1 rounded-full font-bold ${isDark ? "bg-purple-900/50 text-purple-200" : "bg-purple-100 text-purple-700"}`}>
              {t("childNav.pointsToNextStar", {
                defaultValue: `${pointsToNextStar} ⭐`,
              })}
            </div>
          </div>
        </motion.div>

        <motion.button
          type="button"
          onClick={dismissOnboarding}
          whileTap={{ scale: motionConfig.tapScale }}
          className={`mt-2 w-full rounded-2xl px-3 py-2 text-start border ${
            isDark ? "bg-gray-900/95 border-gray-700 text-purple-200" : "bg-white/95 border-purple-200 text-purple-700"
          } backdrop-blur-xl shadow-md`}
          data-testid="child-companion-bubble"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={calmMode ? { scale: [1, 1.03, 1] } : { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: calmMode ? 2.6 : 1.8, repeat: Infinity }}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-purple-700/60" : "bg-purple-100"}`}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
            <p className="text-[11px] font-medium truncate">{companionMessage}</p>
          </div>
        </motion.button>
      </div>

      <nav
        className={`${
          isDark ? "bg-gray-900/95" : "bg-white/95"
        } backdrop-blur-xl border-t ${
          isDark ? "border-gray-800" : "border-gray-100"
        } shadow-[0_-4px_20px_rgba(0,0,0,0.08)]`}
      >
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: motionConfig.tapScale }}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all min-h-[56px] min-w-[56px]
                ${isActive
                  ? `${item.color} ${isDark ? "bg-white/10" : "bg-gray-100"}`
                  : `${isDark ? "text-gray-500" : "text-gray-400"} hover:text-gray-600`
                }`}
              aria-label={item.label}
            >
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className={`absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r ${
                    item.id === "games" ? "from-purple-400 to-purple-600" :
                    item.id === "tasks" ? "from-blue-400 to-blue-600" :
                    item.id === "gifts" ? "from-pink-400 to-pink-600" :
                    item.id === "progress" ? "from-amber-400 to-amber-600" :
                    "from-emerald-400 to-emerald-600"
                  }`}
                  transition={{ type: "spring", stiffness: motionConfig.indicatorStiffness, damping: motionConfig.indicatorDamping }}
                />
              )}

              {/* Icon */}
              <motion.span
                animate={isActive ? { scale: motionConfig.iconScale } : { scale: 1 }}
                transition={{ type: "spring", stiffness: motionConfig.springStiffness, damping: motionConfig.springDamping }}
              >
                {isActive ? item.activeIcon : item.icon}
              </motion.span>

              {/* Label */}
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  isActive ? "font-bold" : ""
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      </nav>
    </div>
  );
}

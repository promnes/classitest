import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Gift,
  Trophy,
  BookOpen,
  User,
  Star,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";

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
  const [barsVisible, setBarsVisible] = useState(true);
  const [navTransitioning, setNavTransitioning] = useState(false);
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const scrollTicking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (scrollTicking.current) return;
      scrollTicking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > lastScrollY.current + 10) {
          setBarsVisible(false); // scrolling down → hide
        } else if (y < lastScrollY.current - 10) {
          setBarsVisible(true); // scrolling up → show
        }
        lastScrollY.current = y;
        scrollTicking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const handleNavClick = (item: NavItem) => {
    if (navTransitioning) return;
    if (currentTab === item.id) return;

    setPressedTab(item.id);
    setNavTransitioning(true);
    setBarsVisible(false);

    // Give the click animation time to play before route change.
    window.setTimeout(() => {
      navigate(item.path);
    }, 170);
  };

  useEffect(() => {
    setNavTransitioning(false);
    setPressedTab(null);
  }, [location]);

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
      <AnimatePresence>
        {barsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className="max-w-lg mx-auto px-3 pb-1 mb-1 flex flex-col gap-1.5"
          >
            <div
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
            </div>

            <button
              type="button"
              onClick={dismissOnboarding}
              className={`w-full rounded-2xl px-3 py-2 text-start border ${
                isDark ? "bg-gray-900/95 border-gray-700 text-purple-200" : "bg-white/95 border-purple-200 text-purple-700"
              } backdrop-blur-xl shadow-md`}
              data-testid="child-companion-bubble"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-purple-700/60" : "bg-purple-100"}`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-medium truncate">{companionMessage}</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!navTransitioning && (
          <motion.nav
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`${
              isDark ? "bg-gray-900/95" : "bg-white/95"
            } backdrop-blur-xl border-t ${
              isDark ? "border-gray-800" : "border-gray-100"
            } shadow-[0_-4px_20px_rgba(0,0,0,0.08)]`}
          >
            <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5 [perspective:900px]">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                const isPressed = pressedTab === item.id;

                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.14, y: -4, rotateX: 10 }}
                    whileTap={{ scale: motionConfig.tapScale }}
                    onClick={() => handleNavClick(item)}
                    animate={
                      isPressed
                        ? { scale: 1.28, y: -11, rotateX: 14 }
                        : { scale: 1, y: 0, rotateX: 0 }
                    }
                    transition={
                      isPressed
                        ? { duration: 0.16, ease: "easeOut" }
                        : { type: "spring", stiffness: 260, damping: 20 }
                    }
                    className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all min-h-[56px] min-w-[56px] [transform-style:preserve-3d]
                      ${isActive
                        ? `${item.color} ${isDark ? "bg-white/10 shadow-[0_10px_24px_rgba(59,130,246,0.18)]" : "bg-gray-100 shadow-[0_10px_24px_rgba(0,0,0,0.14)]"}`
                        : `${isDark ? "text-gray-500" : "text-gray-400"} hover:text-gray-600`
                      }`}
                    aria-label={item.label}
                  >
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

                    <motion.span
                      className={`rounded-xl px-2 py-1 ${
                        isActive ? (isDark ? "bg-white/10" : "bg-white") : ""
                      }`}
                      animate={
                        isPressed
                          ? { scale: [1, 1.22, 1.14], y: [0, -6, -9], rotate: [0, -6, 6, 0] }
                          : isActive
                            ? { scale: [motionConfig.iconScale, motionConfig.iconScale + 0.06, motionConfig.iconScale], y: [0, -1.5, 0] }
                            : { scale: 1 }
                      }
                      transition={
                        isPressed
                          ? { duration: 0.17, ease: "easeInOut" }
                          : isActive
                            ? { duration: 1.45, repeat: Infinity, ease: "easeInOut" }
                            : { type: "spring", stiffness: motionConfig.springStiffness, damping: motionConfig.springDamping }
                      }
                      style={{ filter: isActive ? "drop-shadow(0 6px 10px rgba(0,0,0,0.25))" : "none" }}
                    >
                      {isActive ? item.activeIcon : item.icon}
                    </motion.span>

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
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

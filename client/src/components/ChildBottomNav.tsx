import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Gift,
  Trophy,
  ShoppingBag,
  Settings,
  Bell,
  BookOpen,
  User,
  Star,
  Compass,
} from "lucide-react";

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
  const [, navigate] = useLocation();
  const { isDark } = useTheme();

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
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 ${
        isDark ? "bg-gray-900/95" : "bg-white/95"
      } backdrop-blur-xl border-t ${
        isDark ? "border-gray-800" : "border-gray-100"
      } shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom`}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.85 }}
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
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon */}
              <motion.span
                animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
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
  );
}

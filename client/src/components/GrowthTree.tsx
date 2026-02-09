import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { TreePine, Sprout, Leaf, Sun, Star, TrendingUp, Sparkles } from "lucide-react";

interface GrowthTreeData {
  tree: {
    id: string;
    childId: string;
    currentStage: number;
    totalGrowthPoints: number;
    tasksCompleted: number;
    gamesPlayed: number;
    rewardsEarned: number;
    lastGrowthAt: string | null;
    createdAt: string;
  };
  stages: { stage: number; name: string; minPoints: number }[];
  currentStageName: string;
  nextStageName: string | null;
  pointsToNextStage: number;
  progress: number;
  recentEvents: any[];
}

const treeStageIcons: Record<string, React.ReactNode> = {
  seed: <div className="w-8 h-8 rounded-full bg-amber-700" />,
  sprout: <Sprout className="w-12 h-12 text-green-500" />,
  sapling: <Leaf className="w-16 h-16 text-green-500" />,
  smallTree: <TreePine className="w-20 h-20 text-green-600" />,
  mediumTree: <TreePine className="w-24 h-24 text-green-600" />,
  largeTree: <TreePine className="w-28 h-28 text-green-700" />,
  matureTree: <TreePine className="w-32 h-32 text-green-700" />,
  majesticTree: <TreePine className="w-36 h-36 text-emerald-600" />,
};

const treeStageColors: Record<string, string> = {
  seed: "from-amber-200 to-amber-400",
  sprout: "from-green-200 to-green-400",
  sapling: "from-green-300 to-green-500",
  smallTree: "from-green-400 to-green-600",
  mediumTree: "from-green-500 to-green-700",
  largeTree: "from-green-600 to-green-800",
  matureTree: "from-emerald-500 to-emerald-700",
  majesticTree: "from-emerald-400 to-yellow-500",
};

export function GrowthTree() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("childToken");

  const { data, isLoading, error } = useQuery<{ success: boolean; data: GrowthTreeData }>({
    queryKey: ["growth-tree"],
    queryFn: async () => {
      const res = await fetch("/api/child/growth-tree", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch growth tree");
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className={`rounded-2xl p-6 ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg animate-pulse`}>
        <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (error || !data?.data) {
    return null;
  }

  const { tree, currentStageName, nextStageName, pointsToNextStage, progress, stages } = data.data;
  
  const stageTranslationKey = `tree${currentStageName.charAt(0).toUpperCase() + currentStageName.slice(1)}`;
  const nextStageTranslationKey = nextStageName 
    ? `tree${nextStageName.charAt(0).toUpperCase() + nextStageName.slice(1)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-6 ${isDark ? "bg-gray-800/90" : "bg-white/90"} backdrop-blur-sm shadow-xl border ${isDark ? "border-gray-700" : "border-green-200"}`}
    >
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TreePine className="w-6 h-6 text-green-500" />
          <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("growthTree")}
          </h2>
        </div>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {t("treeLevel")} {tree.currentStage}: {t(stageTranslationKey) || currentStageName}
        </p>
      </div>

      <div className="relative flex flex-col items-center mb-6">
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
          className={`relative p-8 rounded-full bg-gradient-to-br ${treeStageColors[currentStageName] || "from-green-200 to-green-400"} shadow-lg`}
        >
          {treeStageIcons[currentStageName] || <TreePine className="w-16 h-16 text-green-600" />}
          
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2"
          >
            <Sun className="w-8 h-8 text-yellow-400" />
          </motion.div>
          
          {tree.currentStage >= 6 && (
            <motion.div
              animate={{ scale: [0.8, 1, 0.8], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -bottom-2 -left-2"
            >
              <Star className="w-6 h-6 text-yellow-500" />
            </motion.div>
          )}
        </motion.div>

        <div className={`mt-4 text-center ${isDark ? "text-white" : "text-gray-800"}`}>
          <p className="text-3xl font-bold text-green-500">{tree.totalGrowthPoints}</p>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("points")}</p>
        </div>
      </div>

      {nextStageName && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t(stageTranslationKey) || currentStageName}
            </span>
            <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {nextStageTranslationKey ? t(nextStageTranslationKey) : nextStageName}
            </span>
          </div>
          <div className={`h-4 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
            />
          </div>
          <p className={`text-center mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {pointsToNextStage > 0 
              ? `${pointsToNextStage} ${t("points")} ${t("remaining") || "remaining"}`
              : t("wellDone")
            }
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className={`text-center p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-green-50"}`}>
          <div className="flex justify-center mb-1">
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-xl font-bold text-green-600">{tree.tasksCompleted}</p>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("tasks") || "Tasks"}</p>
        </div>
        <div className={`text-center p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-blue-50"}`}>
          <div className="flex justify-center mb-1">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-blue-600">{tree.gamesPlayed}</p>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("gamesAndTasks") || "Games"}</p>
        </div>
        <div className={`text-center p-3 rounded-xl ${isDark ? "bg-gray-700" : "bg-purple-50"}`}>
          <div className="flex justify-center mb-1">
            <Star className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-purple-600">{tree.rewardsEarned}</p>
          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t("rewards") || "Rewards"}</p>
        </div>
      </div>
    </motion.div>
  );
}

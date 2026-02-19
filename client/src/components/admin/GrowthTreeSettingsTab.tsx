import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TreePine, Droplets, Save, RefreshCw, Settings2, Zap, TrendingUp,
  Trophy, ArrowUpDown, User, Crown, Flame, Clock, Star, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, Upload, RotateCcw, Check, X, ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TREE_STAGE_ICONS, STAGE_NAMES, STAGE_COLORS } from "@/components/TreeStageIcons";

interface GrowthTreeSettingsData {
  id: string;
  wateringEnabled: boolean;
  wateringCostPoints: number;
  wateringGrowthPoints: number;
  maxWateringsPerDay: number;
  stageIcons: string[];
  stageRequirements: { stage: number; minPoints: number; requiresWatering: boolean; wateringsRequired: number }[] | null;
  updatedAt: string;
}

interface WateringStats {
  totalWaterings: number;
  totalPointsSpent: string;
  totalGrowthPointsEarned: string;
}

interface LeaderboardEntry {
  rank: number;
  childId: string;
  childName: string;
  childAvatar: string | null;
  currentStage: number;
  totalGrowthPoints: number;
  tasksCompleted: number;
  gamesPlayed: number;
  wateringsCount: number;
  rewardsEarned: number;
  daysSinceCreation: number;
  growthSpeed: number;
  pointsSpentOnWatering: number;
  lastGrowthAt: string | null;
}

type SortField = "rank" | "growthSpeed" | "wateringsCount" | "totalGrowthPoints";

export function GrowthTreeSettingsTab({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";

  const [wateringEnabled, setWateringEnabled] = useState(true);
  const [wateringCostPoints, setWateringCostPoints] = useState(10);
  const [wateringGrowthPoints, setWateringGrowthPoints] = useState(15);
  const [maxWateringsPerDay, setMaxWateringsPerDay] = useState(5);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Stage icon reordering state
  const [stageOrder, setStageOrder] = useState<number[]>(Array.from({ length: 20 }, (_, i) => i));
  const [swapFrom, setSwapFrom] = useState<number | null>(null);

  // Custom icon uploads — map stageIndex → URL (custom uploaded) or null (default SVG)
  const [customIcons, setCustomIcons] = useState<(string | null)[]>(Array(20).fill(null));
  const [uploadingStage, setUploadingStage] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Leaderboard sorting
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: settingsData, isLoading } = useQuery<{ success: boolean; data: GrowthTreeSettingsData }>({
    queryKey: ["admin-growth-tree-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/growth-tree-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  const { data: statsData } = useQuery<{ success: boolean; data: WateringStats }>({
    queryKey: ["admin-watering-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/watering-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: leaderboardData } = useQuery<{ success: boolean; data: { leaderboard: LeaderboardEntry[]; totalChildren: number } }>({
    queryKey: ["admin-growth-tree-leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/growth-tree-leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  useEffect(() => {
    if (settingsData?.data) {
      setWateringEnabled(settingsData.data.wateringEnabled);
      setWateringCostPoints(settingsData.data.wateringCostPoints);
      setWateringGrowthPoints(settingsData.data.wateringGrowthPoints);
      setMaxWateringsPerDay(settingsData.data.maxWateringsPerDay);
      // Parse stageIcons — custom URLs start with "/uploads/", others are default stage names
      if (settingsData.data.stageIcons && Array.isArray(settingsData.data.stageIcons)) {
        const icons = settingsData.data.stageIcons;
        const order: number[] = [];
        const customs: (string | null)[] = [];
        icons.forEach((icon: string, idx: number) => {
          if (icon.startsWith("/uploads/")) {
            // Custom uploaded icon
            customs.push(icon);
            order.push(idx); // keep position as-is for custom icons
          } else {
            customs.push(null);
            const nameIdx = STAGE_NAMES.indexOf(icon);
            order.push(nameIdx !== -1 ? nameIdx : idx);
          }
        });
        if (order.length === 20) setStageOrder(order);
        setCustomIcons(customs);
      }
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Build final stageIcons array: custom URL or default name
      const finalIcons = stageOrder.map((origIdx, position) => {
        if (customIcons[position] && customIcons[position]!.startsWith("/uploads/")) {
          return customIcons[position]!;
        }
        return STAGE_NAMES[origIdx];
      });
      const res = await fetch("/api/admin/growth-tree-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          wateringEnabled,
          wateringCostPoints,
          wateringGrowthPoints,
          maxWateringsPerDay,
          stageIcons: finalIcons,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-growth-tree-settings"] });
      setHasUnsavedChanges(false);
    },
  });

  const handleChange = (setter: (v: any) => void, value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  // Swap two stage icons
  const handleIconClick = useCallback((index: number) => {
    if (swapFrom === null) {
      setSwapFrom(index);
    } else {
      if (swapFrom !== index) {
        setStageOrder(prev => {
          const newOrder = [...prev];
          [newOrder[swapFrom], newOrder[index]] = [newOrder[index], newOrder[swapFrom]];
          return newOrder;
        });
        setHasUnsavedChanges(true);
      }
      setSwapFrom(null);
    }
  }, [swapFrom]);

  // Move an icon left/right
  const moveIcon = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= 20) return;
    setStageOrder(prev => {
      const newOrder = [...prev];
      [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
      return newOrder;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Upload custom icon for a stage
  const handleIconUpload = useCallback(async (stagePosition: number, file: File) => {
    setUploadingStage(stagePosition);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("stageIndex", stagePosition.toString());
      const res = await fetch("/api/admin/growth-tree-stage-icon", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.success && data.data?.url) {
        setCustomIcons(prev => {
          const newIcons = [...prev];
          newIcons[stagePosition] = data.data.url;
          return newIcons;
        });
        queryClient.invalidateQueries({ queryKey: ["admin-growth-tree-settings"] });
      }
    } catch (err) {
      console.error("Icon upload failed:", err);
    } finally {
      setUploadingStage(null);
    }
  }, [token, queryClient]);

  // Reset icon back to default SVG
  const handleIconReset = useCallback(async (stagePosition: number) => {
    setUploadingStage(stagePosition);
    try {
      const res = await fetch("/api/admin/growth-tree-stage-icon-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stageIndex: stagePosition }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setCustomIcons(prev => {
        const newIcons = [...prev];
        newIcons[stagePosition] = null;
        return newIcons;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-growth-tree-settings"] });
    } catch (err) {
      console.error("Icon reset failed:", err);
    } finally {
      setUploadingStage(null);
    }
  }, [token, queryClient]);

  // Sort leaderboard
  const sortedLeaderboard = (() => {
    if (!leaderboardData?.data?.leaderboard) return [];
    const list = [...leaderboardData.data.leaderboard];
    list.sort((a, b) => {
      let valA: number, valB: number;
      switch (sortField) {
        case "growthSpeed": valA = a.growthSpeed; valB = b.growthSpeed; break;
        case "wateringsCount": valA = a.wateringsCount; valB = b.wateringsCount; break;
        case "totalGrowthPoints": valA = a.totalGrowthPoints; valB = b.totalGrowthPoints; break;
        default: valA = a.rank; valB = b.rank;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  })();

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const stats = statsData?.data;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Crown className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Crown className="w-5 h-5 text-amber-600" />;
    return <span className={`text-sm font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>#{rank}</span>;
  };

  const getSpeedLabel = (speed: number) => {
    if (speed >= 50) return { label: t("admin.growthTree.speedExcellent"), color: "text-green-500", icon: <Flame className="w-3.5 h-3.5 text-green-500" /> };
    if (speed >= 25) return { label: t("admin.growthTree.speedGood"), color: "text-blue-500", icon: <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> };
    if (speed >= 10) return { label: t("admin.growthTree.speedAverage"), color: "text-yellow-500", icon: <Clock className="w-3.5 h-3.5 text-yellow-500" /> };
    return { label: t("admin.growthTree.speedSlow"), color: "text-red-400", icon: <Clock className="w-3.5 h-3.5 text-red-400" /> };
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className={`h-12 rounded-xl ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
        <div className={`h-64 rounded-xl ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
            <TreePine className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("admin.growthTree.title")}
            </h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("admin.growthTree.description")}
            </p>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasUnsavedChanges || saveMutation.isPending}
          className="flex items-center gap-2"
        >
          {saveMutation.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t("admin.growthTree.save")}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${isDark ? "bg-blue-900/20 border border-blue-800" : "bg-blue-50 border border-blue-200"}`}
          >
            <div className="flex items-center gap-3">
              <Droplets className="w-8 h-8 text-blue-500" />
              <div>
                <p className={`text-2xl font-bold ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                  {stats.totalWaterings}
                </p>
                <p className={`text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                  {t("admin.growthTree.totalWaterings")}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 rounded-xl ${isDark ? "bg-red-900/20 border border-red-800" : "bg-red-50 border border-red-200"}`}
          >
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-red-500" />
              <div>
                <p className={`text-2xl font-bold ${isDark ? "text-red-300" : "text-red-700"}`}>
                  {stats.totalPointsSpent || 0}
                </p>
                <p className={`text-xs ${isDark ? "text-red-400" : "text-red-600"}`}>
                  {t("admin.growthTree.totalPointsSpent")}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-xl ${isDark ? "bg-green-900/20 border border-green-800" : "bg-green-50 border border-green-200"}`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className={`text-2xl font-bold ${isDark ? "text-green-300" : "text-green-700"}`}>
                  {stats.totalGrowthPointsEarned || 0}
                </p>
                <p className={`text-xs ${isDark ? "text-green-400" : "text-green-600"}`}>
                  {t("admin.growthTree.totalGrowthEarned")}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-4 rounded-xl ${isDark ? "bg-purple-900/20 border border-purple-800" : "bg-purple-50 border border-purple-200"}`}
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-purple-500" />
              <div>
                <p className={`text-2xl font-bold ${isDark ? "text-purple-300" : "text-purple-700"}`}>
                  {leaderboardData?.data?.totalChildren || 0}
                </p>
                <p className={`text-xs ${isDark ? "text-purple-400" : "text-purple-600"}`}>
                  {t("admin.growthTree.activeChildren")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Watering Settings */}
      <div className={`rounded-xl p-6 ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm`}>
        <div className="flex items-center gap-2 mb-5">
          <Droplets className="w-5 h-5 text-blue-500" />
          <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("admin.growthTree.wateringSettings")}
          </h3>
        </div>

        <div className="space-y-5">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                {t("admin.growthTree.enableWatering")}
              </label>
              <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {t("admin.growthTree.enableWateringDesc")}
              </p>
            </div>
            <button
              onClick={() => handleChange(setWateringEnabled, !wateringEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                wateringEnabled
                  ? "bg-green-500"
                  : isDark ? "bg-gray-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  wateringEnabled ? (isRTL ? "-translate-x-6" : "translate-x-6") : (isRTL ? "-translate-x-1" : "translate-x-1")
                }`}
              />
            </button>
          </div>

          {wateringEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4 pt-2"
            >
              {/* Cost Points */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("admin.growthTree.wateringCost")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={wateringCostPoints}
                    onChange={(e) => handleChange(setWateringCostPoints, parseInt(e.target.value) || 1)}
                    className={`w-32 px-3 py-2 rounded-lg border text-center font-bold ${
                      isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-800"
                    }`}
                  />
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {t("points")}
                  </span>
                </div>
              </div>

              {/* Growth Points */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("admin.growthTree.wateringGrowth")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={wateringGrowthPoints}
                    onChange={(e) => handleChange(setWateringGrowthPoints, parseInt(e.target.value) || 1)}
                    className={`w-32 px-3 py-2 rounded-lg border text-center font-bold ${
                      isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-800"
                    }`}
                  />
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {t("admin.growthTree.growthPoints")}
                  </span>
                </div>
              </div>

              {/* Max Per Day */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t("admin.growthTree.maxPerDay")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxWateringsPerDay}
                    onChange={(e) => handleChange(setMaxWateringsPerDay, parseInt(e.target.value) || 1)}
                    className={`w-32 px-3 py-2 rounded-lg border text-center font-bold ${
                      isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-300 text-gray-800"
                    }`}
                  />
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {t("admin.growthTree.timesPerDay")}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Stage Icons — Upload, Reorder & Swap */}
      <div className={`rounded-xl p-6 ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-purple-500" />
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
              {t("admin.growthTree.stageIcons")}
            </h3>
          </div>
          {swapFrom !== null && (
            <span className={`text-xs px-3 py-1 rounded-full animate-pulse ${isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
              {t("admin.growthTree.selectSwapTarget")}
            </span>
          )}
        </div>
        <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {t("admin.growthTree.iconReorderHint")}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {stageOrder.map((iconIdx, position) => {
            const IconComponent = TREE_STAGE_ICONS[iconIdx];
            const stageName = STAGE_NAMES[iconIdx];
            const stageKey = `tree${stageName.charAt(0).toUpperCase() + stageName.slice(1)}`;
            const isSelected = swapFrom === position;
            const stageColor = STAGE_COLORS[iconIdx];
            const hasCustomIcon = customIcons[position] && customIcons[position]!.startsWith("/uploads/");
            const isUploading = uploadingStage === position;

            return (
              <motion.div
                key={`${position}-${iconIdx}`}
                layout
                className={`relative flex flex-col items-center p-2 rounded-xl transition-all select-none ${
                  isSelected
                    ? "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20"
                    : isDark ? "bg-gray-700/50 hover:bg-gray-600/50" : "bg-gray-50 hover:bg-gray-100"
                } ${isSelected ? (isDark ? "bg-purple-900/30" : "bg-purple-50") : ""}`}
              >
                {/* Stage number badge */}
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white z-10"
                  style={{ backgroundColor: stageColor }}
                >
                  {position + 1}
                </span>

                {/* Custom icon indicator */}
                {hasCustomIcon && (
                  <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center z-10">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}

                {/* Icon display — custom or default SVG */}
                <div
                  className="w-12 h-12 flex items-center justify-center cursor-pointer relative group"
                  onClick={() => handleIconClick(position)}
                >
                  {isUploading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                  ) : hasCustomIcon ? (
                    <img
                      src={customIcons[position]!}
                      alt={`Stage ${position + 1}`}
                      className="w-10 h-10 object-contain rounded"
                    />
                  ) : (
                    IconComponent && <IconComponent size={36} />
                  )}
                </div>

                <span className={`text-[10px] mt-0.5 text-center leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {t(stageKey)}
                </span>

                {/* Action buttons: Upload + Reset */}
                <div className="flex items-center gap-1 mt-1">
                  {/* Upload button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRefs.current[position]?.click();
                    }}
                    disabled={isUploading}
                    className={`p-1 rounded-md transition-colors ${
                      isDark ? "hover:bg-gray-600 text-blue-400" : "hover:bg-blue-50 text-blue-500"
                    } ${isUploading ? "opacity-30" : "opacity-70 hover:opacity-100"}`}
                    title={t("admin.growthTree.uploadIcon")}
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                  </button>

                  {/* Reset to default (only if custom) */}
                  {hasCustomIcon && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIconReset(position);
                      }}
                      disabled={isUploading}
                      className={`p-1 rounded-md transition-colors ${
                        isDark ? "hover:bg-gray-600 text-orange-400" : "hover:bg-orange-50 text-orange-500"
                      } ${isUploading ? "opacity-30" : "opacity-70 hover:opacity-100"}`}
                      title={t("admin.growthTree.resetIcon")}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Move arrows */}
                  <button
                    onClick={(e) => { e.stopPropagation(); moveIcon(position, isRTL ? 1 : -1); }}
                    disabled={position === 0}
                    className={`p-0.5 rounded ${position === 0 ? "opacity-20" : "opacity-60 hover:opacity-100"}`}
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveIcon(position, isRTL ? -1 : 1); }}
                    disabled={position === 19}
                    className={`p-0.5 rounded ${position === 19 ? "opacity-20" : "opacity-60 hover:opacity-100"}`}
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={(el) => { fileInputRefs.current[position] = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleIconUpload(position, file);
                      e.target.value = ""; // reset so same file can be re-selected
                    }
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Children Leaderboard */}
      <div className={`rounded-xl p-6 ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm`}>
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("admin.growthTree.leaderboard")}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
            {sortedLeaderboard.length} {t("admin.growthTree.children")}
          </span>
        </div>

        {sortedLeaderboard.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            <TreePine className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t("admin.growthTree.noChildren")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <th className={`py-3 px-2 text-start font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <button onClick={() => toggleSort("rank")} className="flex items-center gap-1 hover:opacity-80">
                      # <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className={`py-3 px-2 text-start font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("admin.growthTree.child")}
                  </th>
                  <th className={`py-3 px-2 text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("admin.growthTree.stage")}
                  </th>
                  <th className={`py-3 px-2 text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <button onClick={() => toggleSort("totalGrowthPoints")} className="flex items-center gap-1 mx-auto hover:opacity-80">
                      {t("growthPoints")} <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className={`py-3 px-2 text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <button onClick={() => toggleSort("growthSpeed")} className="flex items-center gap-1 mx-auto hover:opacity-80">
                      {t("admin.growthTree.speed")} <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className={`py-3 px-2 text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <button onClick={() => toggleSort("wateringsCount")} className="flex items-center gap-1 mx-auto hover:opacity-80">
                      <Droplets className="w-3.5 h-3.5" /> <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className={`py-3 px-2 text-center font-semibold hidden md:table-cell ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("tasks")}
                  </th>
                  <th className={`py-3 px-2 text-center font-semibold hidden md:table-cell ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("admin.growthTree.pointsSpent")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sortedLeaderboard.map((entry, idx) => {
                    const StageIcon = TREE_STAGE_ICONS[Math.min(entry.currentStage - 1, 19)];
                    const stageColor = STAGE_COLORS[Math.min(entry.currentStage - 1, 19)];
                    const speedInfo = getSpeedLabel(entry.growthSpeed);

                    return (
                      <motion.tr
                        key={entry.childId}
                        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`border-b last:border-0 ${
                          isDark ? "border-gray-700/50 hover:bg-gray-700/30" : "border-gray-100 hover:bg-gray-50"
                        } ${entry.rank <= 3 ? (isDark ? "bg-yellow-900/5" : "bg-yellow-50/50") : ""}`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankBadge(entry.rank)}
                          </div>
                        </td>

                        {/* Child Name + Avatar */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {entry.childAvatar ? (
                              <img src={entry.childAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                                <User className="w-4 h-4 opacity-50" />
                              </div>
                            )}
                            <div>
                              <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-800"}`}>
                                {entry.childName}
                              </p>
                              <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                {entry.daysSinceCreation} {t("admin.growthTree.days")}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Stage Icon */}
                        <td className="py-3 px-2">
                          <div className="flex flex-col items-center">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${stageColor}20`, border: `2px solid ${stageColor}` }}
                            >
                              {StageIcon && <StageIcon size={22} />}
                            </div>
                            <span className="text-[10px] font-bold mt-0.5" style={{ color: stageColor }}>
                              {entry.currentStage}/20
                            </span>
                          </div>
                        </td>

                        {/* Growth Points */}
                        <td className={`py-3 px-2 text-center font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>
                          {entry.totalGrowthPoints.toLocaleString()}
                        </td>

                        {/* Speed */}
                        <td className="py-3 px-2">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1">
                              {speedInfo.icon}
                              <span className={`text-sm font-bold ${speedInfo.color}`}>
                                {entry.growthSpeed}
                              </span>
                            </div>
                            <span className={`text-[10px] ${speedInfo.color}`}>
                              {speedInfo.label}
                            </span>
                          </div>
                        </td>

                        {/* Waterings */}
                        <td className={`py-3 px-2 text-center ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                          <div className="flex items-center justify-center gap-1">
                            <Droplets className="w-3.5 h-3.5" />
                            <span className="font-bold">{entry.wateringsCount}</span>
                          </div>
                        </td>

                        {/* Tasks */}
                        <td className={`py-3 px-2 text-center hidden md:table-cell ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {entry.tasksCompleted}
                        </td>

                        {/* Points Spent on Watering */}
                        <td className={`py-3 px-2 text-center hidden md:table-cell font-medium ${isDark ? "text-red-400" : "text-red-500"}`}>
                          {entry.pointsSpentOnWatering > 0 ? `-${entry.pointsSpentOnWatering}` : "0"}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Success Message */}
      {saveMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-center ${isDark ? "bg-green-900/30 text-green-300" : "bg-green-50 text-green-700"}`}
        >
          ✅ {t("admin.growthTree.saved")}
        </motion.div>
      )}
    </div>
  );
}

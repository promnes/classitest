import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TreePine, Droplets, Save, RefreshCw, Settings2, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TREE_STAGE_ICONS, STAGE_NAMES } from "@/components/TreeStageIcons";

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

  useEffect(() => {
    if (settingsData?.data) {
      setWateringEnabled(settingsData.data.wateringEnabled);
      setWateringCostPoints(settingsData.data.wateringCostPoints);
      setWateringGrowthPoints(settingsData.data.wateringGrowthPoints);
      setMaxWateringsPerDay(settingsData.data.maxWateringsPerDay);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
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

  const stats = statsData?.data;

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
      <div className="flex items-center justify-between">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Stage Icons Preview */}
      <div className={`rounded-xl p-6 ${isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} shadow-sm`}>
        <div className="flex items-center gap-2 mb-5">
          <Settings2 className="w-5 h-5 text-purple-500" />
          <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("admin.growthTree.stageIcons")}
          </h3>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-3">
          {STAGE_NAMES.map((name, i) => {
            const IconComponent = TREE_STAGE_ICONS[i];
            const stageKey = `tree${name.charAt(0).toUpperCase() + name.slice(1)}`;
            return (
              <div
                key={i}
                className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                  isDark ? "bg-gray-700/50 hover:bg-gray-600/50" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  {IconComponent && <IconComponent size={32} />}
                </div>
                <span className={`text-[10px] mt-1 text-center leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {t(stageKey)}
                </span>
                <span className={`text-[9px] font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>
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

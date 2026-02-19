import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { TreePine, Sparkles, TrendingUp, Star, Zap } from "lucide-react";

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

// Color palette for each stage tier
const STAGE_COLORS = [
  "#8B6914", // 1 seed
  "#6B8E23", // 2 sprout
  "#228B22", // 3 sapling
  "#32CD32", // 4 youngPlant
  "#3CB371", // 5 bush
  "#2E8B57", // 6 smallTree
  "#20B2AA", // 7 growingTree
  "#008B8B", // 8 mediumTree
  "#4682B4", // 9 tallTree
  "#4169E1", // 10 strongTree
  "#6A5ACD", // 11 largeTree
  "#8A2BE2", // 12 matureTree
  "#FF6347", // 13 fruitTree
  "#FF4500", // 14 grandTree
  "#DAA520", // 15 ancientTree
  "#FFD700", // 16 goldenTree
  "#00CED1", // 17 crystalTree
  "#E0E7FF", // 18 diamondTree
  "#FF69B4", // 19 legendaryTree
  "#9400D3", // 20 cosmicTree
];

const STAGE_EMOJIS = [
  "🌰", "🌱", "🌿", "🪴", "🌳", "🌲", "🎄", "🌴", "🎋", "💪",
  "🏔️", "🌍", "🍎", "👑", "⏳", "✨", "💎", "💠", "🔥", "🌌",
];

export function GrowthTree() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const token = localStorage.getItem("childToken");
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragRotation, setDragRotation] = useState(0);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isRTL = i18n.language === "ar";

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

  // Auto-rotation animation
  useEffect(() => {
    if (isDragging) return;
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      setRotation((prev) => (prev + delta * 0.015) % 360);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isDragging]);

  // Drag-to-rotate handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragRotation(rotation);
    lastTimeRef.current = 0;
  }, [rotation]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - dragStart;
    setRotation(dragRotation + diff * 0.5);
  }, [isDragging, dragStart, dragRotation]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    lastTimeRef.current = 0;
  }, []);

  // Auto-dismiss popup
  useEffect(() => {
    if (selectedStage === null) return;
    const timer = setTimeout(() => setSelectedStage(null), 3500);
    return () => clearTimeout(timer);
  }, [selectedStage]);

  if (isLoading) {
    return (
      <div className={`rounded-3xl p-6 ${isDark ? "bg-gray-800" : "bg-white"} shadow-xl animate-pulse`}>
        <div className="h-[400px] bg-gray-300 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (error || !data?.data) return null;

  const { tree, stages, currentStageName, nextStageName, pointsToNextStage, progress } = data.data;
  const currentStage = tree.currentStage;
  const totalStages = stages.length || 20;

  const stageKey = `tree${currentStageName.charAt(0).toUpperCase() + currentStageName.slice(1)}`;
  const nextStageKey = nextStageName
    ? `tree${nextStageName.charAt(0).toUpperCase() + nextStageName.slice(1)}`
    : null;

  // Build 3D node positions — spiral helix
  const treeHeight = 380;
  const radiusX = 100;
  const radiusZ = 80;
  const nodes = stages.map((stage, i) => {
    const fraction = i / (totalStages - 1);
    const y = treeHeight - fraction * treeHeight; // bottom to top
    const angle = (i / totalStages) * 360 * 2.5; // 2.5 spirals
    const rad = ((angle + rotation) * Math.PI) / 180;
    const x = Math.sin(rad) * radiusX;
    const z = Math.cos(rad) * radiusZ;
    const scale = 0.7 + (z + radiusZ) / (2 * radiusZ) * 0.6; // depth scaling
    const unlocked = stage.stage <= currentStage;
    return { ...stage, x, y, z, scale, unlocked, angle, index: i };
  });

  // Sort by z for proper layering (back to front)
  const sortedNodes = [...nodes].sort((a, b) => a.z - b.z);

  const getStageTranslationKey = (name: string) =>
    `tree${name.charAt(0).toUpperCase() + name.slice(1)}`;

  return (
    <div className={`rounded-3xl overflow-hidden ${isDark ? "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-b from-green-50 via-emerald-50 to-green-100"} shadow-2xl border ${isDark ? "border-gray-700" : "border-green-200"}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <TreePine className="w-5 h-5 text-green-500" />
          <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
            {t("growthTree")}
          </h2>
        </div>
        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {t("treeLevel")} {currentStage}/{totalStages} • {t(stageKey)}
        </p>
      </div>

      {/* 3D Tree Scene */}
      <div
        ref={containerRef}
        className="relative mx-auto select-none cursor-grab active:cursor-grabbing"
        style={{ width: "100%", height: 440, perspective: "800px" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Background particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`p-${i}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 3 + Math.random() * 4,
              height: 3 + Math.random() * 4,
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              background: isDark
                ? `rgba(${100 + Math.random() * 155}, ${200 + Math.random() * 55}, ${100 + Math.random() * 155}, 0.4)`
                : `rgba(${50 + Math.random() * 100}, ${150 + Math.random() * 100}, ${50 + Math.random() * 100}, 0.3)`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.7, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}

        {/* Central trunk */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-6 rounded-full"
          style={{
            width: 8,
            height: treeHeight + 10,
            background: isDark
              ? "linear-gradient(to top, #5D4037, #795548, #4CAF50, #66BB6A)"
              : "linear-gradient(to top, #6D4C41, #8D6E63, #43A047, #66BB6A)",
            opacity: 0.5,
          }}
        />

        {/* Stage nodes */}
        {sortedNodes.map((node) => {
          const nodeSize = 32 + (node.index / totalStages) * 12;
          const color = STAGE_COLORS[node.index] || "#4CAF50";

          return (
            <div
              key={node.stage}
              className="absolute"
              style={{
                left: `calc(50% + ${node.x}px)`,
                top: node.y + 30,
                transform: `translate(-50%, -50%) scale(${node.scale})`,
                zIndex: Math.round(node.z + radiusZ),
              }}
            >
              {/* Connection line to trunk */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: Math.abs(node.x) + 4,
                  height: 2,
                  top: "50%",
                  left: node.x > 0 ? -(Math.abs(node.x)) : "50%",
                  background: node.unlocked
                    ? `linear-gradient(${node.x > 0 ? "to left" : "to right"}, ${color}44, transparent)`
                    : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                }}
              />

              {/* Node circle */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStage(node.stage);
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="relative rounded-full flex items-center justify-center transition-shadow"
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  background: node.unlocked
                    ? `radial-gradient(circle at 35% 35%, ${color}ee, ${color}88)`
                    : isDark ? "rgba(60,60,80,0.6)" : "rgba(180,180,200,0.5)",
                  boxShadow: node.unlocked
                    ? `0 0 ${10 + node.index}px ${color}66, inset 0 -2px 4px rgba(0,0,0,0.2)`
                    : "inset 0 -2px 4px rgba(0,0,0,0.1)",
                  opacity: node.unlocked ? 1 : 0.35,
                  border: node.stage === currentStage
                    ? `2px solid ${color}`
                    : node.unlocked
                    ? `1px solid ${color}66`
                    : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  cursor: "pointer",
                  fontSize: nodeSize * 0.45,
                }}
              >
                {STAGE_EMOJIS[node.index]}

                {/* Current stage indicator (pulsing ring) */}
                {node.stage === currentStage && (
                  <motion.div
                    className="absolute inset-[-4px] rounded-full border-2"
                    style={{ borderColor: color }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>

              {/* Stage number label */}
              <div
                className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold ${
                  node.unlocked
                    ? isDark ? "text-gray-300" : "text-gray-700"
                    : isDark ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {node.stage}
              </div>
            </div>
          );
        })}

        {/* Stage Info Popup */}
        <AnimatePresence>
          {selectedStage !== null && (() => {
            const sInfo = stages.find((s) => s.stage === selectedStage);
            if (!sInfo) return null;
            const unlocked = selectedStage <= currentStage;
            const key = getStageTranslationKey(sInfo.name);
            const color = STAGE_COLORS[selectedStage - 1] || "#4CAF50";
            const emoji = STAGE_EMOJIS[selectedStage - 1] || "🌳";

            return (
              <motion.div
                key="popup"
                initial={{ opacity: 0, scale: 0.7, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: -20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className={`absolute left-1/2 -translate-x-1/2 top-[45%] z-50 px-5 py-4 rounded-2xl shadow-2xl min-w-[200px] max-w-[260px] text-center pointer-events-none ${
                  isDark ? "bg-gray-800/95 border border-gray-600" : "bg-white/95 border border-gray-200"
                }`}
                style={{ backdropFilter: "blur(8px)" }}
              >
                <div className="text-3xl mb-2">{emoji}</div>
                <h3 className={`font-bold text-base mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t(key)}
                </h3>
                <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {isRTL ? `المرحلة ${selectedStage} من ${totalStages}` : `Stage ${selectedStage} of ${totalStages}`}
                </p>
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: unlocked ? color : isDark ? "#4a5568" : "#a0aec0" }}
                >
                  {unlocked
                    ? isRTL ? "✅ مفتوحة" : "✅ Unlocked"
                    : `🔒 ${sInfo.minPoints} ${t("points")}`}
                </div>
                {/* Auto-dismiss progress bar */}
                <motion.div
                  className="mt-3 h-1 rounded-full overflow-hidden"
                  style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 3.5, ease: "linear" }}
                  />
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      {nextStageName && (
        <div className="px-5 pb-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t(stageKey)}
            </span>
            <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {nextStageKey ? t(nextStageKey) : nextStageName}
            </span>
          </div>
          <div className={`h-3 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </motion.div>
          </div>
          <p className={`text-center mt-1.5 text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            {pointsToNextStage > 0
              ? `${pointsToNextStage} ${t("points")} ${t("remaining")}`
              : t("wellDone")}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="px-5 pb-5 pt-2">
        <div className="grid grid-cols-4 gap-2">
          <div className={`text-center p-2.5 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm`}>
            <Zap className="w-4 h-4 mx-auto mb-0.5 text-green-500" />
            <p className="text-base font-bold text-green-600">{tree.totalGrowthPoints}</p>
            <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{t("points")}</p>
          </div>
          <div className={`text-center p-2.5 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm`}>
            <Sparkles className="w-4 h-4 mx-auto mb-0.5 text-yellow-500" />
            <p className="text-base font-bold text-yellow-600">{tree.tasksCompleted}</p>
            <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{t("tasks")}</p>
          </div>
          <div className={`text-center p-2.5 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm`}>
            <TrendingUp className="w-4 h-4 mx-auto mb-0.5 text-blue-500" />
            <p className="text-base font-bold text-blue-600">{tree.gamesPlayed}</p>
            <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{t("gamesLabel") || t("gamesAndTasks")}</p>
          </div>
          <div className={`text-center p-2.5 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm`}>
            <Star className="w-4 h-4 mx-auto mb-0.5 text-purple-500" />
            <p className="text-base font-bold text-purple-600">{tree.rewardsEarned}</p>
            <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{t("rewards")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

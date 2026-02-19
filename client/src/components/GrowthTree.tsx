import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { TreePine, Sparkles, TrendingUp, Star, Zap, Droplets, ChevronDown, ChevronUp } from "lucide-react";
import { TREE_STAGE_ICONS, STAGE_COLORS } from "./TreeStageIcons";

interface GrowthTreeData {
  tree: {
    id: string;
    childId: string;
    currentStage: number;
    totalGrowthPoints: number;
    tasksCompleted: number;
    gamesPlayed: number;
    rewardsEarned: number;
    wateringsCount: number;
    lastGrowthAt: string | null;
    createdAt: string;
  };
  stages: { stage: number; name: string; minPoints: number }[];
  currentStageName: string;
  nextStageName: string | null;
  pointsToNextStage: number;
  progress: number;
  recentEvents: any[];
  stageIcons?: string[];
}

interface WateringInfo {
  wateringEnabled: boolean;
  wateringCostPoints: number;
  wateringGrowthPoints: number;
  maxWateringsPerDay: number;
  wateringsToday: number;
  remainingWateringsToday: number;
}

export function GrowthTree() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const containerRef = useRef<HTMLDivElement>(null);
  const treeTargetRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragRotation, setDragRotation] = useState(0);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isRTL = i18n.language === "ar";

  // Water jug drag state
  const [jugPos, setJugPos] = useState({ x: 0, y: 0 });
  const [isDraggingJug, setIsDraggingJug] = useState(false);
  const [jugDragOffset, setJugDragOffset] = useState({ x: 0, y: 0 });
  const [isNearTree, setIsNearTree] = useState(false);
  const [showWaterAnim, setShowWaterAnim] = useState(false);
  const [waterMessage, setWaterMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const { data: wateringData } = useQuery<{ success: boolean; data: WateringInfo }>({
    queryKey: ["watering-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/watering-info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch watering info");
      return res.json();
    },
    enabled: !!token,
  });

  const waterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/child/water-tree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to water tree");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["growth-tree"] });
      queryClient.invalidateQueries({ queryKey: ["watering-info"] });
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      setShowWaterAnim(true);
      const pts = result.data?.growthPointsEarned || 0;
      setWaterMessage(`+${pts} ${t("growthPoints")} 🌱`);
      setTimeout(() => {
        setShowWaterAnim(false);
        setWaterMessage(null);
      }, 2500);
    },
    onError: (err: Error) => {
      setWaterMessage(err.message);
      setTimeout(() => setWaterMessage(null), 2500);
    },
  });

  const wateringInfo = wateringData?.data;
  const canWater = wateringInfo?.wateringEnabled && (wateringInfo?.remainingWateringsToday || 0) > 0;

  // Auto-rotation animation
  useEffect(() => {
    if (isDragging || isDraggingJug) return;
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      setRotation((prev) => (prev + delta * 0.015) % 360);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isDragging, isDraggingJug]);

  // Drag-to-rotate handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isDraggingJug) return;
    setIsDragging(true);
    setDragStart(e.clientX);
    setDragRotation(rotation);
    lastTimeRef.current = 0;
  }, [rotation, isDraggingJug]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || isDraggingJug) return;
    const diff = e.clientX - dragStart;
    setRotation(dragRotation + diff * 0.5);
  }, [isDragging, dragStart, dragRotation, isDraggingJug]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    lastTimeRef.current = 0;
  }, []);

  // Water jug drag handlers
  const handleJugPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = (e.target as HTMLElement).closest('[data-jug]')?.getBoundingClientRect();
    if (rect) {
      setJugDragOffset({ x: e.clientX - rect.left - rect.width / 2, y: e.clientY - rect.top - rect.height / 2 });
    }
    setIsDraggingJug(true);
    setJugPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleJugPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingJug) return;
    e.preventDefault();
    setJugPos({ x: e.clientX - jugDragOffset.x, y: e.clientY - jugDragOffset.y });
    // Check proximity to tree center
    if (treeTargetRef.current) {
      const treeRect = treeTargetRef.current.getBoundingClientRect();
      const treeCenterX = treeRect.left + treeRect.width / 2;
      const treeCenterY = treeRect.top + treeRect.height / 2;
      const dist = Math.sqrt(Math.pow(e.clientX - treeCenterX, 2) + Math.pow(e.clientY - treeCenterY, 2));
      setIsNearTree(dist < 80);
    }
  }, [isDraggingJug, jugDragOffset]);

  const handleJugPointerUp = useCallback(() => {
    if (isNearTree && canWater && !waterMutation.isPending) {
      waterMutation.mutate();
    }
    setIsDraggingJug(false);
    setIsNearTree(false);
    setJugPos({ x: 0, y: 0 });
  }, [isNearTree, canWater, waterMutation]);

  // Global pointer move/up for jug drag
  useEffect(() => {
    if (!isDraggingJug) return;
    const handleMove = (e: PointerEvent) => {
      setJugPos({ x: e.clientX - jugDragOffset.x, y: e.clientY - jugDragOffset.y });
      if (treeTargetRef.current) {
        const treeRect = treeTargetRef.current.getBoundingClientRect();
        const treeCenterX = treeRect.left + treeRect.width / 2;
        const treeCenterY = treeRect.top + treeRect.height / 2;
        const dist = Math.sqrt(Math.pow(e.clientX - treeCenterX, 2) + Math.pow(e.clientY - treeCenterY, 2));
        setIsNearTree(dist < 80);
      }
    };
    const handleUp = () => {
      if (isNearTree && canWater && !waterMutation.isPending) {
        waterMutation.mutate();
      }
      setIsDraggingJug(false);
      setIsNearTree(false);
      setJugPos({ x: 0, y: 0 });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDraggingJug, jugDragOffset, isNearTree, canWater, waterMutation]);

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
  const stageIcons: string[] = data.data.stageIcons || [];

  // Helper: check if a stage index (0-based) has a custom uploaded icon
  const getCustomIconUrl = (idx: number): string | null => {
    const icon = stageIcons[idx];
    return icon && icon.startsWith("/uploads/") ? icon : null;
  };

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
    const y = treeHeight - fraction * treeHeight;
    const angle = (i / totalStages) * 360 * 2.5;
    const rad = ((angle + rotation) * Math.PI) / 180;
    const x = Math.sin(rad) * radiusX;
    const z = Math.cos(rad) * radiusZ;
    const scale = 0.7 + (z + radiusZ) / (2 * radiusZ) * 0.6;
    const unlocked = stage.stage <= currentStage;
    return { ...stage, x, y, z, scale, unlocked, angle, index: i };
  });

  const sortedNodes = [...nodes].sort((a, b) => a.z - b.z);

  const getStageTranslationKey = (name: string) =>
    `tree${name.charAt(0).toUpperCase() + name.slice(1)}`;

  // Current stage icon for collapsed preview
  const currentStageIdx = currentStage - 1;
  const CurrentStageIcon = TREE_STAGE_ICONS[currentStageIdx];
  const currentStageColor = STAGE_COLORS[currentStageIdx] || "#4CAF50";
  const currentCustomIcon = stageIcons[currentStageIdx] && stageIcons[currentStageIdx].startsWith("/uploads/") ? stageIcons[currentStageIdx] : null;

  return (
    <div className={`rounded-3xl overflow-hidden ${isDark ? "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-b from-green-50 via-emerald-50 to-green-100"} shadow-2xl border ${isDark ? "border-gray-700" : "border-green-200"}`}>
      {/* Collapsed: compact card with current stage icon */}
      <div
        className="px-5 pt-4 pb-3 cursor-pointer select-none"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {!isExpanded ? (
          /* ====== COLLAPSED STATE — show only current stage ====== */
          <div className="flex items-center gap-3">
            {/* Current stage icon */}
            <motion.div
              className="relative flex-shrink-0 rounded-full flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                background: `radial-gradient(circle at 35% 35%, ${currentStageColor}ee, ${currentStageColor}88)`,
                boxShadow: `0 0 16px ${currentStageColor}55`,
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {currentCustomIcon ? (
                <img src={currentCustomIcon} alt="" className="w-9 h-9 object-contain rounded-full" />
              ) : (
                CurrentStageIcon && <CurrentStageIcon size={36} />
              )}
              <motion.div
                className="absolute inset-[-3px] rounded-full border-2"
                style={{ borderColor: currentStageColor }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <TreePine className="w-4 h-4 text-green-500 flex-shrink-0" />
                <h2 className={`text-base font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("growthTree")}
                </h2>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("treeLevel")} {currentStage}/{totalStages} • {t(stageKey)}
              </p>
              {/* Mini progress bar */}
              <div className={`mt-1.5 h-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"
                  style={{ width: `${Math.min(100, progress)}%`, transition: "width 0.6s ease" }}
                />
              </div>
            </div>

            {/* Expand indicator */}
            <motion.div
              animate={{ rotate: 0 }}
              className="flex-shrink-0"
            >
              <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
            </motion.div>
          </div>
        ) : (
          /* ====== EXPANDED STATE — header ====== */
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <TreePine className="w-5 h-5 text-green-500" />
              <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("growthTree")}
              </h2>
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              </motion.div>
            </div>
            <p className={`text-xs text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("treeLevel")} {currentStage}/{totalStages} • {t(stageKey)}
            </p>
          </div>
        )}
      </div>

      {/* 3D Tree Scene — only when expanded */}
      <AnimatePresence initial={false}>
      {isExpanded && (
      <motion.div
        ref={containerRef}
        className="relative mx-auto select-none cursor-grab active:cursor-grabbing"
        style={{ width: "100%", perspective: "800px" }}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 440, opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
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

        {/* Tree target zone (invisible) for proximity detection */}
        <div
          ref={treeTargetRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: 160, height: 160 }}
        />

        {/* Near-tree glow indicator */}
        <AnimatePresence>
          {isNearTree && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: 140,
                height: 140,
                background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
                border: "2px dashed rgba(59,130,246,0.5)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Water animation */}
        <AnimatePresence>
          {showWaterAnim && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`drop-${i}`}
                  className="absolute left-1/2 top-1/2 pointer-events-none"
                  initial={{
                    x: -4,
                    y: -4,
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{
                    x: (Math.random() - 0.5) * 120,
                    y: Math.random() * 60 + 20,
                    opacity: 0,
                    scale: 0.3,
                  }}
                  transition={{ duration: 1.2, delay: i * 0.08 }}
                >
                  <Droplets className="w-4 h-4 text-blue-400" />
                </motion.div>
              ))}
              {waterMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: -10 }}
                  exit={{ opacity: 0, y: -40 }}
                  className="absolute left-1/2 top-[40%] -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-sm shadow-xl pointer-events-none"
                >
                  {waterMessage}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

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
          const IconComponent = TREE_STAGE_ICONS[node.index];
          const customIconUrl = getCustomIconUrl(node.index);

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

              {/* Node circle with SVG icon */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStage(node.stage);
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="relative rounded-full flex items-center justify-center transition-shadow overflow-hidden"
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
                }}
              >
                {customIconUrl ? (
                  <img
                    src={customIconUrl}
                    alt={`Stage ${node.stage}`}
                    className="object-contain rounded-full"
                    style={{ width: Math.round(nodeSize * 0.7), height: Math.round(nodeSize * 0.7) }}
                  />
                ) : (
                  IconComponent && <IconComponent size={Math.round(nodeSize * 0.7)} />
                )}

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
            const StageIcon = TREE_STAGE_ICONS[selectedStage - 1];
            const popupCustomIcon = getCustomIconUrl(selectedStage - 1);

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
                <div className="flex justify-center mb-2">
                  {popupCustomIcon ? (
                    <img src={popupCustomIcon} alt={t(key)} className="w-12 h-12 object-contain rounded" />
                  ) : (
                    StageIcon && <StageIcon size={48} />
                  )}
                </div>
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
      </motion.div>
      )}
      </AnimatePresence>

      {/* Expandable sections: watering, progress, stats */}
      <AnimatePresence initial={false}>
      {isExpanded && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="overflow-hidden"
      >

      {/* Watering Section */}
      {wateringInfo?.wateringEnabled && (
        <div className={`mx-5 mb-3 rounded-xl p-3 ${isDark ? "bg-blue-900/20 border border-blue-800/50" : "bg-blue-50 border border-blue-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className={`text-sm font-semibold ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                {t("waterTree")}
              </span>
            </div>
            <span className={`text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>
              {wateringInfo.remainingWateringsToday}/{wateringInfo.maxWateringsPerDay} {t("wateringsRemaining")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Draggable Water Jug */}
            <div className="relative">
              <motion.div
                data-jug="true"
                onPointerDown={handleJugPointerDown}
                className={`cursor-grab active:cursor-grabbing select-none touch-none ${
                  canWater ? "" : "opacity-40 pointer-events-none"
                }`}
                whileHover={canWater ? { scale: 1.1 } : {}}
                whileTap={canWater ? { scale: 0.95 } : {}}
                style={{ touchAction: "none" }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDark ? "bg-blue-800/40" : "bg-blue-100"
                } ${canWater ? "ring-2 ring-blue-400/50 ring-offset-1" : ""}`}>
                  <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
                    {/* Water Jug SVG */}
                    <path d="M20 20h24v8c0 12-4 20-12 24-8-4-12-12-12-24v-8z" fill="#3B82F6" />
                    <path d="M20 20h24v4H20v-4z" fill="#60A5FA" />
                    <path d="M24 16h16v4H24v-4z" fill="#93C5FD" />
                    <ellipse cx="32" cy="16" rx="10" ry="2" fill="#BFDBFE" />
                    {/* Handle */}
                    <path d="M44 22c4 0 6 2 6 6s-2 6-6 6" stroke="#2563EB" strokeWidth="3" fill="none" />
                    {/* Water drops */}
                    <path d="M28 30c0 2-1 4-2 4s-2-2-2-4 1-3 2-3 2 1 2 3z" fill="#93C5FD" opacity="0.6" />
                    <path d="M36 34c0 2-1 4-2 4s-2-2-2-4 1-3 2-3 2 1 2 3z" fill="#93C5FD" opacity="0.4" />
                  </svg>
                </div>
                {canWater && (
                  <p className={`text-[9px] text-center mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                    {t("dragToWater")}
                  </p>
                )}
              </motion.div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 text-xs">
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  {t("wateringCost")}: <strong className="text-red-500">{wateringInfo.wateringCostPoints}</strong> {t("points")}
                </span>
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  {t("wateringGrowth")}: <strong className="text-green-500">+{wateringInfo.wateringGrowthPoints}</strong>
                </span>
              </div>
            </div>

            {/* Quick water button */}
            <button
              onClick={() => canWater && !waterMutation.isPending && waterMutation.mutate()}
              disabled={!canWater || waterMutation.isPending}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                canWater
                  ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : isDark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400"
              }`}
            >
              {waterMutation.isPending ? "..." : t("waterNow")}
            </button>
          </div>
        </div>
      )}

      {/* Floating dragged jug */}
      {isDraggingJug && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: jugPos.x - 24,
            top: jugPos.y - 24,
          }}
        >
          <motion.div
            animate={{ rotate: isNearTree ? [0, -15, 15, -15, 0] : 0 }}
            transition={{ duration: 0.5, repeat: isNearTree ? Infinity : 0 }}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-2xl ${
              isNearTree ? "bg-blue-500 ring-4 ring-blue-300" : "bg-blue-400"
            }`}>
              <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
                <path d="M20 20h24v8c0 12-4 20-12 24-8-4-12-12-12-24v-8z" fill="white" />
                <path d="M20 20h24v4H20v-4z" fill="#DBEAFE" />
                <path d="M24 16h16v4H24v-4z" fill="#EFF6FF" />
                <path d="M44 22c4 0 6 2 6 6s-2 6-6 6" stroke="white" strokeWidth="3" fill="none" />
              </svg>
            </div>
          </motion.div>
        </div>
      )}

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
        <div className="grid grid-cols-5 gap-2">
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
          <div className={`text-center p-2.5 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-sm`}>
            <Droplets className="w-4 h-4 mx-auto mb-0.5 text-blue-400" />
            <p className="text-base font-bold text-blue-400">{tree.wateringsCount || 0}</p>
            <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{t("waterings")}</p>
          </div>
        </div>
      </div>

      </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

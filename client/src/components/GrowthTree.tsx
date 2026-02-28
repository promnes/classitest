import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { TreePine, Sparkles, TrendingUp, Star, Zap, Droplets, ChevronDown, Lock, Check, Crown, Flame } from "lucide-react";
import { TREE_STAGE_ICONS, STAGE_COLORS, STAGE_NAMES } from "./TreeStageIcons";

// ─── Interfaces ───────────────────────────────────────
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

// ─── Biome System ─────────────────────────────────────
interface BiomeConfig {
  name: string;
  skyGradient: string;
  skyGradientDark: string;
  groundGradient: string;
  groundGradientDark: string;
  particleColors: string[];
  creatureType: "butterflies" | "fireflies" | "crystals" | "aurora" | "cosmic";
  accentColor: string;
}

const BIOMES: BiomeConfig[] = [
  {
    name: "springField",
    skyGradient: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 40%, #E0F7FA 70%, #C8E6C9 100%)",
    skyGradientDark: "linear-gradient(180deg, #1a3a4a 0%, #1e3d3d 40%, #1b3326 70%, #0d2818 100%)",
    groundGradient: "linear-gradient(180deg, #81C784 0%, #66BB6A 30%, #8D6E63 80%, #6D4C41 100%)",
    groundGradientDark: "linear-gradient(180deg, #2E7D32 0%, #1B5E20 30%, #4E342E 80%, #3E2723 100%)",
    particleColors: ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98"],
    creatureType: "butterflies",
    accentColor: "#4CAF50",
  },
  {
    name: "bloomingForest",
    skyGradient: "linear-gradient(180deg, #FF8C00 0%, #FFB347 25%, #FFD700 50%, #87CEEB 80%, #228B22 100%)",
    skyGradientDark: "linear-gradient(180deg, #4a2800 0%, #3d2600 25%, #2d2200 50%, #1a2f1a 80%, #0d1f0d 100%)",
    groundGradient: "linear-gradient(180deg, #2E7D32 0%, #388E3C 30%, #5D4037 80%, #4E342E 100%)",
    groundGradientDark: "linear-gradient(180deg, #1B5E20 0%, #1B5E20 30%, #3E2723 80%, #2E1B0E 100%)",
    particleColors: ["#FFD700", "#FFA500", "#FFFF00", "#90EE90"],
    creatureType: "fireflies",
    accentColor: "#FF8C00",
  },
  {
    name: "magicMountain",
    skyGradient: "linear-gradient(180deg, #4B0082 0%, #6A0DAD 25%, #9370DB 50%, #DDA0DD 75%, #8FBC8F 100%)",
    skyGradientDark: "linear-gradient(180deg, #1a0033 0%, #2a0550 25%, #2d1854 50%, #2a1a2d 80%, #0d2818 100%)",
    groundGradient: "linear-gradient(180deg, #6B8E23 0%, #808080 40%, #696969 70%, #556B2F 100%)",
    groundGradientDark: "linear-gradient(180deg, #2E4600 0%, #404040 40%, #333333 70%, #2E3B1F 100%)",
    particleColors: ["#9370DB", "#DDA0DD", "#FF69B4", "#00CED1"],
    creatureType: "crystals",
    accentColor: "#9370DB",
  },
  {
    name: "mythicalLand",
    skyGradient: "linear-gradient(180deg, #0B0033 0%, #1A0066 20%, #330099 40%, #6600CC 60%, #FFD700 90%, #DAA520 100%)",
    skyGradientDark: "linear-gradient(180deg, #050019 0%, #0D0033 20%, #1A004D 40%, #330066 60%, #4D3600 90%, #3D2A00 100%)",
    groundGradient: "linear-gradient(180deg, #DAA520 0%, #B8860B 30%, #8B6914 60%, #654321 100%)",
    groundGradientDark: "linear-gradient(180deg, #6D5210 0%, #5C4306 30%, #45340A 60%, #322211 100%)",
    particleColors: ["#FFD700", "#FFA500", "#FF4500", "#FFFFFF"],
    creatureType: "aurora",
    accentColor: "#FFD700",
  },
  {
    name: "cosmicSpace",
    skyGradient: "linear-gradient(180deg, #000011 0%, #0a0029 25%, #150050 50%, #3b0076 70%, #7b2ff0 90%, #9400D3 100%)",
    skyGradientDark: "linear-gradient(180deg, #000008 0%, #050015 25%, #0a0028 50%, #1d003b 70%, #3d1778 90%, #4a006a 100%)",
    groundGradient: "linear-gradient(180deg, #4a007a 0%, #2d004d 30%, #1a0033 60%, #0a0019 100%)",
    groundGradientDark: "linear-gradient(180deg, #25003d 0%, #170027 30%, #0d001a 60%, #05000d 100%)",
    particleColors: ["#E0B0FF", "#9400D3", "#00CED1", "#FFFFFF", "#FFD700"],
    creatureType: "cosmic",
    accentColor: "#9400D3",
  },
];

function getBiome(stage: number): BiomeConfig {
  if (stage <= 4) return BIOMES[0];
  if (stage <= 8) return BIOMES[1];
  if (stage <= 12) return BIOMES[2];
  if (stage <= 16) return BIOMES[3];
  return BIOMES[4];
}

function getBiomeIndex(stage: number): number {
  if (stage <= 4) return 0;
  if (stage <= 8) return 1;
  if (stage <= 12) return 2;
  if (stage <= 16) return 3;
  return 4;
}

// ─── Seeded Random (stable particles per render) ──────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── BiomeBackground ─────────────────────────────────
function BiomeBackground({ stage, isDark }: { stage: number; isDark: boolean }) {
  const biome = getBiome(stage);
  const rand = useMemo(() => seededRandom(stage * 7 + 42), [stage]);

  // Generate stable cloud positions
  const clouds = useMemo(() => {
    const r = rand;
    return Array.from({ length: 3 }, (_, i) => ({
      x: 10 + r() * 70,
      y: 5 + r() * 25,
      w: 40 + r() * 50,
      delay: r() * 8,
      duration: 15 + r() * 20,
    }));
  }, [stage]);

  // Stars for dark biomes (Mountain, Mythical, Cosmic)
  const stars = useMemo(() => {
    const r = seededRandom(stage * 13 + 99);
    const biomeIdx = getBiomeIndex(stage);
    const count = biomeIdx >= 2 ? 15 + biomeIdx * 8 : 0;
    return Array.from({ length: count }, () => ({
      x: r() * 100,
      y: r() * 60,
      size: 1 + r() * 2.5,
      delay: r() * 4,
      duration: 2 + r() * 3,
    }));
  }, [stage]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
      {/* Sky */}
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{ background: isDark ? biome.skyGradientDark : biome.skyGradient }}
      />

      {/* Stars */}
      {stars.map((star, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
        />
      ))}

      {/* Clouds (only for Spring & Forest biomes) */}
      {getBiomeIndex(stage) < 2 && clouds.map((cloud, i) => (
        <motion.div
          key={`cloud-${i}`}
          className="absolute pointer-events-none"
          style={{
            top: `${cloud.y}%`,
            width: cloud.w,
            height: cloud.w * 0.4,
            borderRadius: cloud.w,
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.6)",
            filter: "blur(4px)",
          }}
          animate={{ x: ["-20%", "120%"] }}
          transition={{
            duration: cloud.duration,
            repeat: Infinity,
            delay: cloud.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* Ground section (bottom 25%) */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
        style={{
          height: "25%",
          background: isDark ? biome.groundGradientDark : biome.groundGradient,
        }}
      />

      {/* Ground texture overlay */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "25%",
          background: isDark
            ? "repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 21px)"
            : "repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(0,0,0,0.03) 20px, rgba(0,0,0,0.03) 21px)",
        }}
      />
    </div>
  );
}

// ─── Floating Particles ───────────────────────────────
function FloatingParticles({ stage, isDark }: { stage: number; isDark: boolean }) {
  const biome = getBiome(stage);
  const particles = useMemo(() => {
    const r = seededRandom(stage * 31 + 17);
    return Array.from({ length: 18 }, (_, i) => ({
      x: r() * 100,
      y: r() * 100,
      size: 2 + r() * 5,
      color: biome.particleColors[Math.floor(r() * biome.particleColors.length)],
      duration: 4 + r() * 8,
      delay: r() * 5,
      drift: (r() - 0.5) * 40,
    }));
  }, [stage]);

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={`fp-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: 0,
            filter: biome.creatureType === "fireflies" ? `blur(1px) drop-shadow(0 0 4px ${p.color})` : undefined,
          }}
          animate={{
            y: [-30, 30, -30],
            x: [0, p.drift, 0],
            opacity: [0, 0.7, 0],
            scale: biome.creatureType === "fireflies" ? [0.5, 1.5, 0.5] : [0.8, 1.2, 0.8],
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

// ─── Creatures SVG Animations ─────────────────────────
function Creatures({ stage, isDark }: { stage: number; isDark: boolean }) {
  const biomeIdx = getBiomeIndex(stage);
  
  if (biomeIdx === 0) {
    // Butterflies
    return (
      <>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`butterfly-${i}`}
            className="absolute pointer-events-none"
            style={{ left: `${15 + i * 30}%`, top: `${20 + i * 10}%` }}
            animate={{
              x: [0, 30 + i * 10, -20, 0],
              y: [0, -15, 10, 0],
            }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
              <motion.g
                animate={{ scaleX: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <path d="M10 8C7 4 2 2 1 5s3 6 9 3z" fill={["#FF69B4", "#FFD700", "#87CEEB"][i]} opacity="0.8" />
                <path d="M10 8C13 4 18 2 19 5s-3 6-9 3z" fill={["#FF69B4", "#FFD700", "#87CEEB"][i]} opacity="0.8" />
              </motion.g>
              <path d="M10 4v8" stroke={isDark ? "#fff" : "#333"} strokeWidth="0.5" />
            </svg>
          </motion.div>
        ))}
      </>
    );
  }

  if (biomeIdx === 1) {
    // Birds
    return (
      <>
        {[0, 1].map((i) => (
          <motion.div
            key={`bird-${i}`}
            className="absolute pointer-events-none"
            style={{ top: `${10 + i * 12}%` }}
            animate={{ x: ["-10%", "110%"] }}
            transition={{ duration: 12 + i * 5, repeat: Infinity, delay: i * 4, ease: "linear" }}
          >
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
              <motion.path
                d="M0 6Q6 0 12 6Q18 0 24 6"
                stroke={isDark ? "#d1d5db" : "#4a5568"}
                strokeWidth="1.5"
                fill="none"
                animate={{ d: ["M0 6Q6 0 12 6Q18 0 24 6", "M0 6Q6 4 12 6Q18 4 24 6", "M0 6Q6 0 12 6Q18 0 24 6"] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </svg>
          </motion.div>
        ))}
      </>
    );
  }

  if (biomeIdx === 2) {
    // Floating crystals
    return (
      <>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={`crystal-${i}`}
            className="absolute pointer-events-none"
            style={{ left: `${10 + i * 22}%`, top: `${60 + (i % 2) * 8}%` }}
            animate={{ y: [0, -8, 0], rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
          >
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
              <polygon points="6,0 12,12 6,18 0,12" fill={["#9370DB", "#00CED1", "#DDA0DD", "#FF69B4"][i]} opacity="0.7" />
              <polygon points="6,0 12,12 6,8" fill="white" opacity="0.3" />
            </svg>
          </motion.div>
        ))}
      </>
    );
  }

  if (biomeIdx === 3) {
    // Aurora waves
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`aurora-${i}`}
            className="absolute left-0 right-0"
            style={{
              top: `${5 + i * 8}%`,
              height: 30 + i * 10,
              background: `linear-gradient(90deg, transparent, ${["rgba(0,255,128,0.15)", "rgba(128,0,255,0.12)", "rgba(255,215,0,0.1)"][i]}, transparent)`,
              filter: "blur(8px)",
            }}
            animate={{
              x: ["-30%", "30%", "-30%"],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{ duration: 8 + i * 3, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    );
  }

  // Cosmic rings + energy
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Energy ring */}
      <motion.div
        className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
        style={{
          width: 200,
          height: 80,
          borderColor: "rgba(148, 0, 211, 0.3)",
          transform: "rotateX(60deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      {/* Shooting stars */}
      {[0, 1].map((i) => (
        <motion.div
          key={`comet-${i}`}
          className="absolute w-1 h-1 rounded-full bg-white pointer-events-none"
          style={{
            boxShadow: "0 0 8px 2px rgba(255,255,255,0.8), -20px 0 15px 1px rgba(255,255,255,0.3)",
            top: `${15 + i * 20}%`,
          }}
          animate={{ x: ["-10%", "110%"], opacity: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 5 + 2, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

// ─── Parallax Tree Scene ──────────────────────────────
function TreeScene({ stage, isDark, showWater }: { stage: number; isDark: boolean; showWater: boolean }) {
  const biome = getBiome(stage);
  const biomeIdx = getBiomeIndex(stage);
  
  // Tree scaling: grows with stage
  const treeScale = 0.4 + (stage / 20) * 0.6;
  const trunkWidth = 6 + stage * 1.2;
  const trunkHeight = 40 + stage * 4;
  const canopyRadius = 20 + stage * 4;

  // Foliage layers — more complex at higher stages
  const foliageLayers = Math.min(stage, 5);

  // Trunk color
  const trunkColor = biomeIdx >= 3
    ? isDark ? "#8B6914" : "#B8860B"
    : isDark ? "#5D4037" : "#6D4C41";

  // Canopy main color
  const canopyColor = STAGE_COLORS[stage - 1] || "#4CAF50";

  // Get glow effect for higher stages
  const glowIntensity = stage > 12 ? (stage - 12) * 3 : 0;
  const glowColor = canopyColor;

  return (
    <div className="absolute inset-0 flex items-end justify-center pointer-events-none" style={{ bottom: "25%" }}>
      <motion.div
        className="relative"
        style={{ width: canopyRadius * 3, height: trunkHeight + canopyRadius * 2 }}
        animate={{ scale: showWater ? [1, 1.03, 1] : 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Trunk shadow on ground */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: trunkWidth * 3,
            height: trunkWidth * 0.8,
            background: "rgba(0,0,0,0.15)",
            filter: "blur(4px)",
          }}
        />

        {/* Root system (visible from stage 5+) */}
        {stage >= 5 && (
          <svg
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            width={trunkWidth * 6}
            height={20}
            viewBox="0 0 120 20"
            style={{ transform: "translateX(-50%)" }}
          >
            <path
              d={`M60 0 Q40 10 20 15 M60 0 Q50 8 35 18 M60 0 Q70 8 85 18 M60 0 Q80 10 100 15`}
              stroke={trunkColor}
              strokeWidth="2"
              fill="none"
              opacity={isDark ? 0.5 : 0.4}
            />
            {stage >= 13 && (
              <motion.path
                d={`M60 0 Q40 10 20 15 M60 0 Q80 10 100 15`}
                stroke={glowColor}
                strokeWidth="1.5"
                fill="none"
                animate={{ opacity: [0.1, 0.5, 0.1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}
          </svg>
        )}

        {/* Main trunk */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: trunkWidth,
            height: trunkHeight,
            borderRadius: trunkWidth / 2,
            background: `linear-gradient(90deg, ${trunkColor}cc, ${trunkColor}, ${trunkColor}cc)`,
          }}
        >
          {/* Trunk texture lines */}
          {stage >= 3 && Array.from({ length: Math.min(stage - 2, 6) }, (_, i) => (
            <div
              key={`tex-${i}`}
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: `${20 + i * 14}%`,
                width: trunkWidth * 0.5,
                height: 1.5,
                borderRadius: 1,
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
              }}
            />
          ))}

          {/* Inner glow for mythical+ stages */}
          {stage >= 13 && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(ellipse at center, ${glowColor}33, transparent)`,
              }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}
        </div>

        {/* Branches (stage 4+) */}
        {stage >= 4 && (
          <svg
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              bottom: trunkHeight * 0.4,
              width: canopyRadius * 2.5,
              height: trunkHeight * 0.6,
              transform: "translateX(-50%)",
            }}
            viewBox="0 0 100 60"
          >
            {/* Left branches */}
            <path d={`M50 50 Q30 40 ${15 - stage * 0.3} ${35 - stage * 0.5}`} stroke={trunkColor} strokeWidth="2.5" fill="none" opacity="0.7" />
            {stage >= 7 && <path d="M50 40 Q35 30 20 25" stroke={trunkColor} strokeWidth="2" fill="none" opacity="0.6" />}
            {/* Right branches */}
            <path d={`M50 50 Q70 40 ${85 + stage * 0.3} ${35 - stage * 0.5}`} stroke={trunkColor} strokeWidth="2.5" fill="none" opacity="0.7" />
            {stage >= 7 && <path d="M50 40 Q65 30 80 25" stroke={trunkColor} strokeWidth="2" fill="none" opacity="0.6" />}
          </svg>
        )}

        {/* Canopy — layered ellipses */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: trunkHeight * 0.6 }}
        >
          {/* Outer glow for golden+ stages */}
          {glowIntensity > 0 && (
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: canopyRadius * 3.5,
                height: canopyRadius * 3,
                background: `radial-gradient(ellipse, ${glowColor}${Math.round(glowIntensity * 2).toString(16).padStart(2, '0')}, transparent 70%)`,
                filter: `blur(${glowIntensity}px)`,
              }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          )}

          {/* Background foliage layer */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: -canopyRadius * 0.5,
              width: canopyRadius * 2.8,
              height: canopyRadius * 2.2,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at 40% 40%, ${canopyColor}99, ${canopyColor}55)`,
              filter: "blur(2px)",
            }}
            animate={{
              scaleX: [1, 1.02, 0.98, 1],
              scaleY: [1, 0.98, 1.02, 1],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Main canopy */}
          <motion.div
            className="relative"
            style={{
              width: canopyRadius * 2.4,
              height: canopyRadius * 2,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at 35% 35%, ${canopyColor}ee, ${canopyColor}aa, ${canopyColor}77)`,
              marginLeft: -canopyRadius * 1.2,
            }}
            animate={{
              scaleX: [1, 1.015, 0.985, 1],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Highlight spots */}
            <div
              className="absolute rounded-full"
              style={{
                top: "15%",
                left: "20%",
                width: "30%",
                height: "25%",
                borderRadius: "50%",
                background: `radial-gradient(ellipse, rgba(255,255,255,0.25), transparent)`,
              }}
            />

            {/* Extra leaf clusters */}
            {foliageLayers >= 2 && (
              <>
                <div
                  className="absolute rounded-full"
                  style={{
                    top: "-10%",
                    left: "10%",
                    width: "35%",
                    height: "40%",
                    borderRadius: "50%",
                    background: `${canopyColor}88`,
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    top: "-5%",
                    right: "5%",
                    width: "30%",
                    height: "35%",
                    borderRadius: "50%",
                    background: `${canopyColor}77`,
                  }}
                />
              </>
            )}

            {/* Fruits for stage 13+ */}
            {stage >= 13 && (
              <>
                {Array.from({ length: Math.min(stage - 12, 6) }, (_, i) => {
                  const angle = (i / 6) * Math.PI * 1.5 + 0.3;
                  const r2 = canopyRadius * 0.6;
                  const fx = 50 + Math.cos(angle) * 35;
                  const fy = 40 + Math.sin(angle) * 30;
                  const fruitColor = biomeIdx >= 4
                    ? ["#E0B0FF", "#00CED1", "#FFD700"][i % 3]
                    : ["#FF6347", "#FF4500", "#FFD700"][i % 3];
                  return (
                    <motion.div
                      key={`fruit-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: `${fx}%`,
                        top: `${fy}%`,
                        width: 8,
                        height: 8,
                        background: `radial-gradient(circle at 30% 30%, ${fruitColor}, ${fruitColor}aa)`,
                        boxShadow: `0 0 6px ${fruitColor}66`,
                      }}
                      animate={{ scale: [0.8, 1.1, 0.8] }}
                      transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                    />
                  );
                })}
              </>
            )}

            {/* Crystal facets for stage 17+ */}
            {stage >= 17 && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%, rgba(255,255,255,0.1) 100%)",
                }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              />
            )}
          </motion.div>

          {/* Small leaf drifting effect */}
          {stage >= 6 && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`leaf-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${20 + i * 25}%`,
                    top: "80%",
                  }}
                  animate={{
                    y: [0, 40 + i * 15],
                    x: [0, (i % 2 === 0 ? 1 : -1) * (15 + i * 5)],
                    rotate: [0, 360],
                    opacity: [0.8, 0],
                  }}
                  transition={{
                    duration: 4 + i,
                    repeat: Infinity,
                    delay: i * 2,
                    ease: "easeIn",
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: 4,
                      height: 6,
                      background: canopyColor,
                      opacity: 0.7,
                    }}
                  />
                </motion.div>
              ))}
            </>
          )}
        </div>

        {/* Nest on branch (stage 8-12) */}
        {stage >= 8 && stage <= 12 && (
          <div
            className="absolute"
            style={{
              right: -canopyRadius * 0.2,
              bottom: trunkHeight * 0.6,
            }}
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <ellipse cx="10" cy="10" rx="9" ry="4" fill="#8B6914" opacity="0.8" />
              <circle cx="7" cy="8" r="2" fill="#F5F5DC" />
              <circle cx="13" cy="8" r="2" fill="#F5F5DC" />
            </svg>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Rain/Watering Animation ──────────────────────────
function WaterAnimation({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {/* Rain cloud */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: "5%" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <svg width="80" height="30" viewBox="0 0 80 30">
          <ellipse cx="40" cy="15" rx="35" ry="12" fill="rgba(100,149,237,0.6)" />
          <ellipse cx="25" cy="12" rx="18" ry="10" fill="rgba(120,160,240,0.5)" />
          <ellipse cx="55" cy="12" rx="18" ry="10" fill="rgba(120,160,240,0.5)" />
        </svg>
      </motion.div>

      {/* Rain drops */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={`rain-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${25 + Math.random() * 50}%`,
            top: "15%",
            width: 2,
            height: 8,
            background: "linear-gradient(180deg, rgba(100,149,237,0.8), rgba(100,149,237,0.2))",
            borderRadius: 4,
          }}
          animate={{
            y: [0, 250],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.5,
            repeat: 3,
            delay: i * 0.08,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

// ─── Journey Map (Winding Path) ───────────────────────
function JourneyMap({
  stages,
  currentStage,
  stageIcons,
  isDark,
  isRTL,
  t,
  selectedStage,
  onSelectStage,
}: {
  stages: { stage: number; name: string; minPoints: number }[];
  currentStage: number;
  stageIcons: string[];
  isDark: boolean;
  isRTL: boolean;
  t: (key: string) => string;
  selectedStage: number | null;
  onSelectStage: (s: number | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalStages = stages.length;

  // Auto-scroll to current stage
  useEffect(() => {
    if (scrollRef.current) {
      const currentNode = scrollRef.current.querySelector(`[data-stage="${currentStage}"]`);
      if (currentNode) {
        currentNode.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentStage]);

  const biomeNames = ["springField", "bloomingForest", "magicMountain", "mythicalLand", "cosmicSpace"];
  const biomeLabels: Record<string, { en: string; ar: string }> = {
    springField: { en: "Spring Field", ar: "حقل الربيع" },
    bloomingForest: { en: "Blooming Forest", ar: "الغابة المزهرة" },
    magicMountain: { en: "Magic Mountain", ar: "الجبل السحري" },
    mythicalLand: { en: "Mythical Land", ar: "أرض الأساطير" },
    cosmicSpace: { en: "Cosmic Space", ar: "الفضاء الكوني" },
  };

  return (
    <div className="px-4 pb-3">
      <div
        ref={scrollRef}
        className="relative overflow-y-auto max-h-[300px] py-4 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="relative flex flex-col items-center gap-0">
          {stages.map((stage, i) => {
            const unlocked = stage.stage <= currentStage;
            const isCurrent = stage.stage === currentStage;
            const isSelected = selectedStage === stage.stage;
            const color = STAGE_COLORS[i] || "#4CAF50";
            const StageIcon = TREE_STAGE_ICONS[i];
            const customIcon = stageIcons[i] && stageIcons[i].startsWith("/uploads/") ? stageIcons[i] : null;
            const x = (i % 2 === 0) ? -40 : 40;
            const biomeStart = i % 4 === 0;
            const biomeIdx = Math.floor(i / 4);
            const stageKey = `tree${stage.name.charAt(0).toUpperCase() + stage.name.slice(1)}`;

            return (
              <div key={stage.stage} data-stage={stage.stage} className="relative w-full flex flex-col items-center">
                {/* Biome divider */}
                {biomeStart && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className={`w-[85%] mb-3 mt-1 py-1.5 px-3 rounded-full text-center text-[10px] font-bold tracking-wide ${
                      isDark ? "bg-gray-700/50 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}
                    style={{
                      borderLeft: `3px solid ${BIOMES[biomeIdx]?.accentColor || "#4CAF50"}`,
                      borderRight: `3px solid ${BIOMES[biomeIdx]?.accentColor || "#4CAF50"}`,
                    }}
                  >
                    {isRTL
                      ? biomeLabels[biomeNames[biomeIdx]]?.ar || biomeNames[biomeIdx]
                      : biomeLabels[biomeNames[biomeIdx]]?.en || biomeNames[biomeIdx]}
                  </motion.div>
                )}

                {/* Connecting line to next */}
                {i < totalStages - 1 && (
                  <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-[calc(100%)]" style={{ top: 44 }}>
                    <div
                      className="w-full h-full"
                      style={{
                        background: unlocked
                          ? `linear-gradient(180deg, ${color}, ${STAGE_COLORS[i + 1] || color})`
                          : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                      }}
                    />
                    {/* Energy flow on path */}
                    {unlocked && (
                      <motion.div
                        className="absolute top-0 left-0 w-full rounded-full"
                        style={{
                          height: 8,
                          background: `radial-gradient(circle, ${color}cc, transparent)`,
                        }}
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.15, ease: "linear" }}
                      />
                    )}
                  </div>
                )}

                {/* Stage node */}
                <div
                  className="relative flex items-center gap-3 py-2 z-10"
                  style={{ transform: `translateX(${x}px)` }}
                >
                  <motion.button
                    onClick={() => onSelectStage(isSelected ? null : stage.stage)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      width: isCurrent ? 48 : 38,
                      height: isCurrent ? 48 : 38,
                      background: unlocked
                        ? `radial-gradient(circle at 35% 35%, ${color}ee, ${color}88)`
                        : isDark ? "rgba(60,60,80,0.6)" : "rgba(200,200,215,0.6)",
                      boxShadow: isCurrent
                        ? `0 0 20px ${color}66, 0 0 40px ${color}33`
                        : unlocked
                        ? `0 0 8px ${color}44`
                        : "none",
                      border: isCurrent
                        ? `2.5px solid ${color}`
                        : unlocked
                        ? `1.5px solid ${color}55`
                        : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                      opacity: unlocked ? 1 : 0.4,
                    }}
                  >
                    {customIcon ? (
                      <img src={customIcon} alt="" className="rounded-full" style={{ width: isCurrent ? 32 : 24, height: isCurrent ? 32 : 24 }} />
                    ) : StageIcon ? (
                      <StageIcon size={isCurrent ? 32 : 24} />
                    ) : null}

                    {/* Lock icon for locked stages */}
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                        <Lock className="w-3.5 h-3.5 text-white/70" />
                      </div>
                    )}

                    {/* Pulsing ring for current */}
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-[-5px] rounded-full border-2"
                        style={{ borderColor: color }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    {/* Check for completed */}
                    {unlocked && !isCurrent && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </motion.button>

                  {/* Stage label */}
                  <div className={`min-w-0 ${isCurrent ? "" : ""}`}>
                    <p className={`text-xs font-bold truncate max-w-[120px] ${
                      isCurrent
                        ? isDark ? "text-white" : "text-gray-900"
                        : unlocked
                        ? isDark ? "text-gray-300" : "text-gray-700"
                        : isDark ? "text-gray-600" : "text-gray-400"
                    }`}>
                      {t(stageKey)}
                    </p>
                    <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {isCurrent
                        ? isRTL ? "⭐ أنت هنا" : "⭐ You are here"
                        : unlocked
                        ? isRTL ? "✅ مفتوحة" : "✅ Unlocked"
                        : `🔒 ${stage.minPoints} ${t("points")}`}
                    </p>
                  </div>
                </div>

                {/* Selected stage detail popup */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`w-[80%] rounded-xl p-3 mb-2 text-center overflow-hidden ${
                        isDark ? "bg-gray-800/90 border border-gray-600" : "bg-white/90 border border-gray-200"
                      }`}
                      style={{ backdropFilter: "blur(8px)" }}
                    >
                      <p className={`text-xs font-bold mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {isRTL ? `المرحلة ${stage.stage} من ${totalStages}` : `Stage ${stage.stage} of ${totalStages}`}
                      </p>
                      <div
                        className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-white"
                        style={{ background: unlocked ? color : isDark ? "#4a5568" : "#a0aec0" }}
                      >
                        {unlocked
                          ? isRTL ? "✅ أكملت هذه المرحلة" : "✅ Completed"
                          : `🔒 ${stage.minPoints} ${t("points")} ${isRTL ? "مطلوبة" : "required"}`}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Panel ──────────────────────────────────────
function StatsPanel({
  tree,
  isDark,
  t,
}: {
  tree: GrowthTreeData["tree"];
  isDark: boolean;
  t: (key: string) => string;
}) {
  const stats = [
    { icon: Zap, value: tree.totalGrowthPoints, label: t("points"), color: "#22c55e", bg: isDark ? "bg-green-900/20" : "bg-green-50" },
    { icon: Sparkles, value: tree.tasksCompleted, label: t("tasks"), color: "#eab308", bg: isDark ? "bg-yellow-900/20" : "bg-yellow-50" },
    { icon: TrendingUp, value: tree.gamesPlayed, label: t("gamesLabel") || t("gamesAndTasks"), color: "#3b82f6", bg: isDark ? "bg-blue-900/20" : "bg-blue-50" },
    { icon: Star, value: tree.rewardsEarned, label: t("rewards"), color: "#a855f7", bg: isDark ? "bg-purple-900/20" : "bg-purple-50" },
    { icon: Droplets, value: tree.wateringsCount || 0, label: t("waterings"), color: "#06b6d4", bg: isDark ? "bg-cyan-900/20" : "bg-cyan-50" },
  ];

  return (
    <div className="px-4 pb-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex-shrink-0 w-[90px] p-3 rounded-2xl ${stat.bg} border ${
              isDark ? "border-gray-700/50" : "border-gray-200/80"
            }`}
          >
            <stat.icon className="w-5 h-5 mb-1.5" style={{ color: stat.color }} />
            <p className="text-lg font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
            <p className={`text-[10px] leading-tight mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Celebration Overlay ──────────────────────────────
function CelebrationOverlay({
  show,
  stageName,
  stageNumber,
  color,
  isRTL,
  isBiomeChange,
  onDone,
}: {
  show: boolean;
  stageName: string;
  stageNumber: number;
  color: string;
  isRTL: boolean;
  isBiomeChange: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDone, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  if (!show) return null;

  const confettiColors = ["#FFD700", "#FF6347", "#00CED1", "#FF69B4", "#7B68EE", "#32CD32", "#FF8C00"];

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 rounded-2xl" />

      {/* Confetti */}
      {Array.from({ length: isBiomeChange ? 40 : 20 }, (_, i) => (
        <motion.div
          key={`conf-${i}`}
          className="absolute rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-5%",
            width: 6 + Math.random() * 6,
            height: 6 + Math.random() * 6,
            background: confettiColors[i % confettiColors.length],
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
          animate={{
            y: [0, 500],
            x: [(Math.random() - 0.5) * 150],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random() * 1.5,
            delay: Math.random() * 0.5,
            ease: "easeIn",
          }}
        />
      ))}

      {/* Center message */}
      <motion.div
        className="relative z-10 text-center px-8 py-6 rounded-3xl"
        style={{
          background: `radial-gradient(circle, ${color}dd, ${color}99)`,
          boxShadow: `0 0 60px ${color}66`,
        }}
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: 2 }}
        >
          {isBiomeChange ? (
            <Crown className="w-12 h-12 mx-auto mb-2 text-white" />
          ) : (
            <Sparkles className="w-10 h-10 mx-auto mb-2 text-white" />
          )}
        </motion.div>
        <h3 className="text-xl font-black text-white mb-1">
          {isRTL ? "🎉 مبروك!" : "🎉 Level Up!"}
        </h3>
        <p className="text-white/90 font-semibold text-sm">
          {isRTL
            ? `وصلت إلى ${stageName}!`
            : `You reached ${stageName}!`}
        </p>
        {isBiomeChange && (
          <p className="text-white/75 text-xs mt-1">
            {isRTL ? "🌍 عالم جديد مفتوح!" : "🌍 New world unlocked!"}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main GrowthTree Component ────────────────────────
export function GrowthTree() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";

  const [isExpanded, setIsExpanded] = useState(false);
  const [showWaterAnim, setShowWaterAnim] = useState(false);
  const [waterMessage, setWaterMessage] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStage, setCelebrationStage] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"tree" | "journey">("tree");
  const prevStageRef = useRef<number>(0);

  // ─── Data Queries ─────────────────────────────────
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
      }, 3000);
    },
    onError: (err: Error) => {
      setWaterMessage(err.message);
      setTimeout(() => setWaterMessage(null), 2500);
    },
  });

  const wateringInfo = wateringData?.data;
  const canWater = wateringInfo?.wateringEnabled && (wateringInfo?.remainingWateringsToday || 0) > 0;

  // ─── Level-up Detection ───────────────────────────
  useEffect(() => {
    if (!data?.data) return;
    const cs = data.data.tree.currentStage;
    if (prevStageRef.current > 0 && cs > prevStageRef.current) {
      setCelebrationStage(cs);
      setShowCelebration(true);
    }
    prevStageRef.current = cs;
  }, [data?.data?.tree.currentStage]);

  // ─── Loading / Error ──────────────────────────────
  if (isLoading) {
    return (
      <div className={`rounded-3xl p-6 ${isDark ? "bg-gray-800" : "bg-white"} shadow-xl animate-pulse`}>
        <div className="h-[120px] bg-gray-300 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (error || !data?.data) return null;

  const { tree, stages, currentStageName, nextStageName, pointsToNextStage, progress } = data.data;
  const currentStage = tree.currentStage;
  const totalStages = stages.length || 20;
  const stageIcons: string[] = data.data.stageIcons || [];

  const stageKey = `tree${currentStageName.charAt(0).toUpperCase() + currentStageName.slice(1)}`;
  const nextStageKey = nextStageName
    ? `tree${nextStageName.charAt(0).toUpperCase() + nextStageName.slice(1)}`
    : null;

  const currentStageIdx = currentStage - 1;
  const CurrentStageIcon = TREE_STAGE_ICONS[currentStageIdx];
  const currentStageColor = STAGE_COLORS[currentStageIdx] || "#4CAF50";
  const currentCustomIcon = stageIcons[currentStageIdx] && stageIcons[currentStageIdx].startsWith("/uploads/") ? stageIcons[currentStageIdx] : null;
  const biome = getBiome(currentStage);

  const isCelebrationBiomeChange = celebrationStage > 0 && celebrationStage % 4 === 1 && celebrationStage > 1;
  const celebrationColor = STAGE_COLORS[celebrationStage - 1] || "#4CAF50";
  const celebrationName = celebrationStage > 0 && stages[celebrationStage - 1]
    ? t(`tree${stages[celebrationStage - 1].name.charAt(0).toUpperCase() + stages[celebrationStage - 1].name.slice(1)}`)
    : "";

  return (
    <div className={`rounded-3xl overflow-hidden shadow-2xl border ${isDark ? "border-gray-700/50" : "border-gray-200/50"} relative`}>
      {/* ====== COLLAPSED STATE ====== */}
      <div
        className={`cursor-pointer select-none transition-all ${
          !isExpanded ? "px-4 py-3.5" : "px-4 pt-3 pb-0"
        }`}
        style={{
          background: !isExpanded
            ? isDark
              ? `linear-gradient(135deg, rgba(20,30,20,0.95), rgba(15,25,15,0.95))`
              : `linear-gradient(135deg, rgba(240,253,244,0.98), rgba(236,253,245,0.98))`
            : "transparent",
        }}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {!isExpanded ? (
          <div className="flex items-center gap-3">
            {/* Mini tree scene (collapsed) */}
            <div className="relative flex-shrink-0 w-[56px] h-[56px] rounded-2xl overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ background: isDark ? biome.skyGradientDark : biome.skyGradient }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-[35%]"
                style={{ background: isDark ? biome.groundGradientDark : biome.groundGradient }}
              />
              {/* Mini tree */}
              <div className="absolute inset-0 flex items-end justify-center pb-[30%]">
                <div className="relative">
                  <div style={{ width: 3, height: 14 + currentStage, background: isDark ? "#6D4C41" : "#5D4037", borderRadius: 2, margin: "0 auto" }} />
                  <motion.div
                    className="absolute bottom-[70%] left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: 12 + currentStage * 1.5,
                      height: 10 + currentStage * 1.2,
                      background: `radial-gradient(circle, ${currentStageColor}ee, ${currentStageColor}77)`,
                    }}
                    animate={{ scaleX: [1, 1.05, 0.95, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                </div>
              </div>
              {/* Level badge */}
              <div
                className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-black text-white"
                style={{ background: currentStageColor, boxShadow: `0 0 6px ${currentStageColor}88` }}
              >
                {currentStage}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <TreePine className="w-4 h-4 text-green-500 flex-shrink-0" />
                <h2 className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("growthTree")}
                </h2>
              </div>
              <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("treeLevel")} {currentStage}/{totalStages} · {t(stageKey)}
              </p>

              {/* Progress bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                  <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                      width: `${Math.min(100, progress)}%`,
                      background: `linear-gradient(90deg, ${currentStageColor}99, ${currentStageColor})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, progress)}%` }}
                    transition={{ duration: 1 }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Watering indicator */}
              {wateringInfo?.wateringEnabled && (
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: wateringInfo.maxWateringsPerDay }, (_, i) => (
                    <Droplets
                      key={i}
                      className={`w-3 h-3 ${i < wateringInfo.remainingWateringsToday ? "text-blue-400" : isDark ? "text-gray-600" : "text-gray-300"}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Expand arrow */}
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
            </motion.div>
          </div>
        ) : (
          /* Expanded header */
          <div className="relative z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TreePine className="w-5 h-5 text-green-400" />
                <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("growthTree")}
                </h2>
              </div>
              <motion.div animate={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* ====== EXPANDED CONTENT ====== */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Tab switcher: Tree View / Journey Map */}
            <div className={`flex mx-4 mt-2 mb-0 rounded-xl overflow-hidden ${isDark ? "bg-gray-800/80" : "bg-gray-100"}`}>
              {(["tree", "journey"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={(e) => { e.stopPropagation(); setActiveTab(tab); }}
                  className={`flex-1 py-2 text-xs font-bold transition-all ${
                    activeTab === tab
                      ? `${isDark ? "bg-gray-700 text-white" : "bg-white text-gray-800"} shadow-sm`
                      : `${isDark ? "text-gray-400" : "text-gray-500"}`
                  } rounded-xl`}
                >
                  {tab === "tree"
                    ? isRTL ? "🌳 الشجرة" : "🌳 Tree"
                    : isRTL ? "🗺️ الرحلة" : "🗺️ Journey"}
                </button>
              ))}
            </div>

            {/* ── Tree View Tab ── */}
            {activeTab === "tree" && (
              <div className="relative" style={{ minHeight: 380 }}>
                {/* Biome background */}
                <BiomeBackground stage={currentStage} isDark={isDark} />

                {/* Floating particles */}
                <FloatingParticles stage={currentStage} isDark={isDark} />

                {/* Creatures */}
                <Creatures stage={currentStage} isDark={isDark} />

                {/* Tree scene */}
                <TreeScene stage={currentStage} isDark={isDark} showWater={showWaterAnim} />

                {/* Water animation */}
                <AnimatePresence>
                  {showWaterAnim && <WaterAnimation active={showWaterAnim} />}
                </AnimatePresence>

                {/* Water message overlay */}
                <AnimatePresence>
                  {waterMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute left-1/2 top-[35%] -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-blue-500/90 text-white font-bold text-sm shadow-2xl pointer-events-none"
                      style={{ backdropFilter: "blur(4px)" }}
                    >
                      {waterMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Stage info badge (bottom overlay) */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <div className={`mx-3 mb-3 px-4 py-3 rounded-2xl ${
                    isDark ? "bg-gray-900/80 border border-gray-700/50" : "bg-white/80 border border-gray-200/50"
                  }`} style={{ backdropFilter: "blur(12px)" }}>
                    {/* Current stage + progress */}
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${currentStageColor}ee, ${currentStageColor}88)`,
                          boxShadow: `0 0 12px ${currentStageColor}44`,
                        }}
                      >
                        {currentCustomIcon ? (
                          <img src={currentCustomIcon} alt="" className="w-7 h-7 object-contain rounded" />
                        ) : CurrentStageIcon ? (
                          <CurrentStageIcon size={28} />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                            {t(stageKey)}
                          </p>
                          <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {currentStage}/{totalStages}
                          </span>
                        </div>
                        {nextStageName && (
                          <div className="mt-1">
                            <div className={`h-2 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                              <motion.div
                                className="h-full rounded-full relative overflow-hidden"
                                style={{
                                  background: `linear-gradient(90deg, ${currentStageColor}, ${STAGE_COLORS[currentStage] || currentStageColor})`,
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                              >
                                <motion.div
                                  className="absolute inset-0"
                                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
                                  animate={{ x: ["-100%", "200%"] }}
                                  transition={{ duration: 2.5, repeat: Infinity }}
                                />
                              </motion.div>
                            </div>
                            <p className={`text-[10px] mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                              {pointsToNextStage > 0
                                ? `${pointsToNextStage} ${t("points")} ${t("remaining")} → ${nextStageKey ? t(nextStageKey) : nextStageName}`
                                : t("wellDone")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Watering button */}
                    {wateringInfo?.wateringEnabled && (
                      <div className="flex items-center gap-2 mt-1 pt-2 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: wateringInfo.maxWateringsPerDay }, (_, i) => (
                            <Droplets
                              key={i}
                              className={`w-3.5 h-3.5 ${i < wateringInfo.remainingWateringsToday ? "text-blue-400" : isDark ? "text-gray-600" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                        <div className="flex-1" />
                        <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          <span className="text-red-400 font-bold">-{wateringInfo.wateringCostPoints}</span>
                          {" / "}
                          <span className="text-green-400 font-bold">+{wateringInfo.wateringGrowthPoints}</span>
                          {" "}{t("points")}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canWater && !waterMutation.isPending) waterMutation.mutate();
                          }}
                          disabled={!canWater || waterMutation.isPending}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            canWater
                              ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 active:scale-95"
                              : isDark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          <Droplets className="w-3.5 h-3.5" />
                          {waterMutation.isPending ? "..." : t("waterNow")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Journey Map Tab ── */}
            {activeTab === "journey" && (
              <JourneyMap
                stages={stages}
                currentStage={currentStage}
                stageIcons={stageIcons}
                isDark={isDark}
                isRTL={isRTL}
                t={t}
                selectedStage={selectedStage}
                onSelectStage={setSelectedStage}
              />
            )}

            {/* ── Stats ── */}
            <StatsPanel tree={tree} isDark={isDark} t={t} />

            {/* ── Celebration Overlay ── */}
            <AnimatePresence>
              {showCelebration && (
                <CelebrationOverlay
                  show={showCelebration}
                  stageName={celebrationName}
                  stageNumber={celebrationStage}
                  color={celebrationColor}
                  isRTL={isRTL}
                  isBiomeChange={isCelebrationBiomeChange}
                  onDone={() => setShowCelebration(false)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Emoji Kingdom — Worlds & Procedural Generation Module =====
// 10 educational worlds with infinite procedurally generated levels

import { POOL } from './config.js';

// ===== 10 WORLDS =====
export const WORLDS = [
  {
    id: 'forest',
    emoji: '🌿',
    icon: '🌳',
    order: 0,
    ageRange: [4, 6],
    baseOps: ['count', 'add'],
    baseRange: 5,
    rangeStep: 1,
    baseTimer: 0,
    timerStartLevel: 15,
    baseTimerSec: 25,
    timerDecay: 0.4,
    baseQuestions: 8,
    cats: ['farm', 'fruit', 'flower'],
    questionTypes: ['visualCount', 'classic', 'compare'],
    bossEvery: 10,
    bossTypes: ['dragon_baby', 'slime_king', 'flower_witch', 'tree_giant', 'mushroom_lord'],
    gradient: 'linear-gradient(135deg,#86efac,#22c55e)',
    accent: '#16a34a',
    particleStyle: '🍃',
    unlockReq: null,
  },
  {
    id: 'orchard',
    emoji: '🍎',
    icon: '🌺',
    order: 1,
    ageRange: [5, 7],
    baseOps: ['add'],
    baseRange: 10,
    rangeStep: 2,
    baseTimer: 0,
    timerStartLevel: 10,
    baseTimerSec: 22,
    timerDecay: 0.5,
    baseQuestions: 10,
    cats: ['fruit', 'veggie', 'food'],
    questionTypes: ['classic', 'visualCount', 'missingNumber', 'compare'],
    bossEvery: 10,
    bossTypes: ['apple_worm', 'veggie_monster', 'pie_boss', 'juice_king', 'harvest_dragon'],
    gradient: 'linear-gradient(135deg,#fde68a,#f59e0b)',
    accent: '#b45309',
    particleStyle: '🍎',
    unlockReq: { world: 'forest', starsNeeded: 15 },
  },
  {
    id: 'ocean',
    emoji: '🌊',
    icon: '🐠',
    order: 2,
    ageRange: [5, 8],
    baseOps: ['add', 'sub'],
    baseRange: 12,
    rangeStep: 2,
    baseTimer: 0,
    timerStartLevel: 8,
    baseTimerSec: 20,
    timerDecay: 0.5,
    baseQuestions: 10,
    cats: ['sea', 'weather', 'bird'],
    questionTypes: ['classic', 'missingNumber', 'compare', 'trueFalse'],
    bossEvery: 10,
    bossTypes: ['kraken', 'shark_king', 'storm_whale', 'coral_golem', 'ice_serpent'],
    gradient: 'linear-gradient(135deg,#67e8f9,#0891b2)',
    accent: '#0e7490',
    particleStyle: '🌊',
    unlockReq: { world: 'orchard', starsNeeded: 15 },
  },
  {
    id: 'volcano',
    emoji: '🔥',
    icon: '🌋',
    order: 3,
    ageRange: [7, 10],
    baseOps: ['mul'],
    baseRange: 5,
    rangeStep: 1,
    baseTimer: 20,
    timerStartLevel: 0,
    baseTimerSec: 20,
    timerDecay: 0.4,
    baseQuestions: 10,
    cats: ['wild', 'sport', 'vehicle'],
    questionTypes: ['classic', 'trueFalse', 'missingNumber', 'classic'],
    bossEvery: 10,
    bossTypes: ['lava_dragon', 'fire_golem', 'magma_worm', 'ash_phoenix', 'volcano_titan'],
    gradient: 'linear-gradient(135deg,#fdba74,#ea580c)',
    accent: '#c2410c',
    particleStyle: '🔥',
    unlockReq: { world: 'ocean', starsNeeded: 15 },
  },
  {
    id: 'electric',
    emoji: '⚡',
    icon: '🏙️',
    order: 4,
    ageRange: [8, 11],
    baseOps: ['mul', 'div'],
    baseRange: 8,
    rangeStep: 1,
    baseTimer: 18,
    timerStartLevel: 0,
    baseTimerSec: 18,
    timerDecay: 0.4,
    baseQuestions: 10,
    cats: ['tech', 'tool', 'building'],
    questionTypes: ['classic', 'missingNumber', 'trueFalse', 'placeValue'],
    bossEvery: 10,
    bossTypes: ['thunder_bot', 'circuit_snake', 'neon_golem', 'battery_king', 'storm_mech'],
    gradient: 'linear-gradient(135deg,#c4b5fd,#7c3aed)',
    accent: '#6d28d9',
    particleStyle: '⚡',
    unlockReq: { world: 'volcano', starsNeeded: 15 },
  },
  {
    id: 'castle',
    emoji: '🏰',
    icon: '🏰',
    order: 5,
    ageRange: [8, 12],
    baseOps: ['fraction'],
    baseRange: 12,
    rangeStep: 2,
    baseTimer: 25,
    timerStartLevel: 0,
    baseTimerSec: 25,
    timerDecay: 0.3,
    baseQuestions: 10,
    cats: ['fashion', 'building', 'school'],
    questionTypes: ['fractionVisual', 'classic', 'compare', 'missingNumber'],
    bossEvery: 10,
    bossTypes: ['knight_boss', 'wizard_king', 'stone_guardian', 'ghost_lord', 'castle_dragon'],
    gradient: 'linear-gradient(135deg,#f9a8d4,#db2777)',
    accent: '#be185d',
    particleStyle: '🏰',
    unlockReq: { world: 'electric', starsNeeded: 15 },
  },
  {
    id: 'space',
    emoji: '🌌',
    icon: '🚀',
    order: 6,
    ageRange: [9, 12],
    baseOps: ['decimal'],
    baseRange: 10,
    rangeStep: 2,
    baseTimer: 22,
    timerStartLevel: 0,
    baseTimerSec: 22,
    timerDecay: 0.3,
    baseQuestions: 10,
    cats: ['space', 'tech', 'weather'],
    questionTypes: ['classic', 'trueFalse', 'missingNumber', 'sequence'],
    bossEvery: 10,
    bossTypes: ['alien_emperor', 'black_hole', 'comet_dragon', 'nebula_giant', 'galaxy_lord'],
    gradient: 'linear-gradient(135deg,#312e81,#4f46e5)',
    accent: '#3730a3',
    particleStyle: '🌟',
    unlockReq: { world: 'castle', starsNeeded: 15 },
  },
  {
    id: 'puzzle',
    emoji: '🧩',
    icon: '🧩',
    order: 7,
    ageRange: [6, 14],
    baseOps: ['pattern'],
    baseRange: 20,
    rangeStep: 3,
    baseTimer: 30,
    timerStartLevel: 0,
    baseTimerSec: 30,
    timerDecay: 0.3,
    baseQuestions: 10,
    cats: ['music', 'bug', 'flower'],
    questionTypes: ['sequence', 'classic', 'compare', 'trueFalse'],
    bossEvery: 10,
    bossTypes: ['puzzle_master', 'riddle_sphinx', 'maze_minotaur', 'logic_golem', 'pattern_oracle'],
    gradient: 'linear-gradient(135deg,#a3e635,#65a30d)',
    accent: '#4d7c0f',
    particleStyle: '🧩',
    unlockReq: { world: 'ocean', starsNeeded: 25 },
  },
  {
    id: 'geometry',
    emoji: '🏗️',
    icon: '📐',
    order: 8,
    ageRange: [9, 14],
    baseOps: ['geometry'],
    baseRange: 15,
    rangeStep: 2,
    baseTimer: 28,
    timerStartLevel: 0,
    baseTimerSec: 28,
    timerDecay: 0.3,
    baseQuestions: 10,
    cats: ['building', 'tool', 'school'],
    questionTypes: ['geometry', 'classic', 'missingNumber', 'trueFalse'],
    bossEvery: 10,
    bossTypes: ['triangle_titan', 'circle_sage', 'cube_king', 'prism_dragon', 'architect_boss'],
    gradient: 'linear-gradient(135deg,#38bdf8,#0284c7)',
    accent: '#0369a1',
    particleStyle: '📐',
    unlockReq: { world: 'electric', starsNeeded: 25 },
  },
  {
    id: 'algebra',
    emoji: '👑',
    icon: '👑',
    order: 9,
    ageRange: [11, 15],
    baseOps: ['algebra'],
    baseRange: 15,
    rangeStep: 2,
    baseTimer: 25,
    timerStartLevel: 0,
    baseTimerSec: 25,
    timerDecay: 0.3,
    baseQuestions: 10,
    cats: ['mix', 'space', 'tech'],
    questionTypes: ['algebra', 'classic', 'missingNumber', 'trueFalse'],
    bossEvery: 10,
    bossTypes: ['equation_dragon', 'variable_phantom', 'formula_wizard', 'x_lord', 'math_emperor'],
    gradient: 'linear-gradient(135deg,#fbbf24,#92400e)',
    accent: '#78350f',
    particleStyle: '👑',
    unlockReq: { world: 'space', starsNeeded: 20 },
  },
];

export const WORLD_MAP = WORLDS.reduce((m, w) => { m[w.id] = w; return m; }, {});

// ===== PROCEDURAL LEVEL GENERATION =====

export function generateLevelConfig(worldId, levelIndex, skillData) {
  const w = WORLD_MAP[worldId];
  if (!w) return null;

  const tier = Math.floor(levelIndex / 5);
  const isBoss = (levelIndex + 1) % w.bossEvery === 0;
  const bossIdx = Math.floor(levelIndex / w.bossEvery) % w.bossTypes.length;

  // Range scales with tier
  let range = w.baseRange + tier * w.rangeStep;
  // DDA adjustment
  const skill = (skillData && skillData.smoothedSkill) || 50;
  const ddaFactor = 0.7 + (skill / 100) * 0.6;
  range = Math.max(3, Math.round(range * ddaFactor));

  // Questions increase slowly
  const questions = isBoss
    ? Math.min(15, w.baseQuestions + Math.floor(tier / 2))
    : Math.min(20, w.baseQuestions + Math.floor(tier / 3));

  // Timer
  let timer = 0;
  if (levelIndex >= w.timerStartLevel) {
    const timerTier = Math.floor((levelIndex - w.timerStartLevel) / 5);
    timer = Math.max(6, w.baseTimerSec - timerTier * w.timerDecay);
    // DDA: higher skill -> less time
    const timerAdj = Math.round((skill - 50) / 25);
    timer = Math.max(6, timer - timerAdj);
  }

  // Pick question types for this level (cycle through world types)
  const qTypes = w.questionTypes;
  const primaryType = qTypes[levelIndex % qTypes.length];
  // Mix in secondary types for variety
  const secondaryType = qTypes[(levelIndex + 2) % qTypes.length];

  // Ops can expand with progression for multi-op worlds
  let ops = [...w.baseOps];
  // For counting world, transition to add
  if (worldId === 'forest' && levelIndex >= 10) ops = ['add'];
  if (worldId === 'forest' && levelIndex >= 25) ops = ['add', 'sub'];
  // For volcano (mul), add div later
  if (worldId === 'volcano' && levelIndex >= 20) ops = ['mul', 'div'];

  // Pick random emoji categories from world
  const cats = [...w.cats];

  return {
    worldId,
    levelIndex,
    range,
    questions,
    timer,
    ops,
    cats,
    questionTypes: [primaryType, secondaryType],
    boss: isBoss,
    bossType: isBoss ? w.bossTypes[bossIdx] : null,
    emoji: w.emoji,
    gradient: w.gradient,
    accent: w.accent,
    particleStyle: w.particleStyle,
  };
}

// ===== WORLD UNLOCK LOGIC =====

export function isWorldUnlocked(worldId, worldProgress) {
  const w = WORLD_MAP[worldId];
  if (!w) return false;
  if (!w.unlockReq) return true; // first world always unlocked

  const reqWorld = w.unlockReq.world;
  const reqStars = w.unlockReq.starsNeeded;
  const wp = worldProgress[reqWorld];
  if (!wp) return false;

  return getTotalStars(wp) >= reqStars;
}

export function getTotalStars(worldProg) {
  if (!worldProg || !worldProg.stars) return 0;
  return Object.values(worldProg.stars).reduce((s, v) => s + (v || 0), 0);
}

export function getWorldCompletion(worldProg) {
  if (!worldProg) return { levels: 0, stars: 0, mastery: 'none' };
  const totalStars = getTotalStars(worldProg);
  const levels = worldProg.levelReached || 0;
  let mastery = 'none';
  if (totalStars >= 150) mastery = 'diamond';
  else if (totalStars >= 100) mastery = 'gold';
  else if (totalStars >= 50) mastery = 'silver';
  else if (totalStars >= 20) mastery = 'bronze';
  return { levels, stars: totalStars, mastery };
}

export function getMasteryIcon(mastery) {
  switch (mastery) {
    case 'diamond': return '💎';
    case 'gold': return '🥇';
    case 'silver': return '🥈';
    case 'bronze': return '🥉';
    default: return '';
  }
}

// ===== LEVEL NAME GENERATION =====

export function getLevelName(worldId, levelIndex, lang) {
  const w = WORLD_MAP[worldId];
  if (!w) return '';
  const isBoss = (levelIndex + 1) % w.bossEvery === 0;
  const num = levelIndex + 1;
  if (isBoss) {
    const bossNames = { ar: '👑 معركة الزعيم', en: '👑 Boss Battle', pt: '👑 Luta do Chefe' };
    return (bossNames[lang] || bossNames.en) + ' ' + num;
  }
  return w.emoji + ' ' + num;
}

// ===== DAILY CHALLENGE GENERATION =====

export function generateDailyChallenge(date, skillData) {
  // Use date as seed for consistent daily challenge
  const seed = dateToSeed(date);
  const worldIdx = seed % WORLDS.length;
  const w = WORLDS[worldIdx];

  const skill = (skillData && skillData.smoothedSkill) || 50;
  const range = Math.max(5, Math.round(20 * (0.7 + (skill / 100) * 0.6)));

  return {
    worldId: w.id,
    levelIndex: -1,
    range,
    questions: 12,
    timer: 15,
    ops: ['add', 'sub', 'mul', 'div'].slice(0, Math.max(2, Math.floor(skill / 25))),
    cats: w.cats,
    questionTypes: ['classic', 'trueFalse', 'missingNumber'],
    boss: false,
    bossType: null,
    emoji: '🎯',
    gradient: w.gradient,
    accent: w.accent,
    particleStyle: w.particleStyle,
  };
}

function dateToSeed(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

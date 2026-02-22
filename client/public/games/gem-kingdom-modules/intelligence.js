/**
 * Gem Kingdom — intelligence.js
 * Dynamic Difficulty Adjustment (DDA) v2
 * Per-mechanic skill profiling, frustration/boredom detection, flow-state tuning
 *
 * Exports:
 *   getLevelAdjustment(progress, worldIdx, levelIdx)
 *   updateAfterLevel(progress, score, maxCombo, timeSec, movesLeft)
 */

// ===== SKILL DIMENSIONS (per-mechanic tracking) =====
const SKILLS = [
  'matching',    // Basic match-3 speed & accuracy
  'specials',    // Creating special gems
  'obstacles',   // Breaking obstacles efficiently
  'combos',      // Sustaining long combos
  'planning',    // Using moves efficiently (movesLeft)
  'speed',       // Completing levels quickly
  'boss',        // Boss damage efficiency
];

const DEFAULT_SKILL = () => ({
  rating: 50,       // 0-100 scale
  samples: 0,       // number of data points
  trend: 0,         // recent trend (-10 to +10)
  lastValues: [],   // last 5 raw scores for this skill
});

// ===== FLOW STATE DETECTION =====
const FLOW = {
  FRUSTRATION: -2,
  STRUGGLING: -1,
  NORMAL: 0,
  FLOW: 1,
  BOREDOM: 2,
};

function detectFlowState(progress) {
  const h = progress._dda || {};
  const streak = h.consecutiveFails || 0;
  const winStreak = h.consecutiveWins || 0;
  const avgMovesLeft = h.avgMovesLeftPct || 50;

  // Frustration: 3+ consecutive fails
  if (streak >= 3) return FLOW.FRUSTRATION;
  // Struggling: 2 consecutive fails
  if (streak >= 2) return FLOW.STRUGGLING;
  // Boredom: 3+ wins with lots of moves left
  if (winStreak >= 3 && avgMovesLeft > 60) return FLOW.BOREDOM;
  // Flow: winning with moderate challenge
  if (winStreak >= 1 && avgMovesLeft >= 10 && avgMovesLeft <= 45) return FLOW.FLOW;
  // Normal
  return FLOW.NORMAL;
}

// ===== LEVEL ADJUSTMENT CALCULATION =====

/**
 * Returns adjustments to apply for a given level based on player skill & history
 * @param {Object} progress - Player progress from loadProgress()
 * @param {number} worldIdx - World index (0-9)
 * @param {number} levelIdx - Level index (0-9)
 * @returns {Object} { extraMoves, scoreMultiplier, spawnBias, hintDelay, bossHPMult, message }
 */
export function getLevelAdjustment(progress, worldIdx, levelIdx) {
  const result = {
    extraMoves: 0,
    scoreMultiplier: 1.0,
    spawnBias: 0,        // -2 to +2  (negative = easier colors spawned)
    hintDelay: 5000,     // ms before hint appears
    bossHPMult: 1.0,     // boss HP multiplier
    message: null,       // optional encouragement
  };

  if (!progress) return result;

  const flowState = detectFlowState(progress);
  const dda = progress._dda || {};
  const skill = getOverallSkill(progress);
  const attempts = dda.levelAttempts?.[`${worldIdx}-${levelIdx}`] || 0;

  switch (flowState) {
    case FLOW.FRUSTRATION:
      // Maximum help
      result.extraMoves = Math.min(5 + attempts, 10);
      result.scoreMultiplier = 0.8;
      result.spawnBias = -2;
      result.hintDelay = 2000;
      result.bossHPMult = 0.7;
      result.message = 'encouragement_max';
      break;

    case FLOW.STRUGGLING:
      // Moderate help
      result.extraMoves = Math.min(3 + Math.floor(attempts / 2), 7);
      result.scoreMultiplier = 0.9;
      result.spawnBias = -1;
      result.hintDelay = 3000;
      result.bossHPMult = 0.85;
      result.message = 'encouragement';
      break;

    case FLOW.NORMAL:
      // No adjustment
      result.hintDelay = 5000;
      break;

    case FLOW.FLOW:
      // Slightly harder to maintain challenge
      result.spawnBias = 1;
      result.hintDelay = 8000;
      break;

    case FLOW.BOREDOM:
      // Increase challenge
      result.spawnBias = 2;
      result.hintDelay = 10000;
      result.bossHPMult = 1.15;
      result.message = 'challenge_up';
      break;
  }

  // Per-attempt ramp: after 3+ attempts on same level, give increasingly more help
  if (attempts >= 5) {
    result.extraMoves = Math.max(result.extraMoves, 5);
    result.spawnBias = Math.min(result.spawnBias, -1);
  } else if (attempts >= 3) {
    result.extraMoves = Math.max(result.extraMoves, 3);
  }

  // Skill-based fine-tuning
  if (skill < 30) {
    // Beginner: more forgiving
    result.hintDelay = Math.min(result.hintDelay, 3000);
    result.extraMoves = Math.max(result.extraMoves, 2);
  } else if (skill > 80) {
    // Expert: tougher
    result.hintDelay = Math.max(result.hintDelay, 8000);
    result.bossHPMult = Math.max(result.bossHPMult, 1.1);
  }

  return result;
}

// ===== POST-LEVEL SKILL UPDATE =====

/**
 * Update DDA data after a level completion (win or lose)
 * @param {Object} progress - Player progress (will be mutated)
 * @param {number} score - Score achieved
 * @param {number} maxCombo - Highest combo chain
 * @param {number} timeSec - Time taken in seconds
 * @param {number} movesLeft - Remaining moves (0 if failed)
 * @param {Object} [extra] - Optional extra data: {won, worldIdx, levelIdx, specialsCreated, obstaclesCleared, bossHP}
 * @returns {Object} Updated progress
 */
export function updateAfterLevel(progress, score, maxCombo, timeSec, movesLeft, extra = {}) {
  if (!progress) return progress;

  // Init DDA tracking object
  if (!progress._dda) {
    progress._dda = {
      consecutiveFails: 0,
      consecutiveWins: 0,
      totalGames: 0,
      avgMovesLeftPct: 50,
      skills: {},
      levelAttempts: {},
      sessionScores: [],
      lastFlowState: FLOW.NORMAL,
    };
  }

  const dda = progress._dda;
  const won = extra.won !== undefined ? extra.won : movesLeft > 0;
  const levelKey = extra.worldIdx !== undefined ? `${extra.worldIdx}-${extra.levelIdx}` : null;

  // Track attempts per level
  if (levelKey) {
    dda.levelAttempts[levelKey] = (dda.levelAttempts[levelKey] || 0) + 1;
    if (won) {
      // Reset attempts on win (or cap to prevent stale data)
      dda.levelAttempts[levelKey] = 0;
    }
  }

  // Win/fail streaks
  if (won) {
    dda.consecutiveWins = (dda.consecutiveWins || 0) + 1;
    dda.consecutiveFails = 0;
  } else {
    dda.consecutiveFails = (dda.consecutiveFails || 0) + 1;
    dda.consecutiveWins = 0;
  }

  dda.totalGames = (dda.totalGames || 0) + 1;

  // Rolling average of moves left %
  const totalMoves = (movesLeft || 0) + (extra.movesUsed || 20);
  const movesLeftPct = totalMoves > 0 ? Math.round((movesLeft / totalMoves) * 100) : 0;
  dda.avgMovesLeftPct = Math.round(
    (dda.avgMovesLeftPct || 50) * 0.7 + movesLeftPct * 0.3
  );

  // Track session scores (last 10)
  dda.sessionScores = dda.sessionScores || [];
  dda.sessionScores.push(score);
  if (dda.sessionScores.length > 10) dda.sessionScores.shift();

  // Update skills
  updateSkill(dda, 'matching', won ? Math.min(score / 50, 100) : Math.min(score / 100, 40));
  updateSkill(dda, 'combos', Math.min(maxCombo * 15, 100));
  updateSkill(dda, 'speed', timeSec < 60 ? 90 : timeSec < 120 ? 70 : timeSec < 180 ? 50 : 30);
  updateSkill(dda, 'planning', movesLeftPct);

  if (extra.specialsCreated !== undefined) {
    updateSkill(dda, 'specials', Math.min(extra.specialsCreated * 10, 100));
  }
  if (extra.obstaclesCleared !== undefined) {
    updateSkill(dda, 'obstacles', Math.min(extra.obstaclesCleared * 5, 100));
  }
  if (extra.bossHP !== undefined) {
    updateSkill(dda, 'boss', extra.bossHP <= 0 ? 90 : 30);
  }

  // Flow state from this round
  dda.lastFlowState = detectFlowState(progress);

  return progress;
}

// ===== SKILL HELPERS =====

function initSkills(dda) {
  if (!dda.skills) dda.skills = {};
  for (const dim of SKILLS) {
    if (!dda.skills[dim]) dda.skills[dim] = DEFAULT_SKILL();
  }
}

function updateSkill(dda, dimension, rawScore) {
  initSkills(dda);
  const s = dda.skills[dimension];
  if (!s) return;

  s.lastValues = s.lastValues || [];
  s.lastValues.push(rawScore);
  if (s.lastValues.length > 5) s.lastValues.shift();

  // Exponential moving average
  const alpha = s.samples < 3 ? 0.5 : 0.3;
  s.rating = Math.round(s.rating * (1 - alpha) + rawScore * alpha);
  s.rating = Math.max(0, Math.min(100, s.rating));
  s.samples++;

  // Trend: compare last 2 vs previous 2
  if (s.lastValues.length >= 4) {
    const recent = (s.lastValues[s.lastValues.length - 1] + s.lastValues[s.lastValues.length - 2]) / 2;
    const older = (s.lastValues[s.lastValues.length - 3] + s.lastValues[s.lastValues.length - 4]) / 2;
    s.trend = Math.round(Math.max(-10, Math.min(10, recent - older)));
  }
}

function getOverallSkill(progress) {
  const dda = progress._dda;
  if (!dda || !dda.skills) return 50;
  const ratings = Object.values(dda.skills).map(s => s.rating || 50);
  if (ratings.length === 0) return 50;
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
}

// ===== ANALYTICS EXPORT =====

/**
 * Get detailed skill report for parent analytics / reports.js
 */
export function getSkillReport(progress) {
  const dda = progress?._dda;
  if (!dda) return null;

  initSkills(dda);
  const skills = {};
  for (const dim of SKILLS) {
    const s = dda.skills[dim] || DEFAULT_SKILL();
    skills[dim] = {
      rating: s.rating,
      trend: s.trend,
      samples: s.samples,
      level: s.rating >= 80 ? 'expert' : s.rating >= 60 ? 'advanced' : s.rating >= 40 ? 'intermediate' : s.rating >= 20 ? 'beginner' : 'novice',
    };
  }

  return {
    overall: getOverallSkill(progress),
    skills,
    flowState: dda.lastFlowState,
    totalGames: dda.totalGames || 0,
    consecutiveWins: dda.consecutiveWins || 0,
    consecutiveFails: dda.consecutiveFails || 0,
    sessionScores: [...(dda.sessionScores || [])],
  };
}

/**
 * Get encouragement messages based on flow state
 */
export function getEncouragement(progress) {
  const flow = detectFlowState(progress);
  const messages = {
    ar: {
      [FLOW.FRUSTRATION]: ['لا تستسلم! أنت تتحسن! 💪', 'كل فشل يقربك من النجاح! 🌟', 'جرب استراتيجية مختلفة! 🧠'],
      [FLOW.STRUGGLING]: ['أنت قريب من الفوز! ✨', 'ركز على الأهداف! 🎯', 'استخدم المعززات للمساعدة! 🔧'],
      [FLOW.NORMAL]: ['أحسنت! استمر! 👍', 'أداء رائع! 🌟'],
      [FLOW.FLOW]: ['أنت في قمة أدائك! 🔥', 'مذهل! استمر هكذا! ⚡'],
      [FLOW.BOREDOM]: ['جرب تحدي أصعب! 🏆', 'حاول الحصول على 3 نجوم! ⭐⭐⭐'],
    },
    en: {
      [FLOW.FRUSTRATION]: ["Don't give up! You're improving! 💪", 'Every fail brings you closer to success! 🌟', 'Try a different strategy! 🧠'],
      [FLOW.STRUGGLING]: ["You're close to winning! ✨", 'Focus on the objectives! 🎯', 'Use boosters for help! 🔧'],
      [FLOW.NORMAL]: ['Well done! Keep going! 👍', 'Great performance! 🌟'],
      [FLOW.FLOW]: ["You're at peak performance! 🔥", 'Amazing! Keep it up! ⚡'],
      [FLOW.BOREDOM]: ['Try a harder challenge! 🏆', 'Aim for 3 stars! ⭐⭐⭐'],
    },
    pt: {
      [FLOW.FRUSTRATION]: ['Não desista! Você está melhorando! 💪', 'Cada falha te aproxima do sucesso! 🌟', 'Tente uma estratégia diferente! 🧠'],
      [FLOW.STRUGGLING]: ['Você está perto de vencer! ✨', 'Foque nos objetivos! 🎯', 'Use reforços para ajudar! 🔧'],
      [FLOW.NORMAL]: ['Muito bem! Continue! 👍', 'Ótimo desempenho! 🌟'],
      [FLOW.FLOW]: ['Você está no auge! 🔥', 'Incrível! Continue assim! ⚡'],
      [FLOW.BOREDOM]: ['Tente um desafio mais difícil! 🏆', 'Mire nas 3 estrelas! ⭐⭐⭐'],
    },
  };

  const lang = typeof LANG !== 'undefined' ? (LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en') : 'en';
  const pool = messages[lang]?.[flow] || messages.en[FLOW.NORMAL];
  return pool[Math.floor(Math.random() * pool.length)];
}

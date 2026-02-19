// ===== Emoji Kingdom — Core Systems =====
// Progress persistence, XP/Level, Lives, Combo/Streak, Scoring

const STORAGE_KEY = 'classify_math_v2';
const OLD_KEY = 'classify_math_progress';
const XP_PER_LEVEL = 1000;
const MAX_LIVES = 5;
const REGEN_MS = 10 * 60 * 1000; // 10 min per life

// ===== Progress =====
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  // Migrate from old system
  const base = defaultProgress();
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY));
    if (old && old.unlocked) {
      base.unlocked = old.unlocked;
      base.scores = old.scores || {};
      base.stars = old.stars || {};
    }
  } catch(e) {}
  saveProgress(base);
  return base;
}

function defaultProgress() {
  return {
    unlocked: 1,
    scores: {},
    stars: {},
    totalXP: 0,
    playerLevel: 1,
    coins: 0,
    lives: MAX_LIVES,
    livesTimestamp: Date.now(),
    boosters: { hammer: 1, shuffle: 1, extraTime: 1, hint: 3 },
    badges: [],
    dailyChallengeDate: null,
    dailyChallengeCompleted: false,
    skillData: {
      avgResponseTime: 8,
      accuracyRate: 0.5,
      highestStreak: 0,
      totalGamesPlayed: 0,
      smoothedSkill: 50
    },
    tutorialShown: {},
    purchaseCounts: { hammer: 0, shuffle: 0, extraTime: 0, hint: 0 }
  };
}

export function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch(e) {}
}

// ===== XP & Player Level =====
export function addXP(p, amount) {
  const oldLvl = getPlayerLevel(p);
  p.totalXP = (p.totalXP || 0) + Math.round(amount);
  const newLvl = getPlayerLevel(p);
  const leveledUp = newLvl > oldLvl;
  if (leveledUp) {
    p.playerLevel = newLvl;
    // Level up rewards
    p.boosters.hint = (p.boosters.hint || 0) + 1;
    p.boosters.hammer = (p.boosters.hammer || 0) + 1;
    p.lives = Math.min(MAX_LIVES, (p.lives || 0) + 1);
  }
  saveProgress(p);
  return { leveledUp, newLevel: newLvl, xpGained: Math.round(amount) };
}

export function getPlayerLevel(p) {
  return Math.floor((p.totalXP || 0) / XP_PER_LEVEL) + 1;
}

export function getLevelXPProgress(p) {
  return (p.totalXP || 0) % XP_PER_LEVEL;
}

export function getXPToNextLevel() {
  return XP_PER_LEVEL;
}

// ===== Lives =====
export function getLives(p) {
  const now = Date.now();
  let lives = p.lives != null ? p.lives : MAX_LIVES;
  const ts = p.livesTimestamp || now;
  if (lives < MAX_LIVES) {
    const elapsed = now - ts;
    const regen = Math.floor(elapsed / REGEN_MS);
    if (regen > 0) {
      lives = Math.min(lives + regen, MAX_LIVES);
      p.lives = lives;
      p.livesTimestamp = ts + regen * REGEN_MS;
      saveProgress(p);
    }
  }
  return lives;
}

export function loseLife(p) {
  const cur = getLives(p);
  if (cur >= MAX_LIVES) p.livesTimestamp = Date.now();
  p.lives = Math.max(cur - 1, 0);
  saveProgress(p);
  return p.lives;
}

export function getTimeToNextLife(p) {
  if (getLives(p) >= MAX_LIVES) return 0;
  const elapsed = Date.now() - (p.livesTimestamp || Date.now());
  return Math.max(0, REGEN_MS - (elapsed % REGEN_MS));
}

export function getMaxLives() { return MAX_LIVES; }

// ===== Combo / Streak =====
export function getComboMultiplier(streak) {
  return 1 + Math.min(streak, 20) * 0.25;
}

// ===== Scoring =====
export function calculateScore(correct, timeRemaining, maxTime, comboMult, usedHint) {
  if (!correct) return 0;
  const base = 100;
  const speed = maxTime > 0 ? (1.0 + (timeRemaining / maxTime) * 0.5) : 1.3;
  let sc = Math.round(base * speed * comboMult);
  if (usedHint) sc = Math.round(sc * 0.7);
  return sc;
}

export function calculateXP(totalScore, totalQ, isPerfect, noHints, isDaily) {
  let xp = Math.round(totalScore / 8);
  if (isPerfect) xp += 50;
  if (noHints) xp += 20;
  if (isDaily) xp *= 2;
  return xp;
}

export function calculateCoins(stars, isPerfect, isDaily) {
  let coins = stars * 10;
  if (isPerfect) coins += 25;
  if (isDaily) coins *= 2;
  return coins;
}

// ===== Level Progress =====
export function updateLevelProgress(p, levelIdx, score, stars) {
  const prev = p.stars[levelIdx] || 0;
  if (stars > prev) p.stars[levelIdx] = stars;
  const prevSc = p.scores[levelIdx] || 0;
  if (score > prevSc) p.scores[levelIdx] = score;
  if (stars >= 1 && levelIdx + 1 >= (p.unlocked || 1)) {
    p.unlocked = levelIdx + 2;
  }
  saveProgress(p);
}

export function getStarsForScore(correct, total) {
  const pct = correct / total;
  if (pct >= 1) return 3;
  if (pct >= 0.8) return 2;
  if (pct >= 0.6) return 1;
  return 0;
}

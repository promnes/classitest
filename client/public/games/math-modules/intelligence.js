// ===== Emoji Kingdom — Intelligence Module =====
// DDA, Skill Rating, Smart Question Distribution, Flow Controller

// ===== Player Skill Rating =====
export function updateSkillData(sd, correct, responseTime) {
  const n = (sd.totalGamesPlayed || 0);
  // Exponential smoothing for accuracy
  const newAcc = correct ? 1 : 0;
  sd.accuracyRate = sd.accuracyRate * 0.7 + newAcc * 0.3;
  // Exponential smoothing for response time
  sd.avgResponseTime = sd.avgResponseTime * 0.7 + Math.min(responseTime, 30) * 0.3;
  return sd;
}

export function updateSkillAfterLevel(sd, accuracy, avgTime, highStreak, totalQ) {
  // Compute current performance score (0-100)
  const accScore = Math.min(accuracy, 1) * 50;
  const timeScore = Math.max(0, (15 - avgTime) / 15) * 30;
  const streakScore = Math.min(highStreak / totalQ, 1) * 20;
  const currentSkill = accScore + timeScore + streakScore;
  // Exponential smoothing to prevent sudden jumps
  sd.smoothedSkill = (sd.smoothedSkill || 50) * 0.7 + currentSkill * 0.3;
  if (highStreak > (sd.highestStreak || 0)) sd.highestStreak = highStreak;
  sd.totalGamesPlayed = (sd.totalGamesPlayed || 0) + 1;
  return sd;
}

export function getSmoothedSkill(sd) {
  return sd.smoothedSkill || 50;
}

// ===== Dynamic Difficulty Adjustment =====
export function adjustRange(baseRange, smoothedSkill) {
  // Skill 50 = neutral. Higher skill -> harder (larger range)
  const factor = 0.7 + (smoothedSkill / 100) * 0.6; // 0.7 to 1.3
  return Math.max(3, Math.round(baseRange * factor));
}

export function adjustTimer(baseTimer, smoothedSkill) {
  if (baseTimer <= 0) return 0; // no timer levels
  // Higher skill -> less time (harder)
  const adj = Math.round((smoothedSkill - 50) / 25); // -2 to +2
  return Math.max(6, baseTimer - adj);
}

// ===== Smart Question Distribution =====
// Returns difficulty tier: 'easy', 'medium', 'hard'
export function getQuestionDifficulty(qIndex, totalQ, isBoss) {
  const pct = qIndex / totalQ;
  const rand = Math.random();
  if (isBoss) {
    // Boss: 20% easy, 40% medium, 40% hard
    if (rand < 0.2) return 'easy';
    if (rand < 0.6) return 'medium';
    return 'hard';
  }
  // Normal: 40% easy, 40% medium, 20% hard
  // But bias toward harder as questions progress
  const hardChance = 0.1 + pct * 0.2;  // 0.1 → 0.3
  const easyChance = 0.5 - pct * 0.2;  // 0.5 → 0.3
  if (rand < easyChance) return 'easy';
  if (rand < easyChance + (1 - easyChance - hardChance)) return 'medium';
  return 'hard';
}

export function getDifficultyRange(baseRange, difficulty) {
  switch(difficulty) {
    case 'easy':   return Math.max(2, Math.round(baseRange * 0.4));
    case 'medium': return Math.max(3, Math.round(baseRange * 0.7));
    case 'hard':   return baseRange;
    default:       return baseRange;
  }
}

// ===== Flow State Controller =====
// Returns transition delay in ms based on last response time
export function getTransitionDelay(responseTime) {
  if (responseTime < 3) return 600;   // Fast → quick transition
  if (responseTime < 6) return 900;   // Normal
  if (responseTime < 10) return 1100; // Default
  return 1400;                         // Slow → gentle transition
}

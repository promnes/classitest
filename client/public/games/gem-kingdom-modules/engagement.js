/**
 * Gem Kingdom — engagement.js
 * Micro-badges, streak messages, near-miss detection,
 * motivational feedback, session tracking
 *
 * Exports: checkMicroBadges, getNearMissMessage, getStreakMessage,
 *          getSessionSummary, getMilestoneMessage
 */

import { LANG } from './config.js';

const L = () => LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';

// ===== MICRO-BADGES =====
// Earned during gameplay (per-level, not persistent achievements)
// These are momentary rewards shown as toast notifications

const MICRO_BADGES = [
  {
    id: 'first_special',
    condition: (stats) => stats.specialsCreated >= 1,
    icon: '⚡',
    text: { ar: 'أول جوهرة خاصة!', en: 'First Special Gem!', pt: 'Primeira Gema Especial!' },
  },
  {
    id: 'combo_3',
    condition: (stats) => stats.maxCombo >= 3,
    icon: '🔥',
    text: { ar: 'كومبو ثلاثي!', en: 'Triple Combo!', pt: 'Combo Triplo!' },
  },
  {
    id: 'combo_5',
    condition: (stats) => stats.maxCombo >= 5,
    icon: '💥',
    text: { ar: 'كومبو خماسي!', en: '5x Combo!', pt: 'Combo 5x!' },
  },
  {
    id: 'combo_8',
    condition: (stats) => stats.maxCombo >= 8,
    icon: '🌟',
    text: { ar: 'كومبو أسطوري!', en: 'Legendary Combo!', pt: 'Combo Lendário!' },
  },
  {
    id: 'power_combo',
    condition: (stats) => stats.powerCombos >= 1,
    icon: '💫',
    text: { ar: 'دمج قوي!', en: 'Power Combo!', pt: 'Combo de Poder!' },
  },
  {
    id: 'half_moves',
    condition: (stats) => stats.movesLeftPct >= 50,
    icon: '🎯',
    text: { ar: 'نصف الحركات باقية!', en: 'Half Moves Left!', pt: 'Metade dos Movimentos!' },
  },
  {
    id: 'speed_demon',
    condition: (stats) => stats.timeSec <= 30,
    icon: '⏱️',
    text: { ar: 'سريع كالبرق!', en: 'Speed Demon!', pt: 'Velocidade Relâmpago!' },
  },
  {
    id: 'obstacle_clear',
    condition: (stats) => stats.obstaclesCleared >= 10,
    icon: '🧱',
    text: { ar: 'محطم العوائق!', en: 'Obstacle Smasher!', pt: 'Destruidor de Obstáculos!' },
  },
  {
    id: 'no_bad_swap',
    condition: (stats) => stats.badSwaps === 0 && stats.totalSwaps >= 5,
    icon: '🎯',
    text: { ar: 'دقة مطلقة!', en: 'Perfect Accuracy!', pt: 'Precisão Perfeita!' },
  },
  {
    id: 'boss_slayer',
    condition: (stats) => stats.bossDefeated,
    icon: '⚔️',
    text: { ar: 'قاتل الوحوش!', en: 'Boss Slayer!', pt: 'Matador de Chefes!' },
  },
  {
    id: 'rainbow_master',
    condition: (stats) => stats.rainbowsCreated >= 2,
    icon: '🌈',
    text: { ar: 'سيد قوس قزح!', en: 'Rainbow Master!', pt: 'Mestre do Arco-Íris!' },
  },
  {
    id: 'big_score',
    condition: (stats) => stats.score >= 5000,
    icon: '🏅',
    text: { ar: 'نتيجة هائلة!', en: 'Huge Score!', pt: 'Pontuação Enorme!' },
  },
];

/**
 * Check which micro-badges were earned in this level
 * @param {Object} stats - Level stats: {specialsCreated, maxCombo, powerCombos, movesLeftPct, timeSec, obstaclesCleared, badSwaps, totalSwaps, bossDefeated, rainbowsCreated, score}
 * @returns {Array} [{id, icon, text}]
 */
export function checkMicroBadges(stats) {
  const lang = L();
  const earned = [];

  for (const badge of MICRO_BADGES) {
    try {
      if (badge.condition(stats)) {
        earned.push({
          id: badge.id,
          icon: badge.icon,
          text: badge.text[lang] || badge.text.en,
        });
      }
    } catch (e) {
      // Skip broken conditions
    }
  }

  return earned;
}

// ===== NEAR-MISS DETECTION =====
// "Almost had it!" — show encouraging message when player barely fails

const NEAR_MISS_MESSAGES = {
  ar: [
    'كاد ينجح! حاول مرة أخرى! 💪',
    'كنت قريباً جداً! 🔥',
    'لقد كدت تفوز! جرب مرة أخرى! ✨',
    'تقريباً! حركة واحدة كانت تكفي! 🎯',
    'رائع رغم كل شيء! أنت تتحسن! 📈',
  ],
  en: [
    'So close! Try again! 💪',
    'You were SO close! 🔥',
    'Almost had it! One more try! ✨',
    'Nearly there! Just one more move would have done it! 🎯',
    'Amazing effort! You are improving! 📈',
  ],
  pt: [
    'Quase! Tente de novo! 💪',
    'Você estava TÃO perto! 🔥',
    'Quase conseguiu! Mais uma tentativa! ✨',
    'Quase lá! Só mais um movimento! 🎯',
    'Esforço incrível! Você está melhorando! 📈',
  ],
};

/**
 * Get a near-miss message if the player barely failed
 * @param {Object} stats - {objectivesPct, movesLeft, score, starThresholds}
 * @returns {string|null} Message or null if not a near-miss
 */
export function getNearMissMessage(stats) {
  const {
    objectivesPct = 0,  // 0-100, how close to completing objectives
    score = 0,
    starThresholds = [0, 0, 0],
  } = stats;

  // Near miss if objectives were 70-99% complete
  const isNearMiss = objectivesPct >= 70 && objectivesPct < 100;

  // Also near miss if score was close to 1-star threshold
  const closeToStar = starThresholds[0] > 0 && score >= starThresholds[0] * 0.8;

  if (!isNearMiss && !closeToStar) return null;

  const lang = L();
  const pool = NEAR_MISS_MESSAGES[lang] || NEAR_MISS_MESSAGES.en;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===== STREAK MESSAGES =====

const STREAK_MESSAGES = {
  ar: {
    2: 'فوز مزدوج! 🔥',
    3: 'ثلاثية رائعة! ⚡',
    5: 'خمس انتصارات متتالية! 🏆',
    7: 'سبعة! أنت لا يُوقف! 💫',
    10: 'عشرة! أنت أسطورة! 👑',
  },
  en: {
    2: 'Double Win! 🔥',
    3: 'Triple Streak! ⚡',
    5: 'Five-Win Streak! 🏆',
    7: 'Seven! Unstoppable! 💫',
    10: 'TEN! You are a legend! 👑',
  },
  pt: {
    2: 'Vitória Dupla! 🔥',
    3: 'Sequência Tripla! ⚡',
    5: 'Cinco Vitórias Seguidas! 🏆',
    7: 'Sete! Imparável! 💫',
    10: 'DEZ! Você é lendário! 👑',
  },
};

/**
 * Get streak message for current win streak
 * @param {number} streak - Current consecutive wins
 * @returns {string|null}
 */
export function getStreakMessage(streak) {
  if (streak < 2) return null;
  const lang = L();
  const msgs = STREAK_MESSAGES[lang] || STREAK_MESSAGES.en;

  // Find the highest matching threshold
  const thresholds = [10, 7, 5, 3, 2];
  for (const t of thresholds) {
    if (streak >= t && msgs[t]) return msgs[t];
  }
  return null;
}

// ===== SESSION SUMMARY =====

/**
 * Generate end-of-session summary
 * @param {Object} session - {levelsPlayed, levelsWon, totalScore, totalCoins, totalStars, timeMinutes, badgesEarned}
 * @returns {Object} {title, stats: [{label, value, icon}], message}
 */
export function getSessionSummary(session) {
  const lang = L();
  const {
    levelsPlayed = 0,
    levelsWon = 0,
    totalScore = 0,
    totalCoins = 0,
    totalStars = 0,
    timeMinutes = 0,
    badgesEarned = 0,
  } = session;

  const winRate = levelsPlayed > 0 ? Math.round((levelsWon / levelsPlayed) * 100) : 0;

  const labels = {
    ar: {
      title: 'ملخص الجلسة 📊',
      played: 'مراحل لعبتها',
      won: 'انتصارات',
      winRate: 'نسبة الفوز',
      score: 'مجموع النقاط',
      coins: 'عملات جمعتها',
      stars: 'نجوم حصلت عليها',
      time: 'وقت اللعب',
      badges: 'شارات حصلت عليها',
      great: 'أداء رائع! استمر! 🌟',
      good: 'أحسنت! تعال غداً! 😊',
      ok: 'جهد جيد! تحسن كل يوم! 💪',
    },
    en: {
      title: 'Session Summary 📊',
      played: 'Levels Played',
      won: 'Victories',
      winRate: 'Win Rate',
      score: 'Total Score',
      coins: 'Coins Earned',
      stars: 'Stars Earned',
      time: 'Play Time',
      badges: 'Badges Earned',
      great: 'Amazing performance! Keep it up! 🌟',
      good: 'Well done! Come back tomorrow! 😊',
      ok: 'Good effort! Getting better every day! 💪',
    },
    pt: {
      title: 'Resumo da Sessão 📊',
      played: 'Fases Jogadas',
      won: 'Vitórias',
      winRate: 'Taxa de Vitória',
      score: 'Pontuação Total',
      coins: 'Moedas Ganhas',
      stars: 'Estrelas Ganhas',
      time: 'Tempo de Jogo',
      badges: 'Medalhas Ganhas',
      great: 'Performance incrível! Continue! 🌟',
      good: 'Muito bem! Volte amanhã! 😊',
      ok: 'Bom esforço! Melhorando a cada dia! 💪',
    },
  };

  const t = labels[lang] || labels.en;
  const message = winRate >= 80 ? t.great : winRate >= 50 ? t.good : t.ok;

  return {
    title: t.title,
    stats: [
      { label: t.played, value: levelsPlayed, icon: '🎮' },
      { label: t.won, value: levelsWon, icon: '✅' },
      { label: t.winRate, value: winRate + '%', icon: '📈' },
      { label: t.score, value: totalScore.toLocaleString(), icon: '🏅' },
      { label: t.coins, value: totalCoins, icon: '🪙' },
      { label: t.stars, value: totalStars, icon: '⭐' },
      { label: t.time, value: timeMinutes + 'min', icon: '⏱️' },
      { label: t.badges, value: badgesEarned, icon: '🎖️' },
    ],
    message,
  };
}

// ===== MILESTONE MESSAGES =====

const MILESTONES = [
  { threshold: 10,   type: 'stars',  icon: '⭐', key: 'milestone_10_stars' },
  { threshold: 50,   type: 'stars',  icon: '🌟', key: 'milestone_50_stars' },
  { threshold: 100,  type: 'stars',  icon: '💫', key: 'milestone_100_stars' },
  { threshold: 200,  type: 'stars',  icon: '✨', key: 'milestone_200_stars' },
  { threshold: 300,  type: 'stars',  icon: '👑', key: 'milestone_300_stars' },
  { threshold: 10,   type: 'levels', icon: '🎮', key: 'milestone_10_levels' },
  { threshold: 25,   type: 'levels', icon: '🏅', key: 'milestone_25_levels' },
  { threshold: 50,   type: 'levels', icon: '🏆', key: 'milestone_50_levels' },
  { threshold: 100,  type: 'levels', icon: '🎊', key: 'milestone_100_levels' },
  { threshold: 1000, type: 'coins',  icon: '🪙', key: 'milestone_1000_coins' },
  { threshold: 5000, type: 'coins',  icon: '💰', key: 'milestone_5000_coins' },
];

const MILESTONE_TEXT = {
  ar: {
    milestone_10_stars: 'حصلت على 10 نجوم! ⭐',
    milestone_50_stars: 'حصلت على 50 نجمة! 🌟',
    milestone_100_stars: '100 نجمة! أنت نجم حقيقي! 💫',
    milestone_200_stars: '200 نجمة! مذهل! ✨',
    milestone_300_stars: '300 نجمة! ملك النجوم! 👑',
    milestone_10_levels: 'أنهيت 10 مراحل! 🎮',
    milestone_25_levels: '25 مرحلة! ممتاز! 🏅',
    milestone_50_levels: '50 مرحلة! نصف الطريق! 🏆',
    milestone_100_levels: 'أنهيت كل المراحل! 🎊',
    milestone_1000_coins: 'جمعت 1000 عملة! 🪙',
    milestone_5000_coins: '5000 عملة! ثروة! 💰',
  },
  en: {
    milestone_10_stars: 'Earned 10 Stars! ⭐',
    milestone_50_stars: 'Earned 50 Stars! 🌟',
    milestone_100_stars: '100 Stars! You are a star! 💫',
    milestone_200_stars: '200 Stars! Amazing! ✨',
    milestone_300_stars: '300 Stars! Star King! 👑',
    milestone_10_levels: 'Completed 10 Levels! 🎮',
    milestone_25_levels: '25 Levels! Excellent! 🏅',
    milestone_50_levels: '50 Levels! Halfway there! 🏆',
    milestone_100_levels: 'All Levels Complete! 🎊',
    milestone_1000_coins: 'Earned 1000 Coins! 🪙',
    milestone_5000_coins: '5000 Coins! Rich! 💰',
  },
  pt: {
    milestone_10_stars: 'Ganhou 10 Estrelas! ⭐',
    milestone_50_stars: 'Ganhou 50 Estrelas! 🌟',
    milestone_100_stars: '100 Estrelas! Você é uma estrela! 💫',
    milestone_200_stars: '200 Estrelas! Incrível! ✨',
    milestone_300_stars: '300 Estrelas! Rei das Estrelas! 👑',
    milestone_10_levels: 'Completou 10 Fases! 🎮',
    milestone_25_levels: '25 Fases! Excelente! 🏅',
    milestone_50_levels: '50 Fases! Metade do caminho! 🏆',
    milestone_100_levels: 'Todas as Fases Completas! 🎊',
    milestone_1000_coins: 'Ganhou 1000 Moedas! 🪙',
    milestone_5000_coins: '5000 Moedas! Rico! 💰',
  },
};

/**
 * Check if a new milestone was reached
 * @param {Object} current - {totalStars, levelsCompleted, totalCoins}
 * @param {Object} previous - Same shape, previous values
 * @returns {Array} [{icon, text}] New milestones
 */
export function getMilestoneMessage(current, previous) {
  const lang = L();
  const texts = MILESTONE_TEXT[lang] || MILESTONE_TEXT.en;
  const results = [];

  for (const m of MILESTONES) {
    const curVal = m.type === 'stars' ? current.totalStars
      : m.type === 'levels' ? current.levelsCompleted
      : current.totalCoins;
    const prevVal = m.type === 'stars' ? previous.totalStars
      : m.type === 'levels' ? previous.levelsCompleted
      : previous.totalCoins;

    if (curVal >= m.threshold && (prevVal || 0) < m.threshold) {
      results.push({ icon: m.icon, text: texts[m.key] || m.key });
    }
  }

  return results;
}

// ===== COMEBACK MESSAGES =====

/**
 * Get message when player returns after absence
 * @param {number} hoursSinceLastPlay
 * @returns {string|null}
 */
export function getComebackMessage(hoursSinceLastPlay) {
  if (hoursSinceLastPlay < 24) return null;

  const lang = L();
  const msgs = {
    ar: {
      short: 'مرحباً بعودتك! جاهز للعب؟ 🎮',
      medium: 'اشتقنا لك! هيا نلعب! 🤗',
      long: 'أهلاً! مغامرات جديدة بانتظارك! 🌟',
    },
    en: {
      short: 'Welcome back! Ready to play? 🎮',
      medium: 'We missed you! Let us play! 🤗',
      long: 'Hello! New adventures await you! 🌟',
    },
    pt: {
      short: 'Bem-vindo de volta! Pronto para jogar? 🎮',
      medium: 'Sentimos sua falta! Vamos jogar! 🤗',
      long: 'Olá! Novas aventuras esperam por você! 🌟',
    },
  };

  const m = msgs[lang] || msgs.en;
  if (hoursSinceLastPlay >= 168) return m.long;     // 7+ days
  if (hoursSinceLastPlay >= 48) return m.medium;     // 2+ days
  return m.short;
}

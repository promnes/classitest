/**
 * Gem Kingdom — reports.js
 * Parent reports & skill analysis
 * Generates structured data for parent dashboard viewing
 *
 * Exports: generateReport, getWorldBreakdown, getSkillAnalysis, getPlaytimeSummary
 */

import { LANG, WORLD_NAMES, WORLD_ICONS, loadProgress } from './config.js';

const L = () => LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';

// ===== REPORT LABELS =====

const LABELS = {
  ar: {
    reportTitle: 'تقرير أداء الطفل',
    overview: 'نظرة عامة',
    worldProgress: 'تقدم العوالم',
    skills: 'تحليل المهارات',
    playtime: 'وقت اللعب',
    recommendations: 'توصيات',
    totalStars: 'إجمالي النجوم',
    totalLevels: 'المراحل المكتملة',
    totalCoins: 'العملات المجمعة',
    totalTime: 'إجمالي وقت اللعب',
    avgScore: 'متوسط النقاط',
    winRate: 'نسبة الفوز',
    favoriteWorld: 'العالم المفضل',
    strongSkill: 'أقوى مهارة',
    weakSkill: 'مهارة تحتاج تحسين',
    noData: 'لا توجد بيانات كافية بعد',
    matching: 'المطابقة',
    specials: 'الجواهر الخاصة',
    obstacles: 'تحطيم العوائق',
    combos: 'الكومبو',
    planning: 'التخطيط',
    speed: 'السرعة',
    boss: 'معارك الوحوش',
    excellent: 'ممتاز',
    good: 'جيد',
    developing: 'قيد التطوير',
    needsPractice: 'يحتاج تدريب',
    minutes: 'دقيقة',
    hours: 'ساعة',
    today: 'اليوم',
    thisWeek: 'هذا الأسبوع',
    total: 'الإجمالي',
    completed: 'مكتمل',
    locked: 'مقفل',
    stars: 'نجوم',
  },
  en: {
    reportTitle: 'Child Performance Report',
    overview: 'Overview',
    worldProgress: 'World Progress',
    skills: 'Skill Analysis',
    playtime: 'Play Time',
    recommendations: 'Recommendations',
    totalStars: 'Total Stars',
    totalLevels: 'Levels Completed',
    totalCoins: 'Total Coins',
    totalTime: 'Total Play Time',
    avgScore: 'Average Score',
    winRate: 'Win Rate',
    favoriteWorld: 'Favorite World',
    strongSkill: 'Strongest Skill',
    weakSkill: 'Needs Improvement',
    noData: 'Not enough data yet',
    matching: 'Matching',
    specials: 'Special Gems',
    obstacles: 'Obstacle Breaking',
    combos: 'Combos',
    planning: 'Planning',
    speed: 'Speed',
    boss: 'Boss Battles',
    excellent: 'Excellent',
    good: 'Good',
    developing: 'Developing',
    needsPractice: 'Needs Practice',
    minutes: 'minutes',
    hours: 'hours',
    today: 'Today',
    thisWeek: 'This Week',
    total: 'Total',
    completed: 'completed',
    locked: 'locked',
    stars: 'stars',
  },
  pt: {
    reportTitle: 'Relatório de Desempenho',
    overview: 'Visão Geral',
    worldProgress: 'Progresso dos Mundos',
    skills: 'Análise de Habilidades',
    playtime: 'Tempo de Jogo',
    recommendations: 'Recomendações',
    totalStars: 'Total de Estrelas',
    totalLevels: 'Fases Completadas',
    totalCoins: 'Total de Moedas',
    totalTime: 'Tempo Total de Jogo',
    avgScore: 'Pontuação Média',
    winRate: 'Taxa de Vitória',
    favoriteWorld: 'Mundo Favorito',
    strongSkill: 'Habilidade Mais Forte',
    weakSkill: 'Precisa Melhorar',
    noData: 'Dados insuficientes ainda',
    matching: 'Combinação',
    specials: 'Gemas Especiais',
    obstacles: 'Quebra de Obstáculos',
    combos: 'Combos',
    planning: 'Planejamento',
    speed: 'Velocidade',
    boss: 'Batalhas de Chefes',
    excellent: 'Excelente',
    good: 'Bom',
    developing: 'Desenvolvendo',
    needsPractice: 'Precisa Praticar',
    minutes: 'minutos',
    hours: 'horas',
    today: 'Hoje',
    thisWeek: 'Esta Semana',
    total: 'Total',
    completed: 'completas',
    locked: 'bloqueado',
    stars: 'estrelas',
  },
};

// ===== SKILL DIMENSION LABELS =====

const SKILL_KEYS = ['matching', 'specials', 'obstacles', 'combos', 'planning', 'speed', 'boss'];

function getSkillLabel(key) {
  const lang = L();
  return (LABELS[lang] || LABELS.en)[key] || key;
}

function getRatingLabel(rating) {
  const lang = L();
  const t = LABELS[lang] || LABELS.en;
  if (rating >= 80) return t.excellent;
  if (rating >= 60) return t.good;
  if (rating >= 40) return t.developing;
  return t.needsPractice;
}

// ===== MAIN REPORT GENERATOR =====

/**
 * Generate a full parent-facing report
 * @param {Object} [progressOverride] - Optional progress object (if null, reads from storage)
 * @returns {Object} Structured report data
 */
export function generateReport(progressOverride) {
  const progress = progressOverride || loadProgress();
  const lang = L();
  const t = LABELS[lang] || LABELS.en;
  const dda = progress?._dda || {};

  // Compute overview stats
  let totalStars = 0;
  let levelsCompleted = 0;
  let worldStars = [];

  for (let w = 0; w < 10; w++) {
    let ws = 0;
    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      if (s > 0) levelsCompleted++;
      ws += s;
    }
    worldStars.push(ws);
    totalStars += ws;
  }

  const totalGames = dda.totalGames || 0;
  const wins = dda.consecutiveWins || 0; // approximate
  const avgScore = dda.sessionScores?.length > 0
    ? Math.round(dda.sessionScores.reduce((a, b) => a + b, 0) / dda.sessionScores.length)
    : 0;

  // Favorite world (most stars)
  let favWorld = 0;
  let maxWS = 0;
  worldStars.forEach((s, i) => {
    if (s > maxWS) { maxWS = s; favWorld = i; }
  });

  // Skills
  const skillReport = getSkillAnalysis(progress);

  // Find strongest and weakest
  let strongestSkill = null;
  let weakestSkill = null;
  let maxRating = -1;
  let minRating = 101;

  for (const sk of skillReport) {
    if (sk.rating > maxRating) { maxRating = sk.rating; strongestSkill = sk; }
    if (sk.rating < minRating && sk.samples > 0) { minRating = sk.rating; weakestSkill = sk; }
  }

  // Recommendations
  const recommendations = getRecommendations(progress, skillReport);

  return {
    title: t.reportTitle,
    generatedAt: new Date().toISOString(),
    overview: {
      totalStars: { label: t.totalStars, value: totalStars, icon: '⭐' },
      levelsCompleted: { label: t.totalLevels, value: levelsCompleted, max: 100, icon: '🎮' },
      totalCoins: { label: t.totalCoins, value: progress?.coins || 0, icon: '🪙' },
      avgScore: { label: t.avgScore, value: avgScore, icon: '🏅' },
      favoriteWorld: {
        label: t.favoriteWorld,
        value: (WORLD_NAMES?.[lang]?.[favWorld]) || `World ${favWorld + 1}`,
        icon: WORLD_ICONS?.[favWorld] || '🌍',
      },
      strongSkill: strongestSkill
        ? { label: t.strongSkill, value: strongestSkill.label, icon: '💪' }
        : null,
      weakSkill: weakestSkill
        ? { label: t.weakSkill, value: weakestSkill.label, icon: '📚' }
        : null,
    },
    worldBreakdown: getWorldBreakdown(progress),
    skills: skillReport,
    recommendations,
  };
}

// ===== WORLD BREAKDOWN =====

/**
 * Get per-world progress breakdown
 * @param {Object} progress
 * @returns {Array} [{worldIdx, name, icon, stars, maxStars, levelsComplete, isUnlocked}]
 */
export function getWorldBreakdown(progress) {
  const lang = L();
  const t = LABELS[lang] || LABELS.en;
  const results = [];

  let cumulativeStars = 0;

  for (let w = 0; w < 10; w++) {
    let stars = 0;
    let complete = 0;

    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      stars += s;
      if (s > 0) complete++;
    }

    const isUnlocked = w === 0 || cumulativeStars >= w * 15;

    results.push({
      worldIdx: w,
      name: (WORLD_NAMES?.[lang]?.[w]) || `World ${w + 1}`,
      icon: WORLD_ICONS?.[w] || '🌍',
      stars,
      maxStars: 30, // 10 levels × 3 stars
      levelsComplete: complete,
      totalLevels: 10,
      isUnlocked,
      completionPct: Math.round((complete / 10) * 100),
      starsPct: Math.round((stars / 30) * 100),
      status: complete === 10 ? t.completed : !isUnlocked ? t.locked : `${complete}/10`,
    });

    cumulativeStars += stars;
  }

  return results;
}

// ===== SKILL ANALYSIS =====

/**
 * Get detailed skill analysis
 * @param {Object} progress
 * @returns {Array} [{key, label, rating, ratingLabel, trend, samples}]
 */
export function getSkillAnalysis(progress) {
  const dda = progress?._dda || {};
  const skills = dda.skills || {};

  return SKILL_KEYS.map(key => {
    const s = skills[key] || { rating: 50, trend: 0, samples: 0 };
    return {
      key,
      label: getSkillLabel(key),
      rating: s.rating || 50,
      ratingLabel: getRatingLabel(s.rating || 50),
      trend: s.trend || 0,
      trendIcon: s.trend > 2 ? '📈' : s.trend < -2 ? '📉' : '➡️',
      samples: s.samples || 0,
    };
  });
}

// ===== PLAYTIME SUMMARY =====

/**
 * Get playtime summary from progress
 * @param {Object} progress
 * @returns {Object} {totalMinutes, sessionsCount, avgSessionMin}
 */
export function getPlaytimeSummary(progress) {
  const dda = progress?._dda || {};
  const totalGames = dda.totalGames || 0;
  // Estimate: ~2 minutes per game on average
  const estimatedMinutes = totalGames * 2;

  return {
    totalMinutes: estimatedMinutes,
    totalFormatted: estimatedMinutes >= 60
      ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
      : `${estimatedMinutes}m`,
    totalGames,
    avgGameMinutes: totalGames > 0 ? 2 : 0,
  };
}

// ===== RECOMMENDATIONS =====

function getRecommendations(progress, skillReport) {
  const lang = L();
  const recs = [];

  const weakSkills = skillReport
    .filter(s => s.samples > 0 && s.rating < 40)
    .sort((a, b) => a.rating - b.rating);

  const strongSkills = skillReport
    .filter(s => s.rating >= 70)
    .sort((a, b) => b.rating - a.rating);

  const dda = progress?._dda || {};

  // Recommendation: practice weak skills
  if (weakSkills.length > 0) {
    const recTexts = {
      ar: `ينصح بالتركيز على تحسين: ${weakSkills.map(s => s.label).join('، ')}`,
      en: `Recommended to practice: ${weakSkills.map(s => s.label).join(', ')}`,
      pt: `Recomendado praticar: ${weakSkills.map(s => s.label).join(', ')}`,
    };
    recs.push({ icon: '📚', text: recTexts[lang] || recTexts.en, priority: 'high' });
  }

  // Recommendation: celebrate strengths
  if (strongSkills.length > 0) {
    const celebTexts = {
      ar: `مهارة متميزة في: ${strongSkills.map(s => s.label).join('، ')}`,
      en: `Excelling in: ${strongSkills.map(s => s.label).join(', ')}`,
      pt: `Destaque em: ${strongSkills.map(s => s.label).join(', ')}`,
    };
    recs.push({ icon: '⭐', text: celebTexts[lang] || celebTexts.en, priority: 'info' });
  }

  // Recommendation: frustration detection
  if ((dda.consecutiveFails || 0) >= 3) {
    const frustTexts = {
      ar: 'الطفل يواجه صعوبة — قد يحتاج مساعدة أو استراحة',
      en: 'Child is struggling — may need help or a break',
      pt: 'Criança está com dificuldade — pode precisar de ajuda ou pausa',
    };
    recs.push({ icon: '⚠️', text: frustTexts[lang] || frustTexts.en, priority: 'warning' });
  }

  // Recommendation: consistent play
  if ((dda.totalGames || 0) < 5) {
    const newTexts = {
      ar: 'الطفل مبتدئ — شجعه على الاستمرار!',
      en: "Child is new — encourage them to keep playing!",
      pt: 'Criança é nova — incentive a continuar!',
    };
    recs.push({ icon: '🌱', text: newTexts[lang] || newTexts.en, priority: 'info' });
  }

  return recs;
}

// ===== EXPORT FOR POSTMESSAGE =====

/**
 * Create a compact report suitable for postMessage to parent app
 * @param {Object} progress
 * @returns {Object}
 */
export function createCompactReport(progress) {
  const dda = progress?._dda || {};
  const skills = dda.skills || {};

  let totalStars = 0;
  let levelsCompleted = 0;
  for (let w = 0; w < 10; w++) {
    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      if (s > 0) levelsCompleted++;
      totalStars += s;
    }
  }

  return {
    type: 'gem-kingdom-report',
    totalStars,
    levelsCompleted,
    coins: progress?.coins || 0,
    totalGames: dda.totalGames || 0,
    skills: Object.fromEntries(
      SKILL_KEYS.map(k => [k, (skills[k]?.rating || 50)])
    ),
    overallSkill: Math.round(
      SKILL_KEYS.reduce((sum, k) => sum + (skills[k]?.rating || 50), 0) / SKILL_KEYS.length
    ),
  };
}

// ===== GRADE ESTIMATION =====
export function estimateGradeLevel(progress) {
  const skillReport = getSkillAnalysis(progress);
  const avgSkill = skillReport.length > 0
    ? Math.round(skillReport.reduce((s, r) => s + r.rating, 0) / skillReport.length) : 50;

  let totalStars = 0;
  let levelsCompleted = 0;
  for (let w = 0; w < 10; w++) {
    for (let l = 0; l < 10; l++) {
      const s = progress?.worlds?.[w]?.stars?.[l] || 0;
      if (s > 0) levelsCompleted++;
      totalStars += s;
    }
  }

  // Composite: skill average + progression depth
  const progressBonus = Math.min(20, levelsCompleted * 0.4);
  const composite = avgSkill * 0.7 + progressBonus + (totalStars > 100 ? 10 : totalStars * 0.1);

  if (composite >= 85) return { grade: '5+', label: 'Advanced', confidence: 'high' };
  if (composite >= 72) return { grade: '4-5', label: 'Grade 4-5', confidence: 'medium' };
  if (composite >= 58) return { grade: '3-4', label: 'Grade 3-4', confidence: 'medium' };
  if (composite >= 42) return { grade: '2-3', label: 'Grade 2-3', confidence: 'medium' };
  if (composite >= 28) return { grade: '1-2', label: 'Grade 1-2', confidence: 'medium' };
  return { grade: 'K-1', label: 'Kindergarten-1st', confidence: 'low' };
}

// ===== FULL REPORT FOR POSTMESSAGE =====
export function generateFullReport(progressOverride) {
  const progress = progressOverride || loadProgress();
  return {
    type: 'GEM_PROGRESS_REPORT',
    timestamp: Date.now(),
    overview: generateReport(progress).overview,
    worldBreakdown: getWorldBreakdown(progress),
    skills: getSkillAnalysis(progress),
    playtime: getPlaytimeSummary(progress),
    gradeEstimate: estimateGradeLevel(progress),
    recommendations: generateReport(progress).recommendations,
  };
}
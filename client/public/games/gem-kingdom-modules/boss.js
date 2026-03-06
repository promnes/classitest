/**
 * Gem Kingdom — boss.js
 * 10 Mini-Bosses (level 4 each world) + 10 World Bosses (level 9 each world)
 * Each boss has unique emoji, name, HP, phases, and attack patterns
 *
 * Exports: createBoss(worldIdx, levelIdx) → boss object
 */

import { LANG, OBSTACLE } from './config.js';

// ===== BOSS DEFINITIONS =====
// Mini-bosses: HP 80-150, 1 phase, attack every 3-4 turns
// World bosses: HP 200-500, 2-3 phases, attack every 3-5 turns, phase transitions

const MINI_BOSSES = [
  // World 0: Fruit Forest
  {
    emoji: '🐛', hp: 80, maxPhase: 1, attackInterval: 4,
    nameAr: 'الدودة الجائعة', nameEn: 'Hungry Worm', namePt: 'Verme Faminto',
    attacks: ['ice'],
  },
  // World 1: Ocean Deep
  {
    emoji: '🦀', hp: 100, maxPhase: 1, attackInterval: 4,
    nameAr: 'السلطعون الغاضب', nameEn: 'Angry Crab', namePt: 'Caranguejo Furioso',
    attacks: ['ice', 'chain'],
  },
  // World 2: Color Valley
  {
    emoji: '🦎', hp: 110, maxPhase: 1, attackInterval: 3,
    nameAr: 'الحرباء الماكرة', nameEn: 'Sneaky Chameleon', namePt: 'Camaleão Traiçoeiro',
    attacks: ['chain', 'shuffle'],
  },
  // World 3: Animal Safari
  {
    emoji: '🐍', hp: 120, maxPhase: 1, attackInterval: 3,
    nameAr: 'الأفعى السريعة', nameEn: 'Swift Serpent', namePt: 'Serpente Veloz',
    attacks: ['stone', 'ice'],
  },
  // World 4: Space Station
  {
    emoji: '👾', hp: 130, maxPhase: 1, attackInterval: 3,
    nameAr: 'الغازي الفضائي', nameEn: 'Space Invader', namePt: 'Invasor Espacial',
    attacks: ['dark', 'ice'],
  },
  // World 5: Music Hall
  {
    emoji: '🦇', hp: 130, maxPhase: 1, attackInterval: 3,
    nameAr: 'الخفاش المزعج', nameEn: 'Noisy Bat', namePt: 'Morcego Barulhento',
    attacks: ['bomb', 'dark'],
  },
  // World 6: Candy Land
  {
    emoji: '🍭', hp: 140, maxPhase: 1, attackInterval: 3,
    nameAr: 'المصاصة الشريرة', nameEn: 'Evil Lollipop', namePt: 'Pirulito Malvado',
    attacks: ['chain', 'portal'],
  },
  // World 7: Element Lab
  {
    emoji: '🧫', hp: 140, maxPhase: 1, attackInterval: 3,
    nameAr: 'الجرثومة المتحولة', nameEn: 'Mutant Germ', namePt: 'Germe Mutante',
    attacks: ['shadow', 'lock'],
  },
  // World 8: Book Library
  {
    emoji: '📖', hp: 150, maxPhase: 1, attackInterval: 3,
    nameAr: 'الكتاب الملعون', nameEn: 'Cursed Book', namePt: 'Livro Amaldiçoado',
    attacks: ['cage', 'shadow'],
  },
  // World 9: Diamond Palace
  {
    emoji: '🤖', hp: 150, maxPhase: 1, attackInterval: 3,
    nameAr: 'الحارس الآلي', nameEn: 'Robot Guard', namePt: 'Guarda Robô',
    attacks: ['stone', 'dark', 'bomb'],
  },
];

const WORLD_BOSSES = [
  // World 0: Fruit Forest
  {
    emoji: '🐲', hp: 200, maxPhase: 2, attackInterval: 4, phaseThresholds: [0.5],
    nameAr: 'تنين الفاكهة', nameEn: 'Fruit Dragon', namePt: 'Dragão das Frutas',
    attacks: { 1: ['ice', 'ice'], 2: ['ice', 'chain', 'dark'] },
  },
  // World 1: Ocean Deep
  {
    emoji: '🐙', hp: 250, maxPhase: 2, phaseThresholds: [0.5], attackInterval: 4,
    nameAr: 'الأخطبوط العملاق', nameEn: 'Giant Octopus', namePt: 'Polvo Gigante',
    attacks: { 1: ['ice', 'chain'], 2: ['ice', 'chain', 'dark'] },
  },
  // World 2: Color Valley
  {
    emoji: '🦚', hp: 280, maxPhase: 2, phaseThresholds: [0.5], attackInterval: 4,
    nameAr: 'الطاووس الملون', nameEn: 'Chromatic Peacock', namePt: 'Pavão Cromático',
    attacks: { 1: ['chain', 'shuffle'], 2: ['chain', 'stone', 'dark'] },
  },
  // World 3: Animal Safari
  {
    emoji: '🦁', hp: 300, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 4,
    nameAr: 'ملك الغابة', nameEn: 'Jungle King', namePt: 'Rei da Selva',
    attacks: { 1: ['stone'], 2: ['stone', 'ice'], 3: ['stone', 'chain', 'dark'] },
  },
  // World 4: Space Station
  {
    emoji: '🛸', hp: 330, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3,
    nameAr: 'سفينة الغزو', nameEn: 'Invasion Ship', namePt: 'Nave Invasora',
    attacks: { 1: ['dark', 'ice'], 2: ['dark', 'bomb'], 3: ['dark', 'bomb', 'stone'] },
  },
  // World 5: Music Hall
  {
    emoji: '🎭', hp: 350, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3,
    nameAr: 'القناع المسكون', nameEn: 'Haunted Mask', namePt: 'Máscara Assombrada',
    attacks: { 1: ['bomb', 'ice'], 2: ['bomb', 'dark'], 3: ['bomb', 'dark', 'shadow'] },
  },
  // World 6: Candy Land
  {
    emoji: '🎃', hp: 380, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3,
    nameAr: 'قرع الحلوى', nameEn: 'Candy Pumpkin', namePt: 'Abóbora de Doces',
    attacks: { 1: ['chain', 'portal'], 2: ['chain', 'bomb'], 3: ['chain', 'bomb', 'shadow'] },
  },
  // World 7: Element Lab
  {
    emoji: '🧟', hp: 400, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3,
    nameAr: 'وحش المختبر', nameEn: 'Lab Monster', namePt: 'Monstro do Lab',
    attacks: { 1: ['shadow', 'ice'], 2: ['shadow', 'lock', 'stone'], 3: ['shadow', 'lock', 'bomb', 'dark'] },
  },
  // World 8: Book Library
  {
    emoji: '👻', hp: 450, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3,
    nameAr: 'شبح المكتبة', nameEn: 'Library Ghost', namePt: 'Fantasma da Biblioteca',
    attacks: { 1: ['cage', 'ice'], 2: ['cage', 'shadow', 'chain'], 3: ['cage', 'shadow', 'bomb', 'dark'] },
  },
  // World 9: Diamond Palace — FINAL BOSS
  {
    emoji: '👑', hp: 500, maxPhase: 3, phaseThresholds: [0.66, 0.33], attackInterval: 3,
    nameAr: 'ملك الظلام', nameEn: 'Shadow King', namePt: 'Rei das Sombras',
    attacks: { 1: ['stone', 'dark', 'ice'], 2: ['shadow', 'bomb', 'chain'], 3: ['shadow', 'bomb', 'stone', 'dark', 'lock'] },
  },
];

// ===== ATTACK EFFECT MAPPING =====
// Each attack type converts to an obstacle type on random empty cells
const ATTACK_MAP = {
  ice:     { obstacle: OBSTACLE.ICE_1,      count: 3, hp: 1 },
  chain:   { obstacle: OBSTACLE.CHAIN,      count: 2, hp: 1 },
  stone:   { obstacle: OBSTACLE.STONE,      count: 2, hp: 2 },
  dark:    { obstacle: OBSTACLE.DARK,       count: 3, hp: 1 },
  lock:    { obstacle: OBSTACLE.LOCK,       count: 2, hp: 1 },
  bomb:    { obstacle: OBSTACLE.BOMB_TIMER, count: 2, hp: 1 },
  shadow:  { obstacle: OBSTACLE.SHADOW,     count: 3, hp: 1 },
  cage:    { obstacle: OBSTACLE.CAGE,       count: 2, hp: 1 },
  portal:  { obstacle: OBSTACLE.PORTAL,     count: 2, hp: 1 },
  shuffle: { obstacle: -1,                  count: 0, hp: 0 },
};

// ===== BOSS CREATION =====
export function createBoss(worldIdx, levelIdx) {
  const isMiniBoss = levelIdx === 4;
  const isBoss = levelIdx === 9;

  if (!isMiniBoss && !isBoss) return null;

  const def = isMiniBoss ? MINI_BOSSES[worldIdx] : WORLD_BOSSES[worldIdx];
  if (!def) return null;

  const nameKey = LANG === 'ar' ? 'nameAr' : LANG === 'pt' ? 'namePt' : 'nameEn';

  return {
    active: true,
    defeated: false,
    emoji: def.emoji,
    name: def[nameKey],
    hp: def.hp,
    maxHP: def.hp,
    phase: 1,
    maxPhase: def.maxPhase,
    phaseThresholds: def.phaseThresholds || [],
    attackInterval: def.attackInterval,
    attackTimer: def.attackInterval,
    isAttacking: false,
    attacks: def.attacks,
    worldIdx,
    isFinal: worldIdx === 9 && isBoss,
  };
}

/**
 * Get the attack pattern for a boss's current phase
 * Returns an array of obstacle-adding instructions
 */
export function getBossAttack(boss) {
  if (!boss || boss.defeated) return [];

  // Determine current phase based on HP thresholds
  const hpPct = boss.hp / boss.maxHP;
  let phase = 1;
  if (boss.phaseThresholds) {
    for (let i = 0; i < boss.phaseThresholds.length; i++) {
      if (hpPct <= boss.phaseThresholds[i]) phase = i + 2;
    }
  }

  // Update phase
  if (phase > boss.phase) {
    boss.phase = phase;
  }

  // Get attacks for current phase
  let attackList;
  if (Array.isArray(boss.attacks)) {
    // Mini-boss: simple array
    attackList = boss.attacks;
  } else {
    // World boss: phase-based
    attackList = boss.attacks[boss.phase] || boss.attacks[1] || [];
  }

  // Convert attack names to obstacle instructions
  const result = [];
  for (const atk of attackList) {
    const mapping = ATTACK_MAP[atk];
    if (!mapping) continue;

    if (atk === 'shuffle') {
      result.push({ type: 'shuffle' });
    } else {
      // Scale count with phase
      const extraCount = boss.phase > 1 ? Math.floor((boss.phase - 1) * 0.5) : 0;
      result.push({
        type: 'obstacle',
        obstacle: mapping.obstacle,
        count: mapping.count + extraCount,
        hp: mapping.hp,
      });
    }
  }

  return result;
}

/**
 * Get boss taunt text for current phase
 */
export function getBossTaunt(boss) {
  if (!boss) return '';
  const taunts = {
    ar: {
      1: ['لن تهزمني! 💪', 'حان دوري! ⚡', 'خذ هذا! 💥'],
      2: ['أنت قوي... لكنني أقوى! 🔥', 'لا تظن أنك فزت! 😤', 'هذا ليس شكلي النهائي! 👿'],
      3: ['كفى! سأدمر كل شيء! 💀', 'لن أسامحك! ⚡⚡', 'اشعر بقوتي الحقيقية! 🌋'],
    },
    en: {
      1: ["You can't beat me! 💪", "My turn! ⚡", "Take this! 💥"],
      2: ["You're strong... but I'm stronger! 🔥", "Don't think you've won! 😤", "This isn't my final form! 👿"],
      3: ["Enough! I'll destroy everything! 💀", "I won't forgive you! ⚡⚡", "Feel my true power! 🌋"],
    },
    pt: {
      1: ['Você não pode me vencer! 💪', 'Minha vez! ⚡', 'Tome isso! 💥'],
      2: ['Você é forte... mas eu sou mais! 🔥', 'Não pense que venceu! 😤', 'Esta não é minha forma final! 👿'],
      3: ['Chega! Vou destruir tudo! 💀', 'Não vou perdoar! ⚡⚡', 'Sinta meu verdadeiro poder! 🌋'],
    },
  };

  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const phaseTaunts = taunts[lang][boss.phase] || taunts[lang][1];
  return phaseTaunts[Math.floor(Math.random() * phaseTaunts.length)];
}

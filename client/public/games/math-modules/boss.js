// ===== Emoji Kingdom — Boss Module =====
// Boss Level 20: 3 phases, health bar, attack mechanics

import { t } from './config.js';

const BOSS_TOTAL_HP = 15; // 15 questions = 15 HP segments
const PHASES = [
  { name: 1, ops: ['add', 'sub'],        questions: 5, color: '#22c55e' },
  { name: 2, ops: ['mul', 'div'],        questions: 5, color: '#f59e0b' },
  { name: 3, ops: ['add','sub','mul','div'], questions: 5, color: '#ef4444' },
];

export function createBossState() {
  return {
    active: true,
    totalHP: BOSS_TOTAL_HP,
    currentHP: BOSS_TOTAL_HP,
    phase: 0,           // 0-2
    phaseQuestion: 0,   // question within phase
    playerHP: 5,        // player lives during boss
    emoji: '🐲',
    defeated: false,
  };
}

export function getPhases() {
  return PHASES;
}

export function getCurrentPhase(boss) {
  return PHASES[Math.min(boss.phase, PHASES.length - 1)];
}

export function getCurrentPhaseOps(boss) {
  return getCurrentPhase(boss).ops;
}

export function getBossPhaseLabel(boss) {
  return t('bossPhase').replace('{n}', boss.phase + 1);
}

export function hitBoss(boss) {
  boss.currentHP = Math.max(0, boss.currentHP - 1);
  boss.phaseQuestion++;
  // Check phase transition
  const phase = getCurrentPhase(boss);
  if (boss.phaseQuestion >= phase.questions && boss.phase < PHASES.length - 1) {
    boss.phase++;
    boss.phaseQuestion = 0;
  }
  if (boss.currentHP <= 0) boss.defeated = true;
  return { hit: true, defeated: boss.defeated, phaseChanged: boss.phaseQuestion === 0 };
}

export function bossAttack(boss) {
  boss.playerHP = Math.max(0, boss.playerHP - 1);
  return { playerHP: boss.playerHP, gameOver: boss.playerHP <= 0 };
}

export function getBossHPPercent(boss) {
  return (boss.currentHP / boss.totalHP) * 100;
}

export function getBossPhaseSegments(boss) {
  let used = boss.totalHP - boss.currentHP;
  return PHASES.map((ph, i) => {
    const segHP = ph.questions;
    const segUsed = Math.min(used, segHP);
    used -= segUsed;
    return {
      total: segHP,
      remaining: segHP - segUsed,
      color: ph.color,
      active: i === boss.phase,
    };
  });
}

export function getBossEmoji(boss) {
  const pct = boss.currentHP / boss.totalHP;
  if (pct > 0.6) return '🐲';
  if (pct > 0.3) return '🐉';
  if (pct > 0) return '😤';
  return '💀';
}

export function isBossDefeated(boss) {
  return boss.defeated;
}

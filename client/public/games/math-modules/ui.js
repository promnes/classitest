// ===== Emoji Kingdom — UI Module =====
// Audio/Music layers, Animations, Particles, Theme system, Performance mode, Tooltips

import { THEME_GROUPS, THEMES } from './config.js';

// ===== Performance Mode =====
let lowPerfMode = false;
export function isLowPerf() { return lowPerfMode; }
export function setLowPerf(v) { lowPerfMode = v; }
export function detectPerformance() {
  // Simple heuristic: check device memory or hardwareConcurrency
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
    lowPerfMode = true;
  }
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) {
    lowPerfMode = true;
  }
}

export function getParticleCount(base) {
  return lowPerfMode ? Math.max(1, Math.floor(base / 3)) : base;
}

// ===== Theme System =====
export function getTheme(levelIdx) {
  return THEMES[Math.min(levelIdx, THEMES.length - 1)];
}

export function getThemeGroup(levelIdx) {
  const theme = getTheme(levelIdx);
  return THEME_GROUPS[theme.group] || THEME_GROUPS.nature;
}

export function applyTheme(levelIdx, gameEl, doneEl) {
  const theme = getTheme(levelIdx);
  if (gameEl) {
    gameEl.style.background = theme.bg;
    gameEl.style.setProperty('--accent', theme.accent);
  }
  if (doneEl) doneEl.style.background = theme.bg;
}

// ===== Audio System =====
let audioCtx = null;
let musicGain = null;
let musicOsc = null;
let comboGain = null;
let comboOsc = null;
let intensityGain = null;
let intensityOsc = null;
let bossGain = null;
let bossOsc = null;
let musicPlaying = false;

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(freq, dur, type, vol) {
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(vol || 0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (dur || 0.15));
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + (dur || 0.15));
  } catch(e) {}
}

export function sfxCorrect() {
  tone(659, 0.1, 'sine', 0.1);
  setTimeout(() => tone(988, 0.12, 'sine', 0.1), 80);
}

export function sfxWrong() {
  tone(220, 0.15, 'sawtooth', 0.06);
}

export function sfxComplete() {
  [523, 659, 784, 988, 1175, 1319].forEach((f, i) =>
    setTimeout(() => tone(f, 0.18, 'sine', 0.1), i * 80));
}

export function sfxStar() {
  [880, 1100, 1320].forEach((f, i) =>
    setTimeout(() => tone(f, 0.15, 'sine', 0.1), i * 120));
}

export function sfxTick() {
  tone(440, 0.03, 'sine', 0.04);
}

export function sfxLevelUp() {
  [523, 659, 784, 988, 1047, 1319, 1568].forEach((f, i) =>
    setTimeout(() => tone(f, 0.2, 'sine', 0.12), i * 100));
}

export function sfxBossHit() {
  tone(150, 0.2, 'sawtooth', 0.12);
  setTimeout(() => tone(100, 0.15, 'square', 0.08), 100);
}

export function sfxBossAttack() {
  tone(80, 0.3, 'sawtooth', 0.1);
  setTimeout(() => tone(60, 0.2, 'square', 0.08), 150);
}

export function sfxComboUp(streak) {
  const base = 440 + streak * 50;
  tone(base, 0.08, 'sine', 0.06);
  setTimeout(() => tone(base * 1.5, 0.1, 'sine', 0.06), 50);
}

// ===== Adaptive Music Layers =====
function createLoop(freq, type, vol) {
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    return { osc: o, gain: g, targetVol: vol };
  } catch(e) { return null; }
}

export function startMusic() {
  if (musicPlaying || lowPerfMode) return;
  musicPlaying = true;
  // Base loop - gentle sine
  const base = createLoop(220, 'sine', 0.03);
  if (base) { musicGain = base.gain; musicOsc = base.osc; fadeIn(musicGain, 0.03, 1); }
  // Combo layer - triangle, starts silent
  const combo = createLoop(330, 'triangle', 0);
  if (combo) { comboGain = combo.gain; comboOsc = combo.osc; }
  // Intensity layer - square, starts silent
  const intense = createLoop(440, 'square', 0);
  if (intense) { intensityGain = intense.gain; intensityOsc = intense.osc; }
}

export function stopMusic() {
  musicPlaying = false;
  [musicOsc, comboOsc, intensityOsc, bossOsc].forEach(o => {
    try { if (o) o.stop(); } catch(e) {}
  });
  musicOsc = comboOsc = intensityOsc = bossOsc = null;
}

export function updateMusicLayers(streak, isBoss) {
  if (!musicPlaying) return;
  // Combo layer: fade in at streak >= 3
  if (comboGain) {
    const vol = streak >= 3 ? 0.02 : 0;
    fadeIn(comboGain, vol, 0.5);
  }
  // Intensity layer: fade in at streak >= 6
  if (intensityGain) {
    const vol = streak >= 6 ? 0.015 : 0;
    fadeIn(intensityGain, vol, 0.5);
  }
}

function fadeIn(gainNode, targetVol, dur) {
  try {
    const c = ctx();
    gainNode.gain.cancelScheduledValues(c.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, c.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetVol, c.currentTime + dur);
  } catch(e) {}
}

// ===== Particles =====
export function spawnParticles(x, y, count, particleChar) {
  const n = getParticleCount(count);
  const chars = particleChar ? [particleChar] : ['⭐', '✨', '🌟'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = chars[Math.floor(Math.random() * chars.length)];
    p.style.left = (x + (Math.random() - 0.5) * 60) + 'px';
    p.style.top = y + 'px';
    p.style.fontSize = '22px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}

export function spawnCelebration(count) {
  const n = getParticleCount(count);
  const chars = ['⭐', '✨', '🏆', '🎉', '💎', '👑'];
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = chars[Math.floor(Math.random() * chars.length)];
      p.style.left = (Math.random() * innerWidth) + 'px';
      p.style.top = (innerHeight * 0.5 + Math.random() * 100) + 'px';
      p.style.fontSize = '24px';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1300);
    }, i * 70);
  }
}

// ===== Animations =====
export function bounceElement(el) {
  if (!el || lowPerfMode) return;
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'emojiBounce 0.4s ease';
}

export function shakeElement(el) {
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'screenShake 0.4s ease';
}

export function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms || 100); } catch(e) {}
}

// ===== Contextual Tooltips =====
export function shouldShowTooltip(progress, feature) {
  return !(progress.tutorialShown && progress.tutorialShown[feature]);
}

export function markTooltipShown(progress, feature) {
  if (!progress.tutorialShown) progress.tutorialShown = {};
  progress.tutorialShown[feature] = true;
}

export function showTooltip(text, targetEl, duration) {
  const tt = document.createElement('div');
  tt.className = 'tooltip-popup';
  tt.textContent = text;
  document.body.appendChild(tt);
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    tt.style.left = (rect.left + rect.width / 2) + 'px';
    tt.style.top = (rect.top - 10) + 'px';
  } else {
    tt.style.left = '50%';
    tt.style.top = '30%';
  }
  setTimeout(() => {
    tt.style.opacity = '0';
    setTimeout(() => tt.remove(), 400);
  }, duration || 3000);
  return tt;
}

// Auto-detect on load
detectPerformance();

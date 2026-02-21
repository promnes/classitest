// ═══════════════════════════════════════════════════════════════
// Memory Match Pro — ui.js
// Sound Engine, Background Animations, Particles, Card Rendering
// ═══════════════════════════════════════════════════════════════

import { MECH, t } from './config.js';

// ===== AUDIO ENGINE (Childlike Joyful Sounds) =====
let audioCtx = null;
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Low-level primitives: references soundMuted via getter
let _getMuted = () => false;
export function setSoundMuteGetter(fn) { _getMuted = fn; }

function tone(f, d, tp, v, atk) {
  if (_getMuted()) return;
  try {
    const c = ctx(), o = c.createOscillator(), g = c.createGain();
    const a = atk || .005;
    o.type = tp || 'sine';
    o.frequency.setValueAtTime(f, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(v || .08, c.currentTime + a);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + (d || .15));
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + (d || .15) + .01);
  } catch (e) {}
}

function bell(f, d, v) {
  if (_getMuted()) return;
  tone(f, d || .25, 'sine', v || .09, .003);
  tone(f * 2, (d || .25) * .6, 'sine', (v || .09) * .3, .003);
  tone(f * 3, (d || .25) * .35, 'triangle', (v || .09) * .12, .003);
}

function sparkle(f, v) {
  if (_getMuted()) return;
  tone(f, .08, 'sine', v || .06, .002);
  tone(f * 1.5, .06, 'sine', (v || .06) * .4, .002);
}

export function sfxFlip() { bell(659, .1, .07); sparkle(1319, .03); }
export function sfxMatch() {
  bell(784, .15, .11);
  setTimeout(() => bell(988, .18, .12), 70);
  setTimeout(() => { sparkle(1568, .05); sparkle(2093, .03); }, 130);
}
export function sfxNoMatch() {
  tone(330, .18, 'sine', .06, .01);
  setTimeout(() => tone(262, .2, 'triangle', .04, .01), 80);
}
export function sfxComplete() {
  const n = [523, 659, 784, 988, 1175, 1319, 1568];
  n.forEach((f, i) => setTimeout(() => bell(f, .22, .1), i * 90));
  setTimeout(() => sparkle(2093, .06), n.length * 90);
}
export function sfxStar() {
  [880, 1175, 1568].forEach((f, i) => setTimeout(() => {
    bell(f, .2, .1); sparkle(f * 2, .04);
  }, i * 130));
}
export function sfxCoin() {
  tone(1319, .06, 'sine', .09, .002);
  setTimeout(() => tone(1760, .08, 'sine', .1, .002), 50);
  setTimeout(() => sparkle(2637, .04), 90);
}
export function sfxBadge() {
  [880, 1047, 1319, 1568, 1760].forEach((f, i) => setTimeout(() => bell(f, .18, .1), i * 90));
}

// ===== PARTICLE SYSTEM (Royal Match 3D) =====
const particleCanvas = (() => {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
  document.body.appendChild(c);
  return c;
})();
const pCtx = particleCanvas.getContext('2d');
let P = [], pRaf = null;

function pResize() { particleCanvas.width = innerWidth; particleCanvas.height = innerHeight; }
addEventListener('resize', pResize); pResize();

function pLoop() {
  pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life -= p.d;
    if (p.life <= 0) { P.splice(i, 1); continue; }
    p.vy += (p.g || .2); p.x += p.vx; p.y += p.vy;
    p.rot = (p.rot || 0) + (p.rs || 0);
    pCtx.save();
    pCtx.globalAlpha = Math.min(1, p.life * 1.5);
    pCtx.translate(p.x, p.y);
    pCtx.rotate((p.rot || 0) * Math.PI / 180);
    if (p.t === 'fw') {
      pCtx.beginPath(); pCtx.arc(0, 0, p.r * p.life, 0, Math.PI * 2);
      pCtx.fillStyle = p.color; pCtx.fill();
      pCtx.globalAlpha = p.life * .3;
      pCtx.beginPath(); pCtx.arc(-p.vx * .5, -p.vy * .5, p.r * p.life * .6, 0, Math.PI * 2);
      pCtx.fill();
    } else if (p.t === 'em') {
      pCtx.font = p.sz + 'px serif';
      pCtx.textAlign = 'center'; pCtx.textBaseline = 'middle';
      pCtx.fillText(p.em, 0, 0);
    } else {
      pCtx.fillStyle = p.color;
      pCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    pCtx.restore();
  }
  pRaf = P.length > 0 ? requestAnimationFrame(pLoop) : null;
}

export function spawnConfetti(x, y, n) {
  n = n || 40;
  const cols = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD', '#FF69B4', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'];
  for (let i = 0; i < n; i++) {
    P.push({
      x: x || Math.random() * particleCanvas.width, y: y || particleCanvas.height * .3,
      vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 3,
      w: Math.random() * 10 + 4, h: Math.random() * 6 + 3,
      color: cols[Math.floor(Math.random() * cols.length)],
      rot: Math.random() * 360, rs: (Math.random() - .5) * 15,
      g: .25 + Math.random() * .2, life: 1, d: .006 + Math.random() * .007
    });
  }
  if (!pRaf) pLoop();
}

function spawnFirework(x, y) {
  const cols = ['#FFD700', '#FF4500', '#00FF7F', '#1E90FF', '#FF69B4', '#FFA500', '#E74C3C', '#2ECC71', '#9B59B6', '#F39C12'];
  const col = cols[Math.floor(Math.random() * cols.length)];
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2, sp = 2 + Math.random() * 6;
    P.push({
      t: 'fw', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 1.5 + Math.random() * 3, color: col, life: 1, d: .012 + Math.random() * .012, g: .06
    });
  }
  if (!pRaf) pLoop();
}

function spawn3DStars(x, y, n) {
  const em = ['⭐', '🌟', '✨', '💫', '🎆', '💎', '🏆', '🎉', '🎊', '👑'];
  for (let i = 0; i < (n || 8); i++) {
    P.push({
      t: 'em', x: x + (Math.random() - .5) * 100, y,
      vx: (Math.random() - .5) * 6, vy: -Math.random() * 10 - 3,
      em: em[Math.floor(Math.random() * em.length)],
      sz: 18 + Math.random() * 24, life: 1, d: .009, g: .12, rot: 0, rs: (Math.random() - .5) * 10
    });
  }
  if (!pRaf) pLoop();
}

export function royalCelebration(stars) {
  stars = stars || 1;
  const cw = particleCanvas.width, ch = particleCanvas.height;
  for (let w = 0; w < Math.min(stars + 1, 4); w++)
    setTimeout(() => spawnConfetti(cw * (.2 + Math.random() * .6), ch * (.2 + Math.random() * .2), 25 + stars * 10), w * 350);
  for (let f = 0; f < Math.min(stars, 3); f++)
    setTimeout(() => spawnFirework(cw * (.15 + Math.random() * .7), ch * (.1 + Math.random() * .25)), 200 + f * 600);
  setTimeout(() => spawn3DStars(cw / 2, ch * .45, stars * 4), 100);
}

export function spawnMatchParticles(id1, id2) {
  try {
    [id1, id2].forEach(id => {
      const el = document.getElementById('grid').querySelector(`[data-id="${id}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (let i = 0; i < 4; i++) {
        const p = document.createElement('div'); p.className = 'particle';
        p.textContent = ['⭐', '✨', '🌟', '💫', '💎', '🎉'][Math.floor(Math.random() * 6)];
        p.style.left = (cx - 10 + Math.random() * 20) + 'px';
        p.style.top = (cy - 10 + Math.random() * 20) + 'px';
        p.style.fontSize = '18px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
      }
    });
  } catch (e) {}
}

export function spawnCoinFly(n) {
  const count = Math.min(n > 30 ? 8 : n > 15 ? 5 : 3, 8);
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div'); el.className = 'coin-fly'; el.textContent = '🪙';
      el.style.left = (innerWidth * .3 + Math.random() * innerWidth * .4) + 'px';
      el.style.top = (innerHeight * .45 + Math.random() * 40) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }, i * 120);
  }
}

// ===== DYNAMIC BACKGROUND ANIMATION =====
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
let bgParts = [], bgGrp = -1, bgRaf = null, bgActive = false;

const BG_FX = [
  // 0: Nature
  { e: ['🍃', '🌿', '🦋', '🐝', '🌸', '☘️', '🌻', '🍀', '🌺', '🐞'], n: 22, sp: .35, t: 'float' },
  // 1: Ocean
  { e: ['🫧', '💧', '🐟', '🐠', '🐚', '🌊', '🪸', '🐬', '🐡', '🦈'], n: 26, sp: .5, t: 'rise' },
  // 2: City/Food
  { e: ['✨', '⭐', '🌟', '💫', '🎆', '🎇', '🎪', '🎠', '🎡', '🎢'], n: 20, sp: .25, t: 'twinkle' },
  // 3: Adventure
  { e: ['⭐', '💫', '☄️', '✨', '🌟', '🔥', '💥', '🌠', '🏹', '⚔️'], n: 14, sp: 1.2, t: 'shoot' },
  // 4: Tech
  { e: ['⚡', '💎', '🔮', '💠', '🤖', '⚙️', '📡', '💾', '🔬', '💻'], n: 32, sp: .45, t: 'fall' },
  // 5: Desert/Sand
  { e: ['🏜️', '🌵', '🐫', '☀️', '🦂', '🪨', '🏺', '⛺', '🌾', '🦎'], n: 18, sp: .3, t: 'float' },
  // 6: Fantasy/Magic
  { e: ['🧙', '🦄', '🐉', '🔮', '✨', '🏰', '⚗️', '🌙', '👑', '💫'], n: 22, sp: .35, t: 'twinkle' },
  // 7: Candy/Sweet
  { e: ['🍬', '🍭', '🧁', '🎂', '🍰', '🍩', '🍪', '🍫', '🍮', '🍡'], n: 24, sp: .4, t: 'fall' },
  // 8: Arctic/Ice
  { e: ['❄️', '⛄', '🌨️', '🐧', '🦭', '🐻‍❄️', '🏔️', '🧊', '💎', '🌬️'], n: 20, sp: .35, t: 'fall' },
  // 9: Royal/Final
  { e: ['👑', '💎', '🏆', '🎖️', '⭐', '🌟', '🔱', '💫', '🎉', '✨'], n: 28, sp: .4, t: 'rise' },
];

function bgResize() {
  if (!bgCanvas) return;
  const p = bgCanvas.parentElement;
  if (p) { bgCanvas.width = p.clientWidth; bgCanvas.height = p.clientHeight; }
}

function mkBgP(fx, init) {
  const w = bgCanvas.width || innerWidth, h = bgCanvas.height || innerHeight;
  const p = {
    x: Math.random() * w,
    y: init ? Math.random() * h : (fx.t === 'fall' || fx.t === 'shoot' ? -30 : h + 30),
    e: fx.e[Math.floor(Math.random() * fx.e.length)],
    sz: 10 + Math.random() * 16,
    sp: fx.sp * (0.4 + Math.random() * 0.8),
    op: 0.12 + Math.random() * 0.35,
    ph: Math.random() * Math.PI * 2,
    dr: (Math.random() - 0.5) * 0.25,
    rot: 0, rs: (Math.random() - 0.5) * 0.5
  };
  if (fx.t === 'shoot') { p.vx = -0.8 - Math.random() * 1.5; p.vy = 0.4 + Math.random() * 1.2; }
  return p;
}

function bgLoop() {
  if (!bgActive || !bgCtx) { bgRaf = null; return; }
  const w = bgCanvas.width, h = bgCanvas.height;
  bgCtx.clearRect(0, 0, w, h);
  const fx = BG_FX[bgGrp];
  if (!fx) { bgRaf = requestAnimationFrame(bgLoop); return; }

  for (let i = 0; i < bgParts.length; i++) {
    const p = bgParts[i];
    p.ph += 0.015; p.rot += p.rs;
    if (fx.t === 'float') {
      p.y -= p.sp; p.x += Math.sin(p.ph) * 0.4 + p.dr;
      if (p.y < -40) { Object.assign(p, mkBgP(fx, false)); p.y = h + 30; }
    } else if (fx.t === 'rise') {
      p.y -= p.sp; p.x += Math.sin(p.ph) * 0.55; p.sz += Math.sin(p.ph * 2) * 0.03;
      if (p.y < -40) { Object.assign(p, mkBgP(fx, false)); p.y = h + 30; }
    } else if (fx.t === 'twinkle') {
      p.op = 0.08 + Math.abs(Math.sin(p.ph)) * 0.45;
      p.sz = 10 + Math.sin(p.ph * 1.3) * 5; p.y -= p.sp * 0.15;
      if (p.y < -40) { Object.assign(p, mkBgP(fx, false)); p.y = h + 30; p.x = Math.random() * w; }
    } else if (fx.t === 'shoot') {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -50 || p.y > h + 50) { Object.assign(p, mkBgP(fx, false)); p.y = -30; p.x = Math.random() * w; }
    } else if (fx.t === 'fall') {
      p.y += p.sp; p.op = 0.08 + Math.abs(Math.sin(p.ph)) * 0.3;
      if (p.y > h + 40) { Object.assign(p, mkBgP(fx, false)); p.y = -30; p.x = Math.random() * w; }
    }
    bgCtx.save();
    bgCtx.globalAlpha = p.op;
    bgCtx.translate(p.x, p.y); bgCtx.rotate(p.rot * Math.PI / 180);
    bgCtx.font = Math.round(p.sz) + 'px serif';
    bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(p.e, 0, 0);
    bgCtx.restore();
  }
  bgRaf = requestAnimationFrame(bgLoop);
}

export function initBg(g) {
  bgGrp = g; bgParts = []; bgActive = true;
  bgResize();
  const fx = BG_FX[g];
  if (fx) { for (let i = 0; i < fx.n; i++) bgParts.push(mkBgP(fx, true)); }
  if (!bgRaf) bgLoop();
}

export function stopBg() {
  bgActive = false; bgGrp = -1;
  if (bgCanvas && bgCanvas.width && bgCtx) bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
}

addEventListener('resize', () => {
  bgResize();
  if (bgActive && bgGrp >= 0) {
    const fx = BG_FX[bgGrp];
    if (fx) { bgParts = []; for (let i = 0; i < fx.n; i++) bgParts.push(mkBgP(fx, true)); }
  }
});

// ===== SCREEN MANAGEMENT =====
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ===== COUNTDOWN DISPLAY =====
export function updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec) {
  const fill = document.getElementById('cd-fill');
  const text = document.getElementById('cd-text');
  if (!fill || !text) return;
  const max = mechanic === MECH.BOSS ? 120 : levelTimerMax;
  const sec = mechanic === MECH.BOSS ? bossCountdownSec : levelTimerSec;
  const pct = max > 0 ? Math.max(0, (sec / max) * 100) : 100;
  fill.style.width = pct + '%';
  text.textContent = '⏱️ ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  text.className = 'cd-txt' + (sec <= Math.min(20, max * 0.15) ? ' urgent' : '');
}

// ===== CARD RENDERING =====
export function renderCards(cards, gridCols, gridRows, frontIcon, mechanic, fogSet, group, onFlip, onClearFog) {
  const g = document.getElementById('grid');
  const wrap = document.querySelector('.grid-wrap');
  const wW = wrap.clientWidth, wH = wrap.clientHeight;
  const maxW = (wW > 50 ? wW : window.innerWidth) - 16;
  const maxH = (wH > 50 ? wH : window.innerHeight * 0.65) - 16;
  const gap = Math.max(4, Math.min(8, maxW * .01));
  const sW = Math.floor((maxW - gap * (gridCols - 1)) / gridCols);
  const sH = Math.floor((maxH - gap * (gridRows - 1)) / gridRows);
  const sz = Math.max(48, Math.min(sW, sH, 200));

  g.style.gridTemplateColumns = `repeat(${gridCols},${sz}px)`;
  g.style.gridTemplateRows = `repeat(${gridRows},${sz}px)`;
  g.style.gap = gap + 'px';
  g.innerHTML = '';

  cards.forEach(card => {
    const btn = document.createElement('button');
    btn.className = 'card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched flipped' : '');
    btn.disabled = card.flipped || card.matched;
    btn.setAttribute('data-id', card.id);
    btn.innerHTML = `<div class="card-inner"><div class="card-front"><span class="icon">${frontIcon}</span></div><div class="card-back"><span class="sym">${card.symbol}</span></div></div>`;

    // Fog overlay
    if ((mechanic === MECH.FOG || mechanic === MECH.BOSS) && fogSet.has(card.id) && !card.matched && !card.flipped) {
      const fog = document.createElement('div');
      fog.className = 'fog-ov'; fog.textContent = '🌫️';
      fog.addEventListener('click', (e) => { e.stopPropagation(); onClearFog(card.id); });
      btn.querySelector('.card-inner').appendChild(fog);
    }

    btn.style.width = sz + 'px'; btn.style.height = sz + 'px';
    btn.addEventListener('click', () => onFlip(card.id));
    g.appendChild(btn);
  });
}

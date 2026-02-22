// ===== Gem Kingdom 💎 — UI / Canvas Renderer =====
// Canvas 2D rendering: gems, specials, obstacles, particles, tweens, backgrounds
// Depends on: config.js

import {
  SPECIAL, SPECIAL_NAMES, OBSTACLE,
  WORLD_GEMS, WORLD_GRADIENTS, WORLD_ACCENTS, WORLD_PARTICLES,
  BOARD, TIMING, LANG,
} from './config.js';

// ===== PERFORMANCE DETECTION =====
let PERF = 'high'; // 'high' | 'medium' | 'low'
export function detectPerformance() {
  const canvas = document.createElement('canvas');
  canvas.width = 200; canvas.height = 200;
  const ctx = canvas.getContext('2d');
  const start = performance.now();
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `hsl(${i},80%,60%)`;
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, Math.PI * 2);
    ctx.fill();
  }
  const elapsed = performance.now() - start;
  if (elapsed < 15) PERF = 'high';
  else if (elapsed < 40) PERF = 'medium';
  else PERF = 'low';
  return PERF;
}

export function getPerf() { return PERF; }

// ===== TWEEN SYSTEM =====
const tweens = [];

export function addTween(target, props, duration, easing = 'easeOut', onDone = null) {
  const tween = { target, props: {}, elapsed: 0, duration, easing, onDone, dead: false };
  for (const [key, val] of Object.entries(props)) {
    tween.props[key] = { from: target[key] ?? 0, to: val };
  }
  tweens.push(tween);
  return tween;
}

export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (tw.dead) { tweens.splice(i, 1); continue; }
    tw.elapsed += dt;
    const t = Math.min(tw.elapsed / tw.duration, 1);
    const e = ease(t, tw.easing);
    for (const [key, { from, to }] of Object.entries(tw.props)) {
      tw.target[key] = from + (to - from) * e;
    }
    if (t >= 1) {
      tw.dead = true;
      if (tw.onDone) tw.onDone();
      tweens.splice(i, 1);
    }
  }
}

export function hasTweens() { return tweens.length > 0; }
export function clearTweens() { tweens.length = 0; }

function ease(t, type) {
  switch (type) {
    case 'linear': return t;
    case 'easeIn': return t * t;
    case 'easeOut': return 1 - (1 - t) * (1 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bounce': {
      if (t < 1/2.75) return 7.5625 * t * t;
      if (t < 2/2.75) return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
      if (t < 2.5/2.75) return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
    }
    case 'elastic': {
      if (t === 0 || t === 1) return t;
      return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
    }
    case 'back': {
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    }
    default: return 1 - (1 - t) * (1 - t);
  }
}

// ===== PARTICLE SYSTEM =====
const particles = [];
const MAX_PARTICLES = PERF === 'low' ? 50 : PERF === 'medium' ? 150 : 300;

export function spawnParticle(x, y, opts = {}) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({
    x, y,
    vx: opts.vx ?? (Math.random() - 0.5) * 4,
    vy: opts.vy ?? (Math.random() - 0.5) * 4 - 2,
    life: opts.life ?? 0.8,
    maxLife: opts.life ?? 0.8,
    size: opts.size ?? (6 + Math.random() * 8),
    color: opts.color ?? '#fff',
    emoji: opts.emoji ?? null,
    type: opts.type ?? 'circle', // 'circle', 'emoji', 'star', 'ring', 'sparkle'
    gravity: opts.gravity ?? 2,
    friction: opts.friction ?? 0.98,
    rotation: opts.rotation ?? 0,
    rotSpeed: opts.rotSpeed ?? (Math.random() - 0.5) * 5,
    scale: opts.scale ?? 1,
    fadeStart: opts.fadeStart ?? 0.3, // start fading at this life fraction
  });
}

export function spawnBurst(x, y, count, opts = {}) {
  const actualCount = PERF === 'low' ? Math.ceil(count * 0.3) : PERF === 'medium' ? Math.ceil(count * 0.6) : count;
  for (let i = 0; i < actualCount; i++) {
    const angle = (Math.PI * 2 / actualCount) * i + Math.random() * 0.3;
    const speed = (opts.speed ?? 3) + Math.random() * 2;
    spawnParticle(x, y, {
      ...opts,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }
}

export function spawnStarBurst(x, y, color) {
  spawnBurst(x, y, 8, { color, type: 'star', size: 10, life: 0.6, speed: 4 });
}

export function spawnEmojiBurst(x, y, emoji, count = 5) {
  spawnBurst(x, y, count, { emoji, type: 'emoji', size: 16, life: 0.8, speed: 3, gravity: 3 });
}

export function spawnComboText(x, y, text) {
  particles.push({
    x, y, vx: 0, vy: -2, life: 1.2, maxLife: 1.2,
    size: 24, color: '#FFD700', emoji: null,
    type: 'text', text, gravity: 0, friction: 1,
    rotation: 0, rotSpeed: 0, scale: 1, fadeStart: 0.3,
  });
}

export function spawnSpecialActivation(x, y, special) {
  const colors = {
    [SPECIAL.ROCKET_H]: '#00d4ff',
    [SPECIAL.ROCKET_V]: '#00d4ff',
    [SPECIAL.BOMB]: '#ff6b35',
    [SPECIAL.RAINBOW]: '#ff69b4',
    [SPECIAL.NOVA]: '#FFD700',
    [SPECIAL.LIGHTNING]: '#ffd700',
    [SPECIAL.MAGIC]: '#a855f7',
  };
  spawnBurst(x, y, 12, { color: colors[special] || '#fff', type: 'sparkle', size: 8, life: 0.6, speed: 5 });
}

export function spawnRocketTrail(x, y, horizontal) {
  for (let i = 0; i < 3; i++) {
    spawnParticle(x, y, {
      vx: horizontal ? (Math.random() - 0.5) * 1 : (Math.random() - 0.5) * 4,
      vy: horizontal ? (Math.random() - 0.5) * 4 : (Math.random() - 0.5) * 1,
      color: '#00d4ff', size: 4, life: 0.3, gravity: 0, type: 'circle',
    });
  }
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.vy += p.gravity * dt;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed * dt;
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    const alpha = p.life < p.maxLife * p.fadeStart
      ? p.life / (p.maxLife * p.fadeStart)
      : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.type === 'emoji' && p.emoji) {
      ctx.font = `${p.size * p.scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
    } else if (p.type === 'text' && p.text) {
      ctx.font = `bold ${p.size * p.scale}px "Segoe UI","Noto Sans Arabic",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
    } else if (p.type === 'star') {
      drawStar(ctx, 0, 0, 5, p.size * p.scale * 0.5, p.size * p.scale * 0.25, p.color);
    } else if (p.type === 'sparkle') {
      drawSparkle(ctx, 0, 0, p.size * p.scale, p.color);
    } else if (p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * p.scale, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * p.scale * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export function clearParticles() { particles.length = 0; }

// ===== SHAPE HELPERS =====
function drawStar(ctx, cx, cy, spikes, outerR, innerR, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

function drawSparkle(ctx, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const arms = 4;
  for (let i = 0; i < arms * 2; i++) {
    const r = i % 2 === 0 ? size : size * 0.3;
    const angle = (Math.PI / arms) * i;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

// ===== BACKGROUND CANVAS =====
let bgParticles = [];
let bgWorld = 0;

export function initBackground(canvas, worldIdx) {
  bgWorld = worldIdx;
  bgParticles = [];
  const count = PERF === 'low' ? 8 : PERF === 'medium' ? 14 : 20;
  for (let i = 0; i < count; i++) {
    bgParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 10 + Math.random() * 20,
      speed: 0.2 + Math.random() * 0.5,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.5 + Math.random() * 1,
      wobbleAmp: 10 + Math.random() * 20,
      alpha: 0.1 + Math.random() * 0.2,
      emoji: WORLD_PARTICLES[worldIdx] || '✨',
    });
  }
}

export function updateBackground(dt, canvas) {
  for (const p of bgParticles) {
    p.y -= p.speed;
    p.wobblePhase += p.wobbleSpeed * dt;
    p.x += Math.sin(p.wobblePhase) * p.wobbleAmp * dt;
    if (p.y < -30) { p.y = canvas.height + 30; p.x = Math.random() * canvas.width; }
    if (p.x < -30) p.x = canvas.width + 30;
    if (p.x > canvas.width + 30) p.x = -30;
  }
}

export function drawBackground(ctx, canvas, worldIdx) {
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  const colors = (WORLD_GRADIENTS[worldIdx] || WORLD_GRADIENTS[0])
    .match(/#[0-9a-f]{6}/gi) || ['#86efac', '#22c55e'];
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Floating emoji
  for (const p of bgParticles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = `${p.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, p.x, p.y);
    ctx.restore();
  }
}

// ===== GEM RENDERING =====
const gemCache = new Map(); // cache rendered emojis
const SPECIAL_GLOW_COLORS = {
  [SPECIAL.ROCKET_H]: 'rgba(0,212,255,0.6)',
  [SPECIAL.ROCKET_V]: 'rgba(0,212,255,0.6)',
  [SPECIAL.BOMB]: 'rgba(255,107,53,0.6)',
  [SPECIAL.RAINBOW]: 'rgba(255,105,180,0.6)',
  [SPECIAL.NOVA]: 'rgba(255,215,0,0.7)',
  [SPECIAL.LIGHTNING]: 'rgba(255,215,0,0.6)',
  [SPECIAL.MAGIC]: 'rgba(168,85,247,0.6)',
};

export function drawGem(ctx, gem, x, y, cellSize, worldIdx, time) {
  if (!gem || gem.type < 0) return;
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const emojiSize = cellSize * 0.7;

  ctx.save();

  // Obstacle underlay
  if (gem.obstacle !== OBSTACLE.NONE) {
    drawObstacleUnder(ctx, gem, x, y, cellSize, time);
  }

  // Selection / hover glow
  if (gem._selected) {
    ctx.shadowColor = WORLD_ACCENTS[worldIdx] || '#FFD700';
    ctx.shadowBlur = 12;
  }

  // Special glow
  if (gem.special !== SPECIAL.NONE) {
    const glowColor = SPECIAL_GLOW_COLORS[gem.special];
    if (glowColor) {
      const pulse = 0.6 + Math.sin(time * 4) * 0.15;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10 * pulse;
      // Draw glow ring
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Gem emoji
  const gemPool = WORLD_GEMS[worldIdx] || WORLD_GEMS[0];
  const emoji = gemPool[gem.type] || '💎';
  ctx.font = `${emojiSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Tween transforms
  if (gem._scale !== undefined && gem._scale !== 1) {
    ctx.translate(cx, cy);
    ctx.scale(gem._scale, gem._scale);
    ctx.translate(-cx, -cy);
  }
  if (gem._alpha !== undefined) {
    ctx.globalAlpha = gem._alpha;
  }

  ctx.shadowBlur = 0;
  ctx.fillText(emoji, cx, cy);

  // Special indicator
  if (gem.special !== SPECIAL.NONE) {
    drawSpecialIndicator(ctx, gem.special, cx, cy, cellSize, time);
  }

  // Obstacle overlay
  if (gem.obstacle !== OBSTACLE.NONE) {
    drawObstacleOver(ctx, gem, x, y, cellSize, time);
  }

  // Caged indicator
  if (gem.caged) {
    ctx.strokeStyle = 'rgba(139,69,19,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    // Vertical bars
    const bars = 3;
    for (let i = 1; i <= bars; i++) {
      const bx = x + (cellSize / (bars + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(bx, y + 2);
      ctx.lineTo(bx, y + cellSize - 2);
      ctx.stroke();
    }
  }

  // Bomb timer number
  if (gem.obstacle === OBSTACLE.BOMB_TIMER && gem.bombTimer > 0) {
    ctx.font = `bold ${cellSize * 0.3}px sans-serif`;
    ctx.fillStyle = gem.bombTimer <= 3 ? '#ff0000' : '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(gem.bombTimer.toString(), cx, cy + cellSize * 0.28);
    ctx.fillText(gem.bombTimer.toString(), cx, cy + cellSize * 0.28);
  }

  ctx.restore();
}

function drawSpecialIndicator(ctx, special, cx, cy, cellSize, time) {
  const s = cellSize * 0.15;
  ctx.save();

  switch (special) {
    case SPECIAL.ROCKET_H: {
      ctx.fillStyle = '#00d4ff';
      const pulse = 1 + Math.sin(time * 6) * 0.1;
      // Left arrow
      ctx.beginPath();
      ctx.moveTo(cx - cellSize * 0.35 * pulse, cy);
      ctx.lineTo(cx - cellSize * 0.2 * pulse, cy - s);
      ctx.lineTo(cx - cellSize * 0.2 * pulse, cy + s);
      ctx.closePath();
      ctx.fill();
      // Right arrow
      ctx.beginPath();
      ctx.moveTo(cx + cellSize * 0.35 * pulse, cy);
      ctx.lineTo(cx + cellSize * 0.2 * pulse, cy - s);
      ctx.lineTo(cx + cellSize * 0.2 * pulse, cy + s);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case SPECIAL.ROCKET_V: {
      ctx.fillStyle = '#00d4ff';
      const pulse = 1 + Math.sin(time * 6) * 0.1;
      // Top arrow
      ctx.beginPath();
      ctx.moveTo(cx, cy - cellSize * 0.35 * pulse);
      ctx.lineTo(cx - s, cy - cellSize * 0.2 * pulse);
      ctx.lineTo(cx + s, cy - cellSize * 0.2 * pulse);
      ctx.closePath();
      ctx.fill();
      // Bottom arrow
      ctx.beginPath();
      ctx.moveTo(cx, cy + cellSize * 0.35 * pulse);
      ctx.lineTo(cx - s, cy + cellSize * 0.2 * pulse);
      ctx.lineTo(cx + s, cy + cellSize * 0.2 * pulse);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case SPECIAL.BOMB: {
      const rot = time * 2;
      ctx.strokeStyle = 'rgba(255,107,53,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.38, rot, rot + Math.PI * 1.5);
      ctx.stroke();
      break;
    }
    case SPECIAL.RAINBOW: {
      const colors = ['#ff0000','#ff8800','#ffff00','#00ff00','#0088ff','#8800ff'];
      const segments = colors.length;
      const r = cellSize * 0.4;
      const startAngle = time * 2;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < segments; i++) {
        ctx.strokeStyle = colors[i];
        const a1 = startAngle + (Math.PI * 2 / segments) * i;
        const a2 = a1 + Math.PI * 2 / segments;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a1, a2);
        ctx.stroke();
      }
      break;
    }
    case SPECIAL.NOVA: {
      const pulse = 0.3 + Math.abs(Math.sin(time * 3)) * 0.15;
      ctx.fillStyle = `rgba(255,215,0,${pulse})`;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.44, 0, Math.PI * 2);
      ctx.fill();
      drawStar(ctx, cx, cy, 6, cellSize * 0.42, cellSize * 0.2, 'rgba(255,215,0,0.3)');
      break;
    }
    case SPECIAL.LIGHTNING: {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      const boltSize = cellSize * 0.15;
      const offX = Math.sin(time * 8) * 2;
      ctx.beginPath();
      ctx.moveTo(cx - boltSize + offX, cy - boltSize);
      ctx.lineTo(cx + offX, cy);
      ctx.lineTo(cx - boltSize * 0.5 + offX, cy);
      ctx.lineTo(cx + boltSize + offX, cy + boltSize);
      ctx.stroke();
      break;
    }
    case SPECIAL.MAGIC: {
      const rot = time * 1.5;
      ctx.strokeStyle = 'rgba(168,85,247,0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const angle = rot + (Math.PI * 2 / 3) * i;
        const r = cellSize * 0.35;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * r * 0.3, cy + Math.sin(angle) * r * 0.3, r * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}

// ===== OBSTACLE RENDERING =====
function drawObstacleUnder(ctx, gem, x, y, cellSize, time) {
  ctx.save();

  switch (gem.obstacle) {
    case OBSTACLE.ICE_1:
    case OBSTACLE.ICE_2: {
      const layers = gem.obstacle === OBSTACLE.ICE_2 ? 2 : 1;
      ctx.fillStyle = layers === 2
        ? 'rgba(180,220,255,0.55)'
        : 'rgba(200,230,255,0.35)';
      roundRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, 6);
      ctx.fill();
      // Ice cracks
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + cellSize * 0.3, y + cellSize * 0.2);
      ctx.lineTo(x + cellSize * 0.5, y + cellSize * 0.5);
      ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.35);
      ctx.stroke();
      if (layers === 2) {
        ctx.beginPath();
        ctx.moveTo(x + cellSize * 0.2, y + cellSize * 0.6);
        ctx.lineTo(x + cellSize * 0.5, y + cellSize * 0.5);
        ctx.lineTo(x + cellSize * 0.4, y + cellSize * 0.8);
        ctx.stroke();
      }
      break;
    }
    case OBSTACLE.DARK: {
      ctx.fillStyle = 'rgba(30,30,50,0.7)';
      roundRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, 6);
      ctx.fill();
      // 눈 icons
      ctx.font = `${cellSize * 0.25}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌑', x + cellSize / 2, y + cellSize / 2);
      break;
    }
    case OBSTACLE.SHADOW: {
      const pulse = 0.4 + Math.sin(time * 2) * 0.1;
      ctx.fillStyle = `rgba(50,0,80,${pulse})`;
      roundRect(ctx, x, y, cellSize, cellSize, 6);
      ctx.fill();
      break;
    }
    case OBSTACLE.PORTAL_IN:
    case OBSTACLE.PORTAL_OUT: {
      const isIn = gem.obstacle === OBSTACLE.PORTAL_IN;
      const rot = time * (isIn ? 2 : -2);
      ctx.strokeStyle = isIn ? 'rgba(0,200,255,0.5)' : 'rgba(255,100,200,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.42, rot, rot + Math.PI * 1.5);
      ctx.stroke();
      break;
    }
    case OBSTACLE.CONVEYOR_U:
    case OBSTACLE.CONVEYOR_D: {
      const isUp = gem.obstacle === OBSTACLE.CONVEYOR_U;
      ctx.fillStyle = 'rgba(100,100,100,0.3)';
      roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,200,200,0.6)';
      ctx.font = `${cellSize * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isUp ? '⬆' : '⬇', x + cellSize / 2, y + cellSize / 2 + cellSize * 0.3);
      break;
    }
  }

  ctx.restore();
}

function drawObstacleOver(ctx, gem, x, y, cellSize, time) {
  ctx.save();

  switch (gem.obstacle) {
    case OBSTACLE.CHAIN: {
      ctx.strokeStyle = 'rgba(150,150,150,0.8)';
      ctx.lineWidth = 2.5;
      // Chain links
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      const r = cellSize * 0.35;
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.3, cy, r * 0.4, r * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.3, cy, r * 0.4, r * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case OBSTACLE.STONE: {
      ctx.fillStyle = '#888';
      roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 8);
      ctx.fill();
      // HP indicator
      if (gem.obstacleHP > 0) {
        ctx.fillStyle = '#555';
        ctx.font = `bold ${cellSize * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪨', x + cellSize / 2, y + cellSize / 2);
        if (gem.obstacleHP > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${cellSize * 0.2}px sans-serif`;
          ctx.fillText(gem.obstacleHP.toString(), x + cellSize / 2, y + cellSize * 0.8);
        }
      }
      break;
    }
    case OBSTACLE.LOCK: {
      ctx.fillStyle = 'rgba(139,69,19,0.6)';
      ctx.font = `${cellSize * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', x + cellSize / 2, y + cellSize * 0.82);
      break;
    }
    case OBSTACLE.BOMB_TIMER: {
      const pulse = gem.bombTimer <= 3 ? (1 + Math.sin(time * 8) * 0.1) : 1;
      ctx.strokeStyle = gem.bombTimer <= 3 ? 'rgba(255,0,0,0.6)' : 'rgba(255,165,0,0.4)';
      ctx.lineWidth = 2 * pulse;
      roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 6);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ===== GRID RENDERING =====
export function drawGrid(ctx, grid, rows, cols, offsetX, offsetY, cellSize, worldIdx, time) {
  // Grid background
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  roundRect(ctx, offsetX - 4, offsetY - 4, cols * cellSize + 8, rows * cellSize + 8, 12);
  ctx.fill();

  // Cell backgrounds
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;

      // Checkerboard
      ctx.fillStyle = (r + c) % 2 === 0
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(255,255,255,0.06)';
      roundRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
      ctx.fill();
    }
  }

  // Draw gems
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = grid[r][c];
      if (!gem) continue;
      const drawX = gem._drawX ?? (offsetX + c * cellSize);
      const drawY = gem._drawY ?? (offsetY + r * cellSize);
      drawGem(ctx, gem, drawX, drawY, cellSize, worldIdx, time);
    }
  }
}

// ===== HUD =====
export function drawHUD(ctx, state, canvasWidth) {
  // Score, moves, combo overlays are handled by DOM HUD
  // This draws game-canvas overlays only

  // Hint highlight
  if (state.hintMove) {
    const { from, to } = state.hintMove;
    const cellSize = state.cellSize;
    const ox = state.offsetX;
    const oy = state.offsetY;
    const time = state.time;
    const pulse = 0.5 + Math.sin(time * 4) * 0.3;
    ctx.save();
    ctx.strokeStyle = `rgba(255,215,0,${pulse})`;
    ctx.lineWidth = 3;
    roundRect(ctx, ox + from.col * cellSize + 2, oy + from.row * cellSize + 2, cellSize - 4, cellSize - 4, 6);
    ctx.stroke();
    roundRect(ctx, ox + to.col * cellSize + 2, oy + to.row * cellSize + 2, cellSize - 4, cellSize - 4, 6);
    ctx.stroke();
    ctx.restore();
  }

  // Selection highlight
  if (state.selected) {
    const { row, col } = state.selected;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    roundRect(ctx, state.offsetX + col * state.cellSize + 1, state.offsetY + row * state.cellSize + 1, state.cellSize - 2, state.cellSize - 2, 6);
    ctx.stroke();
    ctx.restore();
  }
}

// ===== SWIPE VISUAL =====
export function drawSwipeLine(ctx, fromX, fromY, toX, toY) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

// ===== BOSS RENDERING =====
export function drawBossOverlay(ctx, boss, canvasWidth, offsetY, time) {
  if (!boss || !boss.active) return;

  // Boss emoji
  const bx = canvasWidth / 2;
  const by = offsetY - 40;
  const wobble = Math.sin(time * 2) * 5;
  const shake = boss.isAttacking ? (Math.random() - 0.5) * 6 : 0;

  ctx.save();
  ctx.font = `${boss.defeated ? 30 : 40}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (boss.defeated) {
    ctx.globalAlpha = 0.3;
  }
  ctx.fillText(boss.emoji, bx + shake, by + wobble);
  ctx.restore();

  // HP bar is rendered by DOM HUD
  // Attack warning flash
  if (boss.isAttacking) {
    ctx.save();
    ctx.fillStyle = `rgba(255,0,0,${0.1 + Math.sin(time * 10) * 0.08})`;
    ctx.fillRect(0, 0, canvasWidth, canvasWidth);
    ctx.restore();
  }
}

// ===== LEVEL COMPLETE EFFECTS =====
export function spawnLevelCompleteEffects(canvasWidth, canvasHeight) {
  const colors = ['#FFD700', '#ff6b6b', '#00d4ff', '#4ade80', '#f472b6', '#a78bfa'];
  for (let i = 0; i < 40; i++) {
    spawnParticle(
      Math.random() * canvasWidth,
      canvasHeight + 20,
      {
        vx: (Math.random() - 0.5) * 6,
        vy: -8 - Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.5 ? 'star' : 'sparkle',
        size: 6 + Math.random() * 10,
        life: 1.5 + Math.random() * 0.5,
        gravity: 4,
      }
    );
  }
}

export function spawnBossDefeatEffects(cx, cy) {
  spawnBurst(cx, cy, 20, { color: '#FFD700', type: 'star', size: 12, life: 1, speed: 6 });
  spawnBurst(cx, cy, 15, { color: '#ff6b6b', type: 'sparkle', size: 8, life: 0.8, speed: 4 });
  for (let i = 0; i < 5; i++) {
    spawnComboText(cx + (Math.random() - 0.5) * 60, cy + (Math.random() - 0.5) * 40, '⭐');
  }
}

// ===== SCREEN TRANSITION =====
let transitionAlpha = 0;
let transitionDir = 0; // 0 = none, 1 = fade out, -1 = fade in

export function startFadeOut(onMid) {
  transitionAlpha = 0;
  transitionDir = 1;
  const checkFade = setInterval(() => {
    if (transitionAlpha >= 1) {
      clearInterval(checkFade);
      if (onMid) onMid();
      transitionDir = -1;
    }
  }, 16);
}

export function updateTransition(dt) {
  if (transitionDir !== 0) {
    transitionAlpha += transitionDir * dt * 3;
    if (transitionAlpha <= 0) { transitionAlpha = 0; transitionDir = 0; }
    if (transitionAlpha > 1) transitionAlpha = 1;
  }
}

export function drawTransition(ctx, w, h) {
  if (transitionAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${transitionAlpha})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

export function isTransitioning() { return transitionDir !== 0; }

// ===== LAYOUT CALCULATOR =====
export function calcLayout(canvasWidth, canvasHeight, rows, cols) {
  const maxCellW = Math.floor((canvasWidth - 16) / cols);
  const maxCellH = Math.floor((canvasHeight - 80) / rows); // leave space for HUD
  const cellSize = Math.min(maxCellW, maxCellH, 56); // cap at 56px
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;
  const offsetX = Math.floor((canvasWidth - gridW) / 2);
  const offsetY = Math.floor((canvasHeight - gridH) / 2) + 20;
  return { cellSize, offsetX, offsetY, gridW, gridH };
}

// ===== CANVAS SETUP =====
export function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width: rect.width, height: rect.height, dpr };
}

// ===== ANIMATION HELPERS =====
export function pulseValue(time, speed, min, max) {
  return min + (max - min) * (0.5 + 0.5 * Math.sin(time * speed));
}

export function shakeValue(time, intensity) {
  return (Math.random() - 0.5) * intensity * 2;
}

// ===== Gem Kingdom 💎 — Core Game Controller =====
// State machine, game loop, input handlers, screen management, postMessage
// Central orchestrator — wires all modules together

import {
  LANG, BOARD, TIMING, SCORING, XP, SPECIAL, OBSTACLE,
  WORLD_GEMS, WORLD_GRADIENTS, WORLD_ACCENTS, WORLD_NAMES, WORLD_ICONS, WORLD_MASCOTS,
  WORLD_MASCOT_NAMES, ACHIEVEMENTS, KEYS,
  t, loadProgress, saveProgress, createDefaultProgress,
} from './config.js';

import {
  initGrid, swapGems, areAdjacent, findMatches, getSpecials,
  processMatches, applyGravity, spawnNewGems, hasValidMoves,
  shuffleGrid, findBestMove, tickBombTimers, calcComboMultiplier,
  calcStars, createObjectiveTracker, updateObjectives, objectivesComplete,
  getPowerCombo, getPowerComboClearPositions, getSpecialClearPositions,
  nextId, createGem, shuffle,
} from './engine.js';

import {
  setupCanvas, calcLayout, detectPerformance, getPerf,
  drawBackground, drawGrid, drawHUD, drawParticles, drawTransition, drawBossOverlay,
  updateParticles, updateTweens, updateBackground, updateTransition,
  addTween, hasTweens, clearTweens, clearParticles,
  initBackground, spawnBurst, spawnEmojiBurst, spawnStarBurst,
  spawnComboText, spawnSpecialActivation, spawnLevelCompleteEffects, spawnBossDefeatEffects,
  spawnRocketTrail, drawSwipeLine, startFadeOut, isTransitioning,
} from './ui.js';

// ===== REPORTS =====
let REPORTS = null;

async function loadReports() {
  try {
    const mod = await import('./reports.js');
    REPORTS = mod;
  } catch (e) { /* optional */ }
}

// ===== STATE =====
const S = {
  screen: 'world', // 'world', 'level', 'game', 'done', 'shop', 'achieve', 'stats'
  prevScreen: 'world',
  progress: null,
  currentWorld: 0,
  currentLevel: 0,
  winStreak: 0,
  // Game state
  grid: null,
  rows: 8,
  cols: 8,
  gemCount: 7,
  phase: 'idle', // 'idle','selecting','swapping','removing','falling','checking','gameover','paused','boss_attack'
  selected: null,
  score: 0,
  movesLeft: 0,
  combo: 0,
  maxCombo: 0,
  totalGemsRemoved: 0,
  specialsUsed: 0,
  objectiveTracker: [],
  levelDef: null,
  // Boss
  boss: null,
  playerHP: 5,
  // Input
  touchStart: null,
  isDragging: false,
  swipeFrom: null,
  swipeTo: null,
  // Hint
  hintTimer: 0,
  hintMove: null,
  hintUsed: false,
  // Layout
  cellSize: 0,
  offsetX: 0,
  offsetY: 0,
  canvasW: 0,
  canvasH: 0,
  // Timing
  time: 0,
  dt: 0,
  lastTime: 0,
  // Level results
  stars: 0,
  coinsEarned: 0,
  badges: [],
  // Booster state
  activeBooster: null,
  // Animation queue
  animQueue: [],
  processing: false,
  // Muted
  muted: false,
  // Level start time
  levelStartTime: 0,
};

// ===== WORLDS / LEVELS =====
let WORLDS = null; // loaded dynamically

async function loadWorlds() {
  if (WORLDS) return WORLDS;
  try {
    const mod = await import('./worlds.js');
    WORLDS = mod.WORLDS;
  } catch (e) {
    console.warn('worlds.js not loaded, using placeholder');
    WORLDS = generatePlaceholderWorlds();
  }
  return WORLDS;
}

function generatePlaceholderWorlds() {
  const worlds = [];
  for (let w = 0; w < 10; w++) {
    const levels = [];
    for (let l = 0; l < 10; l++) {
      levels.push({
        rows: 8, cols: 8, gemCount: Math.min(5 + Math.floor(w / 2), 7),
        moves: Math.max(25 - w, 15),
        starThresholds: [500 + w * 200 + l * 100, 1000 + w * 300 + l * 150, 2000 + w * 400 + l * 200],
        objectives: [{ type: 'score', target: 500 + w * 200 + l * 100 }],
        obstacles: [],
        isBoss: l === 9,
        isMiniBoss: l === 4,
      });
    }
    worlds.push(levels);
  }
  return worlds;
}

// ===== BOSS SYSTEM =====
let BOSSES = null;

async function loadBoss(worldIdx, levelIdx) {
  if (!BOSSES) {
    try {
      const mod = await import('./boss.js');
      BOSSES = mod;
    } catch (e) {
      console.warn('boss.js not loaded');
      return null;
    }
  }
  return BOSSES.createBoss(worldIdx, levelIdx);
}

// ===== AUDIO =====
let AUDIO = null;

async function loadAudio() {
  if (AUDIO) return AUDIO;
  try {
    const mod = await import('./audio.js');
    AUDIO = mod;
    return AUDIO;
  } catch (e) {
    console.warn('audio.js not loaded');
    return null;
  }
}

function playSound(name) {
  if (S.muted || !AUDIO) return;
  try { AUDIO.play(name); } catch (e) { /* silent */ }
}

// ===== INTELLIGENCE =====
let INTEL = null;

async function loadIntelligence() {
  try {
    const mod = await import('./intelligence.js');
    INTEL = mod;
  } catch (e) { /* optional */ }
}

// ===== STORY =====
let STORY = null;

async function loadStory() {
  try {
    const mod = await import('./story.js');
    STORY = mod;
  } catch (e) { /* optional */ }
}

// ===== ECONOMY =====
let ECONOMY = null;

async function loadEconomy() {
  try {
    const mod = await import('./economy.js');
    ECONOMY = mod;
  } catch (e) { /* optional */ }
}

// ===== ENGAGEMENT =====
let ENGAGE = null;

async function loadEngagement() {
  try {
    const mod = await import('./engagement.js');
    ENGAGE = mod;
  } catch (e) { /* optional */ }
}

// ===== INIT =====
export async function initGame() {
  detectPerformance();

  S.progress = loadProgress();
  S.muted = localStorage.getItem(KEYS.MUTED) === 'true';

  // Set direction
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';

  // Load optional modules in parallel
  await Promise.allSettled([loadWorlds(), loadAudio(), loadIntelligence(), loadStory(), loadEconomy(), loadEngagement(), loadReports()]);

  setupEventListeners();
  showScreen('world');

  // Start render loop
  S.lastTime = performance.now();
  requestAnimationFrame(gameLoop);

  // Check daily reward
  checkDailyReward();

  // Comeback message
  if (ENGAGE && S.progress.lastPlayTimestamp) {
    const hoursSince = (Date.now() - S.progress.lastPlayTimestamp) / 3600000;
    const comebackMsg = ENGAGE.getComebackMessage(hoursSince);
    if (comebackMsg) {
      const toast = qs('#comeback-toast');
      if (toast) {
        toast.querySelector('.comeback-text').textContent = comebackMsg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
      }
    }
  }
}

// ===== GAME LOOP =====
function gameLoop(now) {
  S.dt = Math.min((now - S.lastTime) / 1000, 0.1); // cap at 100ms
  S.lastTime = now;
  S.time += S.dt;

  if (S.screen === 'game') {
    updateGame();
    renderGame();
  }

  requestAnimationFrame(gameLoop);
}

// ===== UPDATE =====
function updateGame() {
  updateTweens(S.dt);
  updateParticles(S.dt);
  updateTransition(S.dt);

  // Background
  const bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas) updateBackground(S.dt, bgCanvas);

  // Hint timer
  if (S.phase === 'idle' && !S.hintMove) {
    S.hintTimer += S.dt;
    if (S.hintTimer >= 5) {
      S.hintMove = findBestMove(S.grid, S.rows, S.cols);
      S.hintTimer = 0;
    }
  }

  // Process animation queue
  if (!S.processing && S.animQueue.length > 0) {
    const next = S.animQueue.shift();
    next();
  }
}

// ===== RENDER =====
function renderGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.clearRect(0, 0, w, h);

  if (S.grid) {
    drawGrid(ctx, S.grid, S.rows, S.cols, S.offsetX, S.offsetY, S.cellSize, S.currentWorld, S.time);
  }

  // HUD overlays
  drawHUD(ctx, {
    hintMove: S.hintMove,
    selected: S.selected,
    cellSize: S.cellSize,
    offsetX: S.offsetX,
    offsetY: S.offsetY,
    time: S.time,
  }, w);

  // Swipe line
  if (S.isDragging && S.swipeFrom && S.swipeTo) {
    drawSwipeLine(ctx, S.swipeFrom.x, S.swipeFrom.y, S.swipeTo.x, S.swipeTo.y);
  }

  // Boss
  if (S.boss) {
    drawBossOverlay(ctx, S.boss, w, S.offsetY, S.time);
  }

  drawParticles(ctx);
  drawTransition(ctx, w, h);
}

// ===== RENDER BACKGROUND =====
function renderBackground() {
  const bgCanvas = document.getElementById('bg-canvas');
  if (!bgCanvas) return;
  const { ctx, width, height } = setupCanvas(bgCanvas);
  drawBackground(ctx, bgCanvas, S.currentWorld);
}

// ===== SCREEN MANAGEMENT =====
function showScreen(name) {
  S.prevScreen = S.screen;
  S.screen = name;

  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'fade-in');
  });

  const screenMap = {
    world: 'world-screen',
    level: 'lvl-screen',
    game: 'game-screen',
    done: 'done-screen',
    shop: 'shop-screen',
    achieve: 'achieve-screen',
    stats: 'stats-screen',
  };

  const el = document.getElementById(screenMap[name]);
  if (el) {
    el.classList.add('active', 'fade-in');
  }

  // Render screen content
  switch (name) {
    case 'world': renderWorldScreen(); break;
    case 'level': renderLevelScreen(); break;
    case 'game': startLevel(); break;
    case 'done': renderDoneScreen(); break;
    case 'shop': renderShopScreen(); break;
    case 'achieve': renderAchieveScreen(); break;
    case 'stats': renderStatsScreen(); { const sb = qs('#report-send'); if (sb) { sb.textContent = '📤 إرسال للوالدين'; sb.classList.remove('sent'); } } break;
  }
}

// ===== WORLD SELECT =====
function renderWorldScreen() {
  const p = S.progress;
  const nameKey = LANG === 'pt' ? 'pt' : LANG === 'ar' ? 'ar' : 'en';

  // Update HUD
  qs('#ws-coins span').textContent = p.coins;
  qs('#ws-gems span').textContent = p.premiumGems;
  qs('#ws-level span').textContent = `Lv.${p.playerLevel}`;
  qs('#mute-btn').textContent = S.muted ? '🔇' : '🔊';

  // XP bar
  const xpForLevel = Math.floor(XP.LEVEL_UP_BASE * Math.pow(XP.LEVEL_UP_SCALE, p.playerLevel - 1));
  const xpInLevel = p.totalXP % xpForLevel;
  qs('#ws-xp-fill').style.width = `${(xpInLevel / xpForLevel) * 100}%`;
  qs('#ws-xp-label').textContent = `${xpInLevel}/${xpForLevel} XP`;

  qs('#ws-title').textContent = t('title');
  qs('#ws-sub').textContent = t('subtitle');

  // World grid
  const grid = qs('#world-grid');
  grid.innerHTML = '';

  for (let w = 0; w < 10; w++) {
    const worldStars = getWorldStars(w);
    const totalPossible = 30; // 10 levels × 3 stars
    const prevStars = w === 0 ? Infinity : getWorldStars(w - 1);
    const isUnlocked = w === 0 || prevStars >= 15; // Need 15 stars from prev world
    const names = WORLD_NAMES[nameKey] || WORLD_NAMES.en;

    const card = document.createElement('div');
    card.className = `wc ${isUnlocked ? '' : 'locked'}`;
    card.style.background = WORLD_GRADIENTS[w];
    card.innerHTML = `
      <div class="wc-mascot">${WORLD_MASCOTS[w]}</div>
      <div class="wc-icon">${WORLD_ICONS[w]}</div>
      <div class="wc-name">${names[w]}</div>
      <div class="wc-stars">⭐ ${worldStars}/${totalPossible}</div>
      ${!isUnlocked ? `<div class="wc-lock">
        <div class="wc-lock-icon">🔒</div>
        <div class="wc-lock-text">${t('unlockReq', { n: 15, w: names[w-1] || '' })}</div>
      </div>` : ''}
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => {
        S.currentWorld = w;
        showScreen('level');
        playSound('tap');
      });
    }

    grid.appendChild(card);
  }
}

// ===== LEVEL SELECT =====
function renderLevelScreen() {
  const w = S.currentWorld;
  const nameKey = LANG === 'pt' ? 'pt' : LANG === 'ar' ? 'ar' : 'en';
  const names = WORLD_NAMES[nameKey] || WORLD_NAMES.en;

  // Set background
  const el = qs('#lvl-screen');
  el.style.background = WORLD_GRADIENTS[w];

  qs('#lvl-title').textContent = `${WORLD_ICONS[w]} ${names[w]}`;
  qs('#lvl-mascot').textContent = WORLD_MASCOTS[w];

  // XP bar
  const p = S.progress;
  const xpForLevel = Math.floor(XP.LEVEL_UP_BASE * Math.pow(XP.LEVEL_UP_SCALE, p.playerLevel - 1));
  const xpInLevel = p.totalXP % xpForLevel;
  qs('#lvl-xp-fill').style.width = `${(xpInLevel / xpForLevel) * 100}%`;
  qs('#lvl-xp-label').textContent = `${xpInLevel}/${xpForLevel} XP`;

  const grid = qs('#lvl-grid');
  grid.innerHTML = '';

  const worldLevels = WORLDS?.[w] || [];
  const worldProgress = p.worlds[w] || {};

  for (let l = 0; l < 10; l++) {
    const level = worldLevels[l];
    const stars = worldProgress.stars?.[l] ?? 0;
    const prevStars = l === 0 ? 1 : (worldProgress.stars?.[l-1] ?? 0);
    const isUnlocked = l === 0 || prevStars > 0;
    const isBoss = level?.isBoss;
    const isMiniBoss = level?.isMiniBoss;

    const card = document.createElement('div');
    card.className = `lc ${isUnlocked ? '' : 'locked'} ${isBoss ? 'boss' : ''} ${isMiniBoss ? 'mini-boss' : ''} ${isUnlocked && stars === 0 ? 'current' : ''}`;

    const gemPool = WORLD_GEMS[w];
    const levelEmoji = isBoss ? '👿' : isMiniBoss ? '😈' : (gemPool[l % gemPool.length] || '💎');
    const starStr = stars > 0 ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '';

    card.innerHTML = `
      <div class="lc-num">${l + 1}</div>
      <div class="lc-emoji">${levelEmoji}</div>
      <div class="lc-stars">${starStr || (isUnlocked ? '' : '')}</div>
      ${!isUnlocked ? `<div class="lc-lock">🔒</div>` : ''}
      ${isBoss ? `<div class="lc-boss-icon">👑</div>` : ''}
      ${isMiniBoss ? `<div class="lc-boss-icon">⚔️</div>` : ''}
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => {
        S.currentLevel = l;
        showScreen('game');
        playSound('tap');
      });
    }

    grid.appendChild(card);
  }
}

// ===== START LEVEL =====
async function startLevel() {
  const w = S.currentWorld;
  const l = S.currentLevel;
  const worldLevels = WORLDS?.[w];
  const levelDef = worldLevels?.[l] || { rows: 8, cols: 8, gemCount: 6, moves: 25, starThresholds: [500, 1000, 2000], objectives: [{ type: 'score', target: 500 }], obstacles: [] };

  S.levelDef = levelDef;
  S.rows = levelDef.rows;
  S.cols = levelDef.cols;
  S.gemCount = levelDef.gemCount;
  S.movesLeft = levelDef.moves;
  S.score = 0;
  S.combo = 0;
  S.maxCombo = 0;
  S.totalGemsRemoved = 0;
  S.specialsUsed = 0;
  S.selected = null;
  S.phase = 'idle';
  S.hintTimer = 0;
  S.hintMove = null;
  S.hintUsed = false;
  S.stars = 0;
  S.coinsEarned = 0;
  S.badges = [];
  S.activeBooster = null;
  S.animQueue = [];
  S.processing = false;
  S.playerHP = 5;
  S.levelStartTime = Date.now();

  clearTweens();
  clearParticles();

  // Init grid
  S.grid = initGrid(S.rows, S.cols, S.gemCount, levelDef.obstacles || []);
  S.objectiveTracker = createObjectiveTracker(levelDef.objectives || []);

  // Boss?
  S.boss = null;
  if (levelDef.isBoss || levelDef.isMiniBoss) {
    S.boss = await loadBoss(w, l);
    if (!S.boss) {
      // Fallback boss
      S.boss = {
        active: true, defeated: false,
        emoji: levelDef.isBoss ? '🐲' : '😈',
        name: levelDef.isBoss ? t('worldBoss') : t('miniBoss'),
        hp: levelDef.isBoss ? 300 : 100,
        maxHP: levelDef.isBoss ? 300 : 100,
        phase: 1, maxPhase: levelDef.isBoss ? 3 : 1,
        attackInterval: 4, attackTimer: 4,
        isAttacking: false,
      };
    }
  }

  // Setup canvas
  const gameScreen = qs('#game-screen');
  gameScreen.style.background = WORLD_GRADIENTS[w];

  setupGameCanvas();
  initBackground(document.getElementById('bg-canvas'), w);
  renderBackground();

  // Update HUD
  updateGameHUD();

  // Boss bar
  updateBossBar();

  // Render objectives
  renderObjectives();

  // Render boosters
  renderBoosters();

  // Story intro?
  if (STORY && l === 0) {
    const dialog = STORY.getWorldIntro(w);
    if (dialog) showStoryDialog(dialog);
  }

  // DDA adjustment
  if (INTEL) {
    const adj = INTEL.getLevelAdjustment(S.progress, w, l);
    if (adj) {
      S.movesLeft += adj.extraMoves || 0;
      // Could also adjust gem count, etc.
    }
  }
}

function setupGameCanvas() {
  const canvas = document.getElementById('game-canvas');
  const wrap = canvas.parentElement;
  const rect = wrap.getBoundingClientRect();

  // Size canvas to available space
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  S.canvasW = rect.width;
  S.canvasH = rect.height;

  // Calc layout
  const layout = calcLayout(rect.width, rect.height, S.rows, S.cols);
  S.cellSize = layout.cellSize;
  S.offsetX = layout.offsetX;
  S.offsetY = layout.offsetY;

  // Set bg canvas size
  const bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas) {
    bgCanvas.style.width = '100%';
    bgCanvas.style.height = '100%';
    bgCanvas.width = rect.width * dpr;
    bgCanvas.height = rect.height * dpr;
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.scale(dpr, dpr);
  }
}

// ===== GAME HUD =====
function updateGameHUD() {
  const nameKey = LANG === 'pt' ? 'pt' : LANG === 'ar' ? 'ar' : 'en';
  const names = WORLD_NAMES[nameKey] || WORLD_NAMES.en;

  qs('#g-title').textContent = `${WORLD_ICONS[S.currentWorld]} ${names[S.currentWorld]}`;
  qs('#g-level').textContent = `${t('level')} ${S.currentLevel + 1}`;
  qs('#g-score').textContent = S.score;
  qs('#g-score-label').textContent = t('score');
  qs('#g-moves').textContent = S.movesLeft;
  qs('#g-moves-label').textContent = t('moves');

  // Danger state
  const movesEl = qs('#g-moves');
  if (S.movesLeft <= 3) movesEl.classList.add('danger');
  else movesEl.classList.remove('danger');

  // Combo
  const comboEl = qs('#g-combo');
  if (S.combo >= 2) {
    comboEl.textContent = `🔥 ${t('combo')} ×${S.combo}`;
    comboEl.style.display = '';
  } else {
    comboEl.style.display = 'none';
  }

  // Objectives
  renderObjectives();
}

function renderObjectives() {
  const el = qs('#g-obj');
  el.innerHTML = '';
  for (const obj of S.objectiveTracker) {
    const done = obj.current >= obj.target;
    const item = document.createElement('div');
    item.className = `g-obj-item ${done ? 'done' : ''}`;
    item.textContent = getObjectiveText(obj) + ` ${obj.current}/${obj.target}`;
    el.appendChild(item);
  }
}

function getObjectiveText(obj) {
  switch (obj.type) {
    case 'score': return '🎯';
    case 'collect': return obj.gem || '💎';
    case 'breakIce': return '❄️';
    case 'freeCaged': return '🔓';
    case 'lightTiles': return '💡';
    case 'cascade': return '🔥';
    case 'useSpecial': return '🌟';
    case 'clearBottom': return '⬇️';
    case 'defuse': return '💣';
    case 'boss': return '⚔️';
    default: return '🎯';
  }
}

function updateBossBar() {
  const bar = qs('#boss-bar');
  if (!S.boss || !S.boss.active) {
    bar.classList.remove('active');
    return;
  }
  bar.classList.add('active');
  qs('#boss-emoji').textContent = S.boss.emoji;
  qs('#boss-name').textContent = S.boss.name;
  qs('#boss-phase').textContent = S.boss.maxPhase > 1 ? t('bossPhase', { n: S.boss.phase }) : '';
  qs('#boss-hp-fill').style.width = `${(S.boss.hp / S.boss.maxHP) * 100}%`;

  // Player hearts
  const hpEl = qs('#player-hp');
  hpEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const heart = document.createElement('span');
    heart.className = `player-heart ${i >= S.playerHP ? 'lost' : ''}`;
    heart.textContent = '❤️';
    hpEl.appendChild(heart);
  }
}

function renderBoosters() {
  const el = qs('#g-boosters');
  el.innerHTML = '';
  const boosters = [
    { key: 'hammer', emoji: '🔨', name: t('boosterHammer') },
    { key: 'shuffle', emoji: '🔀', name: t('boosterShuffle') },
    { key: 'extraMoves', emoji: '➕', name: t('boosterMoves') },
  ];

  for (const b of boosters) {
    const count = S.progress.boosters[b.key] || 0;
    const btn = document.createElement('button');
    btn.className = `g-booster ${count === 0 ? 'empty' : ''}`;
    btn.innerHTML = `${b.emoji}${count > 0 ? `<span class="count">${count}</span>` : ''}`;
    btn.title = b.name;
    if (count > 0) {
      btn.addEventListener('click', () => useBooster(b.key));
    }
    el.appendChild(btn);
  }
}

// ===== INPUT HANDLERS =====
function setupEventListeners() {
  // World screen buttons
  qs('#btn-shop').addEventListener('click', () => showScreen('shop'));
  qs('#btn-achieve').addEventListener('click', () => showScreen('achieve'));
  qs('#btn-stats').addEventListener('click', () => showScreen('stats'));
  qs('#btn-daily').addEventListener('click', () => showDailyReward());
  qs('#mute-btn').addEventListener('click', toggleMute);

  // Level back
  qs('#lvl-back').addEventListener('click', () => { showScreen('world'); playSound('tap'); });

  // Game back
  qs('#g-back').addEventListener('click', () => {
    showScreen('level');
    playSound('tap');
  });

  // Navigation backs
  qs('#shop-back').addEventListener('click', () => showScreen('world'));
  qs('#ach-back').addEventListener('click', () => showScreen('world'));
  qs('#stats-back').addEventListener('click', () => showScreen('world'));
  qs('#report-send').addEventListener('click', () => {
    if (REPORTS) {
      try {
        const report = REPORTS.generateFullReport(S.progress);
        window.parent.postMessage(report, '*');
      } catch(e) {}
    }
    const btn = qs('#report-send');
    btn.textContent = '✅ تم الإرسال';
    btn.classList.add('sent');
  });

  // Game canvas input
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerUp, { passive: false });
  canvas.addEventListener('pointercancel', onPointerUp, { passive: false });

  // Prevent context menu on game
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Resize
  window.addEventListener('resize', () => {
    if (S.screen === 'game') setupGameCanvas();
  });
}

function getGridPos(clientX, clientY) {
  const canvas = document.getElementById('game-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const col = Math.floor((x - S.offsetX) / S.cellSize);
  const row = Math.floor((y - S.offsetY) / S.cellSize);
  if (row >= 0 && row < S.rows && col >= 0 && col < S.cols) {
    return { row, col, x, y };
  }
  return null;
}

function onPointerDown(e) {
  if (S.phase !== 'idle' || isTransitioning()) return;
  e.preventDefault();

  const pos = getGridPos(e.clientX, e.clientY);
  if (!pos) return;

  // Booster mode
  if (S.activeBooster) {
    applyBooster(S.activeBooster, pos.row, pos.col);
    S.activeBooster = null;
    return;
  }

  S.touchStart = pos;
  S.isDragging = true;
  S.swipeFrom = { x: pos.x, y: pos.y };
  S.swipeTo = { x: pos.x, y: pos.y };

  // Selection
  const gem = S.grid[pos.row]?.[pos.col];
  if (!gem) return;

  if (S.selected) {
    // Try swap
    if (areAdjacent(S.selected, pos)) {
      trySwap(S.selected, pos);
      S.selected = null;
    } else {
      S.selected = { row: pos.row, col: pos.col };
    }
  } else {
    S.selected = { row: pos.row, col: pos.col };
  }

  S.hintMove = null;
  S.hintTimer = 0;
}

function onPointerMove(e) {
  if (!S.isDragging || S.phase !== 'idle') return;
  e.preventDefault();

  const pos = getGridPos(e.clientX, e.clientY);
  if (pos) S.swipeTo = { x: pos.x, y: pos.y };

  if (!S.touchStart) return;

  const dx = e.clientX - (S.touchStart.x + document.getElementById('game-canvas').getBoundingClientRect().left);
  const dy = e.clientY - (S.touchStart.y + document.getElementById('game-canvas').getBoundingClientRect().top);
  // Wait for actual swipe (at least half cell)
  // Use raw pixel delta
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const threshold = S.cellSize * 0.3;

  if (absDx > threshold || absDy > threshold) {
    let dir;
    if (absDx > absDy) dir = dx > 0 ? { row: 0, col: 1 } : { row: 0, col: -1 };
    else dir = dy > 0 ? { row: 1, col: 0 } : { row: -1, col: 0 };

    // Swap with swipe heuristic
    const target = {
      row: S.touchStart.row + dir.row,
      col: S.touchStart.col + dir.col,
    };
    if (target.row >= 0 && target.row < S.rows && target.col >= 0 && target.col < S.cols) {
      trySwap(S.touchStart, target);
      S.selected = null;
    }
    S.isDragging = false;
    S.touchStart = null;
  }
}

function onPointerUp(e) {
  S.isDragging = false;
  S.touchStart = null;
}

// ===== SWAP & MATCH =====
async function trySwap(a, b) {
  if (S.phase !== 'idle') return;
  S.phase = 'swapping';
  S.hintMove = null;

  const gemA = S.grid[a.row][a.col];
  const gemB = S.grid[b.row][b.col];
  if (!gemA || !gemB) { S.phase = 'idle'; return; }

  // Check for power combo (two specials swapped)
  const comboType = (gemA.special !== SPECIAL.NONE && gemB.special !== SPECIAL.NONE)
    ? getPowerCombo(gemA.special, gemB.special) : null;

  // Animate swap
  await animateSwap(a, b);

  if (comboType) {
    // Power combo!
    playSound('powerCombo');
    S.movesLeft--;
    spawnSpecialActivation(
      S.offsetX + b.col * S.cellSize + S.cellSize / 2,
      S.offsetY + b.row * S.cellSize + S.cellSize / 2,
      gemB.special
    );
    const clearPos = getPowerComboClearPositions(comboType, b.row, b.col, S.grid, S.rows, S.cols);
    await clearPositions(clearPos, true);
    S.progress.totalPowerCombos++;
    await cascadeLoop();
    return;
  }

  // Rainbow + normal gem: target that gem's type
  if (gemA.special === SPECIAL.RAINBOW && gemB.special === SPECIAL.NONE) {
    gemA._rainbowTarget = gemB.type;
  } else if (gemB.special === SPECIAL.RAINBOW && gemA.special === SPECIAL.NONE) {
    gemB._rainbowTarget = gemA.type;
  }

  // Check for matches after swap
  const { matched } = findMatches(S.grid, S.rows, S.cols);
  if (matched.size > 0) {
    playSound('match');
    S.movesLeft--;
    S.combo = 0;
    await cascadeLoop();
  } else {
    // Swap back
    playSound('badSwap');
    await animateSwap(b, a);
    S.phase = 'idle';
  }
}

function animateSwap(a, b) {
  return new Promise(resolve => {
    const gemA = S.grid[a.row][a.col];
    const gemB = S.grid[b.row][b.col];
    if (!gemA || !gemB) { resolve(); return; }

    const axPx = S.offsetX + a.col * S.cellSize;
    const ayPx = S.offsetY + a.row * S.cellSize;
    const bxPx = S.offsetX + b.col * S.cellSize;
    const byPx = S.offsetY + b.row * S.cellSize;

    gemA._drawX = axPx;
    gemA._drawY = ayPx;
    gemB._drawX = bxPx;
    gemB._drawY = byPx;

    swapGems(S.grid, a, b);

    let done = 0;
    const onDone = () => { done++; if (done >= 2) resolve(); };

    addTween(gemA, { _drawX: bxPx, _drawY: byPx }, TIMING.SWAP / 1000, 'easeOut', onDone);
    addTween(gemB, { _drawX: axPx, _drawY: ayPx }, TIMING.SWAP / 1000, 'easeOut', onDone);
  });
}

// ===== CASCADE LOOP =====
async function cascadeLoop() {
  S.phase = 'checking';
  let hadMatches = true;

  while (hadMatches) {
    // Process matches
    const result = processMatches(S.grid, S.rows, S.cols);
    if (!result) {
      hadMatches = false;
      break;
    }

    S.combo++;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    const multiplier = calcComboMultiplier(S.combo);
    const roundScore = Math.floor(result.score * multiplier);
    S.score += roundScore;
    S.totalGemsRemoved += result.removedPositions.size;

    // Track specials
    for (const ca of result.chainActivated) S.specialsUsed++;

    // Spawn particles for removed gems
    for (const key of result.removedPositions) {
      const [r, c] = key.split(',').map(Number);
      const px = S.offsetX + c * S.cellSize + S.cellSize / 2;
      const py = S.offsetY + r * S.cellSize + S.cellSize / 2;
      const accent = WORLD_ACCENTS[S.currentWorld];
      spawnBurst(px, py, 4, { color: accent, size: 4, life: 0.4, speed: 2 });
    }

    // Combo text
    if (S.combo >= 2) {
      const midKey = [...result.removedPositions][Math.floor(result.removedPositions.size / 2)];
      if (midKey) {
        const [mr, mc] = midKey.split(',').map(Number);
        spawnComboText(
          S.offsetX + mc * S.cellSize + S.cellSize / 2,
          S.offsetY + mr * S.cellSize,
          `${S.combo}x`
        );
      }
      playSound(S.combo >= 5 ? 'megaCombo' : 'combo');

      // Streak engagement message
      if (ENGAGE && S.combo >= 2) {
        const streakMsg = ENGAGE.getStreakMessage(S.combo);
        if (streakMsg) {
          const st = qs('#streak-toast');
          if (st) { st.textContent = streakMsg; st.classList.add('show'); clearTimeout(st._timer); st._timer = setTimeout(() => st.classList.remove('show'), 1800); }
        }
      }
    }

    // Special creations particles
    for (const sp of result.specialsCreated) {
      const px = S.offsetX + sp.col * S.cellSize + S.cellSize / 2;
      const py = S.offsetY + sp.row * S.cellSize + S.cellSize / 2;
      spawnSpecialActivation(px, py, sp.special);
      playSound('specialCreate');
    }

    // Animate removal
    await animateRemoval(result.removedPositions);

    // Update objectives
    updateObjectives(S.objectiveTracker, {
      score: S.score,
      removedTypes: [...result.removedPositions].map(k => {
        const [r, c] = k.split(',').map(Number);
        return S.grid[r]?.[c]?.type;
      }).filter(t => t !== undefined),
      obstaclesHit: result.obstaclesHit,
      combo: S.combo,
      specialsUsed: result.chainActivated.length,
    });

    // Boss damage
    if (S.boss && S.boss.active && !S.boss.defeated) {
      const damage = roundScore * 0.3;
      S.boss.hp -= damage;
      if (S.boss.hp <= 0) {
        S.boss.hp = 0;
        S.boss.defeated = true;
        playSound('bossDefeat');
        spawnBossDefeatEffects(S.canvasW / 2, S.offsetY - 40);
        updateObjectives(S.objectiveTracker, { bossDefeated: true });
      }
      updateBossBar();
    }

    // Gravity
    const falls = applyGravity(S.grid, S.rows, S.cols);
    const spawns = spawnNewGems(S.grid, S.rows, S.cols, S.gemCount);

    // Animate falls
    await animateFalls(falls, spawns);

    // Update HUD
    updateGameHUD();

    // Small delay between cascades
    await delay(50);
  }

  // Boss attack phase
  if (S.boss && S.boss.active && !S.boss.defeated) {
    S.boss.attackTimer -= 1;
    if (S.boss.attackTimer <= 0) {
      await bossAttack();
      S.boss.attackTimer = S.boss.attackInterval;
    }
  }

  // Bomb timer tick
  const exploded = tickBombTimers(S.grid, S.rows, S.cols);
  if (exploded.length > 0) {
    // Bomb exploded — lose a life if not defused
    S.playerHP -= exploded.length;
    updateBossBar();
    for (const exp of exploded) {
      const px = S.offsetX + exp.col * S.cellSize + S.cellSize / 2;
      const py = S.offsetY + exp.row * S.cellSize + S.cellSize / 2;
      spawnBurst(px, py, 10, { color: '#ff4444', type: 'sparkle', size: 8, life: 0.6, speed: 5 });
    }
    playSound('explosion');
  }

  // Check valid moves
  if (!hasValidMoves(S.grid, S.rows, S.cols)) {
    playSound('shuffle');
    // Show shuffle message
    spawnComboText(S.canvasW / 2, S.canvasH / 2, t('shuffling'));
    await delay(500);
    shuffleGrid(S.grid, S.rows, S.cols);
    setupGemDrawPositions();
  }

  // Check game over conditions
  if (S.movesLeft <= 0 || S.playerHP <= 0) {
    await endLevel();
  } else if (objectivesComplete(S.objectiveTracker)) {
    await endLevel();
  } else {
    S.phase = 'idle';
    S.combo = 0;
  }
}

function setupGemDrawPositions() {
  for (let r = 0; r < S.rows; r++) {
    for (let c = 0; c < S.cols; c++) {
      const gem = S.grid[r][c];
      if (gem) {
        gem._drawX = S.offsetX + c * S.cellSize;
        gem._drawY = S.offsetY + r * S.cellSize;
      }
    }
  }
}

// ===== ANIMATIONS =====
function animateRemoval(removedSet) {
  return new Promise(resolve => {
    let pending = removedSet.size;
    if (pending === 0) { resolve(); return; }

    for (const key of removedSet) {
      const [r, c] = key.split(',').map(Number);
      const gem = S.grid[r]?.[c];
      if (!gem) { pending--; if (pending <= 0) resolve(); continue; }

      gem._scale = 1;
      gem._alpha = 1;
      addTween(gem, { _scale: 0, _alpha: 0 }, TIMING.REMOVE / 1000, 'easeIn', () => {
        pending--;
        if (pending <= 0) resolve();
      });
    }
  });
}

function animateFalls(falls, spawns) {
  return new Promise(resolve => {
    let pending = falls.length + spawns.length;
    if (pending === 0) { resolve(); return; }

    for (const f of falls) {
      const gem = S.grid[f.toRow][f.toCol];
      if (!gem) { pending--; continue; }
      const targetY = S.offsetY + f.toRow * S.cellSize;
      gem._drawX = S.offsetX + f.toCol * S.cellSize;
      gem._drawY = S.offsetY + f.fromRow * S.cellSize;
      gem._scale = 1;
      gem._alpha = 1;
      const dist = Math.abs(f.toRow - f.fromRow);
      addTween(gem, { _drawY: targetY }, (TIMING.FALL * dist) / 1000, 'bounce', () => {
        pending--;
        if (pending <= 0) resolve();
      });
    }

    for (const s of spawns) {
      const gem = s.gem;
      const targetY = S.offsetY + s.row * S.cellSize;
      gem._drawX = S.offsetX + s.col * S.cellSize;
      gem._drawY = S.offsetY + (s.fallFrom) * S.cellSize;
      gem._scale = 1;
      gem._alpha = 1;
      const dist = Math.abs(s.row - s.fallFrom);
      addTween(gem, { _drawY: targetY }, (TIMING.FALL * dist) / 1000, 'bounce', () => {
        pending--;
        if (pending <= 0) resolve();
      });
    }
  });
}

// ===== CLEAR POSITIONS (for specials/combos) =====
async function clearPositions(positions, isCombo = false) {
  const keys = new Set(positions.map(p => `${p.row},${p.col}`));
  const toRemove = [];

  for (const p of positions) {
    const gem = S.grid[p.row]?.[p.col];
    if (!gem) continue;

    // Cascade chain: activated specials→clear more
    if (gem.special !== SPECIAL.NONE && !isCombo) {
      const chainPos = getSpecialClearPositions(gem.special, p.row, p.col, S.grid, S.rows, S.cols);
      for (const cp of chainPos) keys.add(`${cp.row},${cp.col}`);
    }

    toRemove.push(p);
  }

  const score = toRemove.length * SCORING.MATCH_3 * 0.5;
  S.score += Math.floor(score);

  // Animate
  await animateRemoval(keys);

  // Remove from grid
  for (const key of keys) {
    const [r, c] = key.split(',').map(Number);
    if (S.grid[r]?.[c]?.obstacle !== OBSTACLE.STONE) {
      S.grid[r][c] = null;
    }
  }
}

// ===== BOSS ATTACK =====
async function bossAttack() {
  if (!S.boss || S.boss.defeated) return;

  S.boss.isAttacking = true;
  spawnComboText(S.canvasW / 2, S.canvasH / 3, t('bossAttack'));
  playSound('bossAttack');
  await delay(600);

  // Random attack: add obstacles
  const empties = [];
  for (let r = 0; r < S.rows; r++) {
    for (let c = 0; c < S.cols; c++) {
      if (S.grid[r][c] && S.grid[r][c].obstacle === OBSTACLE.NONE) empties.push({ row: r, col: c });
    }
  }
  shuffle(empties);

  const attacks = Math.min(3, empties.length);
  for (let i = 0; i < attacks; i++) {
    const { row, col } = empties[i];
    S.grid[row][col].obstacle = OBSTACLE.ICE_1;
    S.grid[row][col].obstacleHP = 1;
    const px = S.offsetX + col * S.cellSize + S.cellSize / 2;
    const py = S.offsetY + row * S.cellSize + S.cellSize / 2;
    spawnBurst(px, py, 6, { color: '#88ccff', type: 'sparkle', size: 6, life: 0.5, speed: 3 });
  }

  S.boss.isAttacking = false;
}

// ===== END LEVEL =====
async function endLevel() {
  S.phase = 'gameover';
  const won = objectivesComplete(S.objectiveTracker);
  const stars = won ? calcStars(S.score, S.levelDef.starThresholds) : 0;
  S.stars = stars;

  // Calculate coins via economy.js or fallback
  if (ECONOMY && won) {
    const reward = ECONOMY.calcReward({
      score: S.score,
      stars,
      isBoss: !!S.levelDef.isBoss,
      isMiniBoss: !!S.levelDef.isMiniBoss,
      movesLeft: S.movesLeft,
      totalMoves: S.levelDef.moves,
      usedBoosters: 0,
      winStreak: S.winStreak,
      worldIdx: S.currentWorld,
    });
    S.coinsEarned = reward.total;
  } else {
    const baseCoins = won ? 5 + stars * 3 : 1;
    const bossBonus = S.boss && S.boss.defeated ? 10 : 0;
    S.coinsEarned = baseCoins + bossBonus;
  }

  // Track win streak
  if (won) S.winStreak++;
  else S.winStreak = 0;

  // Snapshot previous stats for milestone detection
  const prevStats = {
    totalStars: getTotalStars(S.progress),
    levelsCompleted: S.progress.levelsCompleted,
    totalCoins: S.progress.totalCoinsEarned,
  };

  // Badges via engagement.js micro-badges
  S.badges = [];
  const elapsed = (Date.now() - S.levelStartTime) / 1000;
  if (ENGAGE) {
    const microStats = {
      specialsCreated: S.specialsUsed,
      maxCombo: S.maxCombo,
      powerCombos: S.progress.totalPowerCombos || 0,
      movesLeftPct: S.levelDef.moves > 0 ? Math.round((S.movesLeft / S.levelDef.moves) * 100) : 0,
      timeSec: elapsed,
      obstaclesCleared: 0,
      badSwaps: 0,
      totalSwaps: S.levelDef.moves - S.movesLeft,
      bossDefeated: S.boss && S.boss.defeated,
      rainbowsCreated: 0,
      score: S.score,
    };
    const microBadges = ENGAGE.checkMicroBadges(microStats);
    for (const mb of microBadges) S.badges.push(`${mb.icon} ${mb.text}`);
  } else {
    // Fallback inline badges
    if (elapsed < 30 && won) S.badges.push(t('badgeFast'));
    if (!S.hintUsed && won) S.badges.push(t('badgeNoHint'));
    if (stars === 3) S.badges.push(t('badgePerfect'));
    if (S.maxCombo >= 5) S.badges.push(t('badgeCombo'));
    if (S.specialsUsed >= 3) S.badges.push(t('badgeSpecial'));
  }

  // Save progress
  if (won) {
    const p = S.progress;
    if (!p.worlds[S.currentWorld]) p.worlds[S.currentWorld] = { scores: {}, stars: {} };
    const ws = p.worlds[S.currentWorld];
    ws.scores[S.currentLevel] = Math.max(ws.scores[S.currentLevel] || 0, S.score);
    ws.stars[S.currentLevel] = Math.max(ws.stars[S.currentLevel] || 0, stars);

    p.coins += S.coinsEarned;
    p.totalCoinsEarned += S.coinsEarned;
    p.totalGemsCollected += S.totalGemsRemoved;
    p.totalSpecialsUsed += S.specialsUsed;
    p.maxCombo = Math.max(p.maxCombo, S.maxCombo);
    p.highScore = Math.max(p.highScore, S.score);
    p.levelsCompleted++;
    if (elapsed < 30) p.speedLevels++;
    if (S.boss && S.boss.defeated) {
      if (S.levelDef.isBoss) p.bossesDefeated++;
      else p.miniBossesDefeated++;
    }

    // XP
    const xpGain = XP.PER_STAR * stars + XP.PER_LEVEL + (S.boss?.defeated ? XP.PER_BOSS : 0);
    p.totalXP += xpGain;
    const xpForLevel = Math.floor(XP.LEVEL_UP_BASE * Math.pow(XP.LEVEL_UP_SCALE, p.playerLevel - 1));
    while (p.totalXP >= xpForLevel * p.playerLevel) {
      p.playerLevel++;
    }

    // Check achievements
    checkAchievements();

    // Update lastPlayTimestamp
    p.lastPlayTimestamp = Date.now();

    saveProgress(p);

    // DDA update
    if (INTEL) {
      INTEL.updateAfterLevel(p, S.score, S.maxCombo, elapsed, S.movesLeft);
    }
  }

  // Milestone detection
  if (ENGAGE && won) {
    const curStats = {
      totalStars: getTotalStars(S.progress),
      levelsCompleted: S.progress.levelsCompleted,
      totalCoins: S.progress.totalCoinsEarned,
    };
    const milestones = ENGAGE.getMilestoneMessage(curStats, prevStats);
    if (milestones && milestones.length > 0) {
      const m = milestones[0];
      setTimeout(() => {
        const popup = qs('#milestone-popup');
        if (popup) {
          popup.querySelector('.milestone-icon').textContent = m.icon;
          popup.querySelector('.milestone-text').textContent = m.text;
          popup.classList.add('show');
          setTimeout(() => popup.classList.remove('show'), 4000);
        }
      }, 1200);
    }
  }

  // Story Quiz (on boss defeat or last level of world)
  if (STORY && (S.boss && S.boss.defeated || S.levelDef.isBoss && stars > 0)) {
    const quiz = STORY.getQuiz(S.currentWorld);
    if (quiz) {
      setTimeout(() => showStoryQuiz(quiz), 5500);
    }
  }

  // Effects
  if (won) {
    spawnLevelCompleteEffects(S.canvasW, S.canvasH);
    playSound(stars === 3 ? 'perfect' : 'levelComplete');
  } else {
    playSound('levelFail');
  }

  await delay(800);
  showScreen('done');

  // PostMessage to parent
  postGameComplete(won);
}

// ===== DONE SCREEN =====
function renderDoneScreen() {
  const won = S.stars > 0;
  qs('#done-emoji').textContent = won ? '🎉' : '😢';

  // Near-miss message for lost games
  let subtitle = '';
  if (!won && ENGAGE) {
    const objPct = S.objectiveTracker.length > 0
      ? Math.round(S.objectiveTracker.reduce((s, o) => s + Math.min(o.current / o.target, 1), 0) / S.objectiveTracker.length * 100)
      : 0;
    const nearMiss = ENGAGE.getNearMissMessage({
      objectivesPct: objPct,
      score: S.score,
      starThresholds: S.levelDef.starThresholds,
    });
    if (nearMiss) subtitle = nearMiss;
  }

  qs('#done-title').textContent = won
    ? (S.stars === 3 ? t('excellent') : S.stars === 2 ? t('great') : t('good'))
    : (subtitle || t('tryAgain'));

  // Stars
  const starsEl = qs('#done-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = `done-star ${i < S.stars ? 'earned' : 'empty'}`;
    star.textContent = i < S.stars ? '⭐' : '☆';
    starsEl.appendChild(star);
  }

  qs('#done-score').textContent = `${t('score')}: ${S.score}`;

  // Stats
  const statsEl = qs('#done-stats');
  statsEl.innerHTML = `
    <div class="done-stat"><div class="done-stat-v">${S.maxCombo}</div><div class="done-stat-l">${t('combo')}</div></div>
    <div class="done-stat"><div class="done-stat-v">${S.totalGemsRemoved}</div><div class="done-stat-l">💎</div></div>
    <div class="done-stat"><div class="done-stat-v">${S.specialsUsed}</div><div class="done-stat-l">🌟</div></div>
  `;

  // Badges
  const badgesEl = qs('#done-badges');
  badgesEl.innerHTML = '';
  for (const b of S.badges) {
    const badge = document.createElement('div');
    badge.className = 'done-badge';
    badge.textContent = b;
    badgesEl.appendChild(badge);
  }

  // Win streak message
  if (ENGAGE && S.winStreak >= 2) {
    const streakMsg = ENGAGE.getStreakMessage(S.winStreak);
    if (streakMsg) {
      const streakEl = document.createElement('div');
      streakEl.className = 'done-badge';
      streakEl.style.background = 'rgba(251,191,36,.2)';
      streakEl.style.borderColor = 'rgba(251,191,36,.5)';
      streakEl.textContent = streakMsg;
      badgesEl.appendChild(streakEl);
    }
  }

  // Coins
  qs('#done-coins').innerHTML = `🪙 +${S.coinsEarned}`;

  // Session Summary (engagement.js)
  const sessionPanel = qs('#d-session');
  if (sessionPanel && ENGAGE) {
    const elapsed = (Date.now() - S.levelStartTime) / 1000;
    const sessionData = {
      levelsPlayed: 1,
      levelsWon: S.stars > 0 ? 1 : 0,
      totalScore: S.score,
      totalCoins: S.coinsEarned,
      totalStars: S.stars,
      timeMinutes: Math.round(elapsed / 60),
      badgesEarned: S.badges.length,
    };
    const summary = ENGAGE.getSessionSummary(sessionData);
    if (summary) {
      let html = `<div class="session-title">${summary.title}</div><div class="session-grid">`;
      for (const st of summary.stats) {
        html += `<div class="session-item"><div class="si-v">${st.icon} ${st.value}</div><div class="si-l">${st.label}</div></div>`;
      }
      html += `</div>`;
      if (summary.message) html += `<div class="session-msg">${summary.message}</div>`;
      sessionPanel.innerHTML = html;
      sessionPanel.style.display = '';
    } else {
      sessionPanel.style.display = 'none';
    }
  } else if (sessionPanel) {
    sessionPanel.style.display = 'none';
  }

  // Did you know + Fact Library
  const dykTitle = qs('#done-dyk-title');
  const dykText = qs('#done-dyk-text');
  const factsBtn = qs('#facts-lib-btn');
  if (STORY) {
    const fact = STORY.getRandomFact(S.currentWorld);
    if (fact) {
      dykTitle.textContent = t('didYouKnow');
      dykText.textContent = fact;
      qs('#done-dyk').style.display = '';
      // Fact Library button
      const allFacts = STORY.getAllFacts(S.currentWorld);
      if (allFacts && allFacts.length > 1 && factsBtn) {
        factsBtn.style.display = '';
        factsBtn.onclick = () => {
          const list = qs('#facts-list');
          list.innerHTML = allFacts.map((f, i) => `<div class="facts-item"><span class="fi-num">${i + 1}.</span>${f}</div>`).join('');
          qs('#facts-overlay').style.display = '';
        };
      } else if (factsBtn) { factsBtn.style.display = 'none'; }
    } else {
      qs('#done-dyk').style.display = 'none';
    }
  } else {
    qs('#done-dyk').style.display = 'none';
  }
  // Close facts overlay
  const factsClose = qs('#facts-close');
  if (factsClose) factsClose.onclick = () => qs('#facts-overlay').style.display = 'none';
  const factsOverlay = qs('#facts-overlay');
  if (factsOverlay) factsOverlay.addEventListener('click', e => { if (e.target === factsOverlay) factsOverlay.style.display = 'none'; });

  // Buttons
  const btnsEl = qs('#done-btns');
  btnsEl.innerHTML = '';

  if (won && S.currentLevel < 9) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    nextBtn.textContent = t('next');
    nextBtn.addEventListener('click', () => {
      S.currentLevel++;
      showScreen('game');
      playSound('tap');
    });
    btnsEl.appendChild(nextBtn);
  }

  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn btn-success';
  replayBtn.textContent = t('replay');
  replayBtn.addEventListener('click', () => {
    showScreen('game');
    playSound('tap');
  });
  btnsEl.appendChild(replayBtn);

  const menuBtn = document.createElement('button');
  menuBtn.className = 'btn';
  menuBtn.textContent = t('back');
  menuBtn.addEventListener('click', () => {
    showScreen('level');
    playSound('tap');
  });
  btnsEl.appendChild(menuBtn);

  // Share
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-gold';
  shareBtn.textContent = `${t('share')} 📤`;
  shareBtn.addEventListener('click', () => shareResult());
  btnsEl.appendChild(shareBtn);

  // Dismiss handlers for milestone and quiz
  const milestonePopup = qs('#milestone-popup');
  if (milestonePopup) {
    milestonePopup.onclick = () => milestonePopup.classList.remove('show');
  }
  const quizOverlay = qs('#quiz-overlay');
  if (quizOverlay) {
    quizOverlay.onclick = (e) => { if (e.target === quizOverlay) quizOverlay.classList.remove('show'); };
  }
}

// ===== STORY QUIZ =====
function showStoryQuiz(quiz) {
  const overlay = qs('#quiz-overlay');
  if (!overlay) return;
  const card = overlay.querySelector('.quiz-card');
  if (!card) return;

  card.querySelector('.quiz-question').textContent = quiz.q;
  const answersEl = card.querySelector('.quiz-answers');
  const resultEl = card.querySelector('.quiz-result');
  resultEl.textContent = '';
  answersEl.innerHTML = '';

  quiz.a.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-answer-btn';
    btn.textContent = ans;
    btn.addEventListener('click', () => {
      // Disable all buttons
      answersEl.querySelectorAll('.quiz-answer-btn').forEach(b => b.disabled = true);
      if (i === quiz.correct) {
        btn.classList.add('correct');
        resultEl.textContent = LANG === 'ar' ? '✅ إجابة صحيحة! +10 عملات' : LANG === 'pt' ? '✅ Correto! +10 moedas' : '✅ Correct! +10 coins';
        S.progress.coins += 10;
        S.progress.totalQuizCorrect = (S.progress.totalQuizCorrect || 0) + 1;
        saveProgress(S.progress);
        playSound('achievement');
      } else {
        btn.classList.add('wrong');
        answersEl.children[quiz.correct]?.classList.add('correct');
        resultEl.textContent = LANG === 'ar' ? '❌ إجابة خاطئة' : LANG === 'pt' ? '❌ Incorreto' : '❌ Incorrect';
        playSound('error');
      }
      setTimeout(() => overlay.classList.remove('show'), 2500);
    });
    answersEl.appendChild(btn);
  });

  overlay.classList.add('show');
}

// ===== SHOP =====
function renderShopScreen() {
  const p = S.progress;
  qs('#shop-title').textContent = `🛍️ ${t('shop')}`;
  qs('#shop-coins').textContent = `🪙 ${p.coins}`;

  // Boosters
  qs('#shop-boosters-title').textContent = '🎒 ' + t('selectBooster');
  const boosterGrid = qs('#shop-boosters');
  boosterGrid.innerHTML = '';

  const boosters = [
    { key: 'hammer', emoji: '🔨', name: t('boosterHammer'), price: 30 },
    { key: 'shuffle', emoji: '🔀', name: t('boosterShuffle'), price: 20 },
    { key: 'extraMoves', emoji: '➕', name: t('boosterMoves'), price: 40 },
    { key: 'hint', emoji: '💡', name: t('boosterHint'), price: 15 },
    { key: 'bomb', emoji: '💣', name: t('boosterBomb'), price: 50 },
    { key: 'rocket', emoji: '🚀', name: t('boosterRocket'), price: 60 },
    { key: 'freeze', emoji: '🧊', name: t('boosterFreeze'), price: 45 },
    { key: 'multi', emoji: '✖️', name: t('boosterMulti'), price: 55 },
  ];

  for (const b of boosters) {
    const count = p.boosters[b.key] || 0;
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <div class="shop-item-icon">${b.emoji}</div>
      <div class="shop-item-name">${b.name}</div>
      <div class="shop-item-price">🪙 ${b.price}</div>
      <div class="shop-item-count">x${count}</div>
    `;
    item.addEventListener('click', () => buyBooster(b.key, b.price));
    boosterGrid.appendChild(item);
  }

  // Themes
  qs('#shop-themes-title').textContent = '🎨 Themes';
  const themeGrid = qs('#shop-themes');
  themeGrid.innerHTML = '';
  const themes = [
    { key: 'classic', name: 'Classic', price: 0, emoji: '💎' },
    { key: 'neon', name: 'Neon', price: 100, emoji: '🌈' },
    { key: 'royal', name: 'Royal', price: 200, emoji: '👑' },
    { key: 'nature', name: 'Nature', price: 150, emoji: '🌿' },
  ];

  for (const th of themes) {
    const owned = th.price === 0 || p.settings.theme === th.key || (p.purchaseCounts?.[th.key] ?? 0) > 0;
    const item = document.createElement('div');
    item.className = `shop-item ${owned ? 'owned' : ''}`;
    item.innerHTML = `
      <div class="shop-item-icon">${th.emoji}</div>
      <div class="shop-item-name">${th.name}</div>
      <div class="shop-item-price">${owned ? t('owned') : `🪙 ${th.price}`}</div>
    `;
    if (!owned) {
      item.addEventListener('click', () => buyTheme(th.key, th.price));
    }
    themeGrid.appendChild(item);
  }
}

function buyBooster(key, price) {
  const p = S.progress;
  if (p.coins < price) {
    playSound('error');
    return;
  }
  p.coins -= price;
  p.boosters[key] = (p.boosters[key] || 0) + 1;
  saveProgress(p);
  renderShopScreen();
  playSound('buy');
}

function buyTheme(key, price) {
  const p = S.progress;
  if (p.coins < price) {
    playSound('error');
    return;
  }
  p.coins -= price;
  p.purchaseCounts[key] = 1;
  p.settings.theme = key;
  p.totalThemesBought++;
  saveProgress(p);
  renderShopScreen();
  playSound('buy');
}

// ===== BOOSTER USE =====
function useBooster(key) {
  if (S.phase !== 'idle') return;
  const count = S.progress.boosters[key] || 0;
  if (count <= 0) return;

  switch (key) {
    case 'hammer':
      S.activeBooster = 'hammer';
      break;
    case 'shuffle':
      S.progress.boosters.shuffle--;
      saveProgress(S.progress);
      shuffleGrid(S.grid, S.rows, S.cols);
      setupGemDrawPositions();
      playSound('shuffle');
      renderBoosters();
      break;
    case 'extraMoves':
      S.progress.boosters.extraMoves--;
      S.movesLeft += 5;
      saveProgress(S.progress);
      updateGameHUD();
      playSound('powerup');
      renderBoosters();
      break;
  }
}

function applyBooster(booster, row, col) {
  if (booster === 'hammer') {
    const gem = S.grid[row]?.[col];
    if (!gem) return;
    S.progress.boosters.hammer--;
    saveProgress(S.progress);

    // Remove gem + particles
    const px = S.offsetX + col * S.cellSize + S.cellSize / 2;
    const py = S.offsetY + row * S.cellSize + S.cellSize / 2;
    spawnBurst(px, py, 8, { color: '#ff6b6b', type: 'star', size: 6, life: 0.5, speed: 4 });
    S.grid[row][col] = null;
    playSound('hammer');

    // Gravity + cascade
    const falls = applyGravity(S.grid, S.rows, S.cols);
    const spawns = spawnNewGems(S.grid, S.rows, S.cols, S.gemCount);
    animateFalls(falls, spawns).then(() => cascadeLoop());
    renderBoosters();
  }
}

// ===== ACHIEVEMENTS =====
function renderAchieveScreen() {
  const p = S.progress;
  qs('#ach-title').textContent = `🏆 ${t('achievements')}`;
  const grid = qs('#ach-grid');
  grid.innerHTML = '';

  const nameKey = LANG === 'pt' ? 'namePt' : LANG === 'ar' ? 'nameAr' : 'nameEn';

  for (const ach of ACHIEVEMENTS) {
    const unlocked = p.achievementsUnlocked.includes(ach.id);
    const current = getAchievementProgress(p, ach);
    const pct = Math.min((current / ach.goal) * 100, 100);

    const item = document.createElement('div');
    item.className = `ach-item ${unlocked ? 'unlocked' : ''}`;
    item.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-info">
        <div class="ach-name">${ach[nameKey]}</div>
        <div class="ach-progress"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="ach-reward">${unlocked ? '✅' : `🪙${ach.coins}`}</div>
    `;
    grid.appendChild(item);
  }
}

function getAchievementProgress(p, ach) {
  switch (ach.type) {
    case 'levelsCompleted': return p.levelsCompleted;
    case 'gemsCollected': return p.totalGemsCollected;
    case 'maxCombo': return p.maxCombo;
    case 'specialsUsed': return p.totalSpecialsUsed;
    case 'bombsUsed': return p.totalBombsUsed;
    case 'rainbowsUsed': return p.totalRainbowsUsed;
    case 'novasUsed': return p.totalNovasUsed;
    case 'lightningsUsed': return p.totalLightningsUsed;
    case 'totalStars': return getTotalStars(p);
    case 'worldsUnlocked': return getUnlockedWorlds(p);
    case 'bossesDefeated': return p.bossesDefeated;
    case 'miniBossesDefeated': return p.miniBossesDefeated;
    case 'worldsNoHints': return p.worldsNoHints;
    case 'speedLevels': return p.speedLevels;
    case 'perfectWorlds': return p.perfectWorlds;
    case 'dailyStreak': return p.loginStreak?.count || 0;
    case 'powerCombos': return p.totalPowerCombos;
    case 'boardClears': return p.totalBoardClears;
    case 'highScore': return p.highScore;
    case 'obstaclesBroken': return p.totalObstaclesBroken;
    case 'chainsBreak': return p.totalChainsBreak;
    case 'iceBreak': return p.totalIceBreak;
    case 'totalCoins': return p.totalCoinsEarned;
    case 'dailyChallenges': return p.totalDailyChallenges;
    case 'quizCorrect': return p.totalQuizCorrect;
    case 'themesBought': return p.totalThemesBought;
    case 'completionPct': return getCompletionPct(p);
    default: return 0;
  }
}

function checkAchievements() {
  const p = S.progress;
  let newUnlocks = [];

  for (const ach of ACHIEVEMENTS) {
    if (p.achievementsUnlocked.includes(ach.id)) continue;
    const current = getAchievementProgress(p, ach);
    if (current >= ach.goal) {
      p.achievementsUnlocked.push(ach.id);
      p.coins += ach.coins;
      p.totalXP += XP.PER_ACHIEVEMENT;
      newUnlocks.push(ach);
    }
  }

  if (newUnlocks.length > 0) {
    // Show achievement notification after level
    setTimeout(() => {
      for (const ach of newUnlocks) {
        showAchievementNotification(ach);
      }
    }, 1500);
  }
}

function showAchievementNotification(ach) {
  const nameKey = LANG === 'pt' ? 'namePt' : LANG === 'ar' ? 'nameAr' : 'nameEn';
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t('newAchievement')}</h2>
      <div style="font-size:48px;margin:8px 0">${ach.icon}</div>
      <p style="font-size:18px;font-weight:800">${ach[nameKey]}</p>
      <p>🪙 +${ach.coins}</p>
      <button class="btn btn-primary" id="ach-dismiss">${t('excellent')}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#ach-dismiss').addEventListener('click', () => {
    overlay.remove();
    playSound('tap');
  });
  playSound('achievement');
}

// ===== STATS / REPORT =====
function renderStatsScreen() {
  const p = S.progress;
  qs('#stats-title').textContent = `📊 ${t('stats')}`;
  const content = qs('#stats-content');

  const totalStars = getTotalStars(p);

  // Use reports.js for enhanced skill analysis if available
  let skillHTML = '';
  if (REPORTS) {
    try {
      const skills = REPORTS.getSkillAnalysis(p);
      if (skills && skills.length > 0) {
        for (const sk of skills) {
          skillHTML += renderSkillBar(sk.name, sk.rating);
        }
      }
    } catch (e) { /* fallback below */ }
  }
  if (!skillHTML) {
    skillHTML = `
      ${renderSkillBar(t('skillPlanning'), p.skillData.smoothedSkill || 50)}
      ${renderSkillBar(t('skillPattern'), Math.min((p.totalGemsCollected / 500) * 100, 100))}
      ${renderSkillBar(t('skillSpeed'), Math.min((100 - (p.skillData.avgResponseTime || 8)) * 10, 100))}
      ${renderSkillBar(t('skillProblem'), Math.min((p.maxCombo / 10) * 100, 100))}
    `;
  }

  // World breakdown from reports.js
  let worldHTML = '';
  if (REPORTS) {
    try {
      const breakdown = REPORTS.getWorldBreakdown(p);
      if (breakdown && breakdown.length > 0) {
        const nameKey = LANG === 'pt' ? 'pt' : LANG === 'ar' ? 'ar' : 'en';
        const names = WORLD_NAMES[nameKey] || WORLD_NAMES.en;
        worldHTML = `<div class="stats-card" style="margin-top:8px"><h3>🌍 ${LANG === 'ar' ? 'العوالم' : LANG === 'pt' ? 'Mundos' : 'Worlds'}</h3>`;
        for (const wb of breakdown) {
          const pct = wb.stars > 0 ? Math.round((wb.stars / 30) * 100) : 0;
          worldHTML += `<div class="stats-row"><span class="stats-label">${WORLD_ICONS[wb.world] || '💎'} ${names[wb.world] || 'World ' + (wb.world + 1)}</span><span class="stats-value">⭐ ${wb.stars}/30</span></div>`;
        }
        worldHTML += `</div>`;
      }
    } catch (e) { /* skip */ }
  }

  content.innerHTML = `
    <div class="stats-card">
      <h3>📊 ${t('report')}</h3>
      <div class="stats-row"><span class="stats-label">${t('level')}</span><span class="stats-value">Lv.${p.playerLevel}</span></div>
      <div class="stats-row"><span class="stats-label">⭐ ${t('stars')}</span><span class="stats-value">${totalStars}/300</span></div>
      <div class="stats-row"><span class="stats-label">🎯 ${t('level')}</span><span class="stats-value">${p.levelsCompleted}</span></div>
      <div class="stats-row"><span class="stats-label">💎 Gems</span><span class="stats-value">${p.totalGemsCollected}</span></div>
      <div class="stats-row"><span class="stats-label">🏆 High Score</span><span class="stats-value">${p.highScore}</span></div>
      <div class="stats-row"><span class="stats-label">🔥 Max Combo</span><span class="stats-value">${p.maxCombo}</span></div>
      <div class="stats-row"><span class="stats-label">⚔️ Bosses</span><span class="stats-value">${p.bossesDefeated}</span></div>
      <div class="stats-row"><span class="stats-label">🪙 ${t('coins')}</span><span class="stats-value">${p.totalCoinsEarned}</span></div>
    </div>
    <div class="stats-card" style="margin-top:8px">
      <h3>🧠 ${t('report')}</h3>
      ${skillHTML}
    </div>
    ${worldHTML}
  `;
}

function renderSkillBar(name, pct) {
  pct = Math.max(0, Math.min(100, pct));
  const cls = pct >= 70 ? 'strong' : pct >= 40 ? 'developing' : 'weak';
  const label = pct >= 70 ? t('strong') : pct >= 40 ? t('developing') : t('needsPractice');
  return `
    <div class="stats-row">
      <span class="stats-label">${name}</span>
      <div class="skill-bar"><div class="skill-fill ${cls}" style="width:${pct}%"></div></div>
      <span class="stats-value">${label}</span>
    </div>
  `;
}

// ===== DAILY REWARD =====
function checkDailyReward() {
  const p = S.progress;
  const today = new Date().toDateString();
  if (p.loginStreak?.lastDate === today) return; // Already claimed

  // Show daily popup after a short delay
  setTimeout(() => showDailyReward(), 1000);
}

function showDailyReward() {
  const p = S.progress;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let streak = p.loginStreak?.count || 0;
  if (p.loginStreak?.lastDate === yesterday) streak++;
  else if (p.loginStreak?.lastDate !== today) streak = 1;

  const rewards = [5, 10, 15, 20, 30, 40, 60]; // coins per day
  const dayIdx = Math.min(streak - 1, 6);
  const alreadyClaimed = p.loginStreak?.lastDate === today;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t('dailyReward')}</h2>
      <p>${t('streak')}: ${streak} ${t('day')}</p>
      <div class="daily-grid">
        ${rewards.map((r, i) => `
          <div class="daily-day ${i === dayIdx && !alreadyClaimed ? 'today' : ''} ${i < dayIdx ? 'claimed' : ''}">
            <div>${t('day')} ${i + 1}</div>
            <div class="daily-reward-val">🪙${r}</div>
          </div>
        `).join('')}
      </div>
      ${alreadyClaimed
        ? `<p>${t('claimed')}</p>`
        : `<button class="btn btn-gold" id="daily-claim">${t('claim')} 🪙${rewards[dayIdx]}</button>`
      }
      <button class="btn btn-sm" id="daily-close" style="margin-top:8px">${t('back')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  if (!alreadyClaimed) {
    overlay.querySelector('#daily-claim')?.addEventListener('click', () => {
      p.loginStreak = { lastDate: today, count: streak };
      p.coins += rewards[dayIdx];
      p.totalCoinsEarned += rewards[dayIdx];
      saveProgress(p);
      overlay.remove();
      playSound('coins');
      if (S.screen === 'world') renderWorldScreen();
    });
  }

  overlay.querySelector('#daily-close').addEventListener('click', () => {
    overlay.remove();
  });
}

// ===== STORY DIALOG =====
function showStoryDialog(dialog) {
  if (!dialog || !dialog.lines || dialog.lines.length === 0) return;

  let lineIdx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'story-overlay';

  function renderLine() {
    const line = dialog.lines[lineIdx];
    overlay.innerHTML = `
      <div class="story-box">
        <div class="story-mascot">${dialog.mascot || WORLD_MASCOTS[S.currentWorld]}</div>
        <div class="story-name">${dialog.name || ''}</div>
        <div class="story-text">${line}</div>
        <div class="story-btns">
          <button class="btn btn-sm" id="story-skip">${t('storySkip')}</button>
          <button class="btn btn-primary btn-sm" id="story-next">${lineIdx < dialog.lines.length - 1 ? t('storyNext') : t('play')}</button>
        </div>
      </div>
    `;

    overlay.querySelector('#story-skip').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('#story-next').addEventListener('click', () => {
      lineIdx++;
      if (lineIdx >= dialog.lines.length) {
        overlay.remove();
      } else {
        renderLine();
      }
      playSound('tap');
    });
  }

  renderLine();
  document.body.appendChild(overlay);
}

// ===== SHARE =====
function shareResult() {
  const nameKey = LANG === 'pt' ? 'pt' : LANG === 'ar' ? 'ar' : 'en';
  const worldName = (WORLD_NAMES[nameKey] || WORLD_NAMES.en)[S.currentWorld];

  const text = LANG === 'ar'
    ? `💎 حققت ${S.score} نقطة في ${worldName} - المستوى ${S.currentLevel + 1} ⭐${'⭐'.repeat(S.stars)}\n🎮 مملكة الجواهر — Classify`
    : `💎 Scored ${S.score} in ${worldName} - Level ${S.currentLevel + 1} ⭐${'⭐'.repeat(S.stars)}\n🎮 Gem Kingdom — Classify`;

  window.parent.postMessage({
    type: 'SHARE_ACHIEVEMENT',
    game: 'gem',
    world: S.currentWorld + 1,
    level: S.currentLevel + 1,
    score: S.score,
    stars: S.stars,
  }, '*');
}

// ===== POST MESSAGE =====
function postGameComplete(won) {
  const scaledScore = Math.round(S.score > 0 ? Math.min(S.score, 100) : 0);
  const msg = {
    type: 'GAME_COMPLETE',
    score: scaledScore,
    total: 100,
    stars: S.stars,
    won,
    timeElapsed: Math.floor((Date.now() - S.levelStartTime) / 1000),
    level: S.currentLevel + 1,
    world: S.currentWorld + 1,
    maxCombo: S.maxCombo,
  };

  // Attach compact report for parent dashboard
  if (REPORTS) {
    try {
      msg.report = REPORTS.createCompactReport(S.progress);
    } catch (e) { /* skip */ }
  }

  window.parent.postMessage(msg, '*');
}

// ===== MUTE =====
function toggleMute() {
  S.muted = !S.muted;
  localStorage.setItem(KEYS.MUTED, S.muted.toString());
  qs('#mute-btn').textContent = S.muted ? '🔇' : '🔊';
  if (AUDIO) {
    if (S.muted) AUDIO.muteAll();
    else AUDIO.unmuteAll();
  }
}

// ===== HELPERS =====
function qs(sel) { return document.querySelector(sel); }

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function getWorldStars(w) {
  const ws = S.progress.worlds[w];
  if (!ws?.stars) return 0;
  return Object.values(ws.stars).reduce((a, b) => a + b, 0);
}

function getTotalStars(p) {
  let total = 0;
  for (const w of Object.values(p.worlds)) {
    if (w.stars) total += Object.values(w.stars).reduce((a, b) => a + b, 0);
  }
  return total;
}

function getUnlockedWorlds(p) {
  let count = 1; // world 0 always unlocked
  for (let w = 1; w < 10; w++) {
    if (getWorldStars(w - 1) >= 15) count++;
    else break;
  }
  return count;
}

function getCompletionPct(p) {
  const totalLevels = 100;
  return Math.floor((p.levelsCompleted / totalLevels) * 100);
}

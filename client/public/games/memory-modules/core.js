// ═══════════════════════════════════════════════════════════════
// Memory Match Pro — core.js
// Game State, Progress, Card Engine, Mechanics, DDA
// ═══════════════════════════════════════════════════════════════

import { KEYS, MECH, SHOP_ITEMS, BADGE_DEFS, POWER_UPS, XP_TABLE, STREAK_CONFIG, PRESTIGE_CONFIG, t } from './config.js';
import {
  WORLDS, LEVELS, BOSS_CATALOG,
  pickEmoji, pickFrontIcon, shuffleArr,
  getWorldStars, getWorldCompleted, getTotalStars,
  isWorldUnlocked, isLevelUnlocked,
  calcScore, fmtTime
} from './worlds.js';
import {
  sfxFlip, sfxMatch, sfxNoMatch, sfxComplete, sfxStar, sfxCoin, sfxBadge,
  sfxComboUp, sfxBossHit, sfxBossAttack, sfxTap, sfxLevelUp, sfxWhoosh,
  sfxBomb, sfxMirror, sfxChain, sfxChainFail, sfxRainbow, sfxPowerUp,
  startMusic, stopMusic, updateMusicIntensity, cardPanX,
  detectPerformance,
  initBg, stopBg, spawnConfetti, royalCelebration, spawnMatchParticles, spawnCoinFly,
  showScreen, updateCountdownDisplay, renderCards as uiRenderCards
} from './ui.js';

// Detect low-performance devices on load
detectPerformance();

// ===== MIGRATE OLD DATA =====
function migrateOldData() {
  try {
    const oldP = localStorage.getItem(KEYS.OLD_PROGRESS);
    const newP = localStorage.getItem(KEYS.PROGRESS);
    if (oldP && !newP) {
      const old = JSON.parse(oldP);
      // Old format: {unlocked:N, scores:{0:sc,...}, stars:{0:st,...}} with 20 levels
      // Map old level indices to new global indices (old levels → world 0-1 levels)
      const migrated = defaultProgress();
      if (old.stars) {
        Object.entries(old.stars).forEach(([k, v]) => {
          const oldIdx = parseInt(k);
          if (oldIdx < 20 && v > 0) {
            // Map: old 0-3 → W0 levels 0-3, old 4-7 → W0 levels 4-7, etc.
            migrated.stars[oldIdx < 10 ? oldIdx : oldIdx] = v;
          }
        });
      }
      if (old.scores) {
        Object.entries(old.scores).forEach(([k, v]) => {
          const oldIdx = parseInt(k);
          if (oldIdx < 20 && v > 0) {
            migrated.scores[oldIdx < 10 ? oldIdx : oldIdx] = v;
          }
        });
      }
      migrated.unlocked = Math.min(old.unlocked || 1, 100);
      localStorage.setItem(KEYS.PROGRESS, JSON.stringify(migrated));
    }
    // Migrate wallet
    const oldW = localStorage.getItem(KEYS.OLD_WALLET);
    const newW = localStorage.getItem(KEYS.WALLET);
    if (oldW && !newW) localStorage.setItem(KEYS.WALLET, oldW);
    // Migrate badges
    const oldB = localStorage.getItem(KEYS.OLD_BADGES);
    const newB = localStorage.getItem(KEYS.BADGES);
    if (oldB && !newB) localStorage.setItem(KEYS.BADGES, oldB);
    // Migrate DDA
    const oldD = localStorage.getItem(KEYS.OLD_DDA);
    const newD = localStorage.getItem(KEYS.DDA);
    if (oldD && !newD) localStorage.setItem(KEYS.DDA, oldD);
    // Migrate mute
    const oldM = localStorage.getItem(KEYS.OLD_MUTE);
    const newM = localStorage.getItem(KEYS.MUTE);
    if (oldM && !newM) localStorage.setItem(KEYS.MUTE, oldM);
  } catch(e) { console.warn('Migration error:', e); }
}

function defaultProgress() {
  return { unlocked: 1, scores: {}, stars: {}, worldsBeaten: {} };
}

// ===== LOAD PERSISTENT DATA =====
migrateOldData();

export let progress = JSON.parse(localStorage.getItem(KEYS.PROGRESS) || 'null') || defaultProgress();
export let wallet = JSON.parse(localStorage.getItem(KEYS.WALLET) || '{"coins":0,"owned":["default"],"equipped":"default","totalEarned":0}');
export let badgeData = JSON.parse(localStorage.getItem(KEYS.BADGES) || '{"unlocked":[],"dates":{}}');
export let ddaProfile = JSON.parse(localStorage.getItem(KEYS.DDA) || '{"skill":50,"gamesPlayed":0,"totalStars":0,"avgMoveRatio":1.0}');
export let powers = JSON.parse(localStorage.getItem(KEYS.POWERS) || '{"peek":3,"freeze":2,"hint":3,"shield":2,"shuffle":2}');

// ===== XP & LEVELING =====
function defaultXP() { return { total: 0, level: 1 }; }
export let xpData = JSON.parse(localStorage.getItem(KEYS.XP) || 'null') || defaultXP();
export function saveXP() { localStorage.setItem(KEYS.XP, JSON.stringify(xpData)); }

// ===== STREAK =====
function defaultStreak() { return { current: 0, best: 0, lastDate: null }; }
export let streakData = JSON.parse(localStorage.getItem(KEYS.STREAK) || 'null') || defaultStreak();
export function saveStreak() { localStorage.setItem(KEYS.STREAK, JSON.stringify(streakData)); }

// ===== PRESTIGE =====
function defaultPrestige() { return { level: 0 }; }
export let prestigeData = JSON.parse(localStorage.getItem(KEYS.PRESTIGE) || 'null') || defaultPrestige();
export function savePrestige() { localStorage.setItem(KEYS.PRESTIGE, JSON.stringify(prestigeData)); }

// ===== GAMEPLAY STATS =====
function defaultStats() { return { puUsed: 0, mechsPlayed: [], fastestTime: 9999, gamesPlayed: 0 }; }
export let gameStats = JSON.parse(localStorage.getItem(KEYS.STATS) || 'null') || defaultStats();
// Migrate: ensure arrays exist
if (!Array.isArray(gameStats.mechsPlayed)) gameStats.mechsPlayed = [];
export function saveStats() { localStorage.setItem(KEYS.STATS, JSON.stringify(gameStats)); }

// DDA v2: per-mechanic skill profiles
function defaultDDAv2() {
  const mechSkills = {};
  Object.values(MECH).forEach(m => { mechSkills[m] = 50; });
  return {
    mechSkills,           // per-mechanic skill (0-100)
    sessionHistory: [],   // rolling window of last 20 results {match:bool, responseMs:int, mechanic:str}
    avgResponseMs: 2000,  // avg response time in ms
    hintLevel: 0,         // current hint escalation (0=none, 1=glow, 2=pair, 3=peek)
    consecutiveFails: 0,  // consecutive mismatches in session
    consecutiveWins: 0,   // consecutive matches in session
    totalSessions: 0,
  };
}
export let ddaV2 = JSON.parse(localStorage.getItem(KEYS.DDA_V2) || 'null') || defaultDDAv2();
// Ensure new mechanic keys exist on load
Object.values(MECH).forEach(m => { if (ddaV2.mechSkills[m] === undefined) ddaV2.mechSkills[m] = 50; });

export function saveDDAv2() { localStorage.setItem(KEYS.DDA_V2, JSON.stringify(ddaV2)); }

export function saveProgress() { localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress)); }
export function saveWallet() { localStorage.setItem(KEYS.WALLET, JSON.stringify(wallet)); }
export function saveBadges() { localStorage.setItem(KEYS.BADGES, JSON.stringify(badgeData)); }
export function saveDDA() { localStorage.setItem(KEYS.DDA, JSON.stringify(ddaProfile)); }
export function savePowers() { localStorage.setItem(KEYS.POWERS, JSON.stringify(powers)); }

// ===== MUTE =====
export let soundMuted = false;
export function initMute() {
  try { const v = localStorage.getItem(KEYS.MUTE); if (v != null) soundMuted = (v === 'true'); } catch(e) {}
  updateMuteBtns();
}
export function toggleMute() {
  soundMuted = !soundMuted;
  try { localStorage.setItem(KEYS.MUTE, soundMuted ? 'true' : 'false'); } catch(e) {}
  updateMuteBtns();
}
function updateMuteBtns() {
  const icon = soundMuted ? '🔇' : '🔊';
  document.querySelectorAll('.mute-btn').forEach(b => b.textContent = icon);
}

// ===== GAME STATE =====
let cards = [], moves = 0, matchedPairs = 0, totalPairs = 8;
let isChecking = false, gameStarted = false, startTime = null;
let timerInterval = null, elapsedSeconds = 0;
let currentLevel = -1, currentGridCols = 4, currentGridRows = 4;
let currentEmoji = [], currentFrontIcon = '❓', currentGroup = 0;
let currentWorld = 0;
let comboStreak = 0; // Phase B: consecutive match streak

// Mechanic state
let mechanic = MECH.CLASSIC, matchCount = 2;
let picks = [], fogSet = new Set(), maskedMap = {};
let peekInProgress = false, movesSinceShuffle = 0;
let bossCountdownSec = 0, bossTimerId = null;
let levelTimerSec = 0, levelTimerMax = 0, levelTimerId = null;

// Phase C: New mechanic state
let chainOrder = [], chainStep = 0;
let bombMap = {};
let rainbowSet = new Set();

// Phase C: Power-up state
let shieldActive = false, freezeActive = false, freezeTimeout = null;

// Boss state
let bossState = null;

// DDA state
let dda = { skill: 50, streak: 0, failStreak: 0, lastMoveTime: 0, hintTimer: null, diff: 'normal' };
// DDA v2 session state
let ddaLastFlipTime = 0;        // timestamp of last card flip
let ddaHintEscalation = 0;      // 0=none, 1=glow, 2=highlight-pair, 3=brief-peek
let ddaMechSkill = 50;          // current mechanic's skill (cached from ddaV2)

// ===== ACCESSORS =====
export function getState() {
  return {
    cards, moves, matchedPairs, totalPairs, isChecking, gameStarted,
    elapsedSeconds, currentLevel, currentGridCols, currentGridRows,
    currentEmoji, currentFrontIcon, currentGroup, currentWorld,
    mechanic, matchCount, picks, fogSet, maskedMap, peekInProgress,
    movesSinceShuffle, bossCountdownSec, bossState,
    levelTimerSec, levelTimerMax, dda, ddaMechSkill, ddaHintEscalation,
    chainOrder, chainStep, bombMap, rainbowSet, shieldActive, freezeActive
  };
}

// ===== WORLD MAP RENDER =====
export function renderWorldMap() {
  const container = document.getElementById('world-grid');
  if (!container) return;
  container.innerHTML = '';

  WORLDS.forEach((world, idx) => {
    const unlocked = isWorldUnlocked(progress, idx);
    const stars = getWorldStars(progress, idx);
    const completed = getWorldCompleted(progress, idx);
    const totalStarsMax = 30; // 10 levels × 3 stars

    const card = document.createElement('div');
    card.className = 'wc' + (unlocked ? '' : ' locked') + (completed >= 10 ? ' complete' : '');
    if (unlocked) card.style.background = world.gradient;

    const worldNum = document.createElement('div');
    worldNum.className = 'wc-num';
    worldNum.textContent = idx + 1;

    const worldEmoji = document.createElement('div');
    worldEmoji.className = 'wc-emoji';
    worldEmoji.textContent = world.emoji;

    const worldName = document.createElement('div');
    worldName.className = 'wc-name';
    worldName.textContent = t.worldNames[idx] || '';

    const worldChar = document.createElement('div');
    worldChar.className = 'wc-char';
    worldChar.textContent = t.worldChars ? t.worldChars[idx] : '';

    const worldProg = document.createElement('div');
    worldProg.className = 'wc-prog';
    if (unlocked) {
      const bar = document.createElement('div');
      bar.className = 'wc-bar';
      const fill = document.createElement('div');
      fill.className = 'wc-fill';
      fill.style.width = (stars / totalStarsMax * 100) + '%';
      bar.appendChild(fill);
      worldProg.appendChild(bar);
      const info = document.createElement('div');
      info.className = 'wc-info';
      info.textContent = (t.starsCount || '⭐ {n}/{total}').replace('{n}', stars).replace('{total}', totalStarsMax);
      worldProg.appendChild(info);
    } else {
      worldProg.innerHTML = '<span class="wc-lock">🔒</span>';
    }

    card.appendChild(worldNum);
    card.appendChild(worldEmoji);
    card.appendChild(worldName);
    card.appendChild(worldChar);
    card.appendChild(worldProg);

    if (unlocked) {
      card.onclick = () => enterWorld(idx);
    }

    container.appendChild(card);
  });
}

// ===== ENTER WORLD → SHOW LEVEL SELECT =====
export function enterWorld(worldIdx) {
  currentWorld = worldIdx;
  sfxTap();
  renderLevelSelect(worldIdx);
  showScreen('lvl-screen');
}

// ===== LEVEL SELECT RENDER =====
export function renderLevelSelect(worldIdx) {
  const world = WORLDS[worldIdx];
  if (!world) return;

  const grid = document.getElementById('ls-g');
  const title = document.getElementById('ls-t');
  const sub = document.getElementById('ls-s');
  const lvlScreen = document.getElementById('lvl-screen');

  if (title) title.textContent = t.worldNames[worldIdx] || '';
  if (sub) sub.textContent = t.selectLevel || '';
  if (lvlScreen) lvlScreen.style.background = world.gradient;

  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < 10; i++) {
    const gi = worldIdx * 10 + i;
    const lvl = LEVELS[gi];
    if (!lvl) continue;

    const unlocked = isLevelUnlocked(progress, gi);
    const stars = progress.stars[gi] || 0;
    const isCurrent = unlocked && stars === 0;

    const card = document.createElement('div');
    card.className = 'lc' + (unlocked ? '' : ' locked') + (isCurrent ? ' current' : '');
    card.setAttribute('data-grp', world.group);

    if (unlocked) {
      const lvlName = getLevelNameLocal(worldIdx, i);
      const isBoss = lvl.isBoss;
      card.innerHTML =
        `<div class="lc-num">${isBoss ? '👑' : (i + 1)}</div>` +
        `<div class="lc-emoji">${isBoss ? (BOSS_CATALOG[lvl.bossType]?.emoji || '👑') : world.emoji}</div>` +
        `<div class="lc-name">${lvlName}</div>` +
        `<div class="lc-stars">${stars >= 1 ? '⭐' : '☆'}${stars >= 2 ? '⭐' : '☆'}${stars >= 3 ? '⭐' : '☆'}</div>`;
      card.onclick = () => startLevel(gi);
    } else {
      card.innerHTML =
        `<div class="lc-num" style="opacity:.4">${i + 1}</div>` +
        `<div class="lc-lock">${t.locked}</div>` +
        `<div class="lc-name" style="opacity:.4">${getLevelNameLocal(worldIdx, i)}</div>`;
    }
    grid.appendChild(card);
  }
}

function getLevelNameLocal(worldIdx, localIdx) {
  const key = 'lvNamesW' + worldIdx;
  const names = t[key];
  return names ? (names[localIdx] || '') : '';
}

// ===== START LEVEL =====
export function startLevel(globalIdx) {
  currentLevel = globalIdx;
  const lvl = LEVELS[globalIdx];
  if (!lvl) return;

  const world = WORLDS[lvl.world];
  currentWorld = lvl.world;
  currentGroup = world.group;
  currentGridCols = lvl.gridCols;
  currentGridRows = lvl.gridRows;
  totalPairs = lvl.pairs;
  currentEmoji = pickEmoji(lvl.cat, totalPairs);

  // Pick front icon
  const equipped = SHOP_ITEMS.find(si => si.id === wallet.equipped);
  if (equipped && equipped.id !== 'default') {
    currentFrontIcon = equipped.frontIcon;
  } else {
    currentFrontIcon = pickFrontIcon(lvl.world);
  }

  // Apply theme
  const gs = document.getElementById('game-screen');
  gs.dataset.group = currentGroup;
  gs.style.background = world.gradient;

  if (equipped && equipped.id !== 'default') {
    gs.style.setProperty('--cf1', equipped.cf1);
    gs.style.setProperty('--cf2', equipped.cf2);
  } else {
    gs.style.setProperty('--cf1', lvl.cf1);
    gs.style.setProperty('--cf2', lvl.cf2);
  }
  document.getElementById('done-screen').style.background = world.gradient;

  const lvlName = getLevelNameLocal(lvl.world, lvl.localIdx);
  document.getElementById('g-t').textContent = lvlName;
  document.getElementById('g-b').textContent = lvl.isBoss ? '👑' : '' + (lvl.localIdx + 1);

  // Boss label
  if (lvl.isBoss) {
    const bossInfo = BOSS_CATALOG[lvl.bossType];
    if (bossInfo) {
      const bossName = t.bossNames ? t.bossNames[bossInfo.idx] : lvl.bossType;
      document.getElementById('g-t').textContent = bossName;
    }
  }

  initBg(currentGroup);
  startMusic(currentGroup);
  resetGame();
  showScreen('game-screen');
  sfxWhoosh();

  // Render cards via ResizeObserver
  const wrap = document.querySelector('.grid-wrap');
  if (window._cardRO) window._cardRO.disconnect();
  window._cardRO = new ResizeObserver(entries => {
    const r = entries[0].contentRect;
    if (r.width > 50 && r.height > 50) {
      window._cardRO.disconnect();
      renderCardsNow();
      initBg(currentGroup);
    }
  });
  window._cardRO.observe(wrap);
  setTimeout(() => {
    if (window._cardRO) { window._cardRO.disconnect(); window._cardRO = null; }
    const g = document.getElementById('grid');
    if (!g.children.length) renderCardsNow();
  }, 500);

  if (mechanic === MECH.TIMED) setTimeout(() => doTimedPeek(), 400);
}

function resetGame() {
  clearInterval(timerInterval);
  if (bossTimerId) { clearInterval(bossTimerId); bossTimerId = null; }
  stopLevelTimer();
  picks = []; isChecking = false;
  gameStarted = false; startTime = null; elapsedSeconds = 0;
  peekInProgress = false; movesSinceShuffle = 0;
  fogSet = new Set(); maskedMap = {};
  bossCountdownSec = 0; levelTimerSec = 0; levelTimerMax = 0;
  bossState = null; comboStreak = 0;
  chainOrder = []; chainStep = 0;
  bombMap = {}; rainbowSet = new Set();
  shieldActive = false; freezeActive = false;
  if (freezeTimeout) { clearTimeout(freezeTimeout); freezeTimeout = null; }

  const cfg = LEVELS[currentLevel];
  mechanic = cfg ? cfg.mechanic || MECH.CLASSIC : MECH.CLASSIC;
  matchCount = mechanic === MECH.TRIPLE ? 3 : 2;

  levelTimerMax = computeLevelTimer(currentLevel, cfg ? cfg.pairs : 8, mechanic);

  ddaInit();
  cards = createDeck();
  moves = 0; matchedPairs = 0;

  document.getElementById('g-mv').textContent = '0';
  document.getElementById('g-pr').textContent = '0/' + totalPairs;
  document.getElementById('g-prl').textContent = (matchCount === 3 && t.sets) ? t.sets : t.pairs;
  document.getElementById('g-tm').textContent = '0:00';
  document.getElementById('hint').style.display = '';

  const mechInfo = document.getElementById('mech-info');
  const cdWrap = document.getElementById('cd-wrap');
  const peekBanner = document.getElementById('peek-banner');
  if (mechInfo) mechInfo.style.display = 'none';
  if (cdWrap) cdWrap.style.display = 'none';
  if (peekBanner) peekBanner.classList.remove('show');

  // Boss setup
  if (mechanic === MECH.BOSS) {
    const cfg2 = LEVELS[currentLevel];
    const bossInfo = cfg2 && cfg2.bossType ? BOSS_CATALOG[cfg2.bossType] : null;
    if (bossInfo) {
      bossState = {
        type: cfg2.bossType,
        hp: bossInfo.hp,
        maxHp: bossInfo.hp,
        defeated: false,
        ability: bossInfo.ability,
        actionTimer: null,
      };
    }
  }

  setupMechanic();
}

function createDeck() {
  const chosen = currentEmoji.slice(0, totalPairs);
  let deck = [];
  if (matchCount === 3) {
    chosen.forEach(s => { deck.push(s, s, s); });
  } else {
    deck = [...chosen, ...chosen];
  }
  return shuffleArr(deck).map((s, i) => ({ id: i, symbol: s, flipped: false, matched: false, unmasked: false }));
}

export function renderCardsNow() {
  uiRenderCards(cards, currentGridCols, currentGridRows, currentFrontIcon, mechanic, fogSet, currentGroup, flipCard, clearFog, bombMap, rainbowSet, chainOrder, chainStep);
}

// ===== FLIP CARD =====
export function flipCard(id) {
  if (isChecking || peekInProgress) return;
  const card = cards[id];
  if (!card || card.flipped || card.matched) return;
  if (fogSet.has(id)) return;

  if (!gameStarted) {
    gameStarted = true;
    startTime = Date.now();
    document.getElementById('hint').style.display = 'none';
    timerInterval = setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      document.getElementById('g-tm').textContent = fmtTime(elapsedSeconds);
    }, 1000);
    if (mechanic === MECH.BOSS && bossCountdownSec > 0) startBossCountdown();
    if (levelTimerMax > 0) startLevelTimer();
  }

  // Masked: first flip shows decoy
  if (mechanic === MECH.MASKED && maskedMap[id] !== undefined && !card.unmasked) {
    card.flipped = true; card.unmasked = true;
    const btn = document.getElementById('grid').querySelector(`[data-id="${id}"]`);
    if (btn) {
      btn.classList.add('flipped', 'decoy-show');
      const sym = btn.querySelector('.sym');
      if (sym) sym.textContent = maskedMap[id];
    }
    sfxFlip();
    isChecking = true;
    setTimeout(() => {
      card.flipped = false;
      const btn2 = document.getElementById('grid').querySelector(`[data-id="${id}"]`);
      if (btn2) {
        btn2.classList.remove('flipped', 'decoy-show');
        btn2.disabled = false;
        const sym2 = btn2.querySelector('.sym');
        if (sym2) sym2.textContent = card.symbol;
      }
      delete maskedMap[id];
      isChecking = false;
    }, 900);
    return;
  }

  card.flipped = true;
  updateCardDOM(id, true, false);
  const pan = cardPanX(id);
  sfxFlip(pan);
  picks.push(id);

  if (picks.length < matchCount) return;

  moves++; movesSinceShuffle++;
  document.getElementById('g-mv').textContent = moves;
  const allMatch = picks.every(pid => cards[pid].symbol === cards[picks[0]].symbol);
  const hasRainbow = matchCount === 2 && picks.some(pid => rainbowSet.has(pid));
  const isMatch = allMatch || hasRainbow;

  // CHAIN: must match in correct order
  if (isMatch && mechanic === MECH.CHAIN && chainOrder.length > 0) {
    // Find the actual symbol (ignoring rainbow)
    const matchSym = cards[picks.find(pid => !rainbowSet.has(pid)) || picks[0]].symbol;
    if (matchSym !== chainOrder[chainStep]) {
      // Correct match but wrong chain order — flip back as penalty
      isChecking = true;
      sfxChainFail();
      comboStreak = 0;
      updateMusicIntensity(0);
      const chainInfo = document.getElementById('mech-info');
      if (chainInfo) { chainInfo.textContent = t.chainWrong || '❌ Wrong order!'; chainInfo.style.display = ''; }
      setTimeout(() => {
        picks.forEach(pid => { cards[pid].flipped = false; updateCardDOM(pid, false, false); });
        picks = []; isChecking = false;
        if (t.mech && t.mech[mechanic]) {
          const hint = t.mechHint ? t.mechHint[mechanic] : '';
          if (chainInfo) chainInfo.textContent = t.mech[mechanic] + (hint ? ' — ' + hint : '');
        }
        renderCardsNow();
      }, 900);
      // Tick bombs on move even if chain fails
      if (Object.keys(bombMap).length > 0) tickBombs();
      return;
    }
    chainStep++;
    sfxChain();
  }

  if (isMatch) {
    picks.forEach(pid => { cards[pid].matched = true; updateCardDOM(pid, true, true); });
    // Remove rainbow cards from set
    picks.forEach(pid => rainbowSet.delete(pid));
    // Remove bomb entries for matched cards
    picks.forEach(pid => { if (bombMap[pid]) delete bombMap[pid]; });
    matchedPairs++;
    document.getElementById('g-pr').textContent = matchedPairs + '/' + totalPairs;
    comboStreak++;
    const matchPan = cardPanX(picks[0]);
    if (hasRainbow && !allMatch) {
      sfxRainbow();
    } else {
      sfxMatch(matchPan);
    }
    if (comboStreak > 1) sfxComboUp(comboStreak);
    updateMusicIntensity(comboStreak);
    spawnMatchParticles(picks[0], picks[picks.length - 1]);
    ddaOnMatch();

    // Boss damage
    if (bossState && !bossState.defeated) {
      bossState.hp--;
      sfxBossHit();
      updateBossHP();
      if (bossState.hp <= 0) {
        bossState.defeated = true;
      }
    }

    picks = [];
    if (matchedPairs === totalPairs) setTimeout(() => endGame(), 400);
  } else {
    isChecking = true;
    sfxNoMatch();
    comboStreak = 0;
    updateMusicIntensity(0);
    ddaOnMismatch();
    setTimeout(() => {
      picks.forEach(pid => { cards[pid].flipped = false; updateCardDOM(pid, false, false); });
      picks = []; isChecking = false;
    }, 800);
  }

  // Tick bombs on every move
  if (Object.keys(bombMap).length > 0) tickBombs();

  // Moving/Boss shuffle
  const shuffleInterval = dda.diff === 'easy' ? 4 : dda.diff === 'hard' ? 2 : 3;
  if ((mechanic === MECH.MOVING || mechanic === MECH.BOSS) &&
      movesSinceShuffle >= shuffleInterval && matchedPairs < totalPairs) {
    movesSinceShuffle = 0;
    setTimeout(() => shufflePositions(), isMatch ? 600 : 1000);
  }

  // Mirror: flip grid positions every N moves
  const mirrorInterval = dda.diff === 'easy' ? 4 : dda.diff === 'hard' ? 2 : 3;
  if (mechanic === MECH.MIRROR && movesSinceShuffle >= mirrorInterval && matchedPairs < totalPairs) {
    movesSinceShuffle = 0;
    setTimeout(() => mirrorGrid(), isMatch ? 700 : 1100);
  }

  // Boss periodic action
  if (bossState && !bossState.defeated && moves % 4 === 0) {
    if (shieldActive) {
      shieldActive = false;
      showPowerMsg(t.shieldMsg || '🛡️ Blocked!');
    } else {
      setTimeout(() => { bossAction(); sfxBossAttack(); }, 500);
    }
  }
}

// ===== BOSS ACTION =====
function bossAction() {
  if (!bossState || bossState.defeated) return;
  // Simple boss action: add random fog to 1-2 unmatched cards
  const unmatched = cards.filter(c => !c.matched && !c.flipped && !fogSet.has(c.id));
  if (unmatched.length < 2) return;
  const count = Math.min(2, Math.floor(unmatched.length * 0.15));
  const targets = shuffleArr(unmatched).slice(0, count);
  targets.forEach(c => fogSet.add(c.id));
  renderCardsNow();
}

function updateBossHP() {
  const el = document.getElementById('boss-hp');
  if (!el || !bossState) return;
  el.style.display = 'flex';
  const fill = el.querySelector('.boss-hp-fill');
  if (fill) fill.style.width = (bossState.hp / bossState.maxHp * 100) + '%';
  const text = el.querySelector('.boss-hp-text');
  if (text) text.textContent = `${bossState.hp}/${bossState.maxHp}`;
}

// ===== CLEAR FOG =====
export function clearFog(id) {
  fogSet.delete(id);
  const btn = document.getElementById('grid').querySelector(`[data-id="${id}"]`);
  if (btn) {
    const fog = btn.querySelector('.fog-ov');
    if (fog) { fog.style.opacity = '0'; fog.style.transform = 'scale(.5)'; setTimeout(() => fog.remove(), 400); }
  }
  sfxFlip();
}

// ===== MIRROR GRID (Phase C) =====
function mirrorGrid() {
  if (matchedPairs >= totalPairs) return;
  const unmatched = cards.filter(c => !c.matched);
  if (unmatched.length < 4) return;
  // Reverse the symbol positions of unmatched cards
  const syms = unmatched.map(c => ({ symbol: c.symbol, unmasked: c.unmasked }));
  syms.reverse();
  unmatched.forEach((c, i) => { c.symbol = syms[i].symbol; c.flipped = false; c.unmasked = syms[i].unmasked; });
  sfxMirror();
  renderCardsNow();
  // Visual mirror animation
  const grid = document.getElementById('grid');
  if (grid) { grid.classList.add('mirror-anim'); setTimeout(() => grid.classList.remove('mirror-anim'), 600); }
  showPowerMsg(t.mirrorFlip || '🪞 Mirror!');
}

// ===== BOMB SYSTEM (Phase C) =====
function tickBombs() {
  const toExplode = [];
  Object.keys(bombMap).forEach(idStr => {
    const id = parseInt(idStr);
    const b = bombMap[id];
    if (!b || !b.active || cards[id].matched) { delete bombMap[id]; return; }
    b.countdown--;
    if (b.countdown <= 0) toExplode.push(id);
  });
  // Update bomb visuals
  renderCardsNow();
  // Explode any that hit zero
  toExplode.forEach(id => explodeBomb(id));
}

function explodeBomb(id) {
  const card = cards[id];
  if (!card || card.matched) { delete bombMap[id]; return; }
  // Find the card's pair
  const pair = cards.find(c => c.id !== id && c.symbol === card.symbol && !c.matched);
  sfxBomb();
  // Brief visual explosion
  const btn = document.getElementById('grid').querySelector(`[data-id="${id}"]`);
  if (btn) btn.classList.add('bomb-explode');
  setTimeout(() => {
    // Reshuffle the exploded card(s) into new positions among unmatched
    const unmatchedOthers = cards.filter(c => !c.matched && c.id !== id && (!pair || c.id !== pair.id));
    if (unmatchedOthers.length >= 2) {
      const targets = shuffleArr(unmatchedOthers).slice(0, 2);
      [card, pair].filter(Boolean).forEach((c, i) => {
        if (targets[i]) {
          const tmp = c.symbol; c.symbol = targets[i].symbol; targets[i].symbol = tmp;
        }
      });
    }
    delete bombMap[id];
    if (pair && bombMap[pair.id]) delete bombMap[pair.id];
    renderCardsNow();
  }, 600);
}

// ===== POWER-UP SYSTEM (Phase C) =====
function showPowerMsg(msg) {
  const el = document.getElementById('mech-info');
  if (!el) return;
  const prev = el.textContent;
  el.textContent = msg;
  el.style.display = '';
  setTimeout(() => {
    if (el.textContent === msg) {
      if (t.mech && t.mech[mechanic]) {
        const hint = t.mechHint ? t.mechHint[mechanic] : '';
        el.textContent = t.mech[mechanic] + (hint ? ' — ' + hint : '');
      } else {
        el.style.display = 'none';
      }
    }
  }, 2000);
}

export function updatePowerBar() {
  const bar = document.getElementById('pu-bar');
  if (!bar) return;
  const hasPowers = POWER_UPS.some(pu => (powers[pu.id] || 0) > 0);
  bar.style.display = hasPowers ? 'flex' : 'none';
  POWER_UPS.forEach(pu => {
    const btn = bar.querySelector(`[data-pu="${pu.id}"]`);
    if (btn) {
      const count = powers[pu.id] || 0;
      const span = btn.querySelector('.pu-count');
      if (span) span.textContent = count;
      btn.disabled = count <= 0 || !gameStarted;
      btn.classList.toggle('disabled', count <= 0);
    }
  });
}

export function usePower(puId) {
  if (!gameStarted || isChecking || peekInProgress) return;
  if (!powers[puId] || powers[puId] <= 0) {
    showPowerMsg(t.noPower || 'No powers!');
    return;
  }
  powers[puId]--;
  savePowers();
  sfxPowerUp();
  trackPUUsed();

  switch (puId) {
    case 'peek':
      doTimedPeek();
      break;
    case 'freeze':
      if (freezeActive) break;
      freezeActive = true;
      showPowerMsg(t.frozenMsg || '🧊 Frozen!');
      // Pause all timers
      if (levelTimerId) { clearInterval(levelTimerId); levelTimerId = null; }
      if (bossTimerId) { clearInterval(bossTimerId); bossTimerId = null; }
      freezeTimeout = setTimeout(() => {
        freezeActive = false;
        // Resume timers
        if (levelTimerMax > 0 && levelTimerSec > 0) startLevelTimer();
        if (mechanic === MECH.BOSS && bossCountdownSec > 0) startBossCountdown();
      }, 10000);
      break;
    case 'hint':
      ddaShowHint();
      break;
    case 'shield':
      shieldActive = true;
      showPowerMsg(t.shieldMsg || '🛡️ Shielded!');
      break;
    case 'shuffle':
      shufflePositions();
      break;
  }
  updatePowerBar();
}

function awardPowerUps(stars) {
  if (stars <= 0) return [];
  const count = stars >= 3 ? 2 : 1;
  const available = POWER_UPS.map(pu => pu.id);
  const awarded = [];
  for (let i = 0; i < count; i++) {
    const puId = available[Math.floor(Math.random() * available.length)];
    powers[puId] = (powers[puId] || 0) + 1;
    awarded.push(puId);
  }
  savePowers();
  return awarded;
}

// ===== MECHANIC SETUP =====
function setupMechanic() {
  const infoEl = document.getElementById('mech-info');
  const cdWrap = document.getElementById('cd-wrap');
  const bossHP = document.getElementById('boss-hp');
  const ap = ddaAdaptiveParams(); // DDA v2 adaptive parameters

  if (bossHP) bossHP.style.display = 'none';

  if (levelTimerMax > 0) {
    cdWrap.style.display = '';
    levelTimerSec = levelTimerMax;
    updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec);
  }

  if (mechanic === MECH.CLASSIC) { updatePowerBar(); return; }

  if (t.mech && t.mech[mechanic]) {
    const hint = t.mechHint ? t.mechHint[mechanic] : '';
    infoEl.textContent = t.mech[mechanic] + (hint ? ' — ' + hint : '');
    infoEl.style.display = '';
  }

  if (mechanic === MECH.FOG) {
    const nFog = Math.floor(cards.length * ap.fogPct);
    const idxs = shuffleArr(cards.map(c => c.id)).slice(0, nFog);
    idxs.forEach(i => fogSet.add(i));
  }

  if (mechanic === MECH.MASKED) {
    const nMask = Math.floor(cards.length * ap.maskPct);
    const idxs = shuffleArr(cards.map(c => c.id)).slice(0, nMask);
    idxs.forEach(i => {
      let decoy;
      do { decoy = currentEmoji[Math.floor(Math.random() * currentEmoji.length)]; } while (decoy === cards[i].symbol);
      maskedMap[i] = decoy;
    });
  }

  if (mechanic === MECH.BOSS) {
    const nFog = Math.floor(cards.length * ap.bossFogPct);
    const idxs = shuffleArr(cards.map(c => c.id)).slice(0, nFog);
    idxs.forEach(i => fogSet.add(i));

    bossCountdownSec = ap.bossCd;
    cdWrap.style.display = '';
    updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec);

    if (bossHP && bossState) {
      bossHP.style.display = 'flex';
      updateBossHP();
    }
  }

  // ===== MIRROR MECHANIC =====
  if (mechanic === MECH.MIRROR) {
    setTimeout(() => doTimedPeek(), 400);
  }

  // ===== CHAIN MECHANIC =====
  if (mechanic === MECH.CHAIN) {
    const uniqueSyms = [...new Set(cards.map(c => c.symbol))];
    chainOrder = shuffleArr(uniqueSyms);
    chainStep = 0;
    setTimeout(() => doTimedPeek(), 400);
  }

  // ===== BOMB MECHANIC =====
  if (mechanic === MECH.BOMB) {
    const nBombs = Math.max(2, Math.floor(cards.length * ap.bombPct));
    const bombIds = shuffleArr(cards.map(c => c.id)).slice(0, nBombs);
    bombIds.forEach(id => {
      bombMap[id] = { countdown: ap.bombCountBase + Math.floor(Math.random() * 3), active: true };
    });
  }

  // ===== RAINBOW MECHANIC =====
  if (mechanic === MECH.RAINBOW) {
    const ids = shuffleArr(cards.map(c => c.id)).slice(0, ap.rainbowCount);
    ids.forEach(id => rainbowSet.add(id));
  }

  // Show power-up bar if any powers available
  updatePowerBar();
}

// ===== TIMED PEEK =====
function doTimedPeek() {
  peekInProgress = true;
  const grid = document.getElementById('grid');
  const btns = grid.querySelectorAll('.card');
  btns.forEach(b => b.classList.add('flipped'));
  const banner = document.getElementById('peek-banner');
  const peekText = document.getElementById('peek-text');
  if (peekText) peekText.textContent = t.remember || '👀 Remember!';
  if (banner) banner.classList.add('show');
  const peekMs = dda.diff === 'easy' ? 3500 : dda.diff === 'hard' ? 1800 : 2500;
  setTimeout(() => {
    btns.forEach(b => {
      if (!b.classList.contains('matched')) { b.classList.remove('flipped'); b.disabled = false; }
    });
    if (banner) banner.classList.remove('show');
    peekInProgress = false;
  }, peekMs);
}

// ===== SHUFFLE POSITIONS =====
function shufflePositions() {
  if (matchedPairs >= totalPairs) return;
  const unmatched = cards.filter(c => !c.matched);
  if (unmatched.length < 4) return;

  picks.forEach(pid => { cards[pid].flipped = false; });
  picks = []; isChecking = false;

  const syms = unmatched.map(c => ({ symbol: c.symbol, unmasked: c.unmasked }));
  const shuffled = shuffleArr(syms);
  unmatched.forEach((c, i) => {
    c.symbol = shuffled[i].symbol;
    c.flipped = false;
    c.unmasked = shuffled[i].unmasked;
  });

  renderCardsNow();
  setTimeout(() => {
    const grid = document.getElementById('grid');
    grid.querySelectorAll('.card:not(.matched)').forEach(b => b.classList.add('shuffle-anim'));
    setTimeout(() => grid.querySelectorAll('.shuffle-anim').forEach(b => b.classList.remove('shuffle-anim')), 600);
  }, 50);
}

// ===== BOSS COUNTDOWN =====
function startBossCountdown() {
  updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec);
  bossTimerId = setInterval(() => {
    bossCountdownSec--;
    updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec);
    if (bossCountdownSec <= 0) {
      clearInterval(bossTimerId); bossTimerId = null;
      endGame();
    }
  }, 1000);
}

// ===== LEVEL TIMER =====
function computeLevelTimer(lvl, pairs, mech) {
  const mechMult = { classic: 0, timed: 8, moving: 7, masked: 7.5, fog: 7, triple: 9, boss: 0, mirror: 7, chain: 9, bomb: 0, rainbow: 6 };
  const mult = mechMult[mech] || 8;
  if (mech === MECH.CLASSIC || mech === MECH.BOSS) return 0;
  let base = pairs * mult;
  // DDA v2: use per-mechanic skill
  const sk = ddaMechSkill;
  if (sk < 35) base *= 1.3;
  else if (sk > 70) base *= 0.8;
  return Math.round(base);
}

function startLevelTimer() {
  if (levelTimerMax <= 0) return;
  levelTimerSec = levelTimerMax;
  const cdWrap = document.getElementById('cd-wrap');
  if (cdWrap) cdWrap.style.display = '';
  updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec);
  levelTimerId = setInterval(() => {
    levelTimerSec--;
    updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec);
    if (levelTimerSec <= 0) {
      clearInterval(levelTimerId); levelTimerId = null;
      endGame();
    }
  }, 1000);
}

function stopLevelTimer() {
  if (levelTimerId) { clearInterval(levelTimerId); levelTimerId = null; }
}

function updateCardDOM(id, flipped, matched) {
  const btn = document.getElementById('grid').querySelector(`[data-id="${id}"]`);
  if (!btn) return;
  btn.className = 'card' + (flipped ? ' flipped' : '') + (matched ? ' matched' : '');
  btn.disabled = flipped || matched;
}

// ===== DDA ENGINE v2 =====

// Get the effective skill for the current mechanic
function ddaGetMechSkill() {
  return ddaV2.mechSkills[mechanic] || ddaProfile.skill || 50;
}

// Compute difficulty tier from skill
function ddaGetDiff(skill) {
  if (skill < 35) return 'easy';
  if (skill > 70) return 'hard';
  return 'normal';
}

// Adaptive parameters based on per-mechanic skill
function ddaAdaptiveParams() {
  const sk = ddaMechSkill;
  return {
    fogPct:       sk < 35 ? 0.25 : sk > 70 ? 0.5  : 0.38,
    maskPct:      sk < 35 ? 0.2  : sk > 70 ? 0.45 : 0.32,
    bombCountBase:sk < 35 ? 9    : sk > 70 ? 5    : 7,
    bombPct:      sk < 35 ? 0.18 : sk > 70 ? 0.35 : 0.25,
    rainbowCount: sk < 35 ? 4    : sk > 70 ? 2    : 3,
    mirrorEvery:  sk < 35 ? 5    : sk > 70 ? 3    : 4,
    peekDuration: sk < 35 ? 2200 : sk > 70 ? 1200 : 1600,
    bossCd:       sk < 35 ? 160  : sk > 70 ? 90   : 120,
    bossFogPct:   sk < 35 ? 0.18 : sk > 70 ? 0.35 : 0.25,
    hintDelay:    sk < 35 ? 3000 : sk > 70 ? 8000 : 5500,
  };
}

function ddaInit() {
  ddaMechSkill = ddaGetMechSkill();
  const diff = ddaGetDiff(ddaMechSkill);
  dda = { skill: ddaMechSkill, streak: 0, failStreak: 0, lastMoveTime: Date.now(), hintTimer: null, diff: diff };
  ddaHintEscalation = 0;
  ddaLastFlipTime = Date.now();
  ddaUpdateBadge();
}

function ddaUpdateBadge() {
  const badge = document.getElementById('dda-badge');
  if (!badge) return;
  if (mechanic === MECH.CLASSIC && currentLevel < 3) { badge.style.display = 'none'; return; }
  badge.style.display = '';
  let diff, cls;
  const sk = ddaMechSkill;
  if (sk < 35) { diff = t.dda ? t.dda.easy : '🟢 Easy'; cls = 'easy'; }
  else if (sk > 70) { diff = t.dda ? t.dda.hard : '🔴 Hard'; cls = 'hard'; }
  else { diff = t.dda ? t.dda.normal : '🔵 Normal'; cls = 'normal'; }

  // Show session streak indicator
  const sessIcon = dda.streak >= 3 ? '🔥' : dda.failStreak >= 3 ? '❄️' : '';
  badge.textContent = diff + (sessIcon ? ' ' + sessIcon : '');
  badge.className = 'dda-badge ' + cls;
  dda.diff = cls;
}

// Record a result in the session rolling window
function ddaRecordResult(isMatch) {
  const now = Date.now();
  const responseMs = now - ddaLastFlipTime;
  ddaLastFlipTime = now;

  ddaV2.sessionHistory.push({ match: isMatch, responseMs, mechanic });
  if (ddaV2.sessionHistory.length > 20) ddaV2.sessionHistory.shift();

  // Update avg response time (exponential moving avg)
  ddaV2.avgResponseMs = Math.round(ddaV2.avgResponseMs * 0.85 + responseMs * 0.15);
}

// Get recent accuracy (last N moves)
function ddaRecentAccuracy(n) {
  const recent = ddaV2.sessionHistory.slice(-n);
  if (recent.length === 0) return 0.5;
  return recent.filter(r => r.match).length / recent.length;
}

function ddaOnMatch() {
  dda.streak++;
  dda.failStreak = 0;
  ddaHintEscalation = Math.max(0, ddaHintEscalation - 1);

  // Skill adjustment: more for fast matches, less for slow ones
  const speedBonus = ddaV2.avgResponseMs < 2000 ? 1.0 : ddaV2.avgResponseMs < 4000 ? 0.5 : 0;
  const gain = 2 + speedBonus + (dda.streak >= 3 ? 1 : 0);
  ddaMechSkill = Math.min(100, ddaMechSkill + gain);
  dda.skill = ddaMechSkill;

  ddaRecordResult(true);
  ddaClearHintTimer();
  ddaUpdateBadge();
}

function ddaOnMismatch() {
  dda.failStreak++;
  dda.streak = 0;

  // Skill drops more for high-skill players, less for low-skill
  const penaltyMult = ddaMechSkill > 70 ? 1.5 : ddaMechSkill < 35 ? 0.5 : 1.0;
  const loss = 1.5 * penaltyMult;
  ddaMechSkill = Math.max(0, ddaMechSkill - loss);
  dda.skill = ddaMechSkill;

  ddaRecordResult(false);
  ddaUpdateBadge();

  // Escalate hints based on consecutive fails
  if (dda.failStreak >= 2) {
    ddaHintEscalation = Math.min(3, ddaHintEscalation + 1);
    ddaStartHintTimer();
  }
}

function ddaStartHintTimer() {
  ddaClearHintTimer();
  const params = ddaAdaptiveParams();
  // Faster hints for lower hint levels, slower for stronger hints
  const levelDelay = [params.hintDelay, params.hintDelay * 0.7, params.hintDelay * 0.5][Math.min(ddaHintEscalation - 1, 2)];
  dda.hintTimer = setTimeout(() => {
    if (matchedPairs >= totalPairs || !gameStarted) return;
    ddaShowHint();
  }, Math.max(2000, levelDelay));
}

function ddaClearHintTimer() {
  if (dda.hintTimer) { clearTimeout(dda.hintTimer); dda.hintTimer = null; }
}

function ddaShowHint() {
  const unmatched = cards.filter(c => !c.matched && !c.flipped);
  if (unmatched.length < 2) return;
  const symCount = {};
  unmatched.forEach(c => { symCount[c.symbol] = (symCount[c.symbol] || 0) + 1; });
  const hintSym = Object.keys(symCount).find(s => symCount[s] >= (matchCount === 3 ? 3 : 2));
  if (!hintSym) return;
  const hintCards = unmatched.filter(c => c.symbol === hintSym);
  const grid = document.getElementById('grid');

  // 3-Level Progressive Hint System
  const level = Math.max(1, Math.min(3, ddaHintEscalation));

  if (level === 1) {
    // Level 1: Gentle glow — highlight ONE card faintly
    const btn = grid.querySelector(`[data-id="${hintCards[0].id}"]`);
    if (btn) {
      btn.classList.add('dda-hint-l1');
      setTimeout(() => btn.classList.remove('dda-hint-l1'), 3000);
    }
  } else if (level === 2) {
    // Level 2: Highlight pair — both cards glow stronger  
    const maxShow = matchCount === 3 ? 3 : 2;
    hintCards.slice(0, maxShow).forEach(c => {
      const btn = grid.querySelector(`[data-id="${c.id}"]`);
      if (btn) {
        btn.classList.add('dda-hint-l2');
        setTimeout(() => btn.classList.remove('dda-hint-l2'), 4000);
      }
    });
  } else {
    // Level 3: Quick peek — briefly flip both cards face-up
    const maxShow = matchCount === 3 ? 3 : 2;
    hintCards.slice(0, maxShow).forEach(c => {
      const btn = grid.querySelector(`[data-id="${c.id}"]`);
      if (btn) {
        btn.classList.add('flipped', 'dda-hint-l3');
        setTimeout(() => {
          btn.classList.remove('flipped', 'dda-hint-l3');
        }, 1200);
      }
    });
  }

  // After showing hint, reduce escalation and reset fail streak
  dda.failStreak = 0;
  ddaHintEscalation = Math.max(0, ddaHintEscalation - 1);
}

function ddaEndLevel(score, stars) {
  // Legacy profile update
  ddaProfile.gamesPlayed++;
  ddaProfile.totalStars += stars;
  const perfScore = Math.min(100, score + (stars * 5));
  ddaProfile.skill = Math.round(ddaProfile.skill * 0.7 + perfScore * 0.3);
  ddaProfile.avgMoveRatio = ddaProfile.gamesPlayed > 1
    ? ddaProfile.avgMoveRatio * 0.8 + (moves / (totalPairs || 1)) * 0.2
    : moves / (totalPairs || 1);
  saveDDA();

  // DDA v2: Per-mechanic skill update
  const accuracy = ddaRecentAccuracy(20);
  const speedFactor = ddaV2.avgResponseMs < 2500 ? 1.1 : ddaV2.avgResponseMs > 5000 ? 0.9 : 1.0;
  const mechPerfScore = Math.min(100, (score * speedFactor + accuracy * 20));
  ddaV2.mechSkills[mechanic] = Math.round(ddaMechSkill * 0.6 + mechPerfScore * 0.4);
  ddaV2.totalSessions++;
  saveDDAv2();

  ddaClearHintTimer();
}

// ===== COINS =====
export function earnCoins(stars, isFirstTime) {
  if (stars <= 0) return 0;
  const base = stars === 3 ? 50 : stars === 2 ? 25 : 10;
  const bonus = isFirstTime ? 20 : 0;
  const mechBonus = mechanic === MECH.BOSS ? 15 : mechanic === MECH.CLASSIC ? 0 : 5;
  const worldBonus = Math.floor(currentWorld * 2);
  // Prestige multiplier
  const prestigeMult = 1 + (prestigeData.level * PRESTIGE_CONFIG.coinMultiplier);
  // Streak multiplier
  const streakIdx = Math.min(streakData.current, STREAK_CONFIG.coinBonus.length - 1);
  const streakBonus = STREAK_CONFIG.coinBonus[streakIdx];
  const total = Math.round((base + bonus + mechBonus + worldBonus) * prestigeMult) + streakBonus;
  wallet.coins += total;
  wallet.totalEarned += total;
  saveWallet();
  return total;
}

// ===== XP ENGINE =====
export function earnXP(stars) {
  if (stars <= 0) return 0;
  const base = stars === 3 ? 30 : stars === 2 ? 15 : 8;
  const worldXP = Math.floor(currentWorld * 1.5);
  const prestigeMult = 1 + (prestigeData.level * PRESTIGE_CONFIG.xpMultiplier);
  const streakIdx = Math.min(streakData.current, STREAK_CONFIG.xpMultiplier.length - 1);
  const streakMult = STREAK_CONFIG.xpMultiplier[streakIdx];
  const total = Math.round((base + worldXP) * prestigeMult * streakMult);
  xpData.total += total;
  // Level up check
  let leveled = false;
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xpData.total >= XP_TABLE[i].xp) {
      if (xpData.level < XP_TABLE[i].level) {
        xpData.level = XP_TABLE[i].level;
        leveled = true;
      }
      break;
    }
  }
  saveXP();
  if (leveled) {
    sfxLevelUp();
    showXPLevelUp(xpData.level);
  }
  return total;
}

export function getXPForNextLevel() {
  for (let i = 0; i < XP_TABLE.length; i++) {
    if (XP_TABLE[i].level > xpData.level) return XP_TABLE[i].xp;
  }
  return XP_TABLE[XP_TABLE.length - 1].xp;
}

export function getXPForCurrentLevel() {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (XP_TABLE[i].level <= xpData.level) return XP_TABLE[i].xp;
  }
  return 0;
}

function showXPLevelUp(level) {
  const title = (t.xpTitles || [])[level - 1] || ('Level ' + level);
  const popup = document.createElement('div');
  popup.className = 'xp-levelup-popup';
  popup.innerHTML = `<div class="xp-lu-icon">🎉</div><div class="xp-lu-title">${t.xpLevel ? t.xpLevel.replace('{n}', level) : 'Level ' + level}</div><div class="xp-lu-name">${title}</div>`;
  document.body.appendChild(popup);
  sfxStar();
  spawnConfetti(innerWidth / 2, innerHeight * 0.35, 20);
  setTimeout(() => { if (popup.parentElement) popup.remove(); }, 3500);
}

// ===== STREAK ENGINE =====
export function updateStreak() {
  const today = new Date().toDateString();
  if (streakData.lastDate === today) return; // already counted today
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (streakData.lastDate === yesterday) {
    streakData.current += 1;
  } else if (streakData.lastDate !== today) {
    streakData.current = 1; // reset if gap
  }
  if (streakData.current > streakData.best) streakData.best = streakData.current;
  streakData.lastDate = today;
  saveStreak();
}

// ===== PRESTIGE ENGINE =====
export function canPrestige() {
  const completed = Object.keys(progress.stars).filter(k => progress.stars[k] >= 1).length;
  return completed >= PRESTIGE_CONFIG.requirement;
}

export function doPrestige() {
  if (!canPrestige()) return false;
  prestigeData.level += 1;
  savePrestige();
  // Reset progress (keep wallet, badges, stats, xp, streak, powers)
  progress.stars = {};
  progress.scores = {};
  progress.worldsBeaten = {};
  progress.unlocked = 1;
  saveProgress();
  return true;
}

// ===== TRACK MECHANIC USAGE =====
export function trackMechPlayed(mech) {
  if (!gameStats.mechsPlayed.includes(mech)) {
    gameStats.mechsPlayed.push(mech);
    saveStats();
  }
}

// ===== TRACK POWER-UP USAGE =====
export function trackPUUsed() {
  gameStats.puUsed = (gameStats.puUsed || 0) + 1;
  saveStats();
}

export function updateCoinDisplays() {
  const el = document.getElementById('coin-count'); if (el) el.textContent = wallet.coins;
  const el2 = document.getElementById('shop-coins'); if (el2) el2.textContent = wallet.coins;
  // XP bar
  updateXPDisplay();
  // Streak
  updateStreakDisplay();
}

export function updateXPDisplay() {
  const bar = document.getElementById('xp-fill');
  const txt = document.getElementById('xp-text');
  const lvl = document.getElementById('xp-level');
  if (!bar) return;
  const curLevelXP = getXPForCurrentLevel();
  const nextLevelXP = getXPForNextLevel();
  const range = nextLevelXP - curLevelXP;
  const prog = xpData.total - curLevelXP;
  const pct = range > 0 ? Math.min(100, Math.round((prog / range) * 100)) : 100;
  bar.style.width = pct + '%';
  if (txt) txt.textContent = (t.xpProgress || '{cur}/{next} XP').replace('{cur}', xpData.total).replace('{next}', nextLevelXP);
  if (lvl) {
    const title = (t.xpTitles || [])[xpData.level - 1] || ('Lv.' + xpData.level);
    lvl.textContent = title;
  }
}

export function updateStreakDisplay() {
  const el = document.getElementById('streak-display');
  if (!el) return;
  if (streakData.current > 0) {
    el.textContent = (t.streak || '🔥 Streak: {n} days').replace('{n}', streakData.current);
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

// ===== SHOP =====
export function renderShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  grid.innerHTML = '';
  document.getElementById('shop-coins').textContent = wallet.coins;
  const names = t.themeNames || [];
  SHOP_ITEMS.forEach((item, i) => {
    const isOwned = wallet.owned.includes(item.id);
    const isEquipped = wallet.equipped === item.id;
    const canBuy = wallet.coins >= item.price;
    const card = document.createElement('div');
    card.className = 'shop-item' + (isEquipped ? ' equipped' : isOwned ? ' owned' : canBuy ? '' : ' locked');
    const preview = document.createElement('div');
    preview.className = 'si-preview';
    preview.style.background = `linear-gradient(145deg,${item.cf1},${item.cf2})`;
    preview.textContent = item.frontIcon;
    card.appendChild(preview);
    const name = document.createElement('div'); name.className = 'si-name'; name.textContent = names[i] || item.id; card.appendChild(name);
    if (!isOwned) {
      const price = document.createElement('div'); price.className = 'si-price'; price.textContent = '🪙 ' + item.price; card.appendChild(price);
    }
    const btn = document.createElement('button'); btn.className = 'si-btn';
    if (isEquipped) { btn.className += ' equipped'; btn.textContent = t.equipped || '✅ Equipped'; btn.disabled = true; }
    else if (isOwned) { btn.className += ' equip'; btn.textContent = t.equip || 'Equip'; btn.onclick = () => { wallet.equipped = item.id; saveWallet(); renderShop(); }; }
    else if (canBuy) { btn.className += ' buy'; btn.textContent = (t.buy || 'Buy') + ' 🪙' + item.price; btn.onclick = () => buyItem(item); }
    else { btn.className += ' cant'; btn.textContent = t.cantAfford || 'Not enough'; btn.disabled = true; }
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

function buyItem(item) {
  if (wallet.coins < item.price) return;
  wallet.coins -= item.price;
  wallet.owned.push(item.id);
  wallet.equipped = item.id;
  saveWallet();
  sfxCoin();
  renderShop();
  updateCoinDisplays();
}

// ===== BADGES (30 achievements) =====
export function renderBadges() {
  const grid = document.getElementById('badge-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const unlockedCount = badgeData.unlocked.length;
  document.getElementById('badge-sub').textContent = (t.badgeCount || '{n}/{total}').replace('{n}', unlockedCount).replace('{total}', BADGE_DEFS.length);
  const names = t.badgeNames || [];
  const descs = t.badgeDescs || [];
  BADGE_DEFS.forEach((b, i) => {
    const isUnlocked = badgeData.unlocked.includes(b.id);
    const card = document.createElement('div');
    card.className = 'badge-card' + (isUnlocked ? ' unlocked' : ' locked');
    const progress_pct = getBadgeProgress(b);
    card.innerHTML = `<div class="bc-emoji">${b.emoji}</div><div class="bc-name">${names[i] || b.id}</div><div class="bc-desc">${descs[i] || ''}</div>${isUnlocked && badgeData.dates[b.id] ? '<div class="bc-date">' + badgeData.dates[b.id] + '</div>' : ''}${!isUnlocked ? '<div class="bc-progress"><div class="bc-prog-fill" style="width:' + progress_pct + '%"></div></div>' : ''}`;
    grid.appendChild(card);
  });
}

function getBadgeProgress(b) {
  const totalStarsVal = getTotalStars(progress);
  const completedLevels = Object.keys(progress.stars).filter(k => progress.stars[k] >= 1).length;
  const perfectLevels = Object.values(progress.stars).filter(s => s >= 3).length;

  let current = 0, goal = b.goal;
  if (b.type === 'levels') current = completedLevels;
  else if (b.type === 'stars') current = totalStarsVal;
  else if (b.type === 'perfect') current = perfectLevels > 0 ? 1 : 0;
  else if (b.type === 'perfectN') current = perfectLevels;
  else if (b.type === 'world') current = getWorldCompleted(progress, b.goal);
  else if (b.type === 'allWorlds') { const done = WORLDS.every((_, idx) => getWorldCompleted(progress, idx) >= 10); current = done ? 1 : 0; goal = 1; }
  else if (b.type === 'speed') current = gameStats.fastestTime <= b.goal ? 1 : 0;
  else if (b.type === 'totalCoins') current = wallet.totalEarned;
  else if (b.type === 'ownedThemes') current = wallet.owned.length;
  else if (b.type === 'streak') current = streakData.best;
  else if (b.type === 'mechMaster') { const max = Math.max(...Object.values(ddaV2.mechSkills)); current = max; }
  else if (b.type === 'allMechs') current = gameStats.mechsPlayed.length >= 10 ? 1 : 0;
  else if (b.type === 'puUsed') current = gameStats.puUsed || 0;
  else if (b.type === 'prestige') current = prestigeData.level;

  if (goal <= 0) return 100;
  return Math.min(100, Math.round((current / goal) * 100));
}

function checkBadges() {
  const newBadges = [];
  const totalStarsVal = getTotalStars(progress);
  const completedLevels = Object.keys(progress.stars).filter(k => progress.stars[k] >= 1).length;
  const perfectLevels = Object.values(progress.stars).filter(s => s >= 3).length;

  BADGE_DEFS.forEach(b => {
    if (badgeData.unlocked.includes(b.id)) return;
    let earned = false;
    if (b.type === 'levels') earned = completedLevels >= b.goal;
    else if (b.type === 'stars') earned = totalStarsVal >= b.goal;
    else if (b.type === 'perfect') earned = perfectLevels >= 1;
    else if (b.type === 'perfectN') earned = perfectLevels >= b.goal;
    else if (b.type === 'world') earned = getWorldCompleted(progress, b.goal) >= 10;
    else if (b.type === 'allWorlds') earned = WORLDS.every((_, idx) => getWorldCompleted(progress, idx) >= 10);
    else if (b.type === 'speed') earned = gameStats.fastestTime <= b.goal;
    else if (b.type === 'totalCoins') earned = wallet.totalEarned >= b.goal;
    else if (b.type === 'ownedThemes') earned = wallet.owned.length >= b.goal;
    else if (b.type === 'streak') earned = streakData.best >= b.goal;
    else if (b.type === 'mechMaster') earned = Object.values(ddaV2.mechSkills).some(s => s >= b.goal);
    else if (b.type === 'allMechs') earned = gameStats.mechsPlayed.length >= 10;
    else if (b.type === 'puUsed') earned = (gameStats.puUsed || 0) >= b.goal;
    else if (b.type === 'prestige') earned = prestigeData.level >= b.goal;

    if (earned) {
      badgeData.unlocked.push(b.id);
      badgeData.dates[b.id] = new Date().toLocaleDateString();
      newBadges.push(b);
    }
  });

  if (newBadges.length > 0) {
    saveBadges();
    // Show badges one by one with delay
    newBadges.forEach((badge, idx) => {
      setTimeout(() => showBadgePopup(badge), idx * 2500);
    });
  }
}

function showBadgePopup(badge) {
  const idx = BADGE_DEFS.indexOf(badge);
  const name = (t.badgeNames || [])[idx] || badge.id;
  const popup = document.createElement('div'); popup.className = 'badge-popup';
  popup.innerHTML = `<div class="bp-emoji">${badge.emoji}</div><div class="bp-title">${t.newBadge || '🎉 New Badge!'}</div><div class="bp-name">${name}</div><button class="bp-close" onclick="this.parentElement.remove()">OK</button>`;
  document.body.appendChild(popup);
  sfxBadge();
  spawnConfetti(innerWidth / 2, innerHeight * 0.3, 30);
  setTimeout(() => { if (popup.parentElement) popup.remove(); }, 5000);
}

// ===== END GAME =====
export function endGame() {
  clearInterval(timerInterval);
  if (bossTimerId) { clearInterval(bossTimerId); bossTimerId = null; }
  stopLevelTimer();
  ddaClearHintTimer();
  stopMusic();
  peekInProgress = false;
  const dur = Math.floor((Date.now() - startTime) / 1000);
  const isPartial = matchedPairs < totalPairs;
  const sc = calcScore(moves, totalPairs, dur, matchedPairs, mechanic);
  let stars = 0;
  if (sc >= 50) stars = 1;
  if (sc >= 75) stars = 2;
  if (sc >= 90) stars = 3;
  if (isPartial) stars = 0;

  ddaEndLevel(sc, stars);

  if (currentLevel >= 0) {
    const prev = progress.stars[currentLevel] || 0;
    const isFirstTime = prev === 0 && stars >= 1;
    if (stars > prev) progress.stars[currentLevel] = stars;
    const prevSc = progress.scores[currentLevel] || 0;
    if (sc > prevSc) progress.scores[currentLevel] = sc;

    // Auto-unlock next level
    if (stars >= 1) {
      const nextGi = currentLevel + 1;
      if (nextGi < LEVELS.length) {
        // Just check progress; isLevelUnlocked handles the logic
      }
      // Mark world beaten if boss level completed
      const lvl = LEVELS[currentLevel];
      if (lvl && lvl.isBoss && stars >= 1) {
        progress.worldsBeaten[lvl.world] = true;
      }
    }
    saveProgress();

    const coinsGained = earnCoins(stars, prev === 0 && stars >= 1);
    const dCoins = document.getElementById('d-coins');
    const dCoinsVal = document.getElementById('d-coins-val');
    if (coinsGained > 0 && dCoins && dCoinsVal) {
      dCoinsVal.textContent = coinsGained;
      dCoins.style.display = '';
      sfxCoin();
      setTimeout(() => spawnCoinFly(coinsGained), 300);
    } else if (dCoins) dCoins.style.display = 'none';

    // XP
    const xpGained = earnXP(stars);
    const dXP = document.getElementById('d-xp');
    if (xpGained > 0 && dXP) {
      dXP.style.display = '';
      dXP.textContent = (t.xpGained || '+{n} XP').replace('{n}', xpGained);
    } else if (dXP) dXP.style.display = 'none';

    // Streak
    updateStreak();
    const streakIdx = Math.min(streakData.current, STREAK_CONFIG.coinBonus.length - 1);
    const dStreak = document.getElementById('d-streak');
    if (streakData.current > 1 && dStreak) {
      dStreak.style.display = '';
      dStreak.textContent = (t.streak || '🔥 Streak: {n} days').replace('{n}', streakData.current);
    } else if (dStreak) dStreak.style.display = 'none';

    // Track fastest time
    if (!isPartial && dur < gameStats.fastestTime) {
      gameStats.fastestTime = dur;
      saveStats();
    }
    // Track mechanic played
    trackMechPlayed(mechanic);
    // Track games played
    gameStats.gamesPlayed = (gameStats.gamesPlayed || 0) + 1;
    saveStats();

    // Award power-ups based on stars
    const puAwarded = awardPowerUps(stars);
    const dPu = document.getElementById('d-powers');
    if (puAwarded.length > 0 && dPu) {
      dPu.style.display = '';
      dPu.innerHTML = '<span class="pu-award-icon">🎁</span> ' +
        puAwarded.map(p => POWER_UPS.find(x => x.id === p)).filter(Boolean)
          .map(p => p.icon).join(' ');
      sfxPowerUp();
    } else if (dPu) dPu.style.display = 'none';

    setTimeout(() => checkBadges(), 1200);
  }

  let title, emoji;
  if (isPartial) { title = t.timeUp || '⏰ Time\'s up!'; emoji = '⏰'; }
  else if (bossState && bossState.defeated) { title = t.bossDefeated || '🎉 Boss Defeated!'; emoji = '🏆'; }
  else if (stars >= 3) { title = t.excellent; emoji = '🏆'; }
  else if (stars >= 2) { title = t.great; emoji = '🎉'; }
  else if (stars >= 1) { title = t.good; emoji = '👍'; }
  else { title = t.tryMore; emoji = '💪'; }

  document.getElementById('d-e').textContent = emoji;
  document.getElementById('d-t').textContent = title;
  document.getElementById('d-sub').textContent = isPartial ? (matchedPairs + '/' + totalPairs) : t.done;
  document.getElementById('d-sc').textContent = sc + '/100';
  document.getElementById('d-mv2').textContent = moves;
  document.getElementById('d-tm').textContent = fmtTime(dur);

  const starsEl = document.getElementById('d-st');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const sp = document.createElement('span');
    sp.textContent = i < stars ? '⭐' : '☆';
    sp.style.opacity = i < stars ? '1' : '.3';
    starsEl.appendChild(sp);
  }

  const lvl = LEVELS[currentLevel];
  const hasNext = currentLevel >= 0 && currentLevel < LEVELS.length - 1 && !isPartial;
  document.getElementById('d-nx').style.display = hasNext ? '' : 'none';

  sfxComplete();
  if (stars > 0) sfxStar();
  if (bossState && bossState.defeated) sfxLevelUp();
  showScreen('done-screen');
  if (royalCelebration && !isPartial) royalCelebration(stars);

  if (!isPartial) {
    for (let i = 0; i < stars * 6; i++) {
      setTimeout(() => {
        const p = document.createElement('div'); p.className = 'particle';
        p.textContent = ['⭐', '✨', '🌟', '🎉', '💎'][Math.floor(Math.random() * 5)];
        p.style.left = (Math.random() * innerWidth) + 'px';
        p.style.top = (innerHeight * 0.6 + Math.random() * 80) + 'px';
        p.style.fontSize = '22px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
      }, i * 70);
    }
  }

  try {
    window.parent.postMessage({
      type: 'GAME_COMPLETE', score: sc, total: 100,
      timeElapsed: dur, moves: moves,
      level: currentLevel >= 0 ? currentLevel + 1 : 0,
      world: currentWorld + 1, stars: stars,
      isBoss: lvl ? lvl.isBoss : false,
      bossDefeated: bossState ? bossState.defeated : false,
    }, '*');
  } catch(e) {}
}

export function nextLevel() {
  if (currentLevel >= 0 && currentLevel < LEVELS.length - 1) {
    const nextGi = currentLevel + 1;
    const nextLvl = LEVELS[nextGi];
    // If next level is in a different world, go to world map
    if (nextLvl && nextLvl.world !== currentWorld) {
      showScreen('world-screen');
      renderWorldMap();
    } else {
      startLevel(nextGi);
    }
  }
}

export function replayLevel() { if (currentLevel >= 0) startLevel(currentLevel); }

export function shareResult() {
  const lvl = currentLevel >= 0 ? currentLevel + 1 : 0;
  const stars = currentLevel >= 0 ? (progress.stars[currentLevel] || 0) : 0;
  const text = t.shareText.replace('{score}', progress.scores[currentLevel] || 0)
    .replace('{level}', lvl).replace('{stars}', '⭐'.repeat(stars));
  try { if (navigator.share) navigator.share({ title: t.title, text: text }); } catch(e) {}
  try {
    window.parent.postMessage({
      type: 'SHARE_ACHIEVEMENT', game: 'memory', level: lvl,
      score: progress.scores[currentLevel] || 0, stars: stars, text: text
    }, '*');
  } catch(e) {}
  const btn = document.getElementById('d-sh');
  const o = btn.textContent; btn.textContent = '✅';
  setTimeout(() => { btn.textContent = o; }, 2000);
}

// ===== GO BACK TO WORLD MAP =====
export function goToWorldMap() {
  stopBg();
  stopMusic();
  ddaClearHintTimer();
  stopLevelTimer();
  sfxWhoosh();
  showScreen('world-screen');
  renderWorldMap();
  updateCoinDisplays();
}

// ===== GO BACK TO LEVELS =====
export function goToLevels() {
  stopBg();
  stopMusic();
  ddaClearHintTimer();
  stopLevelTimer();
  sfxWhoosh();
  renderLevelSelect(currentWorld);
  showScreen('lvl-screen');
  updateCoinDisplays();
}

/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Core Engine
   State machine, game loop, progress, postMessage
   ═══════════════════════════════════════════════════════════════ */

import { LANG, t, applyDir } from './i18n.js';
import { WORLDS, getLevelConfig, calcStars, getWorld } from './worlds.js';
import { getQuestions } from './questions.js';
import { initAudio, sfxCorrect, sfxWrong, sfxMeow, sfxLevelUp, sfxWorldComplete, sfxBossAppear, sfxBossHit, sfxStar, sfxClick, sfxCountdown, sfxEat, sfxPurr, toggleMute, isMuted, startAmbient, stopAmbient } from './audio.js';
import { initRenderer, startParticles, stopParticles, burst, shake, pulseGlow, floatIn, animateStars, animateXP, updateTimerRing, worldTransition, applyWorldTheme } from './renderer.js';
import { loadCat, saveCat, getCatEmoji, addXP, feedCat, playCat, applyTimeDecay, updateCatState, getCatLevel, SKINS, buySkin, equipSkin } from './cat.js';
import { getStreakMessage, getNearMissMessage, checkNearMiss, checkMicroBadges, createTracker, trackAnswer, getSessionSummary, getMilestoneMessage, getComebackMessage } from './engagement.js';

const PROGRESS_KEY = 'catk_progress';

/* ── State ── */
let state = {
  screen: 'menu',
  currentWorld: 1,
  currentLevel: 1,
  questions: [],
  qIndex: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  lives: 3,
  timer: 0,
  timerInterval: null,
  totalTime: 0,
  timeUsed: 0,
  xp: 0,
  totalXP: 0,
  cat: null,
  tracker: null,
  startTime: 0,
};

let progress = null;

/* ═══════════════════════════════════════════
   Progress Management
   ═══════════════════════════════════════════ */
function defaultProgress() {
  return {
    worlds: {},        // { "1": { levels: { "1": { stars: 2, best: 85 }, ... }, completed: false } }
    totalStars: 0,
    totalXP: 0,
    levelsCleared: 0,
    coins: 0,
    lastPlayed: Date.now(),
    dailyStreak: 0,
    lastDaily: null,
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch(e) {}
  return defaultProgress();
}

function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch(e) {}
}

function isWorldUnlocked(worldId) {
  if (worldId === 1) return true;
  const prev = progress.worlds[worldId - 1];
  if (!prev) return false;
  // Need at least 7 levels completed in previous world
  const cleared = Object.values(prev.levels || {}).filter(l => l.stars > 0).length;
  return cleared >= 7;
}

function isLevelUnlocked(worldId, levelNum) {
  if (levelNum === 1) return isWorldUnlocked(worldId);
  const wData = progress.worlds[worldId];
  if (!wData) return false;
  const prevLevel = wData.levels?.[levelNum - 1];
  return prevLevel && prevLevel.stars > 0;
}

function getLevelData(worldId, levelNum) {
  return progress.worlds[worldId]?.levels?.[levelNum] || null;
}

function setLevelResult(worldId, levelNum, stars, score) {
  if (!progress.worlds[worldId]) {
    progress.worlds[worldId] = { levels: {}, completed: false };
  }
  const existing = progress.worlds[worldId].levels[levelNum];
  const isNew = !existing || existing.stars === 0;
  const improved = existing && stars > existing.stars;

  if (!existing || stars > existing.stars) {
    progress.worlds[worldId].levels[levelNum] = { stars, best: score };
  } else if (existing && score > existing.best) {
    progress.worlds[worldId].levels[levelNum].best = score;
  }

  if (isNew && stars > 0) {
    progress.levelsCleared++;
    progress.totalStars += stars;
  } else if (improved) {
    progress.totalStars += (stars - existing.stars);
  }

  // Check world completion
  const cleared = Object.values(progress.worlds[worldId].levels).filter(l => l.stars > 0).length;
  if (cleared >= 10) progress.worlds[worldId].completed = true;

  saveProgress();
  return { isNew, improved };
}

/* ═══════════════════════════════════════════
   Screen Management
   ═══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id + '-screen');
  if (el) el.classList.add('active');
  state.screen = id;
}

/* ═══════════════════════════════════════════
   Menu Screen
   ═══════════════════════════════════════════ */
function renderMenu() {
  const catEmoji = getCatEmoji(state.cat);
  const hasProgress = progress.levelsCleared > 0;

  document.getElementById('menu-cat-emoji').textContent = catEmoji;
  document.getElementById('menu-title').textContent = t.title;
  document.getElementById('menu-subtitle').textContent = t.subtitle;

  const btnPlay = document.getElementById('btn-play');
  btnPlay.textContent = hasProgress ? t.resume : t.play;

  document.getElementById('btn-mute').textContent = isMuted() ? '🔇' : '🔊';

  // Comeback message
  const hours = (Date.now() - (progress.lastPlayed || Date.now())) / (1000 * 60 * 60);
  const comeback = getComebackMessage(hours);
  const msgEl = document.getElementById('comeback-msg');
  if (comeback && msgEl) {
    msgEl.textContent = comeback;
    msgEl.style.display = 'block';
  } else if (msgEl) {
    msgEl.style.display = 'none';
  }

  // Cat stats
  const statsEl = document.getElementById('menu-cat-stats');
  if (statsEl) {
    statsEl.innerHTML = `❤️${state.cat.happiness} 🍖${100-state.cat.hunger} ⚡${state.cat.energy} 🧠${state.cat.intelligence}`;
  }

  showScreen('menu');
}

/* ═══════════════════════════════════════════
   World Map Screen
   ═══════════════════════════════════════════ */
function renderWorldMap() {
  const grid = document.getElementById('world-grid');
  grid.innerHTML = '';

  WORLDS.forEach(w => {
    const unlocked = isWorldUnlocked(w.id);
    const wData = progress.worlds[w.id];
    const cleared = wData ? Object.values(wData.levels || {}).filter(l => l.stars > 0).length : 0;
    const totalStars = wData ? Object.values(wData.levels || {}).reduce((sum, l) => sum + (l.stars || 0), 0) : 0;

    const card = document.createElement('div');
    card.className = 'world-card' + (unlocked ? '' : ' locked');
    card.style.background = unlocked ? w.bg : 'rgba(255,255,255,0.05)';
    card.innerHTML = `
      <div class="wc-emoji">${w.emoji}</div>
      <div class="wc-name">${t['w' + w.id]}</div>
      <div class="wc-subject">${t['ws' + w.id]}</div>
      <div class="wc-progress">${unlocked ? cleared + '/10' : '🔒'}</div>
      ${totalStars > 0 ? `<div class="wc-stars">⭐${totalStars}</div>` : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', () => {
        sfxClick();
        state.currentWorld = w.id;
        renderLevelSelect();
      });
    }

    grid.appendChild(card);
    if (unlocked) floatIn(card, w.id * 80);
  });

  // Top bar
  const topStars = document.getElementById('wm-total-stars');
  if (topStars) topStars.textContent = '⭐ ' + (progress.totalStars || 0);
  const topCoins = document.getElementById('wm-coins');
  if (topCoins) topCoins.textContent = '🪙 ' + (progress.coins || 0);

  showScreen('worldMap');
}

/* ═══════════════════════════════════════════
   Level Select Screen
   ═══════════════════════════════════════════ */
function renderLevelSelect() {
  const world = getWorld(state.currentWorld);
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';

  document.getElementById('ls-world-name').textContent = world.emoji + ' ' + t['w' + world.id];
  document.getElementById('ls-subject').textContent = t['ws' + world.id];

  for (let lv = 1; lv <= 10; lv++) {
    const unlocked = isLevelUnlocked(world.id, lv);
    const data = getLevelData(world.id, lv);
    const isBoss = lv === 10;

    const card = document.createElement('div');
    card.className = 'level-card' + (unlocked ? '' : ' locked') + (isBoss ? ' boss-card' : '');

    const starStr = data ? '⭐'.repeat(data.stars) + '☆'.repeat(3 - data.stars) : '☆☆☆';

    card.innerHTML = `
      <div class="lc-num">${isBoss ? '👹' : lv}</div>
      <div class="lc-label">${isBoss ? t.bossAlert : t.level + ' ' + lv}</div>
      <div class="lc-stars">${unlocked ? starStr : '🔒'}</div>
      ${data?.best ? `<div class="lc-best">${data.best}%</div>` : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', () => {
        sfxClick();
        state.currentLevel = lv;
        startLevel();
      });
    }

    grid.appendChild(card);
    if (unlocked) floatIn(card, lv * 60);
  }

  showScreen('levelSelect');
}

/* ═══════════════════════════════════════════
   Start Level (Gameplay)
   ═══════════════════════════════════════════ */
function startLevel() {
  const world = getWorld(state.currentWorld);
  const config = getLevelConfig(state.currentWorld, state.currentLevel);

  state.questions = getQuestions(world.subject, config.totalQuestions);
  state.qIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.lives = 3;
  state.totalTime = config.totalQuestions * config.timePerQuestion;
  state.timeUsed = 0;
  state.timer = config.timePerQuestion;
  state.tracker = createTracker();
  state.startTime = Date.now();

  applyWorldTheme(world);
  startParticles(world.particleType, world.particleColor);
  startAmbient(world.id);

  if (config.isBoss) {
    sfxBossAppear();
    renderBossIntro(world, config);
  } else {
    renderGameplay();
  }
}

/* ── Boss Intro ── */
function renderBossIntro(world, config) {
  const intro = document.getElementById('bossIntro-screen');
  if (intro) {
    document.getElementById('boss-emoji').textContent = world.emoji;
    document.getElementById('boss-name').textContent = t['b' + world.id];
    showScreen('bossIntro');

    setTimeout(() => {
      renderGameplay();
    }, 2000);
  } else {
    renderGameplay();
  }
}

/* ═══════════════════════════════════════════
   Gameplay Screen
   ═══════════════════════════════════════════ */
function renderGameplay() {
  const config = getLevelConfig(state.currentWorld, state.currentLevel);
  showScreen('gameplay');

  // HUD
  document.getElementById('hud-world').textContent = t['w' + state.currentWorld];
  document.getElementById('hud-level').textContent = (config.isBoss ? '👹 ' : '') + t.level + ' ' + state.currentLevel;
  updateHUD();

  renderQuestion();
  startTimer();
}

function updateHUD() {
  document.getElementById('hud-score').textContent = state.score;
  document.getElementById('hud-streak').textContent = state.streak > 1 ? '🔥' + state.streak : '';
  document.getElementById('hud-lives').textContent = '❤️'.repeat(state.lives) + '🖤'.repeat(Math.max(0, 3 - state.lives));

  // Cat mini
  const catMini = document.getElementById('hud-cat');
  if (catMini) catMini.textContent = getCatEmoji(state.cat);
}

/* ── Render current question ── */
function renderQuestion() {
  if (state.qIndex >= state.questions.length) {
    endLevel();
    return;
  }

  const q = state.questions[state.qIndex];
  const config = getLevelConfig(state.currentWorld, state.currentLevel);

  document.getElementById('q-counter').textContent = `${t.question} ${state.qIndex + 1} ${t.of} ${state.questions.length}`;
  document.getElementById('q-emoji').textContent = q.emoji;
  document.getElementById('q-text').textContent = q.q;

  // Progress bar
  const pct = ((state.qIndex) / state.questions.length) * 100;
  document.getElementById('q-progress-fill').style.width = pct + '%';

  // Options
  const optContainer = document.getElementById('q-options');
  optContainer.innerHTML = '';

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(idx, btn));
    optContainer.appendChild(btn);
    floatIn(btn, idx * 80);
  });

  // Reset timer
  state.timer = config.timePerQuestion;
  const timerEl = document.getElementById('q-timer');
  if (timerEl) timerEl.textContent = state.timer;

  state.startTime = Date.now();
}

/* ── Handle answer ── */
function handleAnswer(selectedIdx, btnEl) {
  const q = state.questions[state.qIndex];
  const correct = selectedIdx === q.answer;
  const responseTime = (Date.now() - state.startTime) / 1000;

  // Disable all buttons
  document.querySelectorAll('.opt-btn').forEach(b => b.disabled = true);

  // Track
  trackAnswer(state.tracker, correct, responseTime);

  if (correct) {
    btnEl.classList.add('correct');
    state.score++;
    state.streak++;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    sfxCorrect();
    feedCat(state.cat);

    // Burst effect at button position
    const rect = btnEl.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top, '✨', 6);

    // Streak message
    const streakMsg = getStreakMessage(state.streak);
    if (streakMsg) showToast(streakMsg);

    // Cat reaction
    state.cat.state = 'happy';
  } else {
    btnEl.classList.add('wrong');
    state.lives--;
    state.streak = 0;
    sfxWrong();
    state.cat.state = 'sad';

    // Show correct answer
    const opts = document.querySelectorAll('.opt-btn');
    if (opts[q.answer]) opts[q.answer].classList.add('correct');

    // Shake
    shake(document.getElementById('gameplay-screen'));
  }

  // Update HUD
  updateHUD();

  // Check lives
  if (state.lives <= 0) {
    setTimeout(() => endLevel(), 800);
    return;
  }

  // Next question
  setTimeout(() => {
    state.qIndex++;
    renderQuestion();
  }, correct ? 600 : 1200);
}

/* ── Timer ── */
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timer--;
    state.timeUsed++;

    const timerEl = document.getElementById('q-timer');
    if (timerEl) {
      timerEl.textContent = state.timer;
      if (state.timer <= 3) {
        sfxCountdown();
        timerEl.classList.add('timer-warning');
      } else {
        timerEl.classList.remove('timer-warning');
      }
    }

    if (state.timer <= 0) {
      // Time up for this question — treat as wrong
      state.lives--;
      state.streak = 0;
      sfxWrong();
      updateHUD();

      if (state.lives <= 0) {
        endLevel();
      } else {
        state.qIndex++;
        const config = getLevelConfig(state.currentWorld, state.currentLevel);
        state.timer = config.timePerQuestion;
        renderQuestion();
      }
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

/* ═══════════════════════════════════════════
   End Level
   ═══════════════════════════════════════════ */
function endLevel() {
  stopTimer();
  stopParticles();
  stopAmbient();

  const config = getLevelConfig(state.currentWorld, state.currentLevel);
  const total = state.questions.length;
  const scorePct = Math.round((state.score / total) * 100);
  const stars = calcStars(state.score, total, state.timeUsed, state.totalTime);
  const passed = stars > 0;

  // XP
  let xpGained = 0;
  if (passed) {
    xpGained = config.xpReward;
    const xpResult = addXP(state.cat, xpGained);
    progress.totalXP += xpGained;

    // Coins
    const coinsGained = stars * 10 + (config.isBoss ? 50 : 0);
    progress.coins += coinsGained;
    state.tracker.coinsEarned = coinsGained;
  }

  // Save level result
  const prevProgress = { ...progress };
  if (passed) {
    setLevelResult(state.currentWorld, state.currentLevel, stars, scorePct);
  }
  progress.lastPlayed = Date.now();
  saveProgress();

  // Play with cat
  if (passed) {
    playCat(state.cat);
    state.cat.state = stars === 3 ? 'proud' : 'happy';
  } else {
    state.cat.state = 'sad';
  }
  saveCat(state.cat);

  // Badges
  state.tracker.timeRemainPct = state.totalTime > 0 ? Math.max(0, 1 - state.timeUsed / state.totalTime) : 0;
  if (config.isBoss && passed) state.tracker.bossDefeated = true;
  const badges = checkMicroBadges(state.tracker);

  // Milestone
  const milestone = getMilestoneMessage(progress, prevProgress);

  // Near miss
  const nearMiss = !passed ? checkNearMiss(state.score, Math.ceil(total * config.passScore), total) : { isNearMiss: false };

  // Render results
  renderResults({
    passed,
    stars,
    scorePct,
    correct: state.score,
    total,
    maxStreak: state.maxStreak,
    xpGained,
    badges,
    milestone,
    nearMiss,
    isBoss: config.isBoss,
  });

  // PostMessage to parent (Classify integration)
  if (passed) {
    window.parent.postMessage({
      type: 'GAME_COMPLETE',
      score: scorePct,
      total: 100,
      level: state.currentLevel,
      world: state.currentWorld,
      stars: stars,
      timeElapsed: state.timeUsed,
    }, '*');
  }
}

/* ═══════════════════════════════════════════
   Results Screen
   ═══════════════════════════════════════════ */
function renderResults(data) {
  showScreen('results');

  const titleEl = document.getElementById('results-title');
  titleEl.textContent = data.passed
    ? (data.isBoss ? t.bossDefeated : t.levelComplete)
    : (data.isBoss ? t.bossFailed : t.wrong);

  // Stars
  animateStars(document.getElementById('results-stars'), data.stars);

  // Score
  document.getElementById('results-score').textContent = `${t.score}: ${data.scorePct}%`;

  // Details
  const detailsEl = document.getElementById('results-details');
  detailsEl.innerHTML = `
    ${t.correct}: ${data.correct}/${data.total}<br>
    ${t.streak}: ${data.maxStreak}<br>
    ${t.xp}: +${data.xpGained}<br>
    ${data.badges.length > 0 ? data.badges.map(b => `${b.icon} ${b.label}`).join(' · ') : ''}
  `;

  // Cat
  const catEl = document.getElementById('results-cat');
  if (catEl) {
    catEl.textContent = getCatEmoji(state.cat);
    const catMsg = document.getElementById('results-cat-msg');
    if (catMsg) catMsg.textContent = data.passed ? t.catProud : t.catSad;
  }

  // Milestone toast
  if (data.milestone) {
    setTimeout(() => showToast(data.milestone), 1000);
  }

  // Near miss
  if (data.nearMiss?.isNearMiss) {
    setTimeout(() => showToast(getNearMissMessage()), 800);
  }

  // Sound
  if (data.passed) {
    if (data.isBoss) sfxWorldComplete();
    else sfxLevelUp();
  } else {
    sfxMeow();
  }

  // Buttons
  const nextBtn = document.getElementById('btn-next');
  const retryBtn = document.getElementById('btn-retry');
  const homeBtn = document.getElementById('btn-home');

  if (nextBtn) {
    nextBtn.style.display = data.passed ? '' : 'none';
    nextBtn.onclick = () => {
      sfxClick();
      if (state.currentLevel >= 10) {
        // World complete — go to world map
        worldTransition(() => renderWorldMap());
      } else {
        state.currentLevel++;
        worldTransition(() => startLevel());
      }
    };
  }

  if (retryBtn) {
    retryBtn.onclick = () => {
      sfxClick();
      startLevel();
    };
  }

  if (homeBtn) {
    homeBtn.onclick = () => {
      sfxClick();
      worldTransition(() => renderMenu());
    };
  }
}

/* ═══════════════════════════════════════════
   Store Screen
   ═══════════════════════════════════════════ */
function renderStore() {
  const grid = document.getElementById('store-grid');
  if (!grid) return;
  grid.innerHTML = '';

  document.getElementById('store-coins').textContent = '🪙 ' + progress.coins;

  SKINS.forEach(skin => {
    const owned = state.cat.unlockedSkins.includes(skin.id);
    const equipped = state.cat.equippedSkin === skin.id;

    const card = document.createElement('div');
    card.className = 'store-card' + (equipped ? ' equipped' : '');
    card.innerHTML = `
      <div class="sc-emoji">${skin.emoji}</div>
      <div class="sc-name">${typeof skin.name === 'function' ? skin.name() : skin.name}</div>
      <div class="sc-price">${owned ? (equipped ? t.equipped : t.owned) : '🪙' + skin.cost}</div>
    `;

    card.addEventListener('click', () => {
      if (equipped) return;
      if (owned) {
        equipSkin(state.cat, skin.id);
        sfxPurr();
        renderStore();
      } else {
        const result = buySkin(state.cat, skin.id, progress.coins);
        if (result.success) {
          progress.coins -= result.cost;
          saveProgress();
          saveCat(state.cat);
          equipSkin(state.cat, skin.id);
          sfxStar();
          burst(window.innerWidth / 2, window.innerHeight / 2, '✨', 12);
          renderStore();
        } else {
          showToast(t.notEnough);
          sfxWrong();
        }
      }
    });

    grid.appendChild(card);
  });

  showScreen('store');
}

/* ═══════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════ */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
export function init() {
  applyDir();
  initAudio();
  initRenderer();

  // Load data
  progress = loadProgress();
  state.cat = loadCat();
  applyTimeDecay(state.cat);

  // Wire up menu buttons
  document.getElementById('btn-play').addEventListener('click', () => {
    sfxClick();
    worldTransition(() => renderWorldMap());
  });

  document.getElementById('btn-mute').addEventListener('click', () => {
    const m = toggleMute();
    document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊';
  });

  const btnStore = document.getElementById('btn-store');
  if (btnStore) {
    btnStore.addEventListener('click', () => {
      sfxClick();
      renderStore();
    });
  }

  // Back buttons
  document.querySelectorAll('[data-action="back-menu"]').forEach(b => {
    b.addEventListener('click', () => { sfxClick(); renderMenu(); });
  });
  document.querySelectorAll('[data-action="back-worldmap"]').forEach(b => {
    b.addEventListener('click', () => { sfxClick(); renderWorldMap(); });
  });
  document.querySelectorAll('[data-action="back-levels"]').forEach(b => {
    b.addEventListener('click', () => { sfxClick(); renderLevelSelect(); });
  });

  // Render menu
  renderMenu();
}

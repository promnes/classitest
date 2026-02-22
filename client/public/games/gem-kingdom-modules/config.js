// ===== Gem Kingdom 💎 — Configuration & i18n Module =====
// Constants, internationalization (ar/en/pt), emoji pools, storage keys

export const LANG = new URLSearchParams(location.search).get('lang') || 'ar';
export const STORAGE_PREFIX = 'classify_gem';
export const KEYS = {
  PROGRESS: `${STORAGE_PREFIX}_progress`,
  WALLET: `${STORAGE_PREFIX}_wallet`,
  DDA: `${STORAGE_PREFIX}_dda`,
  MUTED: `${STORAGE_PREFIX}_muted`,
  SETTINGS: `${STORAGE_PREFIX}_settings`,
  DAILY: `${STORAGE_PREFIX}_daily`,
  STORY: `${STORAGE_PREFIX}_story`,
};

// ===== i18n STRINGS =====
const STRINGS = {
  ar: {
    title: 'مملكة الجواهر',
    subtitle: 'مغامرة تعليمية مليئة بالتحديات!',
    play: 'العب',
    back: 'رجوع',
    next: 'التالي',
    replay: 'إعادة',
    share: 'مشاركة',
    mute: '🔇',
    unmute: '🔊',
    score: 'النقاط',
    moves: 'الحركات',
    time: 'الوقت',
    level: 'المستوى',
    world: 'العالم',
    stars: 'نجوم',
    locked: 'مقفل',
    combo: 'كومبو',
    excellent: 'ممتاز!',
    great: 'رائع!',
    good: 'جيد!',
    tryAgain: 'حاول مرة أخرى',
    noMoves: 'انتهت الحركات!',
    shuffling: 'جاري الخلط...',
    levelComplete: 'المستوى مكتمل!',
    worldComplete: 'تم فتح عالم جديد!',
    bossAppears: 'ظهر الزعيم!',
    bossDefeated: 'هُزم الزعيم!',
    bossAttack: 'هجوم الزعيم!',
    miniBoss: 'زعيم صغير',
    worldBoss: 'زعيم العالم',
    hp: 'صحة',
    objectives: 'الأهداف',
    objScore: 'اجمع {n} نقطة',
    objCollect: 'اجمع {n} {gem}',
    objBreakIce: 'كسر {n} جليد',
    objFreeCaged: 'حرر {n} محبوسين',
    objLightTiles: 'أنر {n} بلاطة',
    objCascade: '{n} كومبو متسلسل',
    objUseSpecial: 'استخدم {n} خاص',
    objClearBottom: 'أنزل {n} أحجار',
    objDefuse: 'فجّر {n} قنابل',
    objBoss: 'اهزم الزعيم',
    coins: 'عملات',
    gems: 'جواهر',
    shop: 'المتجر',
    buy: 'شراء',
    owned: 'مملوكة',
    notEnough: 'عملات غير كافية',
    dailyReward: 'مكافأة يومية!',
    day: 'اليوم',
    streak: 'سلسلة',
    claim: 'استلم',
    claimed: 'تم الاستلام',
    achievements: 'الإنجازات',
    newAchievement: 'إنجاز جديد!',
    stats: 'الإحصائيات',
    didYouKnow: 'هل تعلم؟',
    storyNext: 'التالي',
    storySkip: 'تخطي',
    hint: 'تلميح',
    boosterHammer: 'المطرقة',
    boosterShuffle: 'الخلاط',
    boosterMoves: '+5 حركات',
    boosterHint: 'تلميح',
    boosterBomb: 'قنبلة',
    boosterRocket: 'صاروخ مزدوج',
    boosterFreeze: 'تجميد الوقت',
    boosterMulti: 'مضاعف النقاط',
    report: 'تقرير الأداء',
    skillPlanning: 'التخطيط',
    skillPattern: 'تمييز الأنماط',
    skillSpeed: 'سرعة الاستجابة',
    skillProblem: 'حل المشكلات',
    strong: 'قوي',
    developing: 'يتطور',
    needsPractice: 'يحتاج تدريب',
    menu: 'القائمة',
    continue: 'استمرار',
    newGame: 'لعبة جديدة',
    worldStars: '⭐ {n}/{t}',
    unlockReq: 'يحتاج {n}⭐ من {w}',
    playerLevel: 'المستوى {n}',
    xp: 'خبرة',
    perfectLevel: 'مستوى مثالي!',
    noBoosters: 'لا تعزيزات',
    selectBooster: 'اختر تعزيز',
    quizBonus: 'سؤال إضافي!',
    quizCorrect: 'إجابة صحيحة! +{n}🪙',
    quizWrong: 'إجابة خاطئة!',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    loading: 'جاري التحميل...',
    // Boss phases
    bossPhase: 'المرحلة {n}',
    bossWeak: 'الزعيم ضعيف!',
    // Daily challenge
    dailyChallenge: 'تحدي اليوم',
    dailyChallengeDesc: 'أكمل التحدي اليومي!',
    // Engagement
    streak3: 'سلسلة رائعة! 🔥',
    streak5: 'خارق! 🌟',
    streak8: 'لا يُصدق! ⚡',
    streak10: 'أسطوري! 👑',
    nearMiss: 'كنت قريباً جداً!',
    badgeFast: 'البرق ⚡',
    badgeNoHint: 'بدون تلميحات 🧠',
    badgePerfect: 'الكمال ✨',
    badgeCombo: 'ملك الكومبو 💥',
    badgeSpecial: 'صانع السحر 🔮',
  },
  en: {
    title: 'Gem Kingdom',
    subtitle: 'An educational adventure full of challenges!',
    play: 'Play',
    back: 'Back',
    next: 'Next',
    replay: 'Replay',
    share: 'Share',
    mute: '🔇',
    unmute: '🔊',
    score: 'Score',
    moves: 'Moves',
    time: 'Time',
    level: 'Level',
    world: 'World',
    stars: 'Stars',
    locked: 'Locked',
    combo: 'Combo',
    excellent: 'Excellent!',
    great: 'Great!',
    good: 'Good!',
    tryAgain: 'Try Again',
    noMoves: 'No more moves!',
    shuffling: 'Shuffling...',
    levelComplete: 'Level Complete!',
    worldComplete: 'New World Unlocked!',
    bossAppears: 'Boss Appears!',
    bossDefeated: 'Boss Defeated!',
    bossAttack: 'Boss Attack!',
    miniBoss: 'Mini Boss',
    worldBoss: 'World Boss',
    hp: 'HP',
    objectives: 'Objectives',
    objScore: 'Score {n} points',
    objCollect: 'Collect {n} {gem}',
    objBreakIce: 'Break {n} ice',
    objFreeCaged: 'Free {n} caged',
    objLightTiles: 'Light {n} tiles',
    objCascade: '{n} cascades',
    objUseSpecial: 'Use {n} specials',
    objClearBottom: 'Drop {n} gems',
    objDefuse: 'Defuse {n} bombs',
    objBoss: 'Defeat the Boss',
    coins: 'Coins',
    gems: 'Gems',
    shop: 'Shop',
    buy: 'Buy',
    owned: 'Owned',
    notEnough: 'Not enough coins',
    dailyReward: 'Daily Reward!',
    day: 'Day',
    streak: 'Streak',
    claim: 'Claim',
    claimed: 'Claimed',
    achievements: 'Achievements',
    newAchievement: 'New Achievement!',
    stats: 'Stats',
    didYouKnow: 'Did you know?',
    storyNext: 'Next',
    storySkip: 'Skip',
    hint: 'Hint',
    boosterHammer: 'Hammer',
    boosterShuffle: 'Shuffle',
    boosterMoves: '+5 Moves',
    boosterHint: 'Hint',
    boosterBomb: 'Bomb',
    boosterRocket: 'Dual Rocket',
    boosterFreeze: 'Freeze Time',
    boosterMulti: 'Score x2',
    report: 'Progress Report',
    skillPlanning: 'Planning',
    skillPattern: 'Pattern Recognition',
    skillSpeed: 'Reaction Speed',
    skillProblem: 'Problem Solving',
    strong: 'Strong',
    developing: 'Developing',
    needsPractice: 'Needs Practice',
    menu: 'Menu',
    continue: 'Continue',
    newGame: 'New Game',
    worldStars: '⭐ {n}/{t}',
    unlockReq: 'Need {n}⭐ from {w}',
    playerLevel: 'Level {n}',
    xp: 'XP',
    perfectLevel: 'Perfect Level!',
    noBoosters: 'No boosters',
    selectBooster: 'Select Booster',
    quizBonus: 'Bonus Question!',
    quizCorrect: 'Correct! +{n}🪙',
    quizWrong: 'Wrong answer!',
    confirm: 'Confirm',
    cancel: 'Cancel',
    loading: 'Loading...',
    bossPhase: 'Phase {n}',
    bossWeak: 'Boss is weak!',
    dailyChallenge: 'Daily Challenge',
    dailyChallengeDesc: 'Complete the daily challenge!',
    streak3: 'Great streak! 🔥',
    streak5: 'Superb! 🌟',
    streak8: 'Unbelievable! ⚡',
    streak10: 'Legendary! 👑',
    nearMiss: 'So close!',
    badgeFast: 'Lightning ⚡',
    badgeNoHint: 'No Hints 🧠',
    badgePerfect: 'Perfection ✨',
    badgeCombo: 'Combo King 💥',
    badgeSpecial: 'Magic Maker 🔮',
  },
  pt: {
    title: 'Reino das Gemas',
    subtitle: 'Uma aventura educacional cheia de desafios!',
    play: 'Jogar',
    back: 'Voltar',
    next: 'Próximo',
    replay: 'Repetir',
    share: 'Compartilhar',
    mute: '🔇',
    unmute: '🔊',
    score: 'Pontos',
    moves: 'Movimentos',
    time: 'Tempo',
    level: 'Nível',
    world: 'Mundo',
    stars: 'Estrelas',
    locked: 'Bloqueado',
    combo: 'Combo',
    excellent: 'Excelente!',
    great: 'Ótimo!',
    good: 'Bom!',
    tryAgain: 'Tente novamente',
    noMoves: 'Sem movimentos!',
    shuffling: 'Embaralhando...',
    levelComplete: 'Nível Completo!',
    worldComplete: 'Novo Mundo Desbloqueado!',
    bossAppears: 'Chefe Apareceu!',
    bossDefeated: 'Chefe Derrotado!',
    bossAttack: 'Ataque do Chefe!',
    miniBoss: 'Mini Chefe',
    worldBoss: 'Chefe do Mundo',
    hp: 'Vida',
    objectives: 'Objetivos',
    objScore: 'Marque {n} pontos',
    objCollect: 'Colete {n} {gem}',
    objBreakIce: 'Quebre {n} gelos',
    objFreeCaged: 'Liberte {n} presos',
    objLightTiles: 'Ilumine {n} blocos',
    objCascade: '{n} cascatas',
    objUseSpecial: 'Use {n} especiais',
    objClearBottom: 'Solte {n} gemas',
    objDefuse: 'Desarme {n} bombas',
    objBoss: 'Derrote o Chefe',
    coins: 'Moedas',
    gems: 'Gemas',
    shop: 'Loja',
    buy: 'Comprar',
    owned: 'Possuído',
    notEnough: 'Moedas insuficientes',
    dailyReward: 'Recompensa Diária!',
    day: 'Dia',
    streak: 'Sequência',
    claim: 'Resgatar',
    claimed: 'Resgatado',
    achievements: 'Conquistas',
    newAchievement: 'Nova Conquista!',
    stats: 'Estatísticas',
    didYouKnow: 'Você sabia?',
    storyNext: 'Próximo',
    storySkip: 'Pular',
    hint: 'Dica',
    boosterHammer: 'Martelo',
    boosterShuffle: 'Embaralhar',
    boosterMoves: '+5 Movimentos',
    boosterHint: 'Dica',
    boosterBomb: 'Bomba',
    boosterRocket: 'Foguete Duplo',
    boosterFreeze: 'Congelar Tempo',
    boosterMulti: 'Pontos x2',
    report: 'Relatório de Progresso',
    skillPlanning: 'Planejamento',
    skillPattern: 'Reconhecimento de Padrões',
    skillSpeed: 'Velocidade de Reação',
    skillProblem: 'Resolução de Problemas',
    strong: 'Forte',
    developing: 'Desenvolvendo',
    needsPractice: 'Precisa Praticar',
    menu: 'Menu',
    continue: 'Continuar',
    newGame: 'Novo Jogo',
    worldStars: '⭐ {n}/{t}',
    unlockReq: 'Precisa {n}⭐ de {w}',
    playerLevel: 'Nível {n}',
    xp: 'XP',
    perfectLevel: 'Nível Perfeito!',
    noBoosters: 'Sem melhorias',
    selectBooster: 'Selecione Melhoria',
    quizBonus: 'Pergunta Bônus!',
    quizCorrect: 'Correto! +{n}🪙',
    quizWrong: 'Resposta errada!',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    loading: 'Carregando...',
    bossPhase: 'Fase {n}',
    bossWeak: 'Chefe está fraco!',
    dailyChallenge: 'Desafio Diário',
    dailyChallengeDesc: 'Complete o desafio diário!',
    streak3: 'Boa sequência! 🔥',
    streak5: 'Soberbo! 🌟',
    streak8: 'Inacreditável! ⚡',
    streak10: 'Lendário! 👑',
    nearMiss: 'Quase lá!',
    badgeFast: 'Relâmpago ⚡',
    badgeNoHint: 'Sem Dicas 🧠',
    badgePerfect: 'Perfeição ✨',
    badgeCombo: 'Rei do Combo 💥',
    badgeSpecial: 'Mago ✨',
  },
};

export const t = (key, replacements) => {
  let str = (STRINGS[LANG] || STRINGS.ar)[key] || (STRINGS.ar)[key] || key;
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
};

export const DIR = LANG === 'ar' ? 'rtl' : 'ltr';

// ===== GAME CONSTANTS =====
export const BOARD = {
  MIN_ROWS: 7,
  MAX_ROWS: 9,
  DEFAULT_ROWS: 8,
  DEFAULT_COLS: 8,
  CELL_PAD: 2,
  BOARD_PAD: 6,
};

export const TIMING = {
  SWAP_MS: 180,
  REMOVE_MS: 220,
  FALL_MS_PER_CELL: 80,
  SPAWN_MS: 160,
  COMBO_DELAY: 60,
  BOSS_ATTACK_MS: 800,
  HINT_DELAY: 5000,
  AUTO_HINT_DELAY: 8000,
};

export const SCORING = {
  MATCH_3: 100,
  MATCH_4: 300,
  MATCH_5: 500,
  MATCH_EXTRA: 200,
  COMBO_MULTIPLIER: 0.5,  // +50% per combo level
  SPECIAL_BONUS: 150,
  BOSS_HIT: 200,
  OBSTACLE_BREAK: 75,
  TIME_BONUS_PER_SEC: 10,
  MOVE_BONUS_PER_MOVE: 25,
};

export const XP = {
  PER_STAR: 10,
  PER_LEVEL: 5,
  PER_BOSS: 50,
  PER_ACHIEVEMENT: 20,
  LEVEL_UP_BASE: 100,
  LEVEL_UP_SCALE: 1.15,
};

// ===== GEM TYPES =====
export const GEM_TYPES = {
  GEM_0: 0, GEM_1: 1, GEM_2: 2, GEM_3: 3, GEM_4: 4, GEM_5: 5, GEM_6: 6,
};

// ===== SPECIAL TYPES =====
export const SPECIAL = {
  NONE: 0,
  ROCKET_H: 1,
  ROCKET_V: 2,
  BOMB: 3,
  RAINBOW: 4,
  NOVA: 5,
  LIGHTNING: 6,
  MAGIC: 7,
};

export const SPECIAL_NAMES = {
  [SPECIAL.NONE]: '',
  [SPECIAL.ROCKET_H]: '→',
  [SPECIAL.ROCKET_V]: '↑',
  [SPECIAL.BOMB]: '💥',
  [SPECIAL.RAINBOW]: '🌈',
  [SPECIAL.NOVA]: '🌟',
  [SPECIAL.LIGHTNING]: '⚡',
  [SPECIAL.MAGIC]: '🔮',
};

// ===== OBSTACLE TYPES =====
export const OBSTACLE = {
  NONE: 0,
  ICE_1: 1,     // 1-layer ice
  ICE_2: 2,     // 2-layer ice
  CHAIN: 3,     // Chained gem
  STONE: 4,     // Immovable stone
  CAGE: 5,      // Caged item — drop to bottom
  DARK: 6,      // Dark tile — match over to light
  PORTAL_IN: 7, // Portal entrance
  PORTAL_OUT: 8,// Portal exit
  CONVEYOR_U: 9,  // Conveyor up
  CONVEYOR_D: 10, // Conveyor down
  BOMB_TIMER: 11,  // Timed bomb
  LOCK: 12,    // Column lock
  SHADOW: 13,  // Shadow — replicates
};

// ===== WORLD EMOJI POOLS =====
export const WORLD_GEMS = [
  // W0: Fruit Garden
  ['🍎','🍊','🍇','🍓','🍌','🫐','🍑'],
  // W1: Ocean Depths
  ['🐠','🐙','🦀','🐚','🦈','🐋','🐬'],
  // W2: Color Lab
  ['❤️','🧡','💛','💚','💙','💜','🩷'],
  // W3: Animal Kingdom
  ['🐮','🐔','🐑','🐴','🐷','🐰','🐶'],
  // W4: Space Station
  ['🌍','🌙','⭐','☀️','🪐','🚀','🛸'],
  // W5: Music Forest
  ['🎵','🎸','🥁','🎹','🎺','🎻','🎶'],
  // W6: Candy Factory
  ['🍬','🍭','🎂','🍩','🧁','🍪','🍫'],
  // W7: Thunder Lab
  ['💧','🔥','❄️','⚡','🌿','🪨','💨'],
  // W8: Book City
  ['📕','📗','📘','📙','📓','📖','📔'],
  // W9: Diamond Peak
  ['💎','🏆','👑','🌟','🔮','✨','💫'],
];

// ===== WORLD BACKGROUNDS =====
export const WORLD_GRADIENTS = [
  'linear-gradient(135deg,#86efac,#22c55e)',    // W0 Green garden
  'linear-gradient(135deg,#67e8f9,#0891b2)',    // W1 Ocean blue
  'linear-gradient(135deg,#f9a8d4,#ec4899)',    // W2 Pink lab
  'linear-gradient(135deg,#fde68a,#f59e0b)',    // W3 Golden savanna
  'linear-gradient(135deg,#1e1b4b,#312e81)',    // W4 Deep space
  'linear-gradient(135deg,#bbf7d0,#4ade80)',    // W5 Forest green
  'linear-gradient(135deg,#fecdd3,#fb7185)',    // W6 Candy pink
  'linear-gradient(135deg,#7c3aed,#4c1d95)',    // W7 Electric purple
  'linear-gradient(135deg,#fef3c7,#d97706)',    // W8 Golden book
  'linear-gradient(135deg,#818cf8,#6366f1)',    // W9 Royal indigo
];

export const WORLD_ACCENTS = [
  '#16a34a','#0e7490','#db2777','#b45309','#4338ca',
  '#15803d','#e11d48','#6d28d9','#b45309','#4f46e5',
];

export const WORLD_PARTICLES = [
  '🍃','🌊','🎨','🐾','✨','🎵','🍬','⚡','📖','💎',
];

export const WORLD_NAMES = {
  ar: ['حديقة الفواكه','أعماق المحيط','مختبر الألوان','مملكة الحيوانات','محطة الفضاء','غابة الموسيقى','مصنع الحلويات','مختبر البرق','مدينة الكتب','قمة الماس'],
  en: ['Fruit Garden','Ocean Depths','Color Lab','Animal Kingdom','Space Station','Music Forest','Candy Factory','Thunder Lab','Book City','Diamond Peak'],
  pt: ['Jardim das Frutas','Profundezas do Oceano','Lab de Cores','Reino Animal','Estação Espacial','Floresta Musical','Fábrica de Doces','Lab do Trovão','Cidade dos Livros','Pico Diamante'],
};

export const WORLD_ICONS = ['🍎','🐠','🎨','🦁','🚀','🎵','🍬','⚡','📚','💎'];

export const WORLD_MASCOTS = ['🧑‍🌾','🧜‍♀️','🧑‍🔬','🐵','👨‍🚀','🎅','🤖','🧙','🦉','👑'];

export const WORLD_MASCOT_NAMES = {
  ar: ['سعيد','مارينا','فريد','ذكي','أمير','طارق','شوكو','نور','حكيمة','ماس'],
  en: ['Saeed','Marina','Fred','Zaki','Ameer','Tarek','Choco','Noor','Hakima','Maas'],
  pt: ['Saeed','Marina','Fred','Zaki','Ameer','Tarek','Choco','Noor','Hakima','Maas'],
};

// ===== ACHIEVEMENT DEFINITIONS =====
export const ACHIEVEMENTS = [
  { id: 'first_level', type: 'levelsCompleted', goal: 1, coins: 10, icon: '🎮', nameAr: 'المبتدئ', nameEn: 'Beginner', namePt: 'Iniciante' },
  { id: 'collector_100', type: 'gemsCollected', goal: 100, coins: 20, icon: '💎', nameAr: 'الجامع', nameEn: 'Collector', namePt: 'Coletor' },
  { id: 'combo_3', type: 'maxCombo', goal: 3, coins: 30, icon: '🔥', nameAr: 'المتسلسل ×3', nameEn: 'Combo ×3', namePt: 'Combo ×3' },
  { id: 'combo_5', type: 'maxCombo', goal: 5, coins: 50, icon: '💥', nameAr: 'المتسلسل ×5', nameEn: 'Combo ×5', namePt: 'Combo ×5' },
  { id: 'combo_10', type: 'maxCombo', goal: 10, coins: 100, icon: '👑', nameAr: 'المتسلسل ×10', nameEn: 'Combo ×10', namePt: 'Combo ×10' },
  { id: 'special_10', type: 'specialsUsed', goal: 10, coins: 30, icon: '🚀', nameAr: 'القناص', nameEn: 'Sniper', namePt: 'Atirador' },
  { id: 'bombs_20', type: 'bombsUsed', goal: 20, coins: 40, icon: '💣', nameAr: 'المفجر', nameEn: 'Bomber', namePt: 'Bombardeiro' },
  { id: 'rainbow_10', type: 'rainbowsUsed', goal: 10, coins: 50, icon: '🌈', nameAr: 'قوس القزح', nameEn: 'Rainbow', namePt: 'Arco-íris' },
  { id: 'stars_30', type: 'totalStars', goal: 30, coins: 60, icon: '⭐', nameAr: 'نجم × 30', nameEn: '30 Stars', namePt: '30 Estrelas' },
  { id: 'worlds_5', type: 'worldsUnlocked', goal: 5, coins: 80, icon: '🌍', nameAr: 'فاتح العوالم', nameEn: 'World Explorer', namePt: 'Explorador' },
  { id: 'boss_1', type: 'bossesDefeated', goal: 1, coins: 50, icon: '🗡️', nameAr: 'قاتل الزعيم', nameEn: 'Boss Slayer', namePt: 'Matador de Chefe' },
  { id: 'boss_5', type: 'bossesDefeated', goal: 5, coins: 100, icon: '⚔️', nameAr: 'صائد الزعماء', nameEn: 'Boss Hunter', namePt: 'Caçador de Chefes' },
  { id: 'boss_10', type: 'bossesDefeated', goal: 10, coins: 150, icon: '🏆', nameAr: 'إمبراطور الزعماء', nameEn: 'Boss Emperor', namePt: 'Imperador dos Chefes' },
  { id: 'no_hints_world', type: 'worldsNoHints', goal: 1, coins: 100, icon: '🧠', nameAr: 'بدون تلميحات', nameEn: 'No Hints', namePt: 'Sem Dicas' },
  { id: 'speed_30s', type: 'speedLevels', goal: 1, coins: 40, icon: '⏱️', nameAr: 'السرعة', nameEn: 'Speed Run', namePt: 'Corrida' },
  { id: 'perfect_world', type: 'perfectWorlds', goal: 1, coins: 150, icon: '✨', nameAr: 'الكمال', nameEn: 'Perfection', namePt: 'Perfeição' },
  { id: 'streak_7', type: 'dailyStreak', goal: 7, coins: 100, icon: '🔥', nameAr: '7 أيام متتالية', nameEn: '7 Day Streak', namePt: '7 Dias Seguidos' },
  { id: 'streak_30', type: 'dailyStreak', goal: 30, coins: 300, icon: '💪', nameAr: '30 يوم متتالي', nameEn: '30 Day Streak', namePt: '30 Dias Seguidos' },
  { id: 'stars_100', type: 'totalStars', goal: 100, coins: 200, icon: '🌟', nameAr: 'نجم × 100', nameEn: '100 Stars', namePt: '100 Estrelas' },
  { id: 'stars_200', type: 'totalStars', goal: 200, coins: 300, icon: '💫', nameAr: 'نجم × 200', nameEn: '200 Stars', namePt: '200 Estrelas' },
  { id: 'levels_25', type: 'levelsCompleted', goal: 25, coins: 80, icon: '🎯', nameAr: '25 مستوى', nameEn: '25 Levels', namePt: '25 Níveis' },
  { id: 'levels_50', type: 'levelsCompleted', goal: 50, coins: 120, icon: '🎪', nameAr: '50 مستوى', nameEn: '50 Levels', namePt: '50 Níveis' },
  { id: 'levels_100', type: 'levelsCompleted', goal: 100, coins: 200, icon: '🏅', nameAr: '100 مستوى', nameEn: '100 Levels', namePt: '100 Níveis' },
  { id: 'mixer_20', type: 'powerCombos', goal: 20, coins: 60, icon: '🔮', nameAr: 'خبير الدمج', nameEn: 'Master Mixer', namePt: 'Mestre Mistura' },
  { id: 'board_clear', type: 'boardClears', goal: 1, coins: 80, icon: '🌀', nameAr: 'الهادم', nameEn: 'Destroyer', namePt: 'Destruidor' },
  { id: 'score_50k', type: 'highScore', goal: 50000, coins: 200, icon: '💰', nameAr: 'نصف مليون', nameEn: '50K Score', namePt: '50K Pontos' },
  { id: 'mini_boss_all', type: 'miniBossesDefeated', goal: 10, coins: 100, icon: '🗡️', nameAr: 'صيّاد المينيبوس', nameEn: 'Mini Boss Hunter', namePt: 'Caçador Mini Chefe' },
  { id: 'obstacles_100', type: 'obstaclesBroken', goal: 100, coins: 60, icon: '⛏️', nameAr: 'كاسر العوائق', nameEn: 'Obstacle Breaker', namePt: 'Quebrador' },
  { id: 'obstacles_500', type: 'obstaclesBroken', goal: 500, coins: 150, icon: '🔨', nameAr: 'محطم العوائق', nameEn: 'Obstacle Smasher', namePt: 'Esmagador' },
  { id: 'collector_1000', type: 'gemsCollected', goal: 1000, coins: 100, icon: '💎', nameAr: 'الجامع الأعظم', nameEn: 'Grand Collector', namePt: 'Grande Coletor' },
  { id: 'all_worlds', type: 'worldsUnlocked', goal: 10, coins: 200, icon: '🌍', nameAr: 'مستكشف الكل', nameEn: 'World Master', namePt: 'Mestre dos Mundos' },
  { id: 'daily_10', type: 'dailyChallenges', goal: 10, coins: 80, icon: '📅', nameAr: '10 تحديات يومية', nameEn: '10 Daily Challenges', namePt: '10 Desafios Diários' },
  { id: 'quiz_20', type: 'quizCorrect', goal: 20, coins: 60, icon: '🎓', nameAr: 'العالم الصغير', nameEn: 'Little Scholar', namePt: 'Pequeno Sábio' },
  { id: 'theme_buy', type: 'themesBought', goal: 1, coins: 30, icon: '🛍️', nameAr: 'المتسوق', nameEn: 'Shopper', namePt: 'Comprador' },
  { id: 'chain_break_50', type: 'chainsBreak', goal: 50, coins: 50, icon: '⛓️', nameAr: 'كاسر السلاسل', nameEn: 'Chain Breaker', namePt: 'Quebrador de Correntes' },
  { id: 'ice_break_50', type: 'iceBreak', goal: 50, coins: 50, icon: '❄️', nameAr: 'كاسر الجليد', nameEn: 'Ice Breaker', namePt: 'Quebra-Gelo' },
  { id: 'coins_1000', type: 'totalCoins', goal: 1000, coins: 0, icon: '🪙', nameAr: 'ثري', nameEn: 'Wealthy', namePt: 'Rico' },
  { id: 'nova_5', type: 'novasUsed', goal: 5, coins: 80, icon: '🌟', nameAr: 'سيد النوفا', nameEn: 'Nova Master', namePt: 'Mestre Nova' },
  { id: 'lightning_5', type: 'lightningsUsed', goal: 5, coins: 80, icon: '⚡', nameAr: 'سيد البرق', nameEn: 'Lightning Master', namePt: 'Mestre Raio' },
  { id: 'legend', type: 'completionPct', goal: 100, coins: 1000, icon: '🏆', nameAr: 'أسطورة الجواهر', nameEn: 'Gem Legend', namePt: 'Lenda das Gemas' },
];

// ===== DEFAULT PROGRESS =====
export function createDefaultProgress() {
  return {
    worlds: {},          // { [worldIdx]: { scores: {}, stars: {} } }
    coins: 0,
    premiumGems: 0,
    boosters: {},
    purchaseCounts: {},
    achievementsUnlocked: [],
    badges: [],
    totalXP: 0,
    playerLevel: 1,
    bossesDefeated: 0,
    miniBossesDefeated: 0,
    totalGemsCollected: 0,
    totalSpecialsUsed: 0,
    totalBombsUsed: 0,
    totalRainbowsUsed: 0,
    totalNovasUsed: 0,
    totalLightningsUsed: 0,
    totalPowerCombos: 0,
    totalBoardClears: 0,
    totalObstaclesBroken: 0,
    totalChainsBreak: 0,
    totalIceBreak: 0,
    totalQuizCorrect: 0,
    totalDailyChallenges: 0,
    totalThemesBought: 0,
    totalCoinsEarned: 0,
    highScore: 0,
    maxCombo: 0,
    speedLevels: 0,
    perfectWorlds: 0,
    worldsNoHints: 0,
    levelsCompleted: 0,
    worldsCleared: 0,
    loginStreak: { lastDate: null, count: 0 },
    lastPlayTimestamp: 0,
    storyProgress: {},
    settings: { theme: 'classic', gemStyle: 'classic' },
    skillData: {
      accuracyRate: 0.5,
      avgResponseTime: 8,
      smoothedSkill: 50,
      highestStreak: 0,
      totalGamesPlayed: 0,
      typeProfiles: {},
    },
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEYS.PROGRESS);
    if (raw) {
      const p = JSON.parse(raw);
      // Merge with defaults to ensure all keys exist
      const def = createDefaultProgress();
      return { ...def, ...p, skillData: { ...def.skillData, ...(p.skillData || {}) } };
    }
  } catch (e) { /* ignore */ }
  return createDefaultProgress();
}

export function saveProgress(p) {
  try { localStorage.setItem(KEYS.PROGRESS, JSON.stringify(p)); } catch (e) { /* ignore */ }
}

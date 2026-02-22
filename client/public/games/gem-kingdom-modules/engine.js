// ===== Gem Kingdom 💎 — Match Engine =====
// Pure game logic: grid, matching, specials, combos, gravity, obstacles
// Zero DOM/Canvas dependency — portable logic engine

import { SPECIAL, OBSTACLE, SCORING, GEM_TYPES } from './config.js';

// ===== GRID INITIALIZATION =====
let _idCounter = 0;
export function nextId() { return ++_idCounter; }

export function createGem(type, row, col, special = SPECIAL.NONE) {
  return { id: nextId(), type, row, col, special, obstacle: OBSTACLE.NONE, obstacleHP: 0, bombTimer: 0, caged: false };
}

/**
 * Initialize grid with no pre-existing matches
 * @param {number} rows
 * @param {number} cols
 * @param {number} gemCount - number of gem types to use (5-7)
 * @param {Array} obstacles - [{row, col, type, hp?, timer?}]
 */
export function initGrid(rows, cols, gemCount, obstacles = []) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      let type;
      let attempts = 0;
      do {
        type = Math.floor(Math.random() * gemCount);
        attempts++;
      } while (attempts < 50 && wouldMatch(grid, r, c, type, rows, cols));
      const gem = createGem(type, r, c);
      // Apply obstacles
      const obs = obstacles.find(o => o.row === r && o.col === c);
      if (obs) {
        gem.obstacle = obs.type;
        gem.obstacleHP = obs.hp || getDefaultObstacleHP(obs.type);
        if (obs.type === OBSTACLE.BOMB_TIMER) gem.bombTimer = obs.timer || 8;
        if (obs.type === OBSTACLE.CAGE) gem.caged = true;
        if (obs.type === OBSTACLE.STONE) { gem.type = -1; gem.special = SPECIAL.NONE; }
      }
      grid[r][c] = gem;
    }
  }
  return grid;
}

function getDefaultObstacleHP(type) {
  if (type === OBSTACLE.ICE_1) return 1;
  if (type === OBSTACLE.ICE_2) return 2;
  if (type === OBSTACLE.CHAIN) return 1;
  if (type === OBSTACLE.STONE) return 3;
  if (type === OBSTACLE.DARK) return 1;
  if (type === OBSTACLE.LOCK) return 1;
  if (type === OBSTACLE.SHADOW) return 1;
  return 1;
}

function wouldMatch(grid, row, col, type, rows, cols) {
  // Check horizontal
  if (col >= 2 && grid[row][col-1]?.type === type && grid[row][col-2]?.type === type) return true;
  // Check vertical
  if (row >= 2 && grid[row-1]?.[col]?.type === type && grid[row-2]?.[col]?.type === type) return true;
  return false;
}

// ===== ADJACENCY =====
export function areAdjacent(a, b) {
  return (Math.abs(a.row - b.row) + Math.abs(a.col - b.col)) === 1;
}

// ===== SWAP =====
export function swapGems(grid, a, b) {
  const gemA = grid[a.row][a.col];
  const gemB = grid[b.row][b.col];
  // Don't swap stones or locked obstacles
  if (gemA.obstacle === OBSTACLE.STONE || gemB.obstacle === OBSTACLE.STONE) return false;
  if (gemA.obstacle === OBSTACLE.CHAIN || gemB.obstacle === OBSTACLE.CHAIN) return false;
  if (gemA.obstacle === OBSTACLE.LOCK || gemB.obstacle === OBSTACLE.LOCK) return false;

  grid[a.row][a.col] = gemB;
  grid[b.row][b.col] = gemA;
  gemA.row = b.row; gemA.col = b.col;
  gemB.row = a.row; gemB.col = a.col;
  return true;
}

// ===== MATCH DETECTION =====
export function findMatches(grid, rows, cols) {
  const matched = new Set();
  const matchGroups = [];

  // Horizontal
  for (let r = 0; r < rows; r++) {
    let run = 1;
    for (let c = 1; c <= cols; c++) {
      const cur = grid[r][c];
      const prev = grid[r][c-1];
      if (c < cols && cur && prev && cur.type === prev.type && cur.type >= 0 &&
          cur.obstacle !== OBSTACLE.STONE && prev.obstacle !== OBSTACLE.STONE) {
        run++;
      } else {
        if (run >= 3) {
          const group = [];
          for (let k = c - run; k < c; k++) {
            matched.add(`${r},${k}`);
            group.push({ row: r, col: k });
          }
          matchGroups.push({ positions: group, direction: 'h', length: run });
        }
        run = 1;
      }
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    let run = 1;
    for (let r = 1; r <= rows; r++) {
      const cur = grid[r]?.[c];
      const prev = grid[r-1]?.[c];
      if (r < rows && cur && prev && cur.type === prev.type && cur.type >= 0 &&
          cur.obstacle !== OBSTACLE.STONE && prev.obstacle !== OBSTACLE.STONE) {
        run++;
      } else {
        if (run >= 3) {
          const group = [];
          for (let k = r - run; k < r; k++) {
            matched.add(`${k},${c}`);
            group.push({ row: k, col: c });
          }
          matchGroups.push({ positions: group, direction: 'v', length: run });
        }
        run = 1;
      }
    }
  }

  return { matched, matchGroups };
}

// ===== SPECIAL DETECTION =====
// After finding match groups, determine what specials to create
export function getSpecials(matchGroups, grid) {
  const specials = []; // { row, col, special, sourceType }

  // Build position → groups map
  const posGroups = new Map();
  for (const g of matchGroups) {
    for (const p of g.positions) {
      const key = `${p.row},${p.col}`;
      if (!posGroups.has(key)) posGroups.set(key, []);
      posGroups.get(key).push(g);
    }
  }

  // Find intersections (L/T shapes → Bomb)
  const usedGroups = new Set();
  for (const [key, groups] of posGroups) {
    if (groups.length >= 2) {
      // L or T shape → Bomb
      const [r, c] = key.split(',').map(Number);
      const totalLen = groups.reduce((s, g) => s + g.length, 0) - (groups.length - 1);
      specials.push({
        row: r, col: c,
        special: totalLen >= 7 ? SPECIAL.NOVA : SPECIAL.BOMB,
        sourceType: grid[r][c].type
      });
      groups.forEach(g => usedGroups.add(g));
    }
  }

  // Process remaining groups
  for (const g of matchGroups) {
    if (usedGroups.has(g)) continue;
    if (g.length >= 6) {
      // 6+ → Nova
      const mid = g.positions[Math.floor(g.positions.length / 2)];
      specials.push({ row: mid.row, col: mid.col, special: SPECIAL.NOVA, sourceType: grid[mid.row][mid.col].type });
    } else if (g.length >= 5) {
      // 5 → Rainbow
      const mid = g.positions[Math.floor(g.positions.length / 2)];
      specials.push({ row: mid.row, col: mid.col, special: SPECIAL.RAINBOW, sourceType: grid[mid.row][mid.col].type });
    } else if (g.length === 4) {
      // 4 → Rocket (direction perpendicular to match)
      const mid = g.positions[1]; // second position
      const special = g.direction === 'h' ? SPECIAL.ROCKET_V : SPECIAL.ROCKET_H;
      specials.push({ row: mid.row, col: mid.col, special, sourceType: grid[mid.row][mid.col].type });
    }
  }

  return specials;
}

// ===== SPECIAL ACTIVATION =====
// Returns array of positions to clear when a special gem is activated
export function getSpecialClearPositions(special, row, col, grid, rows, cols) {
  const positions = [];

  switch (special) {
    case SPECIAL.ROCKET_H:
      for (let c = 0; c < cols; c++) positions.push({ row, col: c });
      break;
    case SPECIAL.ROCKET_V:
      for (let r = 0; r < rows; r++) positions.push({ row: r, col });
      break;
    case SPECIAL.BOMB:
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) positions.push({ row: nr, col: nc });
        }
      }
      break;
    case SPECIAL.RAINBOW: {
      // Clear all gems of a specific type (the most common one on board, or swapped type)
      const targetType = grid[row][col]._rainbowTarget ?? findMostCommonType(grid, rows, cols);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] && grid[r][c].type === targetType) positions.push({ row: r, col: c });
        }
      }
      break;
    }
    case SPECIAL.NOVA:
      // X pattern — diagonals + row + col
      for (let c = 0; c < cols; c++) positions.push({ row, col: c });
      for (let r = 0; r < rows; r++) positions.push({ row: r, col });
      for (let d = 1; d < Math.max(rows, cols); d++) {
        if (row-d >= 0 && col-d >= 0) positions.push({ row: row-d, col: col-d });
        if (row-d >= 0 && col+d < cols) positions.push({ row: row-d, col: col+d });
        if (row+d < rows && col-d >= 0) positions.push({ row: row+d, col: col-d });
        if (row+d < rows && col+d < cols) positions.push({ row: row+d, col: col+d });
      }
      break;
    case SPECIAL.LIGHTNING:
      // Hit 3 random gems
      const available = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] && grid[r][c].type >= 0 && (r !== row || c !== col))
            available.push({ row: r, col: c });
        }
      }
      shuffle(available);
      for (let i = 0; i < Math.min(3, available.length); i++) positions.push(available[i]);
      break;
    case SPECIAL.MAGIC:
      // Converts to most needed type, then matches naturally
      break;
  }

  // Deduplicate
  const unique = new Map();
  for (const p of positions) unique.set(`${p.row},${p.col}`, p);
  return [...unique.values()];
}

// ===== POWER COMBOS =====
// When two specials are swapped into each other
export function getPowerCombo(specialA, specialB) {
  const pair = [specialA, specialB].sort().join(',');
  const combos = {
    // Rocket + Rocket = cross (full row + full col)
    [`${SPECIAL.ROCKET_H},${SPECIAL.ROCKET_V}`]: 'cross',
    [`${SPECIAL.ROCKET_H},${SPECIAL.ROCKET_H}`]: 'cross',
    [`${SPECIAL.ROCKET_V},${SPECIAL.ROCKET_V}`]: 'cross',
    // Rocket + Bomb = 3 rows or 3 cols
    [`${SPECIAL.BOMB},${SPECIAL.ROCKET_H}`]: 'bigCross',
    [`${SPECIAL.BOMB},${SPECIAL.ROCKET_V}`]: 'bigCross',
    // Bomb + Bomb = 5x5
    [`${SPECIAL.BOMB},${SPECIAL.BOMB}`]: 'megaBomb',
    // Rainbow + any special = all gems of type become that special
    [`${SPECIAL.RAINBOW},${SPECIAL.ROCKET_H}`]: 'rainbowRocket',
    [`${SPECIAL.RAINBOW},${SPECIAL.ROCKET_V}`]: 'rainbowRocket',
    [`${SPECIAL.RAINBOW},${SPECIAL.BOMB}`]: 'rainbowBomb',
    // Rainbow + Rainbow = clear entire board
    [`${SPECIAL.RAINBOW},${SPECIAL.RAINBOW}`]: 'clearBoard',
    // Nova combinations
    [`${SPECIAL.NOVA},${SPECIAL.ROCKET_H}`]: 'novaRocket',
    [`${SPECIAL.NOVA},${SPECIAL.ROCKET_V}`]: 'novaRocket',
    [`${SPECIAL.NOVA},${SPECIAL.BOMB}`]: 'novaBomb',
    [`${SPECIAL.NOVA},${SPECIAL.RAINBOW}`]: 'clearBoard',
    [`${SPECIAL.NOVA},${SPECIAL.NOVA}`]: 'clearBoard',
  };
  return combos[pair] || null;
}

export function getPowerComboClearPositions(combo, row, col, grid, rows, cols) {
  const positions = [];

  switch (combo) {
    case 'cross':
      for (let c = 0; c < cols; c++) positions.push({ row, col: c });
      for (let r = 0; r < rows; r++) positions.push({ row: r, col });
      break;

    case 'bigCross':
      for (let dr = -1; dr <= 1; dr++) {
        for (let c = 0; c < cols; c++) {
          const nr = row + dr;
          if (nr >= 0 && nr < rows) positions.push({ row: nr, col: c });
        }
        for (let r = 0; r < rows; r++) {
          const nc = col + dr;
          if (nc >= 0 && nc < cols) positions.push({ row: r, col: nc });
        }
      }
      break;

    case 'megaBomb':
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) positions.push({ row: nr, col: nc });
        }
      }
      break;

    case 'rainbowRocket': {
      // All gems of swapped type become rockets and fire
      const targetType = grid[row][col].type >= 0 ? grid[row][col].type : findMostCommonType(grid, rows, cols);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] && grid[r][c].type === targetType) {
            positions.push({ row: r, col: c });
            // Also add row or col
            if (Math.random() > 0.5) {
              for (let cc = 0; cc < cols; cc++) positions.push({ row: r, col: cc });
            } else {
              for (let rr = 0; rr < rows; rr++) positions.push({ row: rr, col: c });
            }
          }
        }
      }
      break;
    }

    case 'rainbowBomb': {
      const targetType = grid[row][col].type >= 0 ? grid[row][col].type : findMostCommonType(grid, rows, cols);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] && grid[r][c].type === targetType) {
            // Each becomes a bomb
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) positions.push({ row: nr, col: nc });
              }
            }
          }
        }
      }
      break;
    }

    case 'clearBoard':
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) positions.push({ row: r, col: c });
      }
      break;

    case 'novaRocket':
      // All rows + all cols from that position
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) positions.push({ row: r, col: c });
      }
      break;

    case 'novaBomb':
      // 5x5 + diagonals
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = row + dr, nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) positions.push({ row: nr, col: nc });
        }
      }
      break;
  }

  // Deduplicate
  const unique = new Map();
  for (const p of positions) unique.set(`${p.row},${p.col}`, p);
  return [...unique.values()];
}

// ===== PROCESS MATCHES =====
/**
 * Process all matches in grid. Returns removal info.
 * @returns {{ removedPositions: Set<string>, specialsCreated: Array, chainActivated: Array, obstaclesHit: Array, score: number }}
 */
export function processMatches(grid, rows, cols) {
  const { matched, matchGroups } = findMatches(grid, rows, cols);
  if (matched.size === 0) return null;

  const specials = getSpecials(matchGroups, grid);
  const removedSet = new Set(matched);
  const chainActivated = [];
  const obstaclesHit = [];
  let score = 0;

  // Activate specials from matched gems
  for (const key of matched) {
    const [r, c] = key.split(',').map(Number);
    const gem = grid[r][c];
    if (gem && gem.special !== SPECIAL.NONE) {
      const clearPos = getSpecialClearPositions(gem.special, r, c, grid, rows, cols);
      for (const p of clearPos) {
        removedSet.add(`${p.row},${p.col}`);
      }
      chainActivated.push({ row: r, col: c, special: gem.special });
      score += SCORING.SPECIAL_BONUS;
    }
  }

  // Handle obstacle damage from adjacent matches
  for (const key of removedSet) {
    const [r, c] = key.split(',').map(Number);
    // Damage adjacent obstacles
    const neighbors = [
      { row: r-1, col: c }, { row: r+1, col: c },
      { row: r, col: c-1 }, { row: r, col: c+1 }
    ];
    for (const n of neighbors) {
      if (n.row >= 0 && n.row < rows && n.col >= 0 && n.col < cols) {
        const ng = grid[n.row][n.col];
        if (ng && ng.obstacle !== OBSTACLE.NONE && !removedSet.has(`${n.row},${n.col}`)) {
          const hit = damageObstacle(ng);
          if (hit) {
            obstaclesHit.push({ row: n.row, col: n.col, type: ng.obstacle, destroyed: ng.obstacle === OBSTACLE.NONE });
            score += SCORING.OBSTACLE_BREAK;
          }
        }
      }
    }

    // Handle the matched gem's own obstacle
    const gem = grid[r][c];
    if (gem && gem.obstacle !== OBSTACLE.NONE) {
      damageObstacle(gem);
      obstaclesHit.push({ row: r, col: c, type: gem.obstacle, destroyed: gem.obstacle === OBSTACLE.NONE });
      score += SCORING.OBSTACLE_BREAK;
    }
  }

  // Place specials (don't remove these positions)
  const specialPositions = new Set();
  for (const s of specials) {
    const key = `${s.row},${s.col}`;
    specialPositions.add(key);
    removedSet.delete(key);
    grid[s.row][s.col] = createGem(s.sourceType, s.row, s.col, s.special);
  }

  // Calculate score from match groups
  for (const g of matchGroups) {
    score += calcGroupScore(g.length);
  }

  // Remove matched gems (except special placements)
  for (const key of removedSet) {
    const [r, c] = key.split(',').map(Number);
    const gem = grid[r][c];
    if (gem && gem.obstacle !== OBSTACLE.STONE) {
      grid[r][c] = null;
    }
  }

  return {
    removedPositions: removedSet,
    specialsCreated: specials,
    chainActivated,
    obstaclesHit,
    score,
    matchCount: matchGroups.length,
  };
}

// ===== OBSTACLE DAMAGE =====
function damageObstacle(gem) {
  if (!gem || gem.obstacle === OBSTACLE.NONE) return false;

  switch (gem.obstacle) {
    case OBSTACLE.ICE_1:
      gem.obstacle = OBSTACLE.NONE;
      gem.obstacleHP = 0;
      return true;
    case OBSTACLE.ICE_2:
      gem.obstacle = OBSTACLE.ICE_1;
      gem.obstacleHP = 1;
      return true;
    case OBSTACLE.CHAIN:
      gem.obstacle = OBSTACLE.NONE;
      gem.obstacleHP = 0;
      return true;
    case OBSTACLE.STONE:
      gem.obstacleHP--;
      if (gem.obstacleHP <= 0) {
        gem.obstacle = OBSTACLE.NONE;
        gem.type = -2; // mark for removal
      }
      return true;
    case OBSTACLE.DARK:
      gem.obstacle = OBSTACLE.NONE;
      return true;
    case OBSTACLE.LOCK:
      gem.obstacle = OBSTACLE.NONE;
      return true;
    case OBSTACLE.SHADOW:
      gem.obstacle = OBSTACLE.NONE;
      return true;
    default:
      return false;
  }
}

// ===== GRAVITY =====
/**
 * Apply gravity — gems fall into empty spaces
 * @returns {Array<{gemId, fromRow, fromCol, toRow, toCol}>}
 */
export function applyGravity(grid, rows, cols) {
  const falls = [];

  for (let c = 0; c < cols; c++) {
    let emptyRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      const gem = grid[r][c];
      if (gem) {
        if (gem.obstacle === OBSTACLE.STONE) {
          // Stones don't move
          emptyRow = r - 1;
          continue;
        }
        if (r !== emptyRow) {
          falls.push({ gemId: gem.id, fromRow: r, fromCol: c, toRow: emptyRow, toCol: c });
          grid[emptyRow][c] = gem;
          gem.row = emptyRow;
          gem.col = c;
          grid[r][c] = null;
        }
        emptyRow--;
      }
    }
  }

  return falls;
}

/**
 * Spawn new gems for empty spaces at top
 * @returns {Array<{gem, row, col, fallFrom}>}
 */
export function spawnNewGems(grid, rows, cols, gemCount) {
  const spawns = [];

  for (let c = 0; c < cols; c++) {
    let spawnRow = -1;
    for (let r = 0; r < rows; r++) {
      if (!grid[r][c]) {
        const type = Math.floor(Math.random() * gemCount);
        const gem = createGem(type, r, c);
        grid[r][c] = gem;
        spawns.push({ gem, row: r, col: c, fallFrom: spawnRow });
        spawnRow--;
      }
    }
  }

  return spawns;
}

// ===== VALID MOVES CHECK =====
export function hasValidMoves(grid, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = grid[r][c];
      if (!gem || gem.type < 0 || gem.obstacle === OBSTACLE.STONE || gem.obstacle === OBSTACLE.CHAIN) continue;

      // Rainbow/Special can always swap
      if (gem.special === SPECIAL.RAINBOW || gem.special === SPECIAL.NOVA) return true;

      // Try swap right
      if (c + 1 < cols) {
        const right = grid[r][c+1];
        if (right && right.type >= 0 && right.obstacle !== OBSTACLE.STONE && right.obstacle !== OBSTACLE.CHAIN) {
          swapGems(grid, { row: r, col: c }, { row: r, col: c+1 });
          const { matched } = findMatches(grid, rows, cols);
          swapGems(grid, { row: r, col: c }, { row: r, col: c+1 });
          if (matched.size > 0) return true;
        }
      }
      // Try swap down
      if (r + 1 < rows) {
        const down = grid[r+1]?.[c];
        if (down && down.type >= 0 && down.obstacle !== OBSTACLE.STONE && down.obstacle !== OBSTACLE.CHAIN) {
          swapGems(grid, { row: r, col: c }, { row: r+1, col: c });
          const { matched } = findMatches(grid, rows, cols);
          swapGems(grid, { row: r, col: c }, { row: r+1, col: c });
          if (matched.size > 0) return true;
        }
      }
    }
  }
  return false;
}

// ===== FIND BEST MOVE (for hints) =====
export function findBestMove(grid, rows, cols) {
  let bestMove = null;
  let bestScore = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = grid[r][c];
      if (!gem || gem.type < 0 || gem.obstacle === OBSTACLE.STONE || gem.obstacle === OBSTACLE.CHAIN) continue;

      const neighbors = [
        { row: r, col: c+1 },
        { row: r+1, col: c },
      ];

      for (const n of neighbors) {
        if (n.row >= rows || n.col >= cols) continue;
        const ng = grid[n.row]?.[n.col];
        if (!ng || ng.type < 0 || ng.obstacle === OBSTACLE.STONE || ng.obstacle === OBSTACLE.CHAIN) continue;

        swapGems(grid, { row: r, col: c }, n);
        const { matchGroups } = findMatches(grid, rows, cols);
        let score = 0;
        for (const g of matchGroups) score += calcGroupScore(g.length);
        swapGems(grid, { row: r, col: c }, n);

        if (score > bestScore) {
          bestScore = score;
          bestMove = { from: { row: r, col: c }, to: n };
        }
      }
    }
  }

  return bestMove;
}

// ===== SHUFFLE (when no valid moves) =====
export function shuffleGrid(grid, rows, cols) {
  const movable = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = grid[r][c];
      if (gem && gem.type >= 0 && gem.obstacle === OBSTACLE.NONE && gem.special === SPECIAL.NONE) {
        movable.push(gem);
      }
    }
  }

  // Shuffle types
  const types = movable.map(g => g.type);
  shuffle(types);
  movable.forEach((gem, i) => { gem.type = types[i]; });

  // Make sure there are valid moves after shuffle
  if (!hasValidMoves(grid, rows, cols)) {
    // Try again
    shuffle(types);
    movable.forEach((gem, i) => { gem.type = types[i]; });
  }
}

// ===== BOMB TIMER TICK =====
export function tickBombTimers(grid, rows, cols) {
  const exploded = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = grid[r][c];
      if (gem && gem.obstacle === OBSTACLE.BOMB_TIMER) {
        gem.bombTimer--;
        if (gem.bombTimer <= 0) {
          exploded.push({ row: r, col: c });
        }
      }
    }
  }
  return exploded;
}

// ===== CONVEYOR MOVE =====
export function moveConveyors(grid, rows, cols) {
  const moved = [];
  // Process up conveyors
  for (let c = 0; c < cols; c++) {
    for (let r = 1; r < rows; r++) {
      const gem = grid[r][c];
      if (gem && gem.obstacle === OBSTACLE.CONVEYOR_U) {
        if (r > 0 && grid[r-1][c]) {
          const above = grid[r-1][c];
          if (above.obstacle !== OBSTACLE.STONE) {
            moved.push({ from: { row: r-1, col: c }, dir: 'up' });
          }
        }
      }
    }
  }
  // Process down conveyors
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows - 1; r++) {
      const gem = grid[r][c];
      if (gem && gem.obstacle === OBSTACLE.CONVEYOR_D) {
        if (r < rows-1 && grid[r+1][c]) {
          moved.push({ from: { row: r+1, col: c }, dir: 'down' });
        }
      }
    }
  }
  return moved;
}

// ===== SHADOW SPREAD =====
export function spreadShadows(grid, rows, cols) {
  const newShadows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gem = grid[r][c];
      if (gem && gem.obstacle === OBSTACLE.SHADOW) {
        // Try to spread to one random adjacent cell
        const adj = [
          { row: r-1, col: c }, { row: r+1, col: c },
          { row: r, col: c-1 }, { row: r, col: c+1 }
        ].filter(p => p.row >= 0 && p.row < rows && p.col >= 0 && p.col < cols);
        shuffle(adj);
        for (const p of adj) {
          const ng = grid[p.row][p.col];
          if (ng && ng.obstacle === OBSTACLE.NONE && Math.random() < 0.3) {
            ng.obstacle = OBSTACLE.SHADOW;
            ng.obstacleHP = 1;
            newShadows.push(p);
            break;
          }
        }
      }
    }
  }
  return newShadows;
}

// ===== CAGED ITEMS =====
export function checkCagedItems(grid, rows, cols) {
  const freed = [];
  for (let c = 0; c < cols; c++) {
    const gem = grid[rows-1][c];
    if (gem && gem.caged) {
      freed.push({ row: rows-1, col: c });
      gem.caged = false;
      gem.obstacle = OBSTACLE.NONE;
    }
  }
  return freed;
}

// ===== SCORING =====
export function calcGroupScore(matchLength) {
  if (matchLength <= 2) return 0;
  if (matchLength === 3) return SCORING.MATCH_3;
  if (matchLength === 4) return SCORING.MATCH_4;
  return SCORING.MATCH_5 + (matchLength - 5) * SCORING.MATCH_EXTRA;
}

export function calcComboMultiplier(combo) {
  return 1 + combo * SCORING.COMBO_MULTIPLIER;
}

export function calcStars(score, starThresholds) {
  if (score >= starThresholds[2]) return 3;
  if (score >= starThresholds[1]) return 2;
  if (score >= starThresholds[0]) return 1;
  return 0;
}

// ===== OBJECTIVES =====
export function createObjectiveTracker(objectives) {
  return objectives.map(obj => ({ ...obj, current: 0 }));
}

export function updateObjectives(tracker, event) {
  for (const obj of tracker) {
    switch (obj.type) {
      case 'score': obj.current = event.score || 0; break;
      case 'collect':
        if (event.removedTypes) {
          obj.current += event.removedTypes.filter(t => t === obj.gemType).length;
        }
        break;
      case 'breakIce':
        if (event.obstaclesHit) {
          obj.current += event.obstaclesHit.filter(o =>
            o.type === OBSTACLE.ICE_1 || o.type === OBSTACLE.ICE_2).length;
        }
        break;
      case 'freeCaged':
        if (event.cagedFreed) obj.current += event.cagedFreed;
        break;
      case 'lightTiles':
        if (event.tilesLit) obj.current += event.tilesLit;
        break;
      case 'cascade':
        if (event.combo) obj.current = Math.max(obj.current, event.combo);
        break;
      case 'useSpecial':
        if (event.specialsUsed) obj.current += event.specialsUsed;
        break;
      case 'clearBottom':
        if (event.bottomCleared) obj.current += event.bottomCleared;
        break;
      case 'defuse':
        if (event.bombsDefused) obj.current += event.bombsDefused;
        break;
      case 'boss':
        if (event.bossDefeated) obj.current = 1;
        break;
    }
  }
}

export function objectivesComplete(tracker) {
  return tracker.every(obj => obj.current >= obj.target);
}

// ===== UTILITIES =====
function findMostCommonType(grid, rows, cols) {
  const counts = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const g = grid[r][c];
      if (g && g.type >= 0) counts[g.type] = (counts[g.type] || 0) + 1;
    }
  }
  let best = 0, bestCount = 0;
  for (const [t, cnt] of Object.entries(counts)) {
    if (cnt > bestCount) { best = Number(t); bestCount = cnt; }
  }
  return best;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export { shuffle };

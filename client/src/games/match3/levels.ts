/* ─── Match-3 Royal Puzzle — Level Definitions ─── */

import { GemType, type LevelData } from './types';

const G = GemType;
const BASIC  = [G.Ruby, G.Sapphire, G.Emerald, G.Amethyst];
const FIVE   = [G.Ruby, G.Sapphire, G.Emerald, G.Amethyst, G.Topaz];
const ALL    = [G.Ruby, G.Sapphire, G.Emerald, G.Amethyst, G.Topaz, G.Diamond];

export const LEVELS: LevelData[] = [
  {
    id: 1, name: 'البداية',
    rows: 8, cols: 8, moves: 25,
    objectives: [{ type: 'score', target: 800 }],
    stars: [800, 1600, 3000],
    gems: BASIC,
  },
  {
    id: 2, name: 'الجواهر الحمراء',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'collect', gemType: G.Ruby, target: 12 }],
    stars: [1000, 2200, 4000],
    gems: BASIC,
  },
  {
    id: 3, name: 'تحدي الخمسة',
    rows: 8, cols: 8, moves: 20,
    objectives: [{ type: 'score', target: 1500 }],
    stars: [1500, 3000, 5000],
    gems: FIVE,
  },
  {
    id: 4, name: 'جمع الزمرد',
    rows: 8, cols: 8, moves: 20,
    objectives: [{ type: 'collect', gemType: G.Emerald, target: 18 }],
    stars: [1800, 3500, 6000],
    gems: FIVE,
  },
  {
    id: 5, name: 'العاصفة الملكية',
    rows: 8, cols: 8, moves: 18,
    objectives: [
      { type: 'score', target: 2500 },
      { type: 'collect', gemType: G.Amethyst, target: 10 },
    ],
    stars: [2500, 5000, 8000],
    gems: FIVE,
  },
  {
    id: 6, name: 'كل الألوان',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'score', target: 3000 }],
    stars: [3000, 6000, 10000],
    gems: ALL,
  },
  {
    id: 7, name: 'الياقوت والزفير',
    rows: 8, cols: 8, moves: 18,
    objectives: [
      { type: 'collect', gemType: G.Ruby, target: 15 },
      { type: 'collect', gemType: G.Sapphire, target: 15 },
    ],
    stars: [3500, 7000, 12000],
    gems: ALL,
  },
  {
    id: 8, name: 'الماس الثمين',
    rows: 8, cols: 8, moves: 16,
    objectives: [{ type: 'collect', gemType: G.Diamond, target: 20 }],
    stars: [4000, 8000, 14000],
    gems: ALL,
  },
  {
    id: 9, name: 'عاصفة السلاسل',
    rows: 8, cols: 8, moves: 15,
    objectives: [{ type: 'score', target: 6000 }],
    stars: [6000, 10000, 16000],
    gems: ALL,
  },
  {
    id: 10, name: 'التاج الملكي',
    rows: 8, cols: 8, moves: 14,
    objectives: [
      { type: 'score', target: 8000 },
      { type: 'collect', gemType: G.Topaz, target: 20 },
      { type: 'collect', gemType: G.Amethyst, target: 20 },
    ],
    stars: [8000, 14000, 22000],
    gems: ALL,
  },
];

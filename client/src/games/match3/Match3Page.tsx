/* ─── Match-3 Royal Puzzle — Main Page (Level Select + Game) ─── */

import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { LEVELS } from './levels';
import type { LevelData, SavedProgress } from './types';
import { GEM_STYLES, GemType } from './types';
import Match3Game from './Match3Game';

const STORAGE_KEY = 'match3-progress';

function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProgress(p: SavedProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/* ═══════════════════════════════════════════════
   ███  LEVEL SELECT SCREEN
   ═══════════════════════════════════════════════ */

function LevelSelect({ onPlay }: { onPlay: (level: LevelData) => void }) {
  const [, navigate] = useLocation();
  const progress = loadProgress();

  // Determine which levels are unlocked
  const isUnlocked = (id: number) => {
    if (id === 1) return true;
    return !!(progress[id - 1]?.stars && progress[id - 1].stars > 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16213e] to-[#0a1628] text-white select-none">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg, rgba(26,10,46,0.95) 60%, transparent 100%)' }}>
        <button
          onClick={() => navigate('/child-games')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-lg transition"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">💎</span>
          <h1 className="text-lg font-bold bg-gradient-to-r from-yellow-300 to-purple-300 bg-clip-text text-transparent">
            الجواهر الملكية
          </h1>
        </div>
        <div className="w-10" /> {/* spacer */}
      </div>

      {/* Level Grid */}
      <div className="px-4 pb-8 pt-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-md mx-auto">
          {LEVELS.map((lvl) => {
            const unlocked = isUnlocked(lvl.id);
            const saved = progress[lvl.id];
            const earned = saved?.stars ?? 0;

            return (
              <button
                key={lvl.id}
                disabled={!unlocked}
                onClick={() => unlocked && onPlay(lvl)}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  unlocked
                    ? 'bg-gradient-to-br from-purple-700/60 to-indigo-800/60 border border-purple-500/30 hover:border-yellow-400/50 hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/40'
                    : 'bg-gray-800/40 border border-gray-700/20 opacity-50'
                }`}
              >
                {/* Level number */}
                <span className={`text-2xl font-black ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                  {unlocked ? lvl.id : '🔒'}
                </span>

                {/* Level name */}
                {unlocked && (
                  <span className="text-[9px] text-purple-200/80 font-medium leading-tight text-center px-1">
                    {lvl.name}
                  </span>
                )}

                {/* Stars */}
                {unlocked && (
                  <div className="flex gap-0.5 mt-0.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`text-xs ${earned > i ? 'text-yellow-400' : 'text-gray-600'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                )}

                {/* Badge for completed */}
                {earned === 3 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] shadow-md">
                    💎
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="text-sm font-bold text-purple-300 mb-3 text-center">الإحصائيات</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold text-yellow-400">
                  {Object.keys(progress).filter(k => progress[Number(k)]?.stars > 0).length}
                </div>
                <div className="text-[10px] text-gray-400">مكتمل</div>
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-400">
                  {Object.values(progress).reduce((sum, p) => sum + (p?.stars ?? 0), 0)}
                </div>
                <div className="text-[10px] text-gray-400">⭐ مجموع النجوم</div>
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-400">
                  {Math.max(0, ...Object.values(progress).map(p => p?.score ?? 0)).toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400">أعلى نقاط</div>
              </div>
            </div>
          </div>
        </div>

        {/* How to play */}
        <div className="mt-4 max-w-md mx-auto">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <h3 className="text-sm font-bold text-purple-300 mb-3 text-center">كيف تلعب؟</h3>
            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-base">👆</span>
                <span>اسحب أو انقر لتبديل الجواهر المتجاورة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">💥</span>
                <span>طابق 3 أو أكثر من نفس اللون لتدميرها</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">🚀</span>
                <span>طابق 4 = صاروخ | شكل L = قنبلة | طابق 5 = قوس قزح</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                <span>حقق الأهداف قبل نفاد الحركات واحصل على 3 نجوم!</span>
              </div>
            </div>

            {/* Gem legend */}
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              {([GemType.Ruby, GemType.Sapphire, GemType.Emerald, GemType.Amethyst, GemType.Topaz, GemType.Diamond] as GemType[]).map(gt => (
                <div key={gt} className="w-6 h-6 rounded-full border border-white/20"
                  style={{ backgroundColor: GEM_STYLES[gt].bg }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ███  MAIN PAGE WRAPPER
   ═══════════════════════════════════════════════ */

export default function Match3Page() {
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);

  const handlePlay = useCallback((level: LevelData) => {
    setCurrentLevel(level);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentLevel(null);
  }, []);

  const handleComplete = useCallback((stars: number, score: number) => {
    if (!currentLevel) return;
    const progress = loadProgress();
    const prev = progress[currentLevel.id];
    if (!prev || stars > prev.stars || score > prev.score) {
      progress[currentLevel.id] = {
        stars: Math.max(stars, prev?.stars ?? 0),
        score: Math.max(score, prev?.score ?? 0),
      };
      saveProgress(progress);
    }
  }, [currentLevel]);

  if (currentLevel) {
    return <Match3Game level={currentLevel} onBack={handleBack} onComplete={handleComplete} />;
  }

  return <LevelSelect onPlay={handlePlay} />;
}

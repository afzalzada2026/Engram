import { Flame, Heart, Zap } from 'lucide-react';
import { DIFFS, type Difficulty } from '../lib/levels';
import type { Phase } from '../hooks/useMemoryGame';

interface HudProps {
  score: number;
  level: number;
  lives: number;
  maxLives: number;
  combo: number;
  gridSize: number;
  diff: Difficulty;
  stageName: string;
  stageAccent: string;
  fever: number;
  feverActive: boolean;
  best: number;
  beaten: boolean;
}

export function Hud({
  score,
  level,
  lives,
  maxLives,
  combo,
  gridSize,
  diff,
  stageName,
  stageAccent,
  fever,
  feverActive,
  best,
  beaten,
}: HudProps) {
  return (
    <div className="w-full">
      <div className="flex items-end justify-between">
        <div className="min-w-[92px]">
          <div className="text-[10px] font-semibold tracking-[0.28em] text-dim">SCORE</div>
          <div key={score} className="score-pop font-display text-2xl font-bold tabular-nums text-ink sm:text-3xl">
            {score.toLocaleString()}
          </div>
          <div className="mt-0.5 h-3.5 text-[9px] font-bold tracking-[0.2em]">
            {beaten ? (
              <span className="pop-in inline-block text-gold">NEW BEST</span>
            ) : best > 0 ? (
              <span className="text-dim/70">BEST {best.toLocaleString()}</span>
            ) : null}
          </div>
        </div>

        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-[0.28em] text-dim">LEVEL</div>
          <div className="flex items-center justify-center gap-2">
            <span key={level} className="pop-in font-display text-2xl font-bold tabular-nums text-vio sm:text-3xl">
              {level}
            </span>
            <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-dim">
              {gridSize}×{gridSize}
            </span>
          </div>
          <div className="mt-0.5 flex h-3.5 items-center justify-center gap-1.5 text-[9px] font-bold tracking-[0.2em]">
            <span style={{ color: DIFFS[diff].tint }}>{DIFFS[diff].label}</span>
            <span className="text-dim/50">·</span>
            <span style={{ color: stageAccent }}>{stageName}</span>
          </div>
        </div>

        <div className="flex min-w-[92px] flex-col items-end">
          <div className="text-[10px] font-semibold tracking-[0.28em] text-dim">LIVES</div>
          <div className="mt-1 flex gap-1.5">
            {Array.from({ length: maxLives }, (_, i) => {
              const alive = i < lives;
              return (
                <Heart
                  key={`${i}-${alive}`}
                  className={`h-5 w-5 transition-all duration-300 ${
                    alive ? 'pop-in text-rose drop-shadow-[0_0_7px_rgba(251,77,109,0.8)]' : 'scale-75 text-slate-700 opacity-40'
                  }`}
                  fill={alive ? 'currentColor' : 'none'}
                  strokeWidth={2.2}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* fever meter row */}
      <div className="mt-1.5 flex h-7 items-center gap-2">
        <Flame
          className={`h-4 w-4 shrink-0 transition-colors duration-300 ${feverActive ? 'text-gold' : fever > 0 ? 'text-vio' : 'text-slate-600'}`}
          fill={fever > 0 ? 'currentColor' : 'none'}
        />
        <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full w-full origin-left rounded-full ${feverActive ? 'fever-bar' : ''}`}
            style={{
              transform: `scaleX(${Math.max(0, Math.min(100, fever)) / 100})`,
              transition: 'transform 120ms linear',
              ...(feverActive ? {} : { background: 'linear-gradient(90deg,#a78bfa,#f472b6,#fbbf24)' }),
            }}
          />
        </div>
        {feverActive && (
          <span className="fever-chip inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/60 bg-gold/15 px-2 py-0.5 font-display text-[10px] font-extrabold tracking-widest text-gold">
            <Zap className="h-3 w-3" fill="currentColor" /> FEVER ×2
          </span>
        )}
        {!feverActive && Math.min(combo, 8) >= 2 && (
          <span
            key={Math.min(combo, 8)}
            className="pop-in inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold tracking-widest text-gold"
          >
            <Zap className="h-3 w-3" fill="currentColor" />
            COMBO ×{Math.min(combo, 8)}
          </span>
        )}
      </div>
    </div>
  );
}

export function PhaseBanner({
  phase,
  level,
  patternCount,
  foundCount,
  bonus,
  perfect,
  perfectBonus,
  gridUpgrade,
}: {
  phase: Phase;
  level: number;
  patternCount: number;
  foundCount: number;
  bonus: number;
  perfect: boolean;
  perfectBonus: number;
  gridUpgrade: boolean;
}) {
  const key = `${phase}-${level}`;
  return (
    <div className="flex h-12 w-full flex-col items-center justify-center sm:h-14">
      <div key={key} className="banner-in flex flex-col items-center">
        {phase === 'memorize' && (
          <div className="font-display text-xl font-bold tracking-[0.3em] text-vio drop-shadow-[0_0_14px_rgba(167,139,250,0.65)] sm:text-2xl">
            MEMORIZE
          </div>
        )}
        {phase === 'recall' && (
          <div className="font-display text-xl font-bold tracking-[0.3em] text-cyanx drop-shadow-[0_0_14px_rgba(34,211,238,0.65)] sm:text-2xl">
            RECALL
          </div>
        )}
        {phase === 'roundclear' && (
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-lg font-bold tracking-[0.2em] text-mint drop-shadow-[0_0_14px_rgba(54,245,197,0.65)] sm:text-2xl sm:tracking-[0.22em]">
                GRID CLEARED
              </span>
              <span className="font-display text-base font-bold tabular-nums text-gold sm:text-xl">+{bonus.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex gap-1.5">
              {perfect && (
                <span className="pop-in rounded-full border border-gold/50 bg-gold/15 px-2.5 py-0.5 font-display text-[9px] font-extrabold tracking-[0.2em] text-gold">
                  PERFECT +{perfectBonus}
                </span>
              )}
              {gridUpgrade && (
                <span className="pop-in rounded-full border border-vio/50 bg-vio/15 px-2.5 py-0.5 font-display text-[9px] font-extrabold tracking-[0.2em] text-vio">
                  GRID UPGRADE NEXT
                </span>
              )}
            </div>
          </div>
        )}
        {phase === 'revealmiss' && (
          <div className="font-display text-xl font-bold tracking-[0.3em] text-rose drop-shadow-[0_0_14px_rgba(251,77,109,0.7)] sm:text-2xl">
            CONNECTION LOST
          </div>
        )}

        {(phase === 'memorize' || phase === 'recall') && (
          <div className="mt-2 flex items-center gap-1.5">
            {Array.from({ length: patternCount }, (_, i) => {
              const filled = phase === 'recall' && i < foundCount;
              return (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                    phase === 'memorize'
                      ? 'dot-pulse bg-vio'
                      : filled
                        ? 'bg-mint shadow-[0_0_8px_rgba(54,245,197,0.9)]'
                        : 'bg-white/15'
                  }`}
                  style={phase === 'memorize' ? { animationDelay: `${i * 90}ms` } : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function TimerBar({ phase, ratio }: { phase: Phase; ratio: number }) {
  let bg = 'linear-gradient(90deg,#22d3ee,#a78bfa)';
  if (phase === 'memorize') bg = 'linear-gradient(90deg,#a78bfa,#22d3ee)';
  else if (phase === 'roundclear') bg = '#36f5c5';
  else if (phase === 'recall') {
    if (ratio > 0.5) bg = 'linear-gradient(90deg,#22d3ee,#a78bfa)';
    else if (ratio > 0.25) bg = 'linear-gradient(90deg,#a78bfa,#fbbf24)';
    else bg = 'linear-gradient(90deg,#fbbf24,#fb4d6d)';
  }
  const shown = phase === 'memorize' || phase === 'recall' || phase === 'roundclear';
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className="h-full w-full origin-left rounded-full"
        style={{
          transform: `scaleX(${phase === 'memorize' || phase === 'roundclear' ? 1 : Math.max(ratio, 0)})`,
          transition: 'transform 90ms linear, background 300ms',
          background: bg,
          boxShadow: '0 0 12px rgba(34,211,238,0.35)',
        }}
      />
    </div>
  );
}

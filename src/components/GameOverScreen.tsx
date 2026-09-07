import { useState } from 'react';
import { Check, Flame, Gauge, Home, LayoutGrid, Play, Sparkles, Star, Target, TrendingUp, Zap } from 'lucide-react';
import { NAME_KEY, type ScoreEntry } from '../hooks/useHighScores';
import type { MetaProfile, RunSummary } from '../hooks/useMeta';
import { DIFFS, rankForScore, type Difficulty } from '../lib/levels';
import { HighScoreTable } from './HighScoreTable';

interface Props {
  score: number;
  level: number;
  correctTotal: number;
  pickTotal: number;
  maxCombo: number;
  perfectRounds: number;
  mode: Difficulty;
  isNewBest: boolean;
  qualifies: boolean;
  onSaveName: (name: string) => string;
  scores: ScoreEntry[];
  runSummary: RunSummary | null;
  profile: MetaProfile;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverScreen({
  score,
  level,
  correctTotal,
  pickTotal,
  maxCombo,
  perfectRounds,
  mode,
  isNewBest,
  qualifies,
  onSaveName,
  scores,
  runSummary,
  profile,
  onRestart,
  onMenu,
}: Props) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || 'PLAYER';
    } catch {
      return 'PLAYER';
    }
  });
  const [savedId, setSavedId] = useState<string | null>(null);

  const accuracy = pickTotal > 0 ? Math.round((correctTotal / pickTotal) * 100) : 100;
  const rank = rankForScore(score);
  const showInput = qualifies && !savedId;

  const save = () => {
    const clean = name.trim().toUpperCase().slice(0, 10) || 'PLAYER';
    const id = onSaveName(clean);
    setSavedId(id);
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-abyss/80 p-4 backdrop-blur-md">
      <div className="glass scroller fade-up w-[min(94vw,480px)] max-h-[92svh] overflow-y-auto rounded-3xl p-6 text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] sm:p-8">
        <div className="flex items-center justify-center gap-2">
          <span
            className="rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold tracking-[0.2em]"
            style={{ color: DIFFS[mode].tint, borderColor: `${DIFFS[mode].tint}55`, background: `${DIFFS[mode].tint}14` }}
          >
            {DIFFS[mode].label}
          </span>
          <span className="text-[10px] font-bold tracking-[0.34em] text-dim">SESSION OVER</span>
          <span
            className="rounded-full border px-2.5 py-0.5 font-display text-[10px] font-bold tracking-[0.2em]"
            style={{ color: rank.tint, borderColor: `${rank.tint}55`, background: `${rank.tint}14` }}
          >
            {rank.label}
          </span>
        </div>

        <div className="mt-3 font-display text-5xl font-extrabold tabular-nums leading-none sm:text-6xl">
          <span className="title-shimmer">{score.toLocaleString()}</span>
        </div>
        <div className="mt-1 text-[10px] font-semibold tracking-[0.3em] text-dim">FINAL SCORE</div>

        {isNewBest && (
          <div className="pop-in mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-[11px] font-bold tracking-[0.18em] text-gold">NEW PERSONAL BEST</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-center gap-2">
          {runSummary && runSummary.streak > 1 && (
            <span className="pop-in inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1">
              <Flame className="h-3.5 w-3.5 text-orange-300" fill="currentColor" />
              <span className="text-[10px] font-bold tracking-[0.18em] text-orange-300">DAY {runSummary.streak} STREAK</span>
            </span>
          )}
          {perfectRounds > 0 && (
            <span className="pop-in inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1">
              <Star className="h-3.5 w-3.5 text-gold" fill="currentColor" />
              <span className="text-[10px] font-bold tracking-[0.18em] text-gold">
                {perfectRounds} PERFECT {perfectRounds === 1 ? 'GRID' : 'GRIDS'}
              </span>
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: Gauge, label: 'LEVEL', value: `${level}` },
            { icon: LayoutGrid, label: 'TILES', value: `${correctTotal}` },
            { icon: Target, label: 'ACCURACY', value: `${accuracy}%` },
            { icon: Zap, label: 'BEST COMBO', value: `×${Math.max(maxCombo, 1)}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3">
              <Icon className="mx-auto h-4 w-4 text-vio" />
              <div className="mt-1.5 font-display text-lg font-bold tabular-nums text-ink">{value}</div>
              <div className="text-[9px] font-bold tracking-[0.2em] text-dim">{label}</div>
            </div>
          ))}
        </div>

        {runSummary && (
          <div className="fade-up mt-4 rounded-2xl border border-vio/30 bg-vio/[0.07] p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.24em] text-vio">
                NEURAL XP · LV {profile.level} {profile.title}
              </span>
              <span className="pop-in font-display text-sm font-bold tabular-nums text-gold">+{runSummary.xpGain} XP</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="xp-fill h-full rounded-full bg-gradient-to-r from-vio to-cyanx"
                style={{ width: `${Math.max(3, Math.round((profile.into / profile.need) * 100))}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] font-semibold tracking-widest text-dim">
              <span>{runSummary.leveledTo > 0 ? 'RANK UP' : 'PROGRESS'}</span>
              <span className="tabular-nums">
                {profile.into}/{profile.need} XP
              </span>
            </div>
            {runSummary.leveledTo > 0 && (
              <div className="pop-in mt-3 flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/15 py-2">
                <TrendingUp className="h-4 w-4 text-gold" />
                <span className="font-display text-xs font-extrabold tracking-[0.2em] text-gold">
                  RANK UP — LEVEL {runSummary.leveledTo}
                </span>
              </div>
            )}
          </div>
        )}

        {showInput && (
          <div className="fade-up mt-5 rounded-2xl border border-mint/30 bg-mint/[0.07] p-4">
            <div className="text-[10px] font-bold tracking-[0.24em] text-mint">TOP-10 RUN — CARVE YOUR NAME</div>
            <div className="mt-3 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 10))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save();
                }}
                placeholder="ACE"
                maxLength={10}
                autoFocus
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-abyss/70 px-4 py-2.5 text-center font-display text-base font-bold tracking-[0.24em] text-ink outline-none transition-colors placeholder:text-dim/50 focus:border-mint/60"
              />
              <button
                onClick={save}
                disabled={!name.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-mint to-cyanx px-4 py-2.5 font-display text-xs font-bold tracking-widest text-abyss transition-transform enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> SAVE
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyanx to-vio px-4 py-3.5 font-display text-sm font-bold tracking-widest text-abyss transition-transform duration-150 hover:scale-[1.02] active:scale-95"
          >
            <Play className="h-4 w-4" fill="currentColor" /> PLAY AGAIN
          </button>
          <button
            onClick={onMenu}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 font-display text-sm font-bold tracking-widest text-ink transition-all duration-150 hover:bg-white/10 active:scale-95"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <HighScoreTable
            scores={scores.filter((s) => s.mode === mode)}
            highlightId={savedId}
            limit={5}
            title={`LEGENDS · ${DIFFS[mode].label}`}
          />
        </div>
      </div>
    </div>
  );
}

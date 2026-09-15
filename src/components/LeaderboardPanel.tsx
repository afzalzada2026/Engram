import { useState } from 'react';
import { Crown, Globe2, Loader2, Trophy } from 'lucide-react';
import { DIFFS, DIFF_ORDER, type Difficulty } from '../lib/levels';
import { useLeaderboard } from '../hooks/useLeaderboard';

export function LeaderboardPanel({ initialMode, myUid }: { initialMode: Difficulty; myUid: string | null }) {
  const [mode, setMode] = useState<Difficulty>(initialMode);
  const lb = useLeaderboard(mode);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-cyanx" />
          <span className="text-[11px] font-bold tracking-[0.24em] text-dim">GLOBAL LEGENDS · {DIFFS[mode].label}</span>
        </div>
        {lb.loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-dim" />}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {DIFF_ORDER.map((d) => (
          <button
            key={d}
            onClick={() => setMode(d)}
            className={`rounded-lg border py-1.5 text-[9px] font-bold tracking-[0.14em] transition-colors ${
              d === mode ? 'border-cyanx/60 bg-cyanx/15 text-cyanx' : 'border-white/10 bg-white/[0.03] text-dim hover:text-ink'
            }`}
          >
            {DIFFS[d].label}
          </button>
        ))}
      </div>

      {lb.error ? (
        <p className="py-3 text-center text-xs text-rose">{lb.error}</p>
      ) : lb.entries.length === 0 && !lb.loading ? (
        <p className="py-3 text-center text-xs text-dim">
          No global scores yet on this lane. Sign in and post the first.
        </p>
      ) : (
        <ol className="scroller flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
          {lb.entries.map((e, i) => {
            const hot = e.uid === myUid;
            return (
              <li
                key={e.uid}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm ${
                  hot ? 'bg-mint/10 ring-1 ring-mint/40' : i % 2 ? 'bg-white/[0.02]' : ''
                }`}
              >
                <span className={`w-5 text-center font-display text-xs font-bold ${i < 3 ? 'text-gold' : 'text-dim'}`}>
                  {i === 0 ? <Crown className="mx-auto h-3.5 w-3.5" fill="currentColor" /> : i + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate font-semibold tracking-wide ${hot ? 'text-mint' : 'text-ink'}`}
                >
                  {e.name}
                  {hot && <span className="ml-2 rounded bg-mint/15 px-1.5 py-0.5 text-[9px] font-bold tracking-widest">YOU</span>}
                </span>
                <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-dim">
                  L{e.level}
                </span>
                <span className="w-16 text-right font-display text-sm font-bold tabular-nums text-ink">
                  {e.score.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {lb.myRank && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-mint/30 bg-mint/10 px-3 py-2">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-mint">
            <Trophy className="h-3.5 w-3.5" /> YOUR RANK
          </div>
          <div className="flex items-baseline gap-3 text-sm">
            <span className="font-display font-bold tabular-nums text-ink">#{lb.myRank.rank}</span>
            <span className="font-display font-bold tabular-nums text-mint">{lb.myRank.entry.score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {!myUid && (
        <p className="mt-3 text-center text-[10px] leading-relaxed text-dim">
          Scores are public on the leaderboard. Sign in to post your own.
        </p>
      )}
    </div>
  );
}

import { Crown, Trophy } from 'lucide-react';
import type { ScoreEntry } from '../hooks/useHighScores';
import { DIFFS } from '../lib/levels';

const RANK_STYLE = [
  'text-gold',
  'text-slate-200',
  'text-orange-300',
];

export function HighScoreTable({
  scores,
  highlightId,
  limit = 5,
  title = 'LOCAL LEGENDS',
}: {
  scores: ScoreEntry[];
  highlightId?: string | null;
  limit?: number;
  title?: string;
}) {
  const rows = scores.slice(0, limit);
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-gold" />
        <span className="text-[11px] font-bold tracking-[0.24em] text-dim">{title}</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-3 text-center text-xs text-dim">
          No legends yet — your first run writes history.
        </p>
      ) : (
        <ol className="scroller flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
          {rows.map((s, i) => {
            const hot = highlightId === s.id;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  hot ? 'bg-mint/10 ring-1 ring-mint/40' : i % 2 ? 'bg-white/[0.02]' : ''
                }`}
              >
                <span className={`w-5 text-center font-display text-xs font-bold ${RANK_STYLE[i] ?? 'text-dim'}`}>
                  {i === 0 ? <Crown className="mx-auto h-3.5 w-3.5" fill="currentColor" /> : i + 1}
                </span>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: DIFFS[s.mode].tint, boxShadow: `0 0 6px ${DIFFS[s.mode].tint}` }}
                  title={DIFFS[s.mode].label}
                />
                <span className={`min-w-0 flex-1 truncate font-semibold tracking-wide ${hot ? 'text-mint' : 'text-ink'}`}>
                  {s.name}
                  {hot && <span className="ml-2 rounded bg-mint/15 px-1.5 py-0.5 text-[9px] font-bold tracking-widest">YOU</span>}
                </span>
                <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-dim">
                  L{s.level}
                </span>
                <span className="w-16 text-right font-display text-sm font-bold tabular-nums text-ink">
                  {s.score.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

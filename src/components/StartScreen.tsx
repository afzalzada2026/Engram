import { useMemo, type CSSProperties } from 'react';
import { Brain, Cloud, Crosshair, Download, Eye, Feather, Flame, Globe2, LayoutGrid, MousePointerClick, Play, RotateCcw, Sparkles, Swords, TrendingUp, Zap } from 'lucide-react';
import type { ScoreEntry } from '../hooks/useHighScores';
import type { MetaProfile } from '../hooks/useMeta';
import { DIFFS, DIFF_ORDER, type Difficulty } from '../lib/levels';
import { HighScoreTable } from './HighScoreTable';
import { LeaderboardPanel } from './LeaderboardPanel';
import type { CloudUser } from '../hooks/useFirebaseSync';

interface DemoCell {
  hot: boolean;
  delay: string;
  dur: string;
}

const DIFF_ICONS = { calm: Feather, focus: Crosshair, surge: Flame } as const;

export function StartScreen({
  onStart,
  diff,
  onDiff,
  scores,
  profile,
  canInstall,
  onInstall,
  onOpenSync,
  cloudConnected,
  cloudBusy,
  cloudStatus,
  cloudUser,
  leaderboardMode,
  showGlobal,
  onToggleGlobal,
  challenge,
  onDeclineChallenge,
}: {
  onStart: (diff: Difficulty) => void;
  diff: Difficulty;
  onDiff: (d: Difficulty) => void;
  scores: ScoreEntry[];
  profile: MetaProfile;
  canInstall: boolean;
  onInstall: () => void;
  onOpenSync: () => void;
  cloudConnected: boolean;
  cloudBusy: boolean;
  cloudStatus: 'unconfigured' | 'signedOut' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error';
  cloudUser: CloudUser | null;
  leaderboardMode: Difficulty;
  showGlobal: boolean;
  onToggleGlobal: () => void;
  challenge: { name: string; target: number; mode: Difficulty } | null;
  onDeclineChallenge: () => void;
}) {
  const demo = useMemo<DemoCell[]>(
    () =>
      Array.from({ length: 25 }, (_, i) => {
        const hot = [2, 6, 12, 16, 22, 18].includes(i);
        return {
          hot,
          delay: `${(i % 5) * 0.28 + Math.random() * 0.6}s`,
          dur: `${2.6 + Math.random() * 1.6}s`,
        };
      }),
    []
  );

  const modeScores = useMemo(() => scores.filter((s) => s.mode === diff), [scores, diff]);
  const best = modeScores.length ? modeScores[0].score : 0;

  return (
    <main className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center justify-center gap-5 px-4 py-10">
      {/* ambient demo grid behind the title */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 grid w-[min(88vw,440px)] -translate-x-1/2 -translate-y-1/2 grid-cols-5 gap-2 opacity-40 blur-[1.5px] [mask-image:radial-gradient(circle_at_center,black_20%,transparent_72%)]"
      >
        {demo.map((c, i) => (
          <div
            key={i}
            className={`demo-cell aspect-square ${c.hot ? 'hot' : ''}`}
            style={{ '--dl': c.delay, '--dd': c.dur } as CSSProperties}
          />
        ))}
      </div>

      <div className="fade-up flex flex-col items-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-vio/40 bg-gradient-to-br from-vio/25 to-cyanx/15 shadow-[0_0_30px_rgba(139,92,246,0.35)]">
          <Brain className="h-7 w-7 text-vio" />
        </div>
        <h1 className="title-shimmer mt-4 w-full whitespace-nowrap text-center font-display text-[clamp(2.6rem,12vw,4.5rem)] font-extrabold leading-none tracking-[0.12em] indent-[0.12em] sm:text-7xl">
          ENGRAM
        </h1>
        <p className="mt-3 px-2 text-center text-[10px] font-semibold tracking-[0.22em] text-dim sm:text-xs sm:tracking-[0.34em]">
          CARVE PATTERNS INTO MEMORY
        </p>
      </div>

      {challenge && (
        <div className="fade-up w-full max-w-md rounded-2xl border border-mag/45 bg-mag/[0.09] p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Swords className="h-4 w-4 text-mag" />
            <span className="font-display text-[11px] font-extrabold tracking-[0.2em] text-mag">INCOMING DUEL</span>
          </div>
          <p className="mt-2 text-sm text-ink">
            <span className="font-bold text-mag">{challenge.name}</span> scored{' '}
            <span className="font-display font-bold tabular-nums">{challenge.target.toLocaleString()}</span>
          </p>
          <p className="mt-1 text-[10px] tracking-wide text-dim">
            You'll face the identical grids on {DIFFS[challenge.mode].label}. Pure recall, no luck.
          </p>
          <button onClick={onDeclineChallenge} className="mt-2 text-[10px] font-semibold tracking-widest text-dim underline underline-offset-2 hover:text-ink">
            play a normal run instead
          </button>
        </div>
      )}

      {/* difficulty selector */}
      <div className={`fade-up w-full max-w-md ${challenge ? 'pointer-events-none opacity-40' : ''}`} style={{ animationDelay: '70ms' }}>
        <div className="mb-2 text-center text-[9px] font-bold tracking-[0.3em] text-dim">
          {challenge ? 'LOCKED BY DUEL' : 'CHOOSE YOUR CURRENT'}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DIFF_ORDER.map((d) => {
            const cfg = DIFFS[d];
            const Icon = DIFF_ICONS[d];
            const active = d === diff;
            return (
              <button
                key={d}
                onClick={() => onDiff(d)}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition-all duration-150 active:scale-95 ${
                  active ? 'scale-[1.02]' : 'border-white/10 bg-white/[0.03] opacity-70 hover:opacity-100'
                }`}
                style={
                  active
                    ? {
                        borderColor: `${cfg.tint}88`,
                        background: `${cfg.tint}14`,
                        boxShadow: `0 0 24px -4px ${cfg.tint}55`,
                      }
                    : undefined
                }
              >
                <Icon className="h-4.5 w-4.5" style={{ color: cfg.tint }} fill={d === 'surge' ? 'currentColor' : 'none'} />
                <span className="font-display text-[11px] font-bold tracking-[0.18em]" style={{ color: active ? cfg.tint : '#e8ecff' }}>
                  {cfg.label}
                </span>
                <span className="text-center text-[8.5px] leading-tight tracking-wide text-dim">{cfg.blurb}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onStart(diff)}
        className="fade-up group relative overflow-hidden rounded-full bg-gradient-to-r from-cyanx via-vio to-mag px-10 py-4 font-display text-base font-bold tracking-[0.22em] text-abyss shadow-[0_10px_40px_-8px_rgba(139,92,246,0.7)] transition-transform duration-150 hover:scale-[1.04] active:scale-95"
        style={{ animationDelay: '120ms' }}
      >
        <span className="relative z-10 flex items-center gap-2.5">
          {challenge ? <Swords className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
          {challenge ? 'ACCEPT DUEL' : 'START TRAINING'}
        </span>
        <span className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-500 ease-out group-hover:translate-x-0" />
      </button>

      <div className="fade-up grid w-full max-w-md grid-cols-3 gap-2.5" style={{ animationDelay: '170ms' }}>
        {[
          { icon: Eye, title: 'MEMORIZE', sub: 'Watch the flashes' },
          { icon: MousePointerClick, title: 'RECALL', sub: 'Tap every cell' },
          { icon: Zap, title: 'CHAIN', sub: 'Fever doubles points' },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="glass flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-center">
            <Icon className="h-5 w-5 text-cyanx" />
            <span className="text-[11px] font-bold tracking-[0.18em] text-ink">{title}</span>
            <span className="text-[10px] leading-tight text-dim">{sub}</span>
          </div>
        ))}
      </div>

      {profile.runs > 0 ? (
        <div className="fade-up glass w-full max-w-md rounded-2xl p-4" style={{ animationDelay: '210ms' }}>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-vio/40 bg-vio/10 font-display text-base font-extrabold tabular-nums text-vio">
              {profile.level}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold tracking-[0.22em] text-ink">{profile.title}</span>
                <span className="text-[9px] font-semibold tracking-widest text-dim tabular-nums">
                  {profile.into}/{profile.need} XP
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="xp-fill h-full rounded-full bg-gradient-to-r from-vio to-cyanx"
                  style={{ width: `${Math.max(3, Math.round((profile.into / profile.need) * 100))}%` }}
                />
              </div>
            </div>
            {profile.streak > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1">
                <Flame className="h-3.5 w-3.5 text-orange-300" fill="currentColor" />
                <span className="text-[11px] font-extrabold tracking-wider text-orange-300 tabular-nums">{profile.streak}D</span>
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: RotateCcw, label: 'RUNS', value: profile.runs },
              { icon: LayoutGrid, label: 'TILES MEMORIZED', value: profile.tiles },
              { icon: TrendingUp, label: 'BEST LEVEL', value: profile.bestLevel },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border border-white/8 bg-white/[0.03] px-1 py-2">
                <div className="flex items-center justify-center gap-1 font-display text-sm font-bold tabular-nums text-ink">
                  <Icon className="h-3 w-3 text-cyanx" />
                  {value.toLocaleString()}
                </div>
                <div className="mt-0.5 text-[8px] font-bold tracking-[0.18em] text-dim">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        best > 0 && (
          <div className="fade-up flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5" style={{ animationDelay: '220ms' }}>
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs font-bold tracking-widest text-gold">PERSONAL BEST {best.toLocaleString()}</span>
          </div>
        )
      )}

      {cloudUser && (
        <div className="fade-up flex items-center gap-2 rounded-full border border-cyanx/40 bg-cyanx/10 px-3.5 py-1.5" style={{ animationDelay: '195ms' }}>
          {cloudUser.photoURL ? (
            <img src={cloudUser.photoURL} alt="" className="h-5 w-5 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-cyanx/25 text-[10px] font-bold text-cyanx">
              {cloudUser.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-[10px] font-bold tracking-[0.14em] text-cyanx">
            SIGNED IN AS {cloudUser.displayName.toUpperCase().slice(0, 18)}
          </span>
        </div>
      )}

      {modeScores.length > 0 && (
        <div className="fade-up w-full max-w-md" style={{ animationDelay: '250ms' }}>
          <HighScoreTable scores={modeScores} limit={5} title={`LOCAL · ${DIFFS[diff].label}`} />
        </div>
      )}

      <div className="fade-up w-full max-w-md" style={{ animationDelay: '255ms' }}>
        <button
          onClick={onToggleGlobal}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyanx/35 bg-cyanx/[0.07] px-4 py-2.5 text-[11px] font-bold tracking-[0.18em] text-cyanx transition-colors hover:bg-cyanx/10 active:scale-[0.99]"
        >
          <Globe2 className="h-3.5 w-3.5" />
          {showGlobal ? 'HIDE GLOBAL LEADERBOARD' : 'VIEW GLOBAL LEADERBOARD'}
        </button>
        {showGlobal && (
          <div className="mt-2 fade-up">
            <LeaderboardPanel initialMode={leaderboardMode} myUid={cloudUser?.uid ?? null} />
          </div>
        )}
      </div>

      <div className="fade-up flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: '270ms' }}>
        {canInstall && (
          <button
            onClick={onInstall}
            className="flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-4 py-2 text-[11px] font-bold tracking-[0.16em] text-mint transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Download className="h-3.5 w-3.5" /> INSTALL APP
          </button>
        )}
        <button
          onClick={onOpenSync}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tracking-[0.16em] transition-colors active:scale-95 ${
            cloudConnected ? 'border-mint/35 bg-mint/10 text-mint' : 'border-white/15 bg-white/5 text-dim hover:text-ink'
          }`}
        >
          <span className="relative">
            <Cloud className="h-3.5 w-3.5" />
            {cloudConnected && (
              <span
                className={`absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full ${
                  cloudBusy
                    ? 'dot-pulse bg-gold'
                    : cloudStatus === 'error'
                      ? 'bg-rose'
                      : cloudStatus === 'offline'
                        ? 'bg-gold'
                        : 'bg-mint'
                }`}
              />
            )}
          </span>
          {cloudConnected
            ? cloudBusy
              ? 'CLOUD SYNCING'
              : cloudStatus === 'error'
                ? 'CLOUD NEEDS ATTENTION'
                : cloudStatus === 'offline'
                  ? 'CLOUD OFFLINE'
                  : 'CLOUD SYNCED'
            : 'SYNC / BACKUP'}
        </button>
      </div>

      <div className="fade-up mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] tracking-wider text-dim" style={{ animationDelay: '290ms' }}>
        <span className="flex items-center gap-1.5">
          <span className="kbd">ARROWS</span> move cursor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="kbd">SPACE</span> select cell
        </span>
        <span className="flex items-center gap-1.5">
          <span className="kbd">P</span> pause
        </span>
        <span className="flex items-center gap-1.5">
          <span className="kbd">ENTER</span> start
        </span>
      </div>
    </main>
  );
}

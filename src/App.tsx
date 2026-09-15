import { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, HeartHandshake, Pause, Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react';
import { Grid } from './components/Grid';
import { Hud, PhaseBanner, TimerBar } from './components/Hud';
import { StartScreen } from './components/StartScreen';
import { PauseOverlay } from './components/PauseOverlay';
import { GameOverScreen } from './components/GameOverScreen';
import ParticleFX, { type ParticleFXHandle } from './components/ParticleFX';
import { useHighScores, NAME_KEY } from './hooks/useHighScores';
import { useSound } from './hooks/useSound';
import { useMemoryGame, type GameEvent } from './hooks/useMemoryGame';
import { SettingsModal } from './components/SettingsModal';
import {
  evaluateSession,
  loadSettings,
  newSession,
  saveSettings,
  sleepNudge,
  spanFrom,
  spanTrend,
  type Settings as WSettings,
  type SpanSample,
  type Nudge,
  type SessionState,
} from './lib/wellbeing';
import { CALM_FLASH_STEP_MS, DIFFS, gridSizeForLevel, TILE_FLASH_STEP_MS, type Difficulty } from './lib/levels';
import { useMeta, type RunSummary } from './hooks/useMeta';
import { usePWA } from './hooks/usePWA';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useAnalytics } from './hooks/useAnalytics';
import { SyncModal } from './components/SyncModal';
import { ShareCard } from './components/ShareCard';
import { buildChallengeUrl, clearChallengeFromUrl, readChallengeFromUrl, type Challenge } from './lib/duel';
import { haptic } from './lib/haptics';
import { stageForLevel, stageIndexForLevel } from './lib/themes';
import { NAME_KEY as SAVE_NAME_KEY } from './hooks/useHighScores';
import type { SaveBundle } from './lib/saveData';

const DIFF_KEY = 'engram-difficulty';

function loadDifficulty(): Difficulty {
  try {
    const v = localStorage.getItem(DIFF_KEY);
    if (v === 'calm' || v === 'focus' || v === 'surge') return v;
  } catch {
    /* ignore */
  }
  return 'focus';
}

type PopKind = 'good' | 'bad' | 'bonus' | 'info' | 'fever' | 'feverHit';
interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: PopKind;
}

const POP_STYLE: Record<PopKind, string> = {
  good: 'text-lg text-mint font-bold',
  bad: 'text-[11px] tracking-[0.3em] text-rose font-bold',
  bonus: 'text-3xl text-gold font-extrabold',
  info: 'text-xl text-cyanx font-bold',
  fever: 'text-4xl text-gold font-extrabold tracking-[0.12em]',
  feverHit: 'text-lg text-gold font-bold',
};

export default function App() {
  const hs = useHighScores();
  const meta = useMeta();
  const sound = useSound();
  const fxRef = useRef<ParticleFXHandle>(null);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const tileEls = useRef(new Map<number, HTMLElement>());
  const popSeq = useRef(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [shake, setShake] = useState<{ id: number; mode: 'sm' | 'lg' } | null>(null);
  const shakeTimer = useRef<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [qualifiesAtEnd, setQualifiesAtEnd] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [menuDiff, setMenuDiff] = useState<Difficulty>(loadDifficulty);
  const [settings, setSettings] = useState<WSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [spanSamples, setSpanSamples] = useState<SpanSample[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('engram-span') || '[]') as SpanSample[];
    } catch {
      return [];
    }
  });
  const session = useRef<SessionState>(newSession());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [syncOpen, setSyncOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('manage') === 'account'
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [showGlobal, setShowGlobal] = useState(false);
  const [leaderboardMode] = useState<Difficulty>('focus');
  const [challenge, setChallenge] = useState<Challenge | null>(() => readChallengeFromUrl());
  const [activeDuel, setActiveDuel] = useState<Challenge | null>(null);
  const finalRound = useRef<{ pattern: number[]; size: number; stageId: string }>({ pattern: [], size: 3, stageId: 'drift' });
  const [stageUp, setStageUp] = useState<{ id: string; name: string; tag: string; accent: string } | null>(null);
  const stageIdxRef = useRef(0);
  const pwa = usePWA();

  const patchSettings = useCallback((patch: Partial<WSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const changeDiff = useCallback(
    (d: Difficulty) => {
      setMenuDiff(d);
      try {
        localStorage.setItem(DIFF_KEY, d);
      } catch {
        /* ignore */
      }
      sound.click();
    },
    [sound]
  );

  const analytics = useAnalytics();

  const addPop = useCallback((x: number, y: number, text: string, kind: PopKind) => {
    const id = ++popSeq.current;
    setPops((p) => [...p.slice(-9), { id, x, y, text, kind }]);
  }, []);

  const removePop = useCallback((id: number) => {
    setPops((p) => p.filter((x) => x.id !== id));
  }, []);

  const triggerShake = useCallback((mode: 'sm' | 'lg') => {
    if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    setShake(null);
    requestAnimationFrame(() => {
      setShake({ id: Math.random(), mode });
      shakeTimer.current = window.setTimeout(() => setShake(null), mode === 'lg' ? 540 : 360);
    });
  }, []);

  const tilePoint = useCallback((index: number) => {
    const el = tileEls.current.get(index);
    const wrap = gridWrapRef.current;
    if (!el || !wrap) return null;
    const r = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return {
      sx: r.left + r.width / 2,
      sy: r.top + r.height / 2,
      x: r.left - w.left + r.width / 2,
      y: r.top - w.top + r.height / 2,
    };
  }, []);

  const gridCenter = useCallback(() => {
    const wrap = gridWrapRef.current;
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    return { sx: r.left + r.width / 2, sy: r.top + r.height / 2, x: r.width / 2, y: r.height / 2 };
  }, []);

  const gameRef = useRef<ReturnType<typeof useMemoryGame> | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const hsRef = useRef(hs);
  hsRef.current = hs;

  const onEvent = useCallback(
    (e: GameEvent) => {
      const feverNow = gameRef.current?.g.feverActive ?? false;
      switch (e.type) {
        case 'memorizeStart':
          sound.reveal();
          break;
        case 'recallStart':
          sound.cue();
          break;
        case 'correct': {
          sound.correct(e.combo);
          haptic(7);
          const pt = tilePoint(e.index);
          if (pt) {
            fxRef.current?.burst(pt.sx, pt.sy, feverNow ? '#fbbf24' : '#36f5c5', 16, 3.4);
            addPop(pt.x, pt.y - 8, `+${e.points}`, feverNow ? 'feverHit' : 'good');
          }
          break;
        }
        case 'wrong': {
          sound.wrong();
          haptic([24, 50, 24]);
          triggerShake('sm');
          const pt = tilePoint(e.index);
          if (pt) {
            fxRef.current?.burst(pt.sx, pt.sy, '#fb4d6d', 14, 3);
            addPop(pt.x, pt.y - 8, 'MISS', 'bad');
          }
          break;
        }
        case 'roundClear': {
          sound.clear();
          setSpanSamples((prev) => {
            const next = [...prev, { size: e.level > 0 ? gameRef.current?.g.pattern.length ?? 0 : 0, clean: e.perfect, at: Date.now() }].slice(-40);
            try {
              localStorage.setItem('engram-span', JSON.stringify(next));
            } catch { /* ignore */ }
            return next;
          });
          session.current.runs++;
          session.current.bestSpanThisSession = Math.max(
            session.current.bestSpanThisSession,
            gameRef.current?.g.pattern.length ?? 0
          );
          if (settingsRef.current.coach && !nudge) {
            const n = evaluateSession(session.current, settingsRef.current.sessionMinutes);
            if (n) setNudge(n);
          }
          haptic(e.perfect ? [10, 40, 70, 40, 90] : [10, 40, 70]);
          if (e.perfect) sound.perfect();
          const c = gridCenter();
          if (c) {
            fxRef.current?.confetti(c.sx, c.sy);
            fxRef.current?.ring(c.sx, c.sy);
            if (e.perfect) fxRef.current?.ring(c.sx, c.sy, 'rgba(251,191,36,0.9)');
            addPop(c.x, c.y, `+${e.bonus}`, 'bonus');
            let yOff = 52;
            if (e.perfect) {
              addPop(c.x, c.y - yOff, 'PERFECT', 'info');
              yOff += 44;
            }
            if (e.heartBonus) {
              sound.bonus();
              addPop(c.x, c.y - yOff, '+1 HEART', 'info');
            }
          }
          break;
        }
        case 'feverStart': {
          analytics.feverStart(gameRef.current?.g.level ?? 1);
          sound.feverStart();
          haptic([15, 40, 15, 40, 90]);
          const c = gridCenter();
          if (c) {
            fxRef.current?.ring(c.sx, c.sy, 'rgba(251,191,36,0.9)');
            fxRef.current?.burst(c.sx, c.sy, '#fbbf24', 26, 4.6);
            addPop(c.x, c.y, 'FEVER ×2', 'fever');
          }
          break;
        }
        case 'feverEnd':
          sound.feverEnd();
          break;
        case 'revealMiss':
          sound.impact();
          haptic(70);
          triggerShake('lg');
          break;
        case 'gameOver': {
          sound.over();
          haptic([40, 60, 40, 60, 140]);
          const gs = gameRef.current?.g;
          if (gs) {
            finalRound.current = { pattern: gs.pattern, size: gs.gridSize, stageId: stageForLevel(gs.level).id };
          }
          session.current.runs++;
          session.current.consecutiveLosses++;
          if (settingsRef.current.coach) {
            const n = evaluateSession(session.current, settingsRef.current.sessionMinutes);
            if (n) setNudge(n);
          }
          const mode = gameRef.current?.g.diff ?? 'focus';
          const wasBest = (gameRef.current?.g.score ?? 0) > hs.bestFor(mode);
          analytics.runEnd(mode, e.score, e.level, e.perfectRounds > 0);
          if (activeDuel) analytics.duelResult(e.score > activeDuel.target);
          if (wasBest) analytics.newBest(mode);
          if (cloud.user) {
            void cloud.submitLeaderboard?.(mode, e.score, e.level);
          }
          setIsNewBest(e.score > hs.bestFor(mode));
          setQualifiesAtEnd(hs.qualifies(e.score, mode));
          setRunSummary(
            metaRef.current.recordRun({ score: e.score, level: e.level, tiles: e.correctTotal, perfects: e.perfectRounds })
          );
          break;
        }
        case 'timeout':
          sound.timeout();
          break;
        case 'levelStart': {
          const idx = stageIndexForLevel(e.level);
          if (idx !== stageIdxRef.current) {
            stageIdxRef.current = idx;
            const st = stageForLevel(e.level);
            analytics.stageReached(st.id);
            setStageUp({ id: st.id, name: st.name, tag: st.tag, accent: st.accent });
            sound.bonus();
            haptic([12, 30, 12, 30, 60]);
            const c = gridCenter();
            if (c) {
              fxRef.current?.ring(c.sx, c.sy, st.accent);
              fxRef.current?.burst(c.sx, c.sy, st.accent, 22, 4);
            }
            window.setTimeout(() => setStageUp(null), 2600);
          }
          break;
        }
      }
    },
    [sound, hs, tilePoint, gridCenter, addPop, triggerShake]
  );

  const game = useMemoryGame(onEvent);
  const g = game.g;
  gameRef.current = game;

  const launch = useCallback(() => {
    setPops([]);
    setIsNewBest(false);
    setQualifiesAtEnd(false);
    setRunSummary(null);
    setStageUp(null);
    setShareOpen(false);
    setNudge(null);
    stageIdxRef.current = 0;
    session.current = newSession();
    const hr = new Date().getHours();
    if (settingsRef.current.coach && hr >= 20 && hr < 23) setNudge(sleepNudge());
    sound.start();
    const duel = challenge;
    setActiveDuel(duel);
    analytics.runStart(duel ? duel.mode : menuDiff, !!duel);
    if (duel) analytics.duelAccept(duel.mode);
    game.startGame(duel ? duel.mode : menuDiff, duel ? duel.seed : undefined, { adaptive: settingsRef.current.adaptive });
  }, [sound, game, menuDiff, challenge, analytics]);

  const declineChallenge = useCallback(() => {
    setChallenge(null);
    setActiveDuel(null);
    clearChallengeFromUrl();
    sound.click();
  }, [sound]);
  const launchRef = useRef(launch);
  launchRef.current = launch;

  // global keyboard controls
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const gm = gameRef.current;
      if (!gm) return;
      const s = gm.g;
      const t = ev.target as HTMLElement | null;
      const tag = t?.tagName;
      const k = ev.key;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (k === 'Escape') (t as HTMLInputElement).blur();
        return;
      }
      if (tag === 'BUTTON' && (k === 'Enter' || k === ' ')) return;

      if (s.phase === 'menu') {
        if (k === 'Enter') {
          ev.preventDefault();
          launchRef.current();
        }
        return;
      }

      if (s.paused) {
        if (k === 'p' || k === 'P' || k === 'Escape') {
          ev.preventDefault();
          gm.resume();
        } else if (k === 'r' || k === 'R') {
          ev.preventDefault();
          launchRef.current();
        } else if (k === 'm' || k === 'M') {
          ev.preventDefault();
          gm.toMenu();
        }
        return;
      }

      if (s.phase === 'gameover') {
        if (k === 'r' || k === 'R' || k === 'Enter') {
          ev.preventDefault();
          launchRef.current();
        }
        return;
      }

      if (s.phase !== 'memorize' && s.phase !== 'recall') return;

      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        ev.preventDefault();
        gm.setUsingKeyboard(true);
        gm.moveCursor(-1, 0);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        ev.preventDefault();
        gm.setUsingKeyboard(true);
        gm.moveCursor(1, 0);
      } else if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        ev.preventDefault();
        gm.setUsingKeyboard(true);
        gm.moveCursor(0, -1);
      } else if (k === 'ArrowDown' || k === 'x' || k === 'X' || k === 's' || k === 'S') {
        ev.preventDefault();
        gm.setUsingKeyboard(true);
        gm.moveCursor(0, 1);
      } else if (k === ' ' || k === 'Enter') {
        ev.preventDefault();
        gm.setUsingKeyboard(true);
        gm.activateCursor();
      } else if (k === 'p' || k === 'P' || k === 'Escape') {
        ev.preventDefault();
        gm.pause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // touch: hide keyboard cursor; unlock audio on first gesture
  useEffect(() => {
    const onPointer = () => gameRef.current?.setUsingKeyboard(false);
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);

  useEffect(() => {
    const unlock = () => sound.ensure();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }, [sound]);

  const registerTile = useCallback((i: number, el: HTMLElement | null) => {
    if (el) tileEls.current.set(i, el);
    else tileEls.current.delete(i);
  }, []);

  const saveName = useCallback(
    (name: string) => {
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch {
        /* ignore */
      }
      return hsRef.current.add(name, g.score, g.level, g.diff).id;
    },
    [g.score, g.level, g.diff]
  );

  const inGame = g.phase !== 'menu';
  const playingPhase = g.phase === 'memorize' || g.phase === 'recall';
  const ratio = g.totalTime > 0 ? g.timeLeft / g.totalTime : 0;
  const modeBest = hs.bestFor(g.diff);
  const beaten = modeBest > 0 && g.score > modeBest;
  const gridUpgrade = gridSizeForLevel(g.level + 1 + DIFFS[g.diff].bias) > g.gridSize;
  const stage = stageForLevel(g.level);
  const span = spanFrom(spanSamples);
  const trend = spanTrend(spanSamples);

  const saveBundle = useCallback((): SaveBundle => {
    let name = 'PLAYER';
    try {
      name = localStorage.getItem(SAVE_NAME_KEY) || 'PLAYER';
    } catch {
      /* ignore */
    }
    return { v: 1, ts: Date.now(), name, meta: metaRef.current.store, scores: hsRef.current.scores };
  }, []);

  const shareInput = useCallback(() => {
    let me = 'A FRIEND';
    try {
      me = localStorage.getItem(SAVE_NAME_KEY) || 'A FRIEND';
    } catch {
      /* ignore */
    }
    const seed = g.seed || 'ENGRAM';
    const url = buildChallengeUrl({ seed, target: g.score, name: me, mode: g.diff, level: g.level });
    const accuracy = g.pickTotal > 0 ? Math.round((g.correctTotal / g.pickTotal) * 100) : 100;
    return {
      score: g.score,
      level: g.level,
      accuracy,
      maxCombo: g.maxCombo,
      modeLabel: DIFFS[g.diff].label,
      pattern: finalRound.current.pattern,
      gridSize: finalRound.current.size,
      stageId: finalRound.current.stageId,
      url,
      duelWon: activeDuel ? g.score > activeDuel.target : undefined,
      duelName: activeDuel?.name,
    };
  }, [g.seed, g.score, g.diff, g.level, g.pickTotal, g.correctTotal, g.maxCombo, activeDuel]);

  const applyMerged = useCallback((merged: SaveBundle) => {
    metaRef.current.replaceStore(merged.meta);
    hsRef.current.replaceAll(merged.scores);
    try {
      localStorage.setItem(SAVE_NAME_KEY, merged.name);
    } catch {
      /* ignore */
    }
  }, []);

  const cloud = useFirebaseSync({ getLocalBundle: saveBundle, onApply: applyMerged });

  const resetAll = useCallback(async () => {
    // Disconnect first so the cloud copy cannot immediately restore the local
    // data the player explicitly asked to erase.
    await cloud.disconnect();
    metaRef.current.replaceStore({ xp: 0, runs: 0, tiles: 0, perfects: 0, bestLevel: 0, streak: 0, lastDay: '' });
    hsRef.current.replaceAll([]);
    try {
      [
        'engram-settings-v1',
        'engram-span',
        'engram-highscores-v1',
        'synapse-highscores-v1',
        'engram-meta-v1',
        'synapse-meta-v1',
        'engram-difficulty',
        'engram-errors',
        'synapse-name',
        'synapse-muted',
      ].forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    setSpanSamples([]);
    setSettings(loadSettings());
    game.toMenu();
    setSettingsOpen(false);
  }, [cloud, game]);

  // Local state remains authoritative while offline. A content fingerprint in
  // the adapter prevents a remote merge from causing an upload loop.
  useEffect(() => {
    if (!cloud.user) return;
    analytics.identify(cloud.user.uid);
    analytics.setProfile({ profileLevel: meta.profile.level, favMode: menuDiff });
    const id = window.setTimeout(() => void cloud.syncNow(), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.store, hs.scores, cloud.user, cloud.syncNow]);

  // accumulate active training time for the session coach
  useEffect(() => {
    if (!playingPhase || g.paused) return;
    const iv = window.setInterval(() => {
      session.current.activeMs += 1000;
    }, 1000);
    return () => window.clearInterval(iv);
  }, [playingPhase, g.paused]);

  // keep the screen awake during a run (mobile)
  useEffect(() => {
    if (!playingPhase || g.paused) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let disposed = false;
    const acquire = async () => {
      try {
        const nav = navigator as unknown as {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (nav.wakeLock && document.visibilityState === 'visible') {
          const s = await nav.wakeLock.request('screen');
          if (disposed) void s.release().catch(() => undefined);
          else sentinel = s;
        }
      } catch {
        /* unsupported */
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVis);
      if (sentinel) void sentinel.release().catch(() => undefined);
    };
  }, [playingPhase, g.paused, g.level]);

  return (
    <div
      className={`relative min-h-[100svh] overflow-hidden bg-abyss font-body text-ink ${settings.calm ? 'calm' : ''}`}
      style={
        {
          '--stage-a': stage.from,
          '--stage-b': stage.to,
          '--stage-glow': `${stage.accent}8c`,
          '--stage-wash': stage.wash,
        } as React.CSSProperties
      }
    >
      {/* background layers */}
      <div aria-hidden className="pointer-events-none fixed inset-0 grid-bg" />
      {inGame && <div aria-hidden className="stage-wash pointer-events-none fixed inset-0" />}
      <div aria-hidden className="aurora pointer-events-none fixed -inset-[45%] opacity-[0.16]" />
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[-10%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-vio/20 blur-[120px]"
      />
      <div aria-hidden className="vignette pointer-events-none fixed inset-0" />
      {g.feverActive && <div aria-hidden className="gold-veil pointer-events-none fixed inset-0 z-[35]" />}

      {!settings.calm && <ParticleFX ref={fxRef} />}

      {/* fixed corner controls — safe-area aware, thumb-sized */}
      <div
        className="fixed z-[70] flex gap-2"
        style={{ top: 'max(12px, env(safe-area-inset-top))', right: 'max(12px, env(safe-area-inset-right))' }}
      >
        {inGame && playingPhase && !g.paused && (
          <button
            onClick={() => game.pause()}
            tabIndex={-1}
            aria-label="Pause"
            className="glass grid h-11 w-11 place-items-center rounded-2xl text-dim transition-all hover:text-ink active:scale-90"
          >
            <Pause className="h-4.5 w-4.5" fill="currentColor" />
          </button>
        )}
        {g.phase === 'menu' && (
          <button
            onClick={() => {
              sound.click();
              setSettingsOpen(true);
            }}
            tabIndex={-1}
            aria-label="Settings"
            className="glass grid h-11 w-11 place-items-center rounded-2xl text-dim transition-all hover:text-ink active:scale-90"
          >
            <SettingsIcon className="h-4.5 w-4.5" />
          </button>
        )}
        <button
          onClick={sound.toggleMuted}
          tabIndex={-1}
          aria-label={sound.muted ? 'Unmute sound' : 'Mute sound'}
          className="glass grid h-11 w-11 place-items-center rounded-2xl text-dim transition-all hover:text-ink active:scale-90"
        >
          {sound.muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
        </button>
      </div>

      {/* small brand while playing */}
      {inGame && (
        <div
          className="fixed z-[70] flex items-center gap-2 opacity-80"
          style={{ top: 'max(12px, env(safe-area-inset-top))', left: 'max(12px, env(safe-area-inset-left))' }}
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-vio/40 bg-gradient-to-br from-vio/25 to-cyanx/15">
            <Brain className="h-4 w-4 text-vio" />
          </div>
          <span className="hidden font-display text-xs font-bold tracking-[0.28em] text-dim sm:block">ENGRAM</span>
        </div>
      )}

      {g.phase === 'menu' ? (
        <StartScreen
          onStart={launch}
          diff={menuDiff}
          onDiff={changeDiff}
          scores={hs.scores}
          profile={meta.profile}
          canInstall={pwa.canInstall}
          onInstall={() => {
            analytics.installPrompted();
            void pwa.install();
          }}
          onOpenSync={() => {
            sound.click();
            setSyncOpen(true);
          }}
          cloudConnected={!!cloud.user}
          cloudBusy={cloud.status === 'syncing' || cloud.status === 'connecting'}
          cloudStatus={cloud.status}
          cloudUser={cloud.user}
          leaderboardMode={leaderboardMode}
          showGlobal={showGlobal}
          onToggleGlobal={() => setShowGlobal((v) => !v)}
          challenge={challenge}
          onDeclineChallenge={declineChallenge}
        />
      ) : (
        <main
          className="relative z-10 mx-auto flex min-h-[100svh] w-full flex-col items-center justify-center px-3"
          style={{
            paddingTop: 'max(56px, env(safe-area-inset-top))',
            paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex flex-col items-stretch gap-2.5 sm:gap-3" style={{ width: 'min(94vw, 56svh, 520px)' }}>
            <Hud
              score={g.score}
              level={g.level}
              lives={g.lives}
              maxLives={DIFFS[g.diff].lives}
              combo={g.combo}
              gridSize={g.gridSize}
              diff={g.diff}
              stageName={stage.name}
              stageAccent={stage.accent}
              fever={g.fever}
              feverActive={g.feverActive}
              best={modeBest}
              beaten={beaten}
            />
            <PhaseBanner
              phase={g.phase}
              level={g.level}
              patternCount={g.pattern.length}
              foundCount={g.found.length}
              bonus={g.roundBonus}
              perfect={g.roundPerfect}
              perfectBonus={g.roundPerfectBonus}
              gridUpgrade={gridUpgrade}
            />
            <TimerBar phase={g.phase} ratio={ratio} />

            <div
              ref={gridWrapRef}
              className={`relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-3 ${
                shake ? (shake.mode === 'lg' ? 'shake-lg' : 'shake-sm') : ''
              }`}
            >
              <Grid
                key={`${g.level}-${g.replayKey}`}
                size={g.gridSize}
                pattern={g.pattern}
                found={g.found}
                missed={g.missed}
                phase={g.phase}
                paused={g.paused}
                cursor={g.cursor}
                usingKeyboard={g.usingKeyboard}
                flashScale={DIFFS[g.diff].revealScale}
                stepMs={settings.calm ? CALM_FLASH_STEP_MS : TILE_FLASH_STEP_MS}
                registerTile={registerTile}
                onPick={(i) => game.pickTile(i)}
              />
              <div className="pointer-events-none absolute inset-0">
                {pops.map((p) => (
                  <span
                    key={p.id}
                    onAnimationEnd={() => removePop(p.id)}
                    className={`float-pop font-display ${POP_STYLE[p.kind]}`}
                    style={{ left: p.x, top: p.y }}
                  >
                    {p.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="h-4 text-center text-[11px] leading-4 tracking-wide text-dim">
              {g.level === 1 && g.phase === 'recall'
                ? 'Tap every cell that lit up — any order works.'
                : g.usingKeyboard && playingPhase
                  ? 'Arrows move · Space selects · P pauses'
                  : inGame && playingPhase && !g.feverActive && g.fever >= 60
                    ? 'Fever almost full — chain your hits.'
                    : ''}
            </div>
          </div>
        </main>
      )}

      {stageUp && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center px-6">
          <div className="stage-banner flex flex-col items-center text-center">
            <span className="text-[10px] font-bold tracking-[0.4em] text-dim">NEW STAGE</span>
            <span
              className="mt-1 font-display text-3xl font-extrabold tracking-[0.14em] sm:text-4xl"
              style={{ color: stageUp.accent, textShadow: `0 0 28px ${stageUp.accent}80` }}
            >
              {stageUp.name}
            </span>
            <span className="mt-1 text-[11px] tracking-[0.2em] text-dim">{stageUp.tag}</span>
          </div>
        </div>
      )}

      {syncOpen && (
        <SyncModal bundle={saveBundle()} cloud={cloud} onApply={applyMerged} onClose={() => setSyncOpen(false)} />
      )}

      {shareOpen && <ShareCard {...shareInput()} onClose={() => setShareOpen(false)} />}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={patchSettings}
          span={span}
          spanTrend={trend}
          onClose={() => setSettingsOpen(false)}
          onReset={resetAll}
        />
      )}

      {nudge && settings.coach && g.phase !== 'menu' && (
        <div
          className="fixed inset-x-0 bottom-0 z-[75] flex justify-center px-3"
          style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
        >
          <div
            className="fade-up glass flex w-[min(94vw,470px)] items-start gap-3 rounded-2xl p-3.5"
            style={{ borderColor: nudge.tone === 'recover' ? 'rgba(251,77,109,0.45)' : 'rgba(54,245,197,0.4)' }}
            role="status"
          >
            <HeartHandshake
              className="mt-0.5 h-4.5 w-4.5 shrink-0"
              style={{ color: nudge.tone === 'recover' ? '#fb4d6d' : '#36f5c5' }}
            />
            <div className="min-w-0 flex-1">
              <div
                className="text-[10px] font-bold tracking-[0.2em]"
                style={{ color: nudge.tone === 'recover' ? '#fb4d6d' : '#36f5c5' }}
              >
                {nudge.title}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-dim">{nudge.body}</p>
            </div>
            <button
              onClick={() => setNudge(null)}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold tracking-widest text-dim transition-colors hover:text-ink"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {g.paused && playingPhase && (
        <PauseOverlay
          onResume={() => game.resume()}
          onRestart={() => {
            setPops([]);
            game.startGame();
          }}
          onMenu={() => {
            sound.click();
            game.toMenu();
          }}
        />
      )}

      {g.phase === 'gameover' && (
        <GameOverScreen
          score={g.score}
          level={g.level}
          correctTotal={g.correctTotal}
          pickTotal={g.pickTotal}
          maxCombo={g.maxCombo}
          perfectRounds={g.perfectRounds}
          mode={g.diff}
          duel={activeDuel ? { name: activeDuel.name, target: activeDuel.target } : null}
          onShare={() => {
            sound.click();
            analytics.duelCreate();
            analytics.shareOpen();
            setShareOpen(true);
          }}
          isNewBest={isNewBest}
          qualifies={qualifiesAtEnd}
          onSaveName={saveName}
          scores={hs.scores}
          runSummary={runSummary}
          profile={meta.profile}
          onRestart={launch}
          onMenu={() => {
            sound.click();
            game.toMenu();
          }}
        />
      )}
    </div>
  );
}

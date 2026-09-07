import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  DIFFS,
  type Difficulty,
  gridSizeForLevel,
  patternSizeForLevel,
  recallDuration,
  roundClearBonus,
  samplePattern,
  timeBonusMax,
  tilePoints,
  totalRevealWindow,
} from '../lib/levels';

export type Phase = 'menu' | 'memorize' | 'recall' | 'roundclear' | 'revealmiss' | 'gameover';

export type GameEvent =
  | { type: 'memorizeStart' }
  | { type: 'recallStart' }
  | { type: 'levelStart'; level: number }
  | { type: 'correct'; index: number; points: number; combo: number }
  | { type: 'wrong'; index: number; livesLeft: number }
  | { type: 'roundClear'; level: number; bonus: number; timeBonus: number; heartBonus: boolean; perfect: boolean; perfectBonus: number }
  | { type: 'feverStart' }
  | { type: 'feverEnd' }
  | { type: 'revealMiss' }
  | { type: 'gameOver'; score: number; level: number; correctTotal: number; pickTotal: number; maxCombo: number; perfectRounds: number }
  | { type: 'timeout' };

export type PickResult =
  | { kind: 'correct'; index: number; points: number }
  | { kind: 'wrong'; index: number }
  | { kind: 'ignored' }
  | { kind: 'locked' };

export interface GState {
  phase: Phase;
  paused: boolean;
  diff: Difficulty;
  level: number;
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  gridSize: number;
  pattern: number[];
  found: number[];
  missed: number[];
  cursor: number;
  usingKeyboard: boolean;
  replayKey: number;
  timeLeft: number;
  totalTime: number;
  correctTotal: number;
  pickTotal: number;
  roundBonus: number;
  roundTimeBonus: number;
  roundPerfect: boolean;
  roundPerfectBonus: number;
  fever: number;
  feverActive: boolean;
  roundHadMiss: boolean;
  perfectRounds: number;
}

const initialG = (): GState => ({
  phase: 'menu',
  paused: false,
  diff: 'focus',
  level: 1,
  score: 0,
  lives: 3,
  combo: 0,
  maxCombo: 0,
  gridSize: 3,
  pattern: [],
  found: [],
  missed: [],
  cursor: 4,
  usingKeyboard: false,
  replayKey: 0,
  timeLeft: 0,
  totalTime: 1,
  correctTotal: 0,
  pickTotal: 0,
  roundBonus: 0,
  roundTimeBonus: 0,
  roundPerfect: false,
  roundPerfectBonus: 0,
  fever: 0,
  feverActive: false,
  roundHadMiss: false,
  perfectRounds: 0,
});

export function useMemoryGame(onEvent: (e: GameEvent) => void) {
  const g = useRef<GState>(initialG());
  const [, bump] = useReducer((v: number) => v + 1, 0);
  const timers = useRef<number[]>([]);
  const emitRef = useRef(onEvent);

  useEffect(() => {
    emitRef.current = onEvent;
  });

  const emit = useCallback((e: GameEvent) => emitRef.current(e), []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const beginReveal = useCallback(() => {
    const s = g.current;
    const cfg = DIFFS[s.diff];
    const n = Math.max(s.pattern.length, 3);
    s.phase = 'memorize';
    bump();
    emit({ type: 'memorizeStart' });
    later(() => {
      const t = recallDuration(n, s.level, cfg.recallScale);
      s.phase = 'recall';
      s.totalTime = t;
      s.timeLeft = t;
      bump();
      emit({ type: 'recallStart' });
    }, totalRevealWindow(n, cfg.revealScale));
  }, [emit, later]);

  const startLevel = useCallback(
    (level: number) => {
      clearTimers();
      const s = g.current;
      const cfg = DIFFS[s.diff];
      const eff = level + cfg.bias;
      const size = gridSizeForLevel(eff);
      const cells = size * size;
      const count = patternSizeForLevel(eff, cells);
      s.level = level;
      s.gridSize = size;
      s.pattern = samplePattern(cells, count);
      s.found = [];
      s.missed = [];
      s.cursor = Math.floor(cells / 2);
      s.timeLeft = 0;
      s.totalTime = 1;
      s.roundBonus = 0;
      s.roundTimeBonus = 0;
      s.roundPerfect = false;
      s.roundPerfectBonus = 0;
      s.roundHadMiss = false;
      s.paused = false;
      s.replayKey++;
      emit({ type: 'levelStart', level });
      beginReveal();
    },
    [beginReveal, clearTimers, emit]
  );

  const startGame = useCallback(
    (diff?: Difficulty) => {
      const s = g.current;
      const keepKeyboard = s.usingKeyboard;
      const d = diff ?? s.diff;
      Object.assign(s, initialG());
      s.usingKeyboard = keepKeyboard;
      s.diff = d;
      s.lives = DIFFS[d].lives;
      startLevel(1);
    },
    [startLevel]
  );

  const toMenu = useCallback(() => {
    clearTimers();
    const s = g.current;
    s.phase = 'menu';
    s.paused = false;
    bump();
  }, [clearTimers]);

  const pause = useCallback(() => {
    const s = g.current;
    if (s.paused) return;
    if (s.phase !== 'memorize' && s.phase !== 'recall') return;
    s.paused = true;
    if (s.phase === 'memorize') clearTimers();
    bump();
  }, [clearTimers]);

  const resume = useCallback(() => {
    const s = g.current;
    if (!s.paused) return;
    s.paused = false;
    if (s.phase === 'memorize') {
      // replay the full pattern so pausing can never leak free study time
      s.replayKey++;
      beginReveal();
    }
    bump();
  }, [beginReveal]);

  const finishRound = useCallback(() => {
    const s = g.current;
    const cfg = DIFFS[s.diff];
    const ratio = s.totalTime > 0 ? s.timeLeft / s.totalTime : 0;
    const tb = Math.round(timeBonusMax(s.level) * ratio);
    const perfect = !s.roundHadMiss;
    const perfectBonus = perfect ? 40 + 18 * s.level : 0;
    const bonus = Math.round((roundClearBonus(s.level, s.pattern.length) + tb + perfectBonus) * cfg.scoreMult);
    s.score += bonus;
    s.roundBonus = bonus;
    s.roundTimeBonus = tb;
    s.roundPerfect = perfect;
    s.roundPerfectBonus = perfectBonus;
    if (perfect) s.perfectRounds++;
    let heart = false;
    if (s.level % 5 === 0 && s.lives < cfg.lives) {
      s.lives++;
      heart = true;
    }
    s.phase = 'roundclear';
    bump();
    emit({ type: 'roundClear', level: s.level, bonus, timeBonus: tb, heartBonus: heart, perfect, perfectBonus });
    const next = s.level + 1;
    later(() => startLevel(next), 1500);
  }, [emit, later, startLevel]);

  const pickTile = useCallback(
    (index: number): PickResult => {
      const s = g.current;
      if (s.phase !== 'recall' || s.paused) return { kind: 'locked' };
      if (s.found.includes(index) || s.missed.includes(index)) return { kind: 'ignored' };
      s.pickTotal++;
      if (s.pattern.includes(index)) {
        s.found = [...s.found, index];
        s.combo++;
        s.maxCombo = Math.max(s.maxCombo, s.combo);
        s.correctTotal++;
        const cfg = DIFFS[s.diff];
        const mult = Math.min(s.combo, 8) * (s.feverActive ? 2 : 1);
        const points = Math.round(tilePoints(s.level) * cfg.scoreMult) * mult;
        s.score += points;
        let feverStarted = false;
        if (!s.feverActive) {
          s.fever = Math.min(100, s.fever + cfg.feverGain);
          if (s.fever >= 100) {
            s.feverActive = true;
            feverStarted = true;
          }
        }
        bump();
        if (feverStarted) emit({ type: 'feverStart' });
        emit({ type: 'correct', index, points, combo: s.combo });
        if (s.found.length === s.pattern.length) {
          finishRound();
        }
        return { kind: 'correct', index, points };
      }
      s.missed = [...s.missed, index];
      s.lives--;
      s.combo = 0;
      s.roundHadMiss = true;
      if (!s.feverActive) s.fever = Math.round(s.fever * 0.4);
      bump();
      emit({ type: 'wrong', index, livesLeft: s.lives });
      if (s.lives <= 0) {
        clearTimers();
        s.phase = 'revealmiss';
        bump();
        emit({ type: 'revealMiss' });
        later(() => {
          s.phase = 'gameover';
          bump();
          emit({
            type: 'gameOver',
            score: s.score,
            level: s.level,
            correctTotal: s.correctTotal,
            pickTotal: s.pickTotal,
            maxCombo: s.maxCombo,
            perfectRounds: s.perfectRounds,
          });
        }, 1350);
      }
      return { kind: 'wrong', index };
    },
    [clearTimers, emit, finishRound, later]
  );

  // recall countdown — only feeds the time-bonus, never fails the player
  const s = g.current;
  useEffect(() => {
    if (s.phase !== 'recall' || s.paused) return;
    let warned = false;
    const iv = window.setInterval(() => {
      if (s.timeLeft <= 0.05) {
        if (!warned) {
          warned = true;
          if (s.combo > 0) {
            s.combo = 0;
            bump();
          }
          emit({ type: 'timeout' });
        }
      } else {
        s.timeLeft = Math.max(0, s.timeLeft - 0.05);
      }
      if (s.feverActive) {
        s.fever = Math.max(0, s.fever - 0.625); // 8s of fever
        if (s.fever <= 0) {
          s.feverActive = false;
          emit({ type: 'feverEnd' });
        }
      } else if (s.fever > 0) {
        s.fever = Math.max(0, s.fever - 0.15); // slow decay keeps pressure on
      }
      bump();
    }, 50);
    return () => window.clearInterval(iv);
  }, [s.phase, s.paused, s.replayKey, s.level, s, emit]);

  const moveCursor = useCallback((dx: number, dy: number) => {
    const s = g.current;
    const size = s.gridSize;
    const x = Math.min(size - 1, Math.max(0, (s.cursor % size) + dx));
    const y = Math.min(size - 1, Math.max(0, Math.floor(s.cursor / size) + dy));
    const next = y * size + x;
    if (next !== s.cursor) {
      s.cursor = next;
      bump();
    }
  }, []);

  const activateCursor = useCallback(() => pickTile(g.current.cursor), [pickTile]);

  const setUsingKeyboard = useCallback((v: boolean) => {
    if (g.current.usingKeyboard !== v) {
      g.current.usingKeyboard = v;
      bump();
    }
  }, []);

  return {
    g: s,
    startGame,
    toMenu,
    pause,
    resume,
    pickTile,
    moveCursor,
    activateCursor,
    setUsingKeyboard,
  };
}

export type MemoryGame = ReturnType<typeof useMemoryGame>;

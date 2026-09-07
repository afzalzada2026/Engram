export type Difficulty = 'calm' | 'focus' | 'surge';

export interface DiffCfg {
  key: Difficulty;
  label: string;
  tint: string;
  blurb: string;
  lives: number;
  /** added to the level when sizing grid + pattern (faster ramp) */
  bias: number;
  /** multiplies how long tiles stay lit */
  revealScale: number;
  /** multiplies recall time on the clock */
  recallScale: number;
  /** multiplies all scoring */
  scoreMult: number;
  /** fever charge per correct hit */
  feverGain: number;
}

export const DIFFS: Record<Difficulty, DiffCfg> = {
  calm: {
    key: 'calm',
    label: 'CALM',
    tint: '#36f5c5',
    blurb: 'Slower reveals · 4 lives',
    lives: 4,
    bias: 0,
    revealScale: 1.45,
    recallScale: 1.5,
    scoreMult: 0.75,
    feverGain: 11,
  },
  focus: {
    key: 'focus',
    label: 'FOCUS',
    tint: '#22d3ee',
    blurb: 'The standard curve',
    lives: 3,
    bias: 0,
    revealScale: 1,
    recallScale: 1,
    scoreMult: 1,
    feverGain: 13,
  },
  surge: {
    key: 'surge',
    label: 'SURGE',
    tint: '#f472b6',
    blurb: 'Fast reveals · harder ramp · ×1.5',
    lives: 3,
    bias: 1,
    revealScale: 0.62,
    recallScale: 0.7,
    scoreMult: 1.5,
    feverGain: 15,
  },
};

export const DIFF_ORDER: Difficulty[] = ['calm', 'focus', 'surge'];

export const TILE_FLASH_STEP_MS = 55;
export const EXTRA_REVEAL_TAIL_MS = 200;

export function gridSizeForLevel(level: number): number {
  const l = Math.max(1, level);
  if (l <= 2) return 3;
  if (l <= 5) return 4;
  if (l <= 9) return 5;
  return 6;
}

export function patternSizeForLevel(level: number, cells: number): number {
  const raw = 2 + Math.max(1, level);
  const cap = Math.min(Math.floor(cells * 0.4), 18);
  return Math.max(3, Math.min(raw, cap));
}

/** How long each tile stays lit during the memorize phase (ms). */
export function revealDuration(count: number, scale = 1): number {
  return Math.round((950 + count * 300) * scale);
}

/** Total wall-clock time of the memorize phase, including stagger + tail. */
export function totalRevealWindow(count: number, scale = 1): number {
  return revealDuration(count, scale) + count * TILE_FLASH_STEP_MS + EXTRA_REVEAL_TAIL_MS;
}

/** Time allowed to recall the pattern (ms). Only used for time-bonus scoring. */
export function recallDuration(count: number, level: number, scale = 1): number {
  const generosity = level <= 3 ? 1400 : 0;
  return Math.round((4600 + count * 950 + generosity) * scale);
}

export function tilePoints(level: number): number {
  return 25 + Math.min(level, 25) * 2;
}

export function roundClearBonus(level: number, count: number): number {
  return 60 + 22 * level + 8 * count;
}

export function timeBonusMax(level: number): number {
  return 120 + 30 * level;
}

export function samplePattern(cells: number, count: number): number[] {
  const idx = Array.from({ length: cells }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // shuffle order of the chosen set too, so flash order looks organic
  const chosen = idx.slice(0, count);
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return chosen;
}

export interface Rank {
  label: string;
  tint: string;
}

const RANKS: { min: number; label: string; tint: string }[] = [
  { min: 8000, label: 'SUPERNOVA', tint: '#fbbf24' },
  { min: 4500, label: 'PULSAR', tint: '#f472b6' },
  { min: 2400, label: 'BEACON', tint: '#a78bfa' },
  { min: 1100, label: 'CURRENT', tint: '#22d3ee' },
  { min: 400, label: 'SPARK', tint: '#36f5c5' },
  { min: 0, label: 'DORMANT', tint: '#8b93b8' },
];

export function rankForScore(score: number): Rank {
  const r = RANKS.find((r) => score >= r.min)!;
  return { label: r.label, tint: r.tint };
}

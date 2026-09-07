export interface Stage {
  id: string;
  name: string;
  tag: string;
  /** primary lit-tile gradient start */
  from: string;
  /** primary lit-tile gradient end */
  to: string;
  /** accent used for rings, glows, stage chip */
  accent: string;
  /** ambient background wash */
  wash: string;
  particles: string[];
}

export const STAGES: Stage[] = [
  {
    id: 'drift',
    name: 'DEEP DRIFT',
    tag: 'Quiet space. Cold light.',
    from: '#8b5cf6',
    to: '#22d3ee',
    accent: '#a78bfa',
    wash: 'rgba(139,92,246,0.20)',
    particles: ['#a78bfa', '#22d3ee', '#e8ecff'],
  },
  {
    id: 'reef',
    name: 'ION REEF',
    tag: 'Bioluminant currents.',
    from: '#06b6d4',
    to: '#36f5c5',
    accent: '#36f5c5',
    wash: 'rgba(13,148,136,0.22)',
    particles: ['#36f5c5', '#22d3ee', '#a7f3d0'],
  },
  {
    id: 'ember',
    name: 'EMBER FIELD',
    tag: 'Heat rising.',
    from: '#f97316',
    to: '#fbbf24',
    accent: '#fbbf24',
    wash: 'rgba(249,115,22,0.20)',
    particles: ['#fbbf24', '#fb923c', '#fca5a5'],
  },
  {
    id: 'bloom',
    name: 'NOVA BLOOM',
    tag: 'Petals of plasma.',
    from: '#ec4899',
    to: '#a78bfa',
    accent: '#f472b6',
    wash: 'rgba(236,72,153,0.20)',
    particles: ['#f472b6', '#a78bfa', '#fbcfe8'],
  },
  {
    id: 'circuit',
    name: 'LIVE CIRCUIT',
    tag: 'Signal saturation.',
    from: '#22c55e',
    to: '#a3e635',
    accent: '#a3e635',
    wash: 'rgba(34,197,94,0.20)',
    particles: ['#a3e635', '#22c55e', '#ecfccb'],
  },
  {
    id: 'prism',
    name: 'PRISM CORE',
    tag: 'Every colour at once.',
    from: '#6366f1',
    to: '#f472b6',
    accent: '#e879f9',
    wash: 'rgba(232,121,249,0.22)',
    particles: ['#e879f9', '#38bdf8', '#fde68a', '#34d399'],
  },
];

export const LEVELS_PER_STAGE = 3;

export function stageIndexForLevel(level: number): number {
  return Math.min(STAGES.length - 1, Math.floor(Math.max(0, level - 1) / LEVELS_PER_STAGE));
}

export function stageForLevel(level: number): Stage {
  return STAGES[stageIndexForLevel(level)];
}

/** Level at which the given stage index first appears (for teasers). */
export function levelForStageIndex(i: number): number {
  return i * LEVELS_PER_STAGE + 1;
}

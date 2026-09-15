import type { ScoreEntry } from '../hooks/useHighScores';
import type { MetaStore } from '../hooks/useMeta';
import type { Difficulty } from './levels';

export const SAVE_PREFIX = 'ENGRAM1:';
const MAX_PER_MODE = 10;

export interface SaveBundle {
  v: 1;
  ts: number;
  name: string;
  meta: MetaStore;
  scores: ScoreEntry[];
}

const cleanNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

/** Treat imported and cloud data as untrusted before it reaches the game state. */
export function parseSaveBundle(value: unknown): SaveBundle | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<SaveBundle>;
  if (raw.v !== 1 || !raw.meta || typeof raw.meta !== 'object' || !Array.isArray(raw.scores)) return null;

  const metaRaw = raw.meta as Partial<MetaStore>;
  const scores = raw.scores
    .filter((score): score is ScoreEntry => {
      if (!score || typeof score !== 'object') return false;
      const s = score as Partial<ScoreEntry>;
      return typeof s.id === 'string' && typeof s.name === 'string' && typeof s.score === 'number';
    })
    .map((score) => ({
      id: score.id.slice(0, 40),
      name: score.name.slice(0, 16),
      score: cleanNumber(score.score),
      level: Math.max(1, cleanNumber(score.level)),
      date: cleanNumber(score.date),
      mode: score.mode === 'calm' || score.mode === 'surge' ? score.mode : ('focus' as const),
    }))
    .slice(0, 30);

  return {
    v: 1,
    ts: cleanNumber(raw.ts) || Date.now(),
    name: typeof raw.name === 'string' ? raw.name.slice(0, 16) : 'PLAYER',
    meta: {
      xp: cleanNumber(metaRaw.xp),
      runs: cleanNumber(metaRaw.runs),
      tiles: cleanNumber(metaRaw.tiles),
      perfects: cleanNumber(metaRaw.perfects),
      bestLevel: cleanNumber(metaRaw.bestLevel),
      streak: cleanNumber(metaRaw.streak),
      lastDay: typeof metaRaw.lastDay === 'string' ? metaRaw.lastDay.slice(0, 10) : '',
    },
    scores,
  };
}

function toB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(s: string): string {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSave(bundle: SaveBundle): string {
  return SAVE_PREFIX + toB64(JSON.stringify(bundle));
}

export function decodeSave(raw: string): SaveBundle | null {
  try {
    const original = raw.trim();
    if (original.startsWith('{')) return parseSaveBundle(JSON.parse(original));
    const trimmed = original.replace(/\s+/g, '');
    const body = trimmed.startsWith(SAVE_PREFIX) ? trimmed.slice(SAVE_PREFIX.length) : trimmed;
    return parseSaveBundle(JSON.parse(fromB64(body)));
  } catch {
    return null;
  }
}

/** Conflict-free merge: keep the best of every stat, union the leaderboards. */
export function mergeSave(local: SaveBundle, incoming: SaveBundle): SaveBundle {
  const meta: MetaStore = {
    xp: Math.max(local.meta.xp, incoming.meta.xp),
    runs: Math.max(local.meta.runs, incoming.meta.runs),
    tiles: Math.max(local.meta.tiles, incoming.meta.tiles),
    perfects: Math.max(local.meta.perfects, incoming.meta.perfects),
    bestLevel: Math.max(local.meta.bestLevel, incoming.meta.bestLevel),
    streak: Math.max(local.meta.streak, incoming.meta.streak),
    lastDay: local.meta.lastDay > incoming.meta.lastDay ? local.meta.lastDay : incoming.meta.lastDay,
  };

  const seen = new Set<string>();
  const all = [...local.scores, ...incoming.scores].filter((s) => {
    if (!s || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  all.sort((a, b) => b.score - a.score);

  const perMode: Record<Difficulty, number> = { calm: 0, focus: 0, surge: 0 };
  const scores: ScoreEntry[] = [];
  for (const e of all) {
    const mode = (e.mode ?? 'focus') as Difficulty;
    if (perMode[mode] < MAX_PER_MODE) {
      perMode[mode]++;
      scores.push({ ...e, mode });
    }
  }

  return {
    v: 1,
    ts: Date.now(),
    name: incoming.ts > local.ts ? incoming.name : local.name,
    meta,
    scores,
  };
}

export function downloadBundle(bundle: SaveBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `engram-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

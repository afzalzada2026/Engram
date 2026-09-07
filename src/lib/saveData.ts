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
    const trimmed = raw.trim().replace(/\s+/g, '');
    const body = trimmed.startsWith(SAVE_PREFIX) ? trimmed.slice(SAVE_PREFIX.length) : trimmed;
    const parsed = JSON.parse(fromB64(body)) as SaveBundle;
    if (!parsed || typeof parsed !== 'object' || !parsed.meta || !Array.isArray(parsed.scores)) return null;
    return parsed;
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

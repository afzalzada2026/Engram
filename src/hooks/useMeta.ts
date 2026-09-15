import { useCallback, useMemo, useState } from 'react';

export interface MetaStore {
  xp: number;
  runs: number;
  tiles: number;
  perfects: number;
  bestLevel: number;
  streak: number;
  lastDay: string;
}

export interface MetaProfile {
  level: number;
  into: number;
  need: number;
  title: string;
  streak: number;
  runs: number;
  tiles: number;
  perfects: number;
  bestLevel: number;
}

export interface RunSummary {
  xpGain: number;
  leveledTo: number;
  streak: number;
  streakExtended: boolean;
}

const KEY = 'engram-meta-v1';
const LEGACY_KEY = 'synapse-meta-v1';
const EMPTY: MetaStore = { xp: 0, runs: 0, tiles: 0, perfects: 0, bestLevel: 0, streak: 0, lastDay: '' };
const TITLES = ['NOVICE', 'SYNC', 'PULSE', 'FLOW', 'LUCID', 'MNEMON', 'ORACLE', 'APEX'];

export const needForLevel = (l: number) => 140 + 90 * (l - 1);

export function levelProgress(xp: number) {
  let level = 1;
  let remaining = xp;
  let need = needForLevel(level);
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = needForLevel(level);
  }
  return { level, into: remaining, need };
}

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function load(): MetaStore {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<MetaStore>) };
  } catch {
    return EMPTY;
  }
}

export function useMeta() {
  const [store, setStore] = useState<MetaStore>(load);

  const profile = useMemo<MetaProfile>(() => {
    const { level, into, need } = levelProgress(store.xp);
    return {
      level,
      into,
      need,
      title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))],
      streak: store.streak,
      runs: store.runs,
      tiles: store.tiles,
      perfects: store.perfects,
      bestLevel: store.bestLevel,
    };
  }, [store]);

  const recordRun = useCallback(
    (input: { score: number; level: number; tiles: number; perfects: number }): RunSummary => {
      const xpGain = Math.round(input.score / 12) + input.level * 10 + input.perfects * 30;
      const today = dayKey();
      const yd = new Date();
      yd.setDate(yd.getDate() - 1);
      const yesterday = dayKey(yd);
      const summary: RunSummary = { xpGain, leveledTo: 0, streak: 1, streakExtended: false };
      setStore((prev) => {
        const newXp = prev.xp + xpGain;
        const before = levelProgress(prev.xp).level;
        const after = levelProgress(newXp).level;
        let streak = prev.streak;
        let extended = false;
        if (prev.lastDay !== today) {
          streak = prev.lastDay === yesterday ? prev.streak + 1 : 1;
          extended = true;
        }
        if (after > before) summary.leveledTo = after;
        summary.streak = streak;
        summary.streakExtended = extended;
        const next: MetaStore = {
          xp: newXp,
          runs: prev.runs + 1,
          tiles: prev.tiles + input.tiles,
          perfects: prev.perfects + input.perfects,
          bestLevel: Math.max(prev.bestLevel, input.level),
          streak,
          lastDay: today,
        };
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      return summary;
    },
    []
  );

  const replaceStore = useCallback((next: MetaStore) => {
    setStore(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  return { profile, store, replaceStore, recordRun };
}

export type Meta = ReturnType<typeof useMeta>;

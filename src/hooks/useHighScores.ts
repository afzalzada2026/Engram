import { useCallback, useEffect, useState } from 'react';
import type { Difficulty } from '../lib/levels';

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  level: number;
  date: number;
  mode: Difficulty;
}

const KEY = 'engram-highscores-v1';
const LEGACY_KEY = 'synapse-highscores-v1';
export const NAME_KEY = 'synapse-name';
const MAX_PER_MODE = 10;

function normalize(arr: unknown): ScoreEntry[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((v): v is ScoreEntry => !!v && typeof (v as ScoreEntry).score === 'number' && typeof (v as ScoreEntry).name === 'string')
    .map((v) => ({ ...v, mode: (v.mode ?? 'focus') as Difficulty }));
}

function load(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function useHighScores() {
  const [scores, setScores] = useState<ScoreEntry[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(scores));
    } catch {
      /* storage unavailable */
    }
  }, [scores]);

  const forMode = useCallback((mode: Difficulty) => scores.filter((s) => s.mode === mode), [scores]);

  const qualifies = useCallback(
    (score: number, mode: Difficulty) => {
      const list = scores.filter((s) => s.mode === mode);
      return score > 0 && (list.length < MAX_PER_MODE || score > list[list.length - 1].score);
    },
    [scores]
  );

  const add = useCallback((name: string, score: number, level: number, mode: Difficulty) => {
    const entry: ScoreEntry = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      score,
      level,
      date: Date.now(),
      mode,
    };
    setScores((prev) => {
      const merged = [...prev, entry].sort((a, b) => b.score - a.score);
      const perMode: Record<Difficulty, number> = { calm: 0, focus: 0, surge: 0 };
      const kept: ScoreEntry[] = [];
      for (const e of merged) {
        if (perMode[e.mode] < MAX_PER_MODE) {
          perMode[e.mode]++;
          kept.push(e);
        }
      }
      return kept;
    });
    return entry;
  }, []);

  const bestFor = useCallback(
    (mode: Difficulty) => {
      const m = scores.filter((s) => s.mode === mode);
      return m.length ? m[0].score : 0;
    },
    [scores]
  );

  const replaceAll = useCallback((next: ScoreEntry[]) => setScores(next), []);

  return { scores, forMode, qualifies, add, bestFor, replaceAll };
}

export type HighScores = ReturnType<typeof useHighScores>;

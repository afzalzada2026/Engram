import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '../lib/firebase';
import type { Difficulty } from '../lib/levels';
import { DIFFS } from '../lib/levels';

export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  level: number;
  date: number;
}

const PAGE = 25;

function toEntry(d: QueryDocumentSnapshot): LeaderboardEntry {
  const v = d.data() as Partial<LeaderboardEntry> & { score?: unknown };
  return {
    uid: d.id,
    name: typeof v.name === 'string' ? v.name.slice(0, 16) : 'PLAYER',
    score: typeof v.score === 'number' && Number.isFinite(v.score) ? Math.floor(v.score) : 0,
    level: typeof v.level === 'number' ? Math.floor(v.level) : 1,
    date: typeof v.date === 'number' ? v.date : 0,
  };
}

export function useLeaderboard(mode: Difficulty) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const myUid = firebaseAuth?.currentUser?.uid ?? null;

  useEffect(() => {
    if (!firebaseDb) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const q = query(collection(firebaseDb, 'leaderboards', mode, 'entries'), limit(PAGE));
    // Public read of the top scores; each entry is a single doc per player.
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map(toEntry).sort((a, b) => b.score - a.score);
        setEntries(rows);
        setLoading(false);
      },
      (e) => {
        setError(e.message || 'Leaderboard unavailable');
        setLoading(false);
      }
    );
    return unsub;
  }, [mode]);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  /** The signed-in player's own position, even if they are outside the top page. */
  const [myRank, setMyRank] = useState<{ entry: LeaderboardEntry; rank: number } | null>(null);
  useEffect(() => {
    if (!firebaseDb || !myUid) {
      setMyRank(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(firebaseDb!, 'leaderboards', mode, 'entries', myUid));
        if (!snap.exists()) {
          if (!cancelled) setMyRank(null);
          return;
        }
        const mine = toEntry(snap);
        // Count how many score strictly higher: a single cheap query (<100 docs
        // total realistically); avoids needing a stored rank counter.
        const higher = await getDocs(
          query(collection(firebaseDb!, 'leaderboards', mode, 'entries'), where('score', '>', mine.score))
        );
        if (!cancelled) setMyRank({ entry: mine, rank: higher.size + 1 });
      } catch {
        if (!cancelled) setMyRank(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, myUid, entries]);

  const submitScore = useCallback(
    async (score: number, level: number) => {
      if (!firebaseDb || !myUid || score <= 0) return false;
      try {
        const ref = doc(firebaseDb, 'leaderboards', mode, 'entries', myUid);
        const existing = await getDoc(ref);
        const prevScore = existing.exists() ? (existing.data().score as number) : 0;
        const prevLevel = existing.exists() ? (existing.data().level as number) : 1;
        // Rule-safe monotone write: only push both score and level upward.
        if (existing.exists() && prevScore >= score && prevLevel >= level) return true;
        const name =
          (firebaseAuth?.currentUser?.displayName || 'PLAYER').slice(0, 16) || 'PLAYER';
        await setDoc(ref, {
          uid: myUid,
          name,
          score: Math.floor(Math.max(score, prevScore)),
          level: Math.max(level, prevLevel),
          date: Date.now(),
        });
        return true;
      } catch {
        return false;
      }
    },
    [myUid, mode]
  );

  return { entries, loading, error, myRank, submitScore, modeLabel: DIFFS[mode].label };
}

export type Leaderboard = ReturnType<typeof useLeaderboard>;

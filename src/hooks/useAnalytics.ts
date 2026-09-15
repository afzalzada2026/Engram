import { useCallback, useEffect, useRef } from 'react';
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';

/**
 * Firebase Analytics — instruments retention and virality without collecting
 * personal identifiers in event data.
 *
 * Keys used (all safe for public dashboards):
 *   retention : run_start, run_end, session_time, streak_day
 *   virality  : duel_create, duel_accept, duel_result, share_card, install_prompt
 *   engagement: stage_reached, fever_start, new_best, perfect_clear
 *
 * Exact scores are bucketed so dashboards stay useful without exposing
 * precision that would let a player reverse-engineer leaderboard gaps.
 */

let cached: Analytics | null | undefined;

async function get() {
  if (cached !== undefined) return cached;
  try {
    if (await isSupported()) {
      cached = getAnalytics();
      setAnalyticsCollectionEnabled(cached, true);
    } else {
      cached = null;
    }
  } catch {
    cached = null;
  }
  return cached;
}

const scoreBucket = (score: number): string => {
  if (score < 500) return '0-500';
  if (score < 1500) return '500-1500';
  if (score < 3500) return '1500-3500';
  if (score < 7000) return '3500-7000';
  if (score < 15000) return '7000-15000';
  return '15000+';
};

export function useAnalytics() {
  const ready = useRef(false);

  useEffect(() => {
    void get().then(() => {
      ready.current = true;
    });
  }, []);

  const log = useCallback((name: string, params?: Record<string, string | number>): void => {
    if (!ready.current || !cached) return;
    try {
      logEvent(cached, name, params);
    } catch {
      /* non-fatal */
    }
  }, []);

  const identify = useCallback((uid: string | null) => {
    if (!cached) return;
    try {
      setUserId(cached, uid);
    } catch {
      /* ignore */
    }
  }, []);

  const setProfile = useCallback((props: { profileLevel?: number; favMode?: string }) => {
    if (!cached) return;
    try {
      const p: Record<string, string> = {};
      if (props.profileLevel !== undefined) p.profile_level = Math.min(99, props.profileLevel).toString();
      if (props.favMode) p.fav_mode = props.favMode.slice(0, 16);
      if (Object.keys(p).length) setUserProperties(cached, p);
    } catch {
      /* ignore */
    }
  }, []);

  const runStart = useCallback((mode: string, duel: boolean) => log('run_start', { mode, duel: duel ? 1 : 0 }), [log]);
  const runEnd = useCallback(
    (mode: string, score: number, level: number, perfect: boolean) =>
      log('run_end', { mode, level, perfect: perfect ? 1 : 0, score_bucket: scoreBucket(score) }),
    [log]
  );
  const duelCreate = useCallback(() => log('duel_create'), [log]);
  const duelAccept = useCallback((mode: string) => log('duel_accept', { mode }), [log]);
  const duelResult = useCallback((won: boolean) => log('duel_result', { outcome: won ? 'won' : 'lost' }), [log]);
  const shareOpen = useCallback(() => log('share_card'), [log]);
  const stageReached = useCallback((stageId: string) => log('stage_reached', { stage: stageId }), [log]);
  const feverStart = useCallback((level: number) => log('fever_start', { level }), [log]);
  const newBest = useCallback((mode: string) => log('new_best', { mode }), [log]);
  const streakDay = useCallback((day: number) => log('streak_day', { day: Math.min(day, 365) }), [log]);
  const installPrompted = useCallback(() => log('install_prompt'), [log]);
  const sessionEnd = useCallback((minutes: number, runs: number) => log('session_end', { minutes: Math.round(minutes), runs }), [log]);
  const syncConnected = useCallback(() => log('cloud_sync_connected'), [log]);

  return {
    identify,
    setProfile,
    runStart,
    runEnd,
    duelCreate,
    duelAccept,
    duelResult,
    shareOpen,
    stageReached,
    feverStart,
    newBest,
    streakDay,
    installPrompted,
    sessionEnd,
    syncConnected,
  };
}

export type AnalyticsHook = ReturnType<typeof useAnalytics>;

/**
 * Wellbeing + training-integrity layer.
 *
 * Clinical rationale (kept honest, not marketing):
 *  - Distributed practice (spacing) beats massed practice for retention.
 *  - Visual-spatial working memory degrades measurably after ~10–15 min of
 *    continuous effort; longer sessions train worse, not better.
 *  - `span` (largest pattern recalled cleanly) is a Corsi-blocks-style
 *    construct — a far more meaningful number than a raw score.
 *  - Rapid luminance transients are a trigger for photosensitive epilepsy.
 *    Calm mode removes strobing and honours prefers-reduced-motion.
 */

export interface Settings {
  /** Photosensitive-safe, low-FX visuals. Also the low-end-device 60fps path. */
  calm: boolean;
  /** Show wellbeing nudges (breaks, spacing, sleep). */
  coach: boolean;
  /** Staircase difficulty: pattern size follows your recall instead of pure level. */
  adaptive: boolean;
  /** Target minutes per training session. */
  sessionMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  calm: false,
  coach: true,
  adaptive: false,
  sessionMinutes: 10,
};

const KEY = 'engram-settings-v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Honour the OS accessibility preference on first run.
      const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      return { ...DEFAULT_SETTINGS, calm: !!reduce };
    }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/* ------------------------------ session state ------------------------------ */

export interface SessionState {
  activeMs: number;
  runs: number;
  consecutiveLosses: number;
  bestSpanThisSession: number;
}

export const newSession = (): SessionState => ({
  activeMs: 0,
  runs: 0,
  consecutiveLosses: 0,
  bestSpanThisSession: 0,
});

export type NudgeTone = 'break' | 'spacing' | 'sleep' | 'recover' | 'win';

export interface Nudge {
  tone: NudgeTone;
  title: string;
  body: string;
}

/**
 * Returns at most one nudge, prioritising the most clinically useful message.
 * Voice is deliberately non-punitive: shame does not build habits, momentum does.
 */
export function evaluateSession(s: SessionState, minutes: number): Nudge | null {
  const mins = s.activeMs / 60000;

  if (s.consecutiveLosses >= 3) {
    return {
      tone: 'recover',
      title: 'TAKE A BREATH',
      body: 'Three losses in a row is fatigue, not decline. A short break — then a fresh run — is how recall actually improves.',
    };
  }
  if (mins >= minutes) {
    return {
      tone: 'spacing',
      title: 'STRONG SESSION',
      body: `${Math.round(mins)} minutes is plenty. Recall consolidates between sessions — come back in a couple of hours rather than pushing on.`,
    };
  }
  if (mins >= minutes * 0.7) {
    return {
      tone: 'break',
      title: 'NEARLY THERE',
      body: 'Working memory tires quickly. Finish this run, then rest — the last 30% of a long session trains least.',
    };
  }
  return null;
}

export function sleepNudge(): Nudge {
  return {
    tone: 'sleep',
    title: 'GOOD TIME TO TRAIN',
    body: 'Patterns you learn tonight are consolidated overnight. Sleep is when the engram is actually written.',
  };
}

/* --------------------------------- span ---------------------------------- */

export interface SpanSample {
  /** cells in the pattern for that round */
  size: number;
  /** recalled with zero misses */
  clean: boolean;
  at: number;
}

/**
 * Corsi-style visual-spatial span: the largest pattern recalled without error.
 * Windowed so the number reflects *current* ability, not a lifetime best that
 * a bad month makes feel like failure.
 */
export function spanFrom(samples: SpanSample[], window = 20): number {
  const recent = samples.slice(-window);
  const clean = recent.filter((s) => s.clean);
  if (!clean.length) return 0;
  return Math.max(...clean.map((s) => s.size));
}

export function spanTrend(samples: SpanSample[]): number {
  if (samples.length < 8) return 0;
  const half = Math.floor(samples.length / 2);
  return spanFrom(samples.slice(half)) - spanFrom(samples.slice(0, half));
}

/* --------------------- honest expectations & privacy ---------------------- */

export const DISCLAIMER = [
  'ENGRAM is a game, not a medical device, and not a diagnostic tool.',
  'Your score measures performance on this task. It is not a measure of your memory, your intelligence, or your brain health.',
  'Research on brain training shows that practice reliably improves the trained skill. Benefits that transfer to general thinking are not established.',
  'If you have any concern about your memory, please speak with a qualified clinician.',
];

export const PHOTO_NOTE =
  'Flashing patterns can trigger seizures in people with photosensitive epilepsy. If Calm Mode is off, you accept rapid visual effects.';

export const PRIVACY = [
  'Local play requires no account. There is no advertising and no behavioural analytics.',
  'If you choose Google Cloud Sync, your Google account identifier and game progress are stored privately in Firebase so your devices can find the same save.',
  'Cloud Sync is optional. Manual save codes and backup files remain available without signing in.',
  'Cloud data is not sold or shared for advertising. You can delete the cloud account from the Sync panel and keep playing locally.',
];

export const DATA_SAFETY = [
  ['Required data collection', 'None'],
  ['Optional cloud data', 'Account ID and game progress'],
  ['Data shared for advertising', 'None'],
  ['Local play account', 'Not required'],
  ['Cloud provider', 'Google Firebase'],
  ['Encryption in transit', 'Yes, for Cloud Sync'],
  ['Cloud data deletion', 'Available in Sync / Backup'],
];

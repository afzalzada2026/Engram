import type { Difficulty } from './levels';

export interface Challenge {
  seed: string;
  target: number;
  name: string;
  mode: Difficulty;
  level: number;
}

const PARAM = 'duel';

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): string {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeChallenge(c: Challenge): string {
  return b64url([c.seed, String(c.target), c.name, c.mode, String(c.level)].join('|'));
}

export function decodeChallenge(token: string): Challenge | null {
  try {
    const [seed, target, name, mode, level] = unb64url(token).split('|');
    if (!seed || !target) return null;
    const m: Difficulty = mode === 'calm' || mode === 'surge' ? mode : 'focus';
    return {
      seed,
      target: Math.max(0, Number(target) || 0),
      name: (name || 'A FRIEND').slice(0, 12),
      mode: m,
      level: Math.max(1, Number(level) || 1),
    };
  } catch {
    return null;
  }
}

export function readChallengeFromUrl(): Challenge | null {
  if (typeof window === 'undefined') return null;
  const fromSearch = new URLSearchParams(window.location.search).get(PARAM);
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const fromHash = new URLSearchParams(hash).get(PARAM);
  const token = fromSearch || fromHash;
  return token ? decodeChallenge(token) : null;
}

export function clearChallengeFromUrl() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  url.hash = '';
  window.history.replaceState({}, '', url.toString());
}

export function buildChallengeUrl(c: Challenge): string {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://engram.game/';
  return `${base}?${PARAM}=${encodeChallenge(c)}`;
}

const STAGE_EMOJI: Record<string, string> = {
  drift: '🟪',
  reef: '🟦',
  ember: '🟧',
  bloom: '🟪',
  circuit: '🟩',
  prism: '🟨',
};

/** Wordle-style recap of the final grid — instantly recognisable in a feed. */
export function emojiGrid(pattern: number[], size: number, stageId: string): string {
  const lit = STAGE_EMOJI[stageId] ?? '🟪';
  const set = new Set(pattern);
  const rows: string[] = [];
  const capped = Math.min(size, 6);
  for (let y = 0; y < capped; y++) {
    let row = '';
    for (let x = 0; x < capped; x++) row += set.has(y * size + x) ? lit : '⬛';
    rows.push(row);
  }
  return rows.join('\n');
}

export interface ShareInput {
  score: number;
  level: number;
  accuracy: number;
  maxCombo: number;
  modeLabel: string;
  pattern: number[];
  gridSize: number;
  stageId: string;
  url: string;
  duelWon?: boolean;
  duelName?: string;
}

export function buildShareText(i: ShareInput): string {
  const head = i.duelName
    ? i.duelWon
      ? `I beat ${i.duelName}'s ENGRAM duel 🧠⚡`
      : `${i.duelName} beat me in ENGRAM — I need a rematch 🧠`
    : `ENGRAM · ${i.modeLabel}`;
  return [
    head,
    `${i.score.toLocaleString()} pts · Level ${i.level} · ${i.accuracy}% recall · ×${Math.max(1, i.maxCombo)} combo`,
    '',
    emojiGrid(i.pattern, i.gridSize, i.stageId),
    '',
    'Can you out-remember me?',
    i.url,
  ].join('\n');
}

export interface ShareTarget {
  id: string;
  label: string;
  href: string;
  color: string;
}

export function shareTargets(text: string, url: string): ShareTarget[] {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${t}`, color: '#e8ecff' },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${t}`, color: '#25d366' },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}`, color: '#29b6f6' },
    { id: 'reddit', label: 'Reddit', href: `https://reddit.com/submit?url=${u}&title=${encodeURIComponent('I just set an ENGRAM memory record')}`, color: '#ff4500' },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, color: '#4267b2' },
  ];
}

export async function nativeShare(text: string, url: string): Promise<boolean> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (!nav.share) return false;
  try {
    await nav.share({ title: 'ENGRAM', text, url });
    return true;
  } catch {
    return false;
  }
}

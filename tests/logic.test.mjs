/**
 * ENGRAM pure-logic regression suite.
 * These guard the invariants that, if broken, silently corrupt player progress
 * or produce unfair duels. Run: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { samplePattern, gridSizeForLevel, patternSizeForLevel, DIFFS } from './levels.js';
import { hashSeed, mulberry32, rngFor, makeSeed } from './rng.js';
import { spanFrom, spanTrend, evaluateSession, newSession, DEFAULT_SETTINGS } from './wellbeing.js';
import { encodeChallenge, decodeChallenge } from './duel.js';
import { encodeSave, decodeSave, mergeSave } from './saveData.js';

/* ---------------------------- duel determinism ---------------------------- */

test('same seed + level yields identical patterns (duel fairness)', () => {
  for (const lvl of [1, 3, 7, 12]) {
    const cells = gridSizeForLevel(lvl) ** 2;
    const count = patternSizeForLevel(lvl, cells);
    const a = samplePattern(cells, count, rngFor('K7Q2MX', lvl));
    const b = samplePattern(cells, count, rngFor('K7Q2MX', lvl));
    assert.deepEqual(a, b, `level ${lvl} diverged`);
  }
});

test('different seeds produce different patterns', () => {
  const cells = 25;
  const a = samplePattern(cells, 5, rngFor('AAAAAA', 1));
  const b = samplePattern(cells, 5, rngFor('BBBBBB', 1));
  assert.notDeepEqual(a, b);
});

test('patterns are unique-index sets of the requested size', () => {
  for (let i = 0; i < 200; i++) {
    const cells = 36;
    const p = samplePattern(cells, 9, rngFor(makeSeed(), i));
    assert.equal(p.length, 9);
    assert.equal(new Set(p).size, 9, 'duplicate cell in pattern');
    assert.ok(p.every((n) => n >= 0 && n < cells));
  }
});

test('PRNG is uniform enough and deterministic', () => {
  const r = mulberry32(hashSeed('seed'));
  const first = Array.from({ length: 10 }, () => r());
  const r2 = mulberry32(hashSeed('seed'));
  const second = Array.from({ length: 10 }, () => r2());
  assert.deepEqual(first, second);
  for (const v of first) assert.ok(v >= 0 && v < 1);
  const mean = first.reduce((a, b) => a + b, 0) / first.length;
  assert.ok(mean > 0.1 && mean < 0.9, `degenerate PRNG mean ${mean}`);
});

/* ------------------------------ difficulty ------------------------------- */

test('every difficulty is internally coherent', () => {
  for (const key of ['calm', 'focus', 'surge']) {
    const d = DIFFS[key];
    assert.ok(d.lives >= 1 && d.lives <= 6);
    assert.ok(d.scoreMult > 0);
    assert.ok(d.revealScale > 0);
    assert.equal(d.key, key);
  }
  assert.ok(DIFFS.surge.scoreMult > DIFFS.calm.scoreMult, 'risk must pay more than safety');
  assert.ok(DIFFS.calm.revealScale > DIFFS.surge.revealScale, 'calm must be slower than surge');
});

test('surge ramps grids faster than focus', () => {
  const f = gridSizeForLevel(3 + DIFFS.focus.bias);
  const s = gridSizeForLevel(3 + DIFFS.surge.bias);
  assert.ok(s >= f);
});

/* --------------------------------- span ---------------------------------- */

test('span is the largest clean recall in the window', () => {
  const samples = [
    { size: 4, clean: true, at: 1 },
    { size: 7, clean: true, at: 2 },
    { size: 9, clean: false, at: 3 },
    { size: 5, clean: true, at: 4 },
  ];
  assert.equal(spanFrom(samples), 7);
});

test('failed rounds never set span', () => {
  assert.equal(spanFrom([{ size: 9, clean: false, at: 1 }]), 0);
  assert.equal(spanFrom([]), 0);
});

test('span is windowed so old glory does not mask current ability', () => {
  // 25 strong rounds, then 25 weak ones. With a 20-round window the strong
  // streak must fall entirely out of view.
  const hist = [
    ...Array.from({ length: 25 }, (_, i) => ({ size: 9, clean: true, at: i })),
    ...Array.from({ length: 25 }, (_, i) => ({ size: 3, clean: true, at: 25 + i })),
  ];
  assert.equal(spanFrom(hist, 20), 3, 'stale high span should not persist forever');
  assert.equal(spanFrom(hist.slice(0, 25), 20), 9, 'recent strong play still counts');
});

test('trend is zero without enough data', () => {
  assert.equal(spanTrend([{ size: 5, clean: true, at: 1 }]), 0);
});

/* ----------------------------- session coach ----------------------------- */

test('fatigue triggers before the session target', () => {
  const s = newSession();
  s.activeMs = 9 * 60 * 1000;
  const n = evaluateSession(s, 10);
  assert.ok(n && n.tone === 'break');
});

test('session target triggers a spacing message', () => {
  const s = newSession();
  s.activeMs = 12 * 60 * 1000;
  const n = evaluateSession(s, 10);
  assert.ok(n && n.tone === 'spacing');
});

test('three consecutive losses is treated as fatigue, not decline', () => {
  const s = newSession();
  s.activeMs = 1000;
  s.consecutiveLosses = 3;
  const n = evaluateSession(s, 10);
  assert.ok(n && n.tone === 'recover', 'recovery should outrank length');
});

test('no nagging during a healthy short session', () => {
  const s = newSession();
  s.activeMs = 2 * 60 * 1000;
  assert.equal(evaluateSession(s, 10), null);
});

test('coach is opt-out via settings', () => {
  assert.equal(DEFAULT_SETTINGS.coach, true);
  assert.equal(typeof DEFAULT_SETTINGS.calm, 'boolean');
});

/* ------------------------------- duels ---------------------------------- */

test('challenge round-trips losslessly', () => {
  const c = { seed: 'K7Q2MX', target: 4820, name: 'ALEX', mode: 'surge', level: 9 };
  const back = decodeChallenge(encodeChallenge(c));
  assert.deepEqual(back, c);
});

test('challenge decode is resilient to tampering', () => {
  assert.equal(decodeChallenge('not-a-token'), null);
  assert.equal(decodeChallenge('!!!!'), null);
  const partial = decodeChallenge(encodeChallenge({ seed: 'ABC123', target: 10, name: '', mode: 'focus', level: 1 }));
  assert.equal(partial.seed, 'ABC123');
  assert.equal(partial.name, 'A FRIEND', 'empty name must fall back');
});

test('invalid mode collapses to focus, never crashes', () => {
  const d = decodeChallenge(encodeChallenge({ seed: 'ZZZZZZ', target: 1, name: 'X', mode: 'hacker', level: 1 }));
  assert.equal(d.mode, 'focus');
});

/* ---------------------------- save merge -------------------------------- */

const bundle = (over = {}) => ({
  v: 1,
  ts: 1000,
  name: 'P1',
  meta: { xp: 0, runs: 0, tiles: 0, perfects: 0, bestLevel: 0, streak: 0, lastDay: '' },
  scores: [],
  ...over,
});

test('merge never loses the best stat from either side', () => {
  const local = bundle({ meta: { xp: 500, runs: 10, tiles: 100, perfects: 3, bestLevel: 8, streak: 4, lastDay: '2026-01-02' } });
  const remote = bundle({ meta: { xp: 900, runs: 5, tiles: 200, perfects: 1, bestLevel: 6, streak: 9, lastDay: '2026-01-01' } });
  const m = mergeSave(local, remote).meta;
  assert.equal(m.xp, 900);
  assert.equal(m.runs, 10);
  assert.equal(m.tiles, 200);
  assert.equal(m.perfects, 3);
  assert.equal(m.bestLevel, 8);
  assert.equal(m.streak, 9);
  assert.equal(m.lastDay, '2026-01-02');
});

test('merge is idempotent', () => {
  const a = bundle({ meta: { xp: 400, runs: 3, tiles: 20, perfects: 1, bestLevel: 4, streak: 2, lastDay: '2026-01-01' }, scores: [{ id: 's1', name: 'P1', score: 500, level: 4, date: 1, mode: 'focus' }] });
  const once = mergeSave(a, a);
  const twice = mergeSave(once, once);
  assert.equal(once.meta.xp, twice.meta.xp);
  assert.equal(once.scores.length, twice.scores.length);
});

test('merge unions leaderboards and drops duplicate ids', () => {
  const a = bundle({ scores: [{ id: 's1', name: 'P1', score: 900, level: 5, date: 1, mode: 'focus' }] });
  const b = bundle({ scores: [{ id: 's1', name: 'P1', score: 900, level: 5, date: 1, mode: 'focus' }, { id: 's2', name: 'P2', score: 700, level: 4, date: 2, mode: 'focus' }] });
  const m = mergeSave(a, b);
  assert.equal(m.scores.length, 2);
  assert.equal(m.scores[0].score, 900, 'sorted descending');
});

test('merge caps each difficulty lane at 10', () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, name: 'P', score: 1000 - i, level: 3, date: i, mode: 'focus' }));
  const m = mergeSave(bundle({ scores: many }), bundle({ scores: [] }));
  assert.equal(m.scores.length, 10);
});

test('save round-trips through the portable code', () => {
  const b = bundle({ meta: { xp: 777, runs: 4, tiles: 33, perfects: 2, bestLevel: 7, streak: 3, lastDay: '2026-02-02' } });
  const back = decodeSave(encodeSave(b));
  assert.equal(back.meta.xp, 777);
  assert.equal(back.name, 'P1');
});

test('corrupt save codes return null instead of throwing', () => {
  assert.equal(decodeSave('garbage'), null);
  assert.equal(decodeSave(''), null);
  assert.equal(decodeSave('ENGRAM1:!!!not-base64!!!'), null);
});

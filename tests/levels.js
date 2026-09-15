// src/lib/levels.ts
var DIFFS = {
  calm: {
    key: "calm",
    label: "CALM",
    tint: "#36f5c5",
    blurb: "Slower reveals \xB7 4 lives",
    lives: 4,
    bias: 0,
    revealScale: 1.45,
    recallScale: 1.5,
    scoreMult: 0.75,
    feverGain: 11
  },
  focus: {
    key: "focus",
    label: "FOCUS",
    tint: "#22d3ee",
    blurb: "The standard curve",
    lives: 3,
    bias: 0,
    revealScale: 1,
    recallScale: 1,
    scoreMult: 1,
    feverGain: 13
  },
  surge: {
    key: "surge",
    label: "SURGE",
    tint: "#f472b6",
    blurb: "Fast reveals \xB7 harder ramp \xB7 \xD71.5",
    lives: 3,
    bias: 1,
    revealScale: 0.62,
    recallScale: 0.7,
    scoreMult: 1.5,
    feverGain: 15
  }
};
var DIFF_ORDER = ["calm", "focus", "surge"];
var TILE_FLASH_STEP_MS = 55;
var EXTRA_REVEAL_TAIL_MS = 200;
var CALM_FLASH_STEP_MS = 340;
function gridSizeForLevel(level) {
  const l = Math.max(1, level);
  if (l <= 2) return 3;
  if (l <= 5) return 4;
  if (l <= 9) return 5;
  return 6;
}
function patternSizeForLevel(level, cells) {
  const raw = 2 + Math.max(1, level);
  const cap = Math.min(Math.floor(cells * 0.4), 18);
  return Math.max(3, Math.min(raw, cap));
}
function revealDuration(count, scale = 1) {
  return Math.round((950 + count * 300) * scale);
}
function totalRevealWindow(count, scale = 1) {
  return revealDuration(count, scale) + count * TILE_FLASH_STEP_MS + EXTRA_REVEAL_TAIL_MS;
}
function recallDuration(count, level, scale = 1) {
  const generosity = level <= 3 ? 1400 : 0;
  return Math.round((4600 + count * 950 + generosity) * scale);
}
function tilePoints(level) {
  return 25 + Math.min(level, 25) * 2;
}
function roundClearBonus(level, count) {
  return 60 + 22 * level + 8 * count;
}
function timeBonusMax(level) {
  return 120 + 30 * level;
}
function samplePattern(cells, count, rand = Math.random) {
  const idx = Array.from({ length: cells }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const chosen = idx.slice(0, count);
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return chosen;
}
var RANKS = [
  { min: 8e3, label: "SUPERNOVA", tint: "#fbbf24" },
  { min: 4500, label: "PULSAR", tint: "#f472b6" },
  { min: 2400, label: "BEACON", tint: "#a78bfa" },
  { min: 1100, label: "CURRENT", tint: "#22d3ee" },
  { min: 400, label: "SPARK", tint: "#36f5c5" },
  { min: 0, label: "DORMANT", tint: "#8b93b8" }
];
function rankForScore(score) {
  const r = RANKS.find((r2) => score >= r2.min);
  return { label: r.label, tint: r.tint };
}
export {
  CALM_FLASH_STEP_MS,
  DIFFS,
  DIFF_ORDER,
  EXTRA_REVEAL_TAIL_MS,
  TILE_FLASH_STEP_MS,
  gridSizeForLevel,
  patternSizeForLevel,
  rankForScore,
  recallDuration,
  revealDuration,
  roundClearBonus,
  samplePattern,
  tilePoints,
  timeBonusMax,
  totalRevealWindow
};

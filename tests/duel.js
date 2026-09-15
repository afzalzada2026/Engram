// src/lib/duel.ts
var PARAM = "duel";
function b64url(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s) {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm + "=".repeat((4 - norm.length % 4) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function encodeChallenge(c) {
  return b64url([c.seed, String(c.target), c.name, c.mode, String(c.level)].join("|"));
}
function decodeChallenge(token) {
  try {
    const [seed, target, name, mode, level] = unb64url(token).split("|");
    if (!seed || !target) return null;
    const m = mode === "calm" || mode === "surge" ? mode : "focus";
    return {
      seed,
      target: Math.max(0, Number(target) || 0),
      name: (name || "A FRIEND").slice(0, 12),
      mode: m,
      level: Math.max(1, Number(level) || 1)
    };
  } catch {
    return null;
  }
}
function readChallengeFromUrl() {
  if (typeof window === "undefined") return null;
  const fromSearch = new URLSearchParams(window.location.search).get(PARAM);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const fromHash = new URLSearchParams(hash).get(PARAM);
  const token = fromSearch || fromHash;
  return token ? decodeChallenge(token) : null;
}
function clearChallengeFromUrl() {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}
function buildChallengeUrl(c) {
  const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://engram.game/";
  return `${base}?${PARAM}=${encodeChallenge(c)}`;
}
var STAGE_EMOJI = {
  drift: "\u{1F7EA}",
  reef: "\u{1F7E6}",
  ember: "\u{1F7E7}",
  bloom: "\u{1F7EA}",
  circuit: "\u{1F7E9}",
  prism: "\u{1F7E8}"
};
function emojiGrid(pattern, size, stageId) {
  const lit = STAGE_EMOJI[stageId] ?? "\u{1F7EA}";
  const set = new Set(pattern);
  const rows = [];
  const capped = Math.min(size, 6);
  for (let y = 0; y < capped; y++) {
    let row = "";
    for (let x = 0; x < capped; x++) row += set.has(y * size + x) ? lit : "\u2B1B";
    rows.push(row);
  }
  return rows.join("\n");
}
function buildShareText(i) {
  const head = i.duelName ? i.duelWon ? `I beat ${i.duelName}'s ENGRAM duel \u{1F9E0}\u26A1` : `${i.duelName} beat me in ENGRAM \u2014 I need a rematch \u{1F9E0}` : `ENGRAM \xB7 ${i.modeLabel}`;
  return [
    head,
    `${i.score.toLocaleString()} pts \xB7 Level ${i.level} \xB7 ${i.accuracy}% recall \xB7 \xD7${Math.max(1, i.maxCombo)} combo`,
    "",
    emojiGrid(i.pattern, i.gridSize, i.stageId),
    "",
    "Can you out-remember me?",
    i.url
  ].join("\n");
}
function shareTargets(text, url) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return [
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}`, color: "#e8ecff" },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${t}`, color: "#25d366" },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}`, color: "#29b6f6" },
    { id: "reddit", label: "Reddit", href: `https://reddit.com/submit?url=${u}&title=${encodeURIComponent("I just set an ENGRAM memory record")}`, color: "#ff4500" },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, color: "#4267b2" }
  ];
}
async function nativeShare(text, url) {
  const nav = navigator;
  if (!nav.share) return false;
  try {
    await nav.share({ title: "ENGRAM", text, url });
    return true;
  } catch {
    return false;
  }
}
export {
  buildChallengeUrl,
  buildShareText,
  clearChallengeFromUrl,
  decodeChallenge,
  emojiGrid,
  encodeChallenge,
  nativeShare,
  readChallengeFromUrl,
  shareTargets
};

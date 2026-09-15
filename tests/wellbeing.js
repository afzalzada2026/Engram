// src/lib/wellbeing.ts
var DEFAULT_SETTINGS = {
  calm: false,
  coach: true,
  adaptive: false,
  sessionMinutes: 10
};
var KEY = "engram-settings-v1";
function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      return { ...DEFAULT_SETTINGS, calm: !!reduce };
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
  }
}
var newSession = () => ({
  activeMs: 0,
  runs: 0,
  consecutiveLosses: 0,
  bestSpanThisSession: 0
});
function evaluateSession(s, minutes) {
  const mins = s.activeMs / 6e4;
  if (s.consecutiveLosses >= 3) {
    return {
      tone: "recover",
      title: "TAKE A BREATH",
      body: "Three losses in a row is fatigue, not decline. A short break \u2014 then a fresh run \u2014 is how recall actually improves."
    };
  }
  if (mins >= minutes) {
    return {
      tone: "spacing",
      title: "STRONG SESSION",
      body: `${Math.round(mins)} minutes is plenty. Recall consolidates between sessions \u2014 come back in a couple of hours rather than pushing on.`
    };
  }
  if (mins >= minutes * 0.7) {
    return {
      tone: "break",
      title: "NEARLY THERE",
      body: "Working memory tires quickly. Finish this run, then rest \u2014 the last 30% of a long session trains least."
    };
  }
  return null;
}
function sleepNudge() {
  return {
    tone: "sleep",
    title: "GOOD TIME TO TRAIN",
    body: "Patterns you learn tonight are consolidated overnight. Sleep is when the engram is actually written."
  };
}
function spanFrom(samples, window2 = 20) {
  const recent = samples.slice(-window2);
  const clean = recent.filter((s) => s.clean);
  if (!clean.length) return 0;
  return Math.max(...clean.map((s) => s.size));
}
function spanTrend(samples) {
  if (samples.length < 8) return 0;
  const half = Math.floor(samples.length / 2);
  return spanFrom(samples.slice(half)) - spanFrom(samples.slice(0, half));
}
var DISCLAIMER = [
  "ENGRAM is a game, not a medical device, and not a diagnostic tool.",
  "Your score measures performance on this task. It is not a measure of your memory, your intelligence, or your brain health.",
  "Research on brain training shows that practice reliably improves the trained skill. Benefits that transfer to general thinking are not established.",
  "If you have any concern about your memory, please speak with a qualified clinician."
];
var PHOTO_NOTE = "Flashing patterns can trigger seizures in people with photosensitive epilepsy. If Calm Mode is off, you accept rapid visual effects.";
var PRIVACY = [
  "Everything stays on your device. There is no account, no analytics, no advertising, and no tracking of any kind.",
  "Your scores, XP, streak and settings live only in your browser local storage. Clearing site data erases them permanently.",
  "Use SYNC / BACKUP to export your progress yourself. Nothing is ever uploaded by us, because we have no server.",
  "Because no data leaves your device, we collect nothing to protect, sell, or lose."
];
var DATA_SAFETY = [
  ["Data collected", "None"],
  ["Data shared", "None"],
  ["Data stored", "Local to your device only"],
  ["Accounts required", "No"],
  ["Third-party SDKs", "None"],
  ["Encryption in transit", "Not applicable \u2014 no transmission"],
  ["Data deletion", "Clear site data, or Reset in Settings"]
];
export {
  DATA_SAFETY,
  DEFAULT_SETTINGS,
  DISCLAIMER,
  PHOTO_NOTE,
  PRIVACY,
  evaluateSession,
  loadSettings,
  newSession,
  saveSettings,
  sleepNudge,
  spanFrom,
  spanTrend
};

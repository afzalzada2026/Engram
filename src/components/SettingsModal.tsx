import { useState } from 'react';
import { Activity, EyeOff, Gauge, HeartHandshake, Info, Lock, RotateCcw, ShieldCheck, X } from 'lucide-react';
import {
  DATA_SAFETY,
  DISCLAIMER,
  PHOTO_NOTE,
  PRIVACY,
  type Settings,
} from '../lib/wellbeing';

type Tab = 'training' | 'access' | 'privacy' | 'about';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  span: number;
  spanTrend: number;
  onClose: () => void;
  onReset: () => void;
}

function Toggle({
  on,
  onClick,
  label,
  sub,
  icon: Icon,
  tint,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  icon: typeof EyeOff;
  tint: string;
}) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors active:scale-[0.99]"
      style={{
        borderColor: on ? `${tint}66` : 'rgba(255,255,255,0.09)',
        background: on ? `${tint}12` : 'rgba(255,255,255,0.03)',
      }}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" style={{ color: on ? tint : '#8b93b8' }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold tracking-[0.16em] text-ink">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-dim">{sub}</span>
      </span>
      <span
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ background: on ? tint : 'rgba(255,255,255,0.16)' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-abyss transition-all"
          style={{ left: on ? '18px' : '2px' }}
        />
      </span>
    </button>
  );
}

export function SettingsModal({ settings, onChange, span, spanTrend, onClose, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('training');
  const [confirmReset, setConfirmReset] = useState(false);

  const TABS: { id: Tab; label: string; icon: typeof Info }[] = [
    { id: 'training', label: 'TRAINING', icon: Activity },
    { id: 'access', label: 'COMFORT', icon: EyeOff },
    { id: 'privacy', label: 'PRIVACY', icon: ShieldCheck },
    { id: 'about', label: 'ABOUT', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-abyss/85 p-4 backdrop-blur-md">
      <div className="glass scroller fade-up max-h-[92svh] w-[min(94vw,500px)] overflow-y-auto rounded-3xl p-5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-[0.16em] text-ink">SETTINGS</h2>
            <p className="text-[10px] tracking-wider text-dim">Train well, and stay comfortable doing it</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-dim transition-colors hover:text-ink active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-[9px] font-bold tracking-[0.14em] transition-colors ${
                tab === id ? 'bg-vio/20 text-ink' : 'text-dim hover:text-ink'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'training' && (
          <div className="fade-up mt-4 flex flex-col gap-2.5">
            {/* span — the honest metric */}
            <div className="rounded-2xl border border-cyanx/30 bg-cyanx/[0.07] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.24em] text-cyanx">VISUAL-SPATIAL SPAN</span>
                <span className="font-display text-2xl font-extrabold tabular-nums text-ink">{span || '—'}</span>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-dim">
                The largest pattern you recalled with zero errors, over your recent rounds. This is the number worth
                watching — not your score.
              </p>
              {span > 0 && (
                <div className="mt-2 text-[10px] font-bold tracking-widest" style={{ color: spanTrend > 0 ? '#36f5c5' : spanTrend < 0 ? '#fb4d6d' : '#8b93b8' }}>
                  {spanTrend > 0 ? `▲ +${spanTrend} vs. your earlier rounds` : spanTrend < 0 ? `▼ ${spanTrend} vs. your earlier rounds` : 'Holding steady'}
                </div>
              )}
            </div>

            <Toggle
              on={settings.adaptive}
              onClick={() => onChange({ adaptive: !settings.adaptive })}
              icon={Gauge}
              tint="#a78bfa"
              label="ADAPTIVE DIFFICULTY"
              sub="Pattern size follows your recall — grows when perfect, eases after a miss. Recommended for genuine training."
            />

            <Toggle
              on={settings.coach}
              onClick={() => onChange({ coach: !settings.coach })}
              icon={HeartHandshake}
              tint="#36f5c5"
              label="TRAINING COACH"
              sub="Gentle prompts to rest, space your sessions, and stop before fatigue sets in."
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold tracking-[0.24em] text-ink">SESSION LENGTH</div>
              <p className="mt-1 text-[10px] leading-relaxed text-dim">
                Working memory tires fast. Shorter, spaced sessions train better than one long grind.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((m) => (
                  <button
                    key={m}
                    onClick={() => onChange({ sessionMinutes: m })}
                    className={`rounded-xl border py-2 font-display text-xs font-bold tabular-nums transition-colors ${
                      settings.sessionMinutes === m
                        ? 'border-mint/60 bg-mint/15 text-mint'
                        : 'border-white/10 bg-white/[0.03] text-dim hover:text-ink'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'access' && (
          <div className="fade-up mt-4 flex flex-col gap-2.5">
            <Toggle
              on={settings.calm}
              onClick={() => onChange({ calm: !settings.calm })}
              icon={EyeOff}
              tint="#22d3ee"
              label="CALM MODE"
              sub="No flashing, no shake, no particles. Recommended if you are photosensitive, prone to migraine, or on an older phone."
            />
            <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-4">
              <div className="text-[10px] font-bold tracking-[0.24em] text-gold">PHOTOSENSITIVITY</div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-dim">{PHOTO_NOTE}</p>
            </div>
            <p className="text-center text-[10px] leading-relaxed text-dim">
              Calm Mode also improves frame rate on low-end devices, since it disables blurred compositing layers and
              the particle canvas.
            </p>
          </div>
        )}

        {tab === 'privacy' && (
          <div className="fade-up mt-4 flex flex-col gap-2.5">
            <div className="rounded-2xl border border-mint/30 bg-mint/[0.07] p-4">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-mint" />
                <span className="text-[10px] font-bold tracking-[0.24em] text-mint">LOCAL FIRST, CLOUD OPTIONAL</span>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {PRIVACY.map((p) => (
                  <li key={p} className="text-[10.5px] leading-relaxed text-dim">
                    · {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold tracking-[0.24em] text-ink">DATA SUMMARY</div>
              <dl className="mt-2.5 flex flex-col gap-1.5">
                {DATA_SAFETY.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[10px] tracking-wide text-dim">{k}</dt>
                    <dd className="text-right text-[10px] font-bold tracking-wide text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <button
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                onReset();
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 font-display text-xs font-bold tracking-widest text-rose transition-colors hover:bg-rose/20 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              {confirmReset ? 'TAP AGAIN TO ERASE EVERYTHING' : 'RESET ALL LOCAL DATA'}
            </button>
            <div className="flex items-center justify-center gap-4 text-[9px] font-bold tracking-widest text-dim">
              <a href="./privacy.html" target="_blank" rel="noreferrer" className="transition-colors hover:text-mint">
                PRIVACY POLICY
              </a>
              <a href="./delete-account.html" target="_blank" rel="noreferrer" className="transition-colors hover:text-rose">
                ACCOUNT DELETION
              </a>
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div className="fade-up mt-4 flex flex-col gap-2.5">
            <div className="rounded-2xl border border-vio/30 bg-vio/[0.07] p-4">
              <div className="text-[10px] font-bold tracking-[0.24em] text-vio">WHAT THIS GAME IS</div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {DISCLAIMER.map((d) => (
                  <li key={d} className="text-[10.5px] leading-relaxed text-dim">
                    · {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-bold tracking-[0.24em] text-ink">HOW TO ACTUALLY IMPROVE</div>
              <ul className="mt-2 flex flex-col gap-1.5 text-[10.5px] leading-relaxed text-dim">
                <li>· Recall, don't re-watch. The effort of retrieving is the whole mechanism.</li>
                <li>· Two short sessions beat one long one. Spacing beats cramming.</li>
                <li>· Sleep on it. Patterns learned today consolidate overnight.</li>
                <li>· Chase span, not score. Span reflects real capacity.</li>
                <li>· Move your body and sleep well — no game outperforms either.</li>
              </ul>
            </div>
            <p className="text-center text-[9px] tracking-widest text-dim">ENGRAM v1.0</p>
          </div>
        )}
      </div>
    </div>
  );
}

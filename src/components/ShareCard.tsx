import { useMemo, useState } from 'react';
import { Check, Copy, Link2, Send, Share2, Swords, X } from 'lucide-react';
import { buildShareText, nativeShare, shareTargets, type ShareInput } from '../lib/duel';

interface Props extends ShareInput {
  onClose: () => void;
}

export function ShareCard({ onClose, ...input }: Props) {
  const text = useMemo(() => buildShareText(input), [input]);
  const targets = useMemo(() => shareTargets(text, input.url), [text, input.url]);
  const [copied, setCopied] = useState<'text' | 'link' | null>(null);

  const copy = async (what: 'text' | 'link') => {
    const payload = what === 'text' ? text : input.url;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = payload;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      ta.remove();
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="fixed inset-0 z-[96] grid place-items-center overflow-y-auto bg-abyss/85 p-4 backdrop-blur-md">
      <div className="glass scroller fade-up max-h-[92svh] w-[min(94vw,460px)] overflow-y-auto rounded-3xl p-5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-mag/40 bg-mag/10">
              <Swords className="h-5 w-5 text-mag" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-[0.16em] text-ink">CHALLENGE A FRIEND</h2>
              <p className="text-[10px] tracking-wider text-dim">They get your exact grids. No luck, pure recall.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-dim transition-colors hover:text-ink active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <pre className="scroller mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-abyss/70 p-4 text-center font-body text-[12px] leading-relaxed text-ink">
          {text}
        </pre>

        <button
          onClick={async () => {
            const ok = await nativeShare(text, input.url);
            if (!ok) void copy('text');
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mag via-vio to-cyanx px-4 py-3.5 font-display text-sm font-bold tracking-widest text-abyss transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Share2 className="h-4 w-4" /> SEND CHALLENGE
        </button>

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => copy('text')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 font-display text-[11px] font-bold tracking-widest text-ink transition-colors hover:bg-white/10 active:scale-95"
          >
            {copied === 'text' ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />}
            {copied === 'text' ? 'COPIED' : 'COPY RECAP'}
          </button>
          <button
            onClick={() => copy('link')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 font-display text-[11px] font-bold tracking-widest text-ink transition-colors hover:bg-white/10 active:scale-95"
          >
            {copied === 'link' ? <Check className="h-4 w-4 text-mint" /> : <Link2 className="h-4 w-4" />}
            {copied === 'link' ? 'COPIED' : 'COPY LINK'}
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-bold tracking-[0.28em] text-dim">
            <Send className="h-3 w-3" /> OR POST IT
          </div>
          <div className="grid grid-cols-5 gap-2">
            {targets.map((t) => (
              <a
                key={t.id}
                href={t.href}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-1 py-2.5 transition-all hover:bg-white/10 active:scale-95"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                <span className="text-[8.5px] font-bold tracking-wider text-dim">{t.label}</span>
              </a>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-dim">
          Your friend plays the identical pattern sequence — whoever recalls more wins.
        </p>
      </div>
    </div>
  );
}

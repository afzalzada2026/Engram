import { useMemo, useRef, useState } from 'react';
import { Check, Cloud, Copy, Download, Upload, X } from 'lucide-react';
import { decodeSave, downloadBundle, encodeSave, mergeSave, type SaveBundle } from '../lib/saveData';

interface Props {
  bundle: SaveBundle;
  onApply: (merged: SaveBundle) => void;
  onClose: () => void;
}

type Status = { kind: 'ok' | 'err'; msg: string } | null;

export function SyncModal({ bundle, onApply, onClose }: Props) {
  const code = useMemo(() => encodeSave(bundle), [bundle]);
  const [paste, setPaste] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const applyRaw = (raw: string) => {
    const incoming = decodeSave(raw);
    if (!incoming) {
      setStatus({ kind: 'err', msg: 'That code could not be read. Check you copied all of it.' });
      return;
    }
    const merged = mergeSave(bundle, incoming);
    onApply(merged);
    setStatus({
      kind: 'ok',
      msg: `Merged — level ${Math.max(1, incoming.meta.bestLevel)} best, ${merged.scores.length} scores kept.`,
    });
    setPaste('');
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => applyRaw(String(reader.result ?? ''));
    reader.onerror = () => setStatus({ kind: 'err', msg: 'Could not read that file.' });
    reader.readAsText(f);
  };

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center overflow-y-auto bg-abyss/85 p-4 backdrop-blur-md">
      <div className="glass scroller fade-up max-h-[92svh] w-[min(94vw,470px)] overflow-y-auto rounded-3xl p-5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyanx/40 bg-cyanx/10">
              <Cloud className="h-5 w-5 text-cyanx" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-[0.16em] text-ink">CARRY YOUR MIND</h2>
              <p className="text-[10px] tracking-wider text-dim">Move progress between devices</p>
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

        {/* export */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[10px] font-bold tracking-[0.24em] text-mint">1 · EXPORT FROM THIS DEVICE</div>
          <textarea
            readOnly
            value={code}
            onFocus={(e) => e.currentTarget.select()}
            rows={3}
            className="scroller mt-2.5 w-full resize-none break-all rounded-xl border border-white/10 bg-abyss/70 p-3 font-mono text-[10px] leading-relaxed text-dim outline-none focus:border-mint/50"
          />
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={copy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint to-cyanx px-3 py-2.5 font-display text-xs font-bold tracking-widest text-abyss transition-transform hover:scale-[1.02] active:scale-95"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'COPIED' : 'COPY CODE'}
            </button>
            <button
              onClick={() => downloadBundle(bundle)}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 font-display text-xs font-bold tracking-widest text-ink transition-colors hover:bg-white/10 active:scale-95"
            >
              <Download className="h-4 w-4" /> FILE
            </button>
          </div>
        </div>

        {/* import */}
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[10px] font-bold tracking-[0.24em] text-vio">2 · IMPORT ON THE OTHER DEVICE</div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste an ENGRAM1:… code here"
            rows={3}
            className="scroller mt-2.5 w-full resize-none break-all rounded-xl border border-white/10 bg-abyss/70 p-3 font-mono text-[10px] leading-relaxed text-ink outline-none placeholder:text-dim/50 focus:border-vio/50"
          />
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() => applyRaw(paste)}
              disabled={!paste.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-vio to-cyanx px-3 py-2.5 font-display text-xs font-bold tracking-widest text-abyss transition-transform enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> MERGE PROGRESS
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 font-display text-xs font-bold tracking-widest text-ink transition-colors hover:bg-white/10 active:scale-95"
            >
              <Upload className="h-4 w-4" /> FILE
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json,text/plain"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        </div>

        {status && (
          <div
            className={`pop-in mt-3 rounded-xl border px-3 py-2.5 text-[11px] font-semibold tracking-wide ${
              status.kind === 'ok' ? 'border-mint/40 bg-mint/10 text-mint' : 'border-rose/40 bg-rose/10 text-rose'
            }`}
          >
            {status.msg}
          </div>
        )}

        <p className="mt-4 text-center text-[10px] leading-relaxed text-dim">
          Merging never deletes: it keeps the highest XP, streak and best level, and unions both leaderboards.
        </p>
      </div>
    </div>
  );
}

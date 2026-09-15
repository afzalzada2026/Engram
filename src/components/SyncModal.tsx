import { useMemo, useRef, useState } from 'react';
import { Check, Cloud, CloudOff, Copy, Download, LogOut, RefreshCw, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { decodeSave, downloadBundle, encodeSave, mergeSave, type SaveBundle } from '../lib/saveData';
import type { FirebaseSync } from '../hooks/useFirebaseSync';

interface Props {
  bundle: SaveBundle;
  cloud: FirebaseSync;
  onApply: (merged: SaveBundle) => void;
  onClose: () => void;
}

type Status = { kind: 'ok' | 'err'; msg: string } | null;

export function SyncModal({ bundle, cloud, onApply, onClose }: Props) {
  const code = useMemo(() => encodeSave(bundle), [bundle]);
  const [paste, setPaste] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

        {/* Firebase account sync is optional; local play never depends on it. */}
        <div className="mt-5 rounded-2xl border border-cyanx/30 bg-cyanx/[0.06] p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.24em] text-cyanx">
            <ShieldCheck className="h-3.5 w-3.5" /> PRIVATE CLOUD SYNC
          </div>

          {!cloud.configured ? (
            <div className="mt-3 flex items-start gap-3">
              <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-dim" />
              <div>
                <div className="text-xs font-bold tracking-wide text-ink">Not configured in this build</div>
                <p className="mt-1 text-[10px] leading-relaxed text-dim">
                  Manual codes work now. Add the Firebase values from <code className="text-cyanx">.env.example</code> before publishing to enable account sync.
                </p>
              </div>
            </div>
          ) : !cloud.user ? (
            <div className="mt-3">
              <p className="text-[10.5px] leading-relaxed text-dim">
                Sign in with Google to merge this device into one private Firebase save. Local play remains available without an account.
              </p>
              <button
                onClick={() => void cloud.connect()}
                disabled={cloud.status === 'connecting'}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyanx to-vio px-4 py-3 font-display text-xs font-bold tracking-widest text-abyss transition-transform enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:opacity-60"
              >
                {cloud.status === 'connecting' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span className="font-body text-base font-bold">G</span>}
                {cloud.status === 'connecting' ? 'CONNECTING' : 'CONTINUE WITH GOOGLE'}
              </button>
              {cloud.detail && cloud.status === 'error' && (
                <p className="mt-2 rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-[10px] leading-relaxed text-rose">{cloud.detail}</p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                {cloud.user.photoURL ? (
                  <img src={cloud.user.photoURL} alt="" className="h-10 w-10 rounded-xl border border-white/15 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-vio/40 bg-vio/15 font-display text-sm font-bold text-vio">
                    {cloud.user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold tracking-wide text-ink">{cloud.user.displayName}</div>
                  <div className="truncate text-[9.5px] text-dim">{cloud.user.email}</div>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    cloud.status === 'synced'
                      ? 'bg-mint shadow-[0_0_8px_rgba(54,245,197,0.8)]'
                      : cloud.status === 'error'
                        ? 'bg-rose'
                        : cloud.status === 'offline'
                          ? 'bg-gold'
                          : 'dot-pulse bg-cyanx'
                  }`}
                  aria-label={cloud.status}
                />
              </div>

              <p className={`mt-3 text-[10px] leading-relaxed ${cloud.status === 'error' ? 'text-rose' : 'text-dim'}`}>
                {cloud.detail}
                {cloud.lastSyncedAt && cloud.status === 'synced'
                  ? ` Last synced ${new Date(cloud.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                  : ''}
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void cloud.syncNow(true)}
                  disabled={cloud.status === 'syncing' || cloud.status === 'connecting'}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-mint/35 bg-mint/10 px-3 py-2.5 font-display text-[10px] font-bold tracking-widest text-mint transition-colors enabled:hover:bg-mint/15 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cloud.status === 'syncing' ? 'animate-spin' : ''}`} />
                  SYNC NOW
                </button>
                <button
                  onClick={() => void cloud.disconnect()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 font-display text-[10px] font-bold tracking-widest text-dim transition-colors hover:text-ink active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" /> SIGN OUT
                </button>
              </div>

              <button
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  void cloud.deleteCloudAccount();
                  setConfirmDelete(false);
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[9px] font-bold tracking-widest text-dim/70 transition-colors hover:bg-rose/10 hover:text-rose"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete ? 'TAP AGAIN: VERIFY AND DELETE CLOUD ACCOUNT' : 'DELETE CLOUD ACCOUNT'}
              </button>
            </div>
          )}
        </div>

        {/* export */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[10px] font-bold tracking-[0.24em] text-mint">MANUAL BACKUP · EXPORT</div>
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
          <div className="text-[10px] font-bold tracking-[0.24em] text-vio">MANUAL BACKUP · IMPORT</div>
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

import { Home, Pause, Play, RotateCcw } from 'lucide-react';

export function PauseOverlay({
  onResume,
  onRestart,
  onMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-abyss/70 px-4 backdrop-blur-md">
      <div className="glass fade-up w-[min(92vw,340px)] rounded-3xl p-6 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-vio/40 bg-vio/10">
          <Pause className="h-5 w-5 text-vio" fill="currentColor" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-[0.28em] text-ink">PAUSED</h2>
        <p className="mt-1 text-xs text-dim">Your grid is frozen mid-thought.</p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="group flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-cyanx to-vio px-4 py-3 font-display text-sm font-bold tracking-widest text-abyss transition-transform duration-150 hover:scale-[1.02] active:scale-95"
          >
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4" fill="currentColor" /> RESUME
            </span>
            <span className="kbd !border-black/30 !bg-black/15 !text-abyss">P</span>
          </button>
          <button
            onClick={onRestart}
            className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-display text-sm font-bold tracking-widest text-ink transition-all duration-150 hover:bg-white/10 active:scale-95"
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> RESTART
            </span>
            <span className="kbd">R</span>
          </button>
          <button
            onClick={onMenu}
            className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-display text-sm font-bold tracking-widest text-ink transition-all duration-150 hover:bg-white/10 active:scale-95"
          >
            <span className="flex items-center gap-2">
              <Home className="h-4 w-4" /> MAIN MENU
            </span>
            <span className="kbd">M</span>
          </button>
        </div>
      </div>
    </div>
  );
}

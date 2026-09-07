import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Phase } from '../hooks/useMemoryGame';
import { revealDuration } from '../lib/levels';

type TileState = 'idle' | 'lit' | 'found' | 'missed' | 'miss';

interface GridProps {
  size: number;
  pattern: number[];
  found: number[];
  missed: number[];
  phase: Phase;
  paused: boolean;
  cursor: number;
  usingKeyboard: boolean;
  flashScale: number;
  registerTile: (i: number, el: HTMLElement | null) => void;
  onPick: (i: number) => void;
}

export function Grid({ size, pattern, found, missed, phase, paused, cursor, usingKeyboard, flashScale, registerTile, onPick }: GridProps) {
  const foundSet = useMemo(() => new Set(found), [found]);
  const missedSet = useMemo(() => new Set(missed), [missed]);
  const patternSet = useMemo(() => new Set(pattern), [pattern]);
  const flashDur = revealDuration(Math.max(pattern.length, 3), flashScale);
  const cells = size * size;

  return (
    <div
      role="grid"
      aria-label={`${size} by ${size} memory grid`}
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: 'clamp(6px, 1.5vmin, 12px)' }}
    >
      {Array.from({ length: cells }, (_, i) => {
        let st: TileState = 'idle';
        if (phase === 'memorize' && patternSet.has(i)) st = 'lit';
        else if (foundSet.has(i)) st = 'found';
        else if (missedSet.has(i)) st = 'missed';
        else if ((phase === 'revealmiss' || phase === 'gameover') && patternSet.has(i)) st = 'miss';

        const interactive = phase === 'recall' && !paused && st === 'idle';
        const kb = usingKeyboard && phase === 'recall' && !paused && cursor === i;
        const row = Math.floor(i / size) + 1;
        const col = (i % size) + 1;

        return (
          <div key={i} className="tile-wrap" style={{ animationDelay: `${i * 16}ms` }}>
            <button
              ref={(el) => registerTile(i, el)}
              tabIndex={-1}
              disabled={!(phase === 'recall' && !paused)}
              data-state={st}
              className={`tile ${interactive ? 'on' : ''} ${kb ? 'kb' : ''}`}
              style={
                {
                  '--d': `${pattern.indexOf(i) * 55}ms`,
                  '--fd': `${flashDur}ms`,
                } as CSSProperties
              }
              onPointerDown={(e) => {
                e.preventDefault();
                onPick(i);
              }}
              aria-label={`Cell ${row}, ${col}${st === 'found' ? ', found' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
}

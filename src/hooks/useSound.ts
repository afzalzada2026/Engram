import { useCallback, useEffect, useRef, useState } from 'react';

const AC: typeof AudioContext | undefined =
  typeof window !== 'undefined' ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;

interface ToneOpts {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  delay?: number;
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0];

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('synapse-muted') === '1';
    } catch {
      return false;
    }
  });
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
    try {
      localStorage.setItem('synapse-muted', muted ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [muted]);

  const ensure = useCallback(() => {
    if (!AC) return;
    if (!ctxRef.current) {
      ctxRef.current = new AC();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = 0.9;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
  }, []);

  const tone = useCallback(
    ({ freq, dur = 0.12, type = 'sine', vol = 0.16, slideTo, delay = 0 }: ToneOpts) => {
      if (mutedRef.current) return;
      ensure();
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (!ctx || !master) return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    [ensure]
  );

  const click = useCallback(() => tone({ freq: 640, dur: 0.045, type: 'square', vol: 0.05 }), [tone]);

  const start = useCallback(() => {
    tone({ freq: 240, dur: 0.22, type: 'sine', vol: 0.12, slideTo: 880 });
    tone({ freq: 480, dur: 0.18, type: 'triangle', vol: 0.08, slideTo: 960, delay: 0.05 });
  }, [tone]);

  const reveal = useCallback(() => {
    tone({ freq: 880, dur: 0.07, type: 'sine', vol: 0.1 });
    tone({ freq: 1174.66, dur: 0.09, type: 'sine', vol: 0.08, delay: 0.09 });
  }, [tone]);

  const cue = useCallback(() => tone({ freq: 587.33, dur: 0.08, type: 'triangle', vol: 0.09 }), [tone]);

  const correct = useCallback(
    (combo: number) => {
      const idx = (combo - 1) % 5;
      const octave = 1 + Math.floor((combo - 1) / 5) * 0.5;
      const f = PENTA[idx] * octave;
      tone({ freq: f, dur: 0.14, type: 'sine', vol: 0.16 });
      tone({ freq: f * 1.5, dur: 0.1, type: 'triangle', vol: 0.06, delay: 0.02 });
    },
    [tone]
  );

  const wrong = useCallback(() => {
    tone({ freq: 150, dur: 0.26, type: 'sawtooth', vol: 0.16, slideTo: 62 });
    tone({ freq: 74, dur: 0.3, type: 'square', vol: 0.09, slideTo: 45, delay: 0.02 });
  }, [tone]);

  const clear = useCallback(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.12, delay: i * 0.075 })
    );
  }, [tone]);

  const impact = useCallback(() => {
    tone({ freq: 110, dur: 0.34, type: 'sine', vol: 0.22, slideTo: 38 });
    tone({ freq: 220, dur: 0.2, type: 'sawtooth', vol: 0.07, slideTo: 60 });
  }, [tone]);

  const over = useCallback(() => {
    [392, 329.63, 261.63, 196].forEach((f, i) =>
      tone({ freq: f, dur: 0.24, type: 'triangle', vol: 0.11, delay: i * 0.14 })
    );
  }, [tone]);

  const bonus = useCallback(() => {
    tone({ freq: 1318.5, dur: 0.18, type: 'sine', vol: 0.14 });
    tone({ freq: 1760, dur: 0.22, type: 'sine', vol: 0.1, delay: 0.08 });
  }, [tone]);

  const timeout = useCallback(() => {
    tone({ freq: 233.08, dur: 0.12, type: 'sine', vol: 0.09 });
    tone({ freq: 196, dur: 0.18, type: 'sine', vol: 0.09, delay: 0.12 });
  }, [tone]);

  const feverStart = useCallback(() => {
    [659.25, 830.61, 987.77, 1318.51].forEach((f, i) =>
      tone({ freq: f, dur: 0.1, type: 'triangle', vol: 0.11, delay: i * 0.05 })
    );
    tone({ freq: 1567.98, dur: 0.28, type: 'sine', vol: 0.09, delay: 0.22 });
  }, [tone]);

  const feverEnd = useCallback(() => {
    tone({ freq: 440, dur: 0.1, type: 'sine', vol: 0.08 });
    tone({ freq: 329.63, dur: 0.16, type: 'sine', vol: 0.07, delay: 0.09 });
  }, [tone]);

  const perfect = useCallback(() => {
    [1046.5, 1318.51, 1567.98].forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'sine', vol: 0.1, delay: i * 0.06 }));
  }, [tone]);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (!next) {
        // about to unmute: give instant feedback
        setTimeout(() => click(), 30);
      }
      return next;
    });
  }, [click]);

  return { muted, toggleMuted, ensure, click, start, reveal, cue, correct, wrong, clear, impact, over, bonus, timeout, feverStart, feverEnd, perfect };
}

export type Sound = ReturnType<typeof useSound>;

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface ParticleFXHandle {
  burst: (x: number, y: number, color: string, count?: number, power?: number) => void;
  confetti: (x: number, y: number) => void;
  ring: (x: number, y: number, color?: string) => void;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  r: number;
  color: string;
  drag: number;
  grav: number;
  ring: boolean;
}

interface Amb {
  x: number;
  y: number;
  r: number;
  sp: number;
  tw: number;
  ph: number;
  color: string;
  alpha: number;
}

const CONFETTI = ['#36f5c5', '#a78bfa', '#f472b6', '#22d3ee', '#fbbf24'];
const AMBIENT = ['#22d3ee', '#a78bfa', '#f472b6', '#36f5c5'];
const MAX_PARTICLES = 380;

const ParticleFX = forwardRef<ParticleFXHandle>(function ParticleFX(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<P[]>([]);
  const ambient = useRef<Amb[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });

  useImperativeHandle(
    ref,
    () => ({
      burst(x, y, color, count = 14, power = 3.2) {
        const ps = particles.current;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = (0.3 + Math.random()) * power;
          ps.push({
            x,
            y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - power * 0.25,
            life: 0,
            ttl: 0.5 + Math.random() * 0.5,
            r: 1.5 + Math.random() * 2.5,
            color,
            drag: 0.94,
            grav: 0.055,
            ring: false,
          });
        }
      },
      confetti(x, y) {
        const ps = particles.current;
        for (let i = 0; i < 46; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35;
          const sp = 1.6 + Math.random() * 4.4;
          ps.push({
            x,
            y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 0,
            ttl: 0.9 + Math.random() * 0.9,
            r: 2 + Math.random() * 3,
            color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
            drag: 0.982,
            grav: 0.11,
            ring: false,
          });
        }
      },
      ring(x, y, color = 'rgba(54,245,197,0.9)') {
        const ps = particles.current;
        ps.push({ x, y, vx: 0, vy: 0, life: 0, ttl: 0.55, r: 10, color, drag: 1, grav: 0, ring: true });
      },
    }),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // seed ambient dust
      const amb: Amb[] = [];
      for (let i = 0; i < 30; i++) {
        amb.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1 + Math.random() * 2.2,
          sp: 8 + Math.random() * 16,
          tw: 0.6 + Math.random() * 1.4,
          ph: Math.random() * Math.PI * 2,
          color: AMBIENT[Math.floor(Math.random() * AMBIENT.length)],
          alpha: 0.1 + Math.random() * 0.22,
        });
      }
      ambient.current = amb;
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      // ambient dust
      for (const a of ambient.current) {
        a.y -= a.sp * dt;
        a.x += Math.sin(now / 1500 + a.ph) * 6 * dt;
        if (a.y < -12) {
          a.y = h + 12;
          a.x = Math.random() * w;
        }
        ctx.globalAlpha = a.alpha * (0.55 + 0.45 * Math.sin(now / 900 + a.ph * 4));
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // burst particles
      const ps = particles.current;
      if (ps.length > MAX_PARTICLES) ps.splice(0, ps.length - MAX_PARTICLES);
      const frame = Math.max(dt * 60, 0.25);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          ps.splice(i, 1);
          continue;
        }
        const t = p.life / p.ttl;
        if (p.ring) {
          p.r += 420 * dt;
          ctx.globalAlpha = (1 - t) * 0.7;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4 * (1 - t) + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }
        const dragF = Math.pow(p.drag, frame);
        p.vx *= dragF;
        p.vy = p.vy * dragF + p.grav * frame;
        p.x += p.vx * frame;
        p.y += p.vy * frame;
        ctx.globalAlpha = (1 - t) * 0.25;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1 - t;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-40" aria-hidden="true" />;
});

export default ParticleFX;

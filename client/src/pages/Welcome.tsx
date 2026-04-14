import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';

// ─── Confetti System (GitHub-style) ─────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
  wobbleAmplitude: number;
  gravity: number;
  drag: number;
}

const COLORS = [
  '#6366f1', '#818cf8', '#a78bfa', '#8b5cf6',
  '#22c55e', '#4ade80', '#f59e0b', '#fbbf24',
  '#ef4444', '#f87171', '#06b6d4', '#22d3ee',
  '#ec4899', '#f472b6', '#14b8a6', '#3b82f6',
  '#a855f7', '#e879f9', '#f97316', '#fb923c',
];

function createBurstParticle(canvasWidth: number, originX: number, originY: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const velocity = Math.random() * 8 + 4;
  const isStrip = Math.random() > 0.4;

  return {
    x: originX + (Math.random() - 0.5) * 60,
    y: originY + (Math.random() - 0.5) * 30,
    vx: Math.cos(angle) * velocity * (0.5 + Math.random()),
    vy: Math.sin(angle) * velocity * -1.2 - Math.random() * 3,
    width: isStrip ? Math.random() * 4 + 2 : Math.random() * 8 + 4,
    height: isStrip ? Math.random() * 12 + 6 : Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 15,
    opacity: 1,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.1 + 0.03,
    wobbleAmplitude: Math.random() * 2 + 1,
    gravity: 0.12 + Math.random() * 0.08,
    drag: 0.98 + Math.random() * 0.015,
  };
}

function createFallingParticle(canvasWidth: number): Particle {
  const isStrip = Math.random() > 0.3;
  return {
    x: Math.random() * canvasWidth,
    y: -20 - Math.random() * 80,
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 2 + 1.5,
    width: isStrip ? Math.random() * 3 + 1.5 : Math.random() * 7 + 3,
    height: isStrip ? Math.random() * 10 + 5 : Math.random() * 7 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.08 + 0.02,
    wobbleAmplitude: Math.random() * 3 + 1.5,
    gravity: 0.04 + Math.random() * 0.03,
    drag: 0.995,
  };
}

// ─── Component ──────────────────────────────────────────────
export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const burstCountRef = useRef(0);

  const [phase, setPhase] = useState(-1);

  // Phase timers — staggered reveal like GitHub
  useEffect(() => {
    // Clear the registration flag so future visits go to dashboard
    sessionStorage.removeItem('genx_just_registered');

    const t0 = setTimeout(() => setPhase(0), 100);
    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2400);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Enter key to continue
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && phase >= 3) navigate('/dashboard');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, navigate]);

  // Confetti canvas animation
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Burst waves: 3 big bursts in the first 2 seconds
    if (elapsed < 2000 && burstCountRef.current < 3) {
      const burstInterval = 600;
      const expectedBursts = Math.floor(elapsed / burstInterval) + 1;
      while (burstCountRef.current < expectedBursts && burstCountRef.current < 3) {
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.35;
        for (let i = 0; i < 80; i++) {
          particlesRef.current.push(createBurstParticle(canvas.width, cx, cy));
        }
        burstCountRef.current++;
      }
    }

    // Continuous gentle rain for 6 seconds
    if (elapsed < 6000 && particlesRef.current.length < 600) {
      const rate = elapsed < 2000 ? 5 : elapsed < 4000 ? 3 : 1;
      for (let i = 0; i < rate; i++) {
        particlesRef.current.push(createFallingParticle(canvas.width));
      }
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p) => {
      p.wobble += p.wobbleSpeed;
      p.vx += Math.sin(p.wobble) * p.wobbleAmplitude * 0.01;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Fade when near bottom or after 7s
      if (p.y > canvas.height - 150 || elapsed > 7000) {
        p.opacity -= 0.015;
      }

      if (p.opacity <= 0 || p.y > canvas.height + 50) return false;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      // Rounded confetti strip / square
      const hw = p.width / 2;
      const hh = p.height / 2;
      const r = Math.min(hw, hh, 2);
      ctx.beginPath();
      ctx.moveTo(-hw + r, -hh);
      ctx.lineTo(hw - r, -hh);
      ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
      ctx.lineTo(hw, hh - r);
      ctx.quadraticCurveTo(hw, hh, hw - r, hh);
      ctx.lineTo(-hw + r, hh);
      ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
      ctx.lineTo(-hw, -hh + r);
      ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      return true;
    });

    // Keep animating until all particles are gone
    if (particlesRef.current.length > 0 || elapsed < 6000) {
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    startTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate]);

  return (
    <div className="fixed inset-0 bg-[var(--color-surface)] flex items-center justify-center z-50 overflow-hidden">
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 2 }}
      />

      {/* Glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(500px,90vw)] h-[500px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[min(300px,60vw)] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Logo */}
        <div
          className={`inline-flex items-center justify-center mb-8 transition-all duration-700 ease-out ${
            phase >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <Logo size="lg" className="w-20 h-20 drop-shadow-[0_0_24px_rgba(99,102,241,0.4)]" />
        </div>

        {/* Welcome text */}
        <div className="overflow-hidden mb-3">
          <h1
            className={`text-4xl sm:text-5xl font-extrabold tracking-tight transition-all duration-700 ease-out ${
              phase >= 1
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
          >
            <span className="text-[var(--color-text-primary)]">Welcome, </span>
            <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}!</span>
          </h1>
        </div>

        {/* Tagline */}
        <p
          className={`text-lg text-[var(--color-text-secondary)] mb-10 transition-all duration-700 ease-out ${
            phase >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6'
          }`}
        >
          Your account is ready. Let's start building solutions.
        </p>

        {/* CTA */}
        <div
          className={`transition-all duration-700 ease-out ${
            phase >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6'
          }`}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-3 gradient-primary text-white font-semibold px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/25 text-base group"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-xs text-[var(--color-text-muted)] mt-6">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-mono text-[10px]">Enter</kbd> or click to continue
          </p>
        </div>
      </div>
    </div>
  );
}

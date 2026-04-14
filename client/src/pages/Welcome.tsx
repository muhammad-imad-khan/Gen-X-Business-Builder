import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Zap, ArrowRight } from 'lucide-react';

// ─── Confetti Particle ──────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#818cf8',
  '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
  '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
];

function createParticle(canvasWidth: number): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: -10 - Math.random() * 40,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 6 + 3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    opacity: 1,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  };
}

// ─── Component ──────────────────────────────────────────────
export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const [phase, setPhase] = useState(0); // 0=initial, 1=name, 2=tagline, 3=cta visible

  // Phase timers
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Enter key to continue
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && phase >= 3) navigate('/dashboard');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, navigate]);

  // Confetti canvas
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Add new particles in first 3 seconds
    if (particlesRef.current.length < 200) {
      for (let i = 0; i < 4; i++) {
        particlesRef.current.push(createParticle(canvas.width));
      }
    }

    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // gravity
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;

      // Fade out when below canvas
      if (p.y > canvas.height - 100) {
        p.opacity -= 0.02;
      }

      if (p.opacity <= 0) return false;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return true;
    });

    animFrameRef.current = requestAnimationFrame(animate);
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
        style={{ zIndex: 1 }}
      />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Logo */}
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl gradient-primary mb-8 shadow-2xl shadow-indigo-500/30 transition-all duration-700 ${
            phase >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        >
          <Zap className="w-10 h-10 text-white" />
        </div>

        {/* Welcome text */}
        <div className="overflow-hidden mb-3">
          <h1
            className={`text-4xl sm:text-5xl font-extrabold tracking-tight transition-all duration-700 ${
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
          className={`text-lg text-[var(--color-text-secondary)] mb-10 transition-all duration-700 ${
            phase >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6'
          }`}
        >
          Your account is ready. Let's start building solutions.
        </p>

        {/* CTA */}
        <div
          className={`transition-all duration-700 ${
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

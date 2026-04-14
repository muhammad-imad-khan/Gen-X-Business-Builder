import { useEffect, useRef } from 'react';

interface RocketSceneProps {
  scrollProgress?: number;
  fullPage?: boolean;
  mode?: 'single' | 'dual' | 'ambient';
  launching?: boolean;
  onLaunchComplete?: () => void;
}

export default function RocketScene({
  scrollProgress = 0,
  fullPage = false,
  mode = 'single',
  launching = false,
  onLaunchComplete,
}: RocketSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(0);
  const scrollVelRef = useRef(0);
  const prevScrollRef = useRef(0);
  const launchRef = useRef(false);
  const launchTimeRef = useRef(0);
  const launchDoneRef = useRef(false);
  const onLaunchCompleteRef = useRef(onLaunchComplete);

  useEffect(() => { onLaunchCompleteRef.current = onLaunchComplete; }, [onLaunchComplete]);

  useEffect(() => {
    scrollVelRef.current = scrollProgress - prevScrollRef.current;
    prevScrollRef.current = scrollProgress;
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    if (launching && !launchRef.current) {
      launchRef.current = true;
      launchTimeRef.current = 0;
      launchDoneRef.current = false;
    }
  }, [launching]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animationId: number;
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = fullPage ? window.innerWidth : canvas.parentElement!.clientWidth;
      const h = fullPage ? window.innerHeight : canvas.parentElement!.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.width / (window.devicePixelRatio || 1);
    const H = () => canvas.height / (window.devicePixelRatio || 1);

    // Stars
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.5,
      twinkleSpeed: Math.random() * 0.03 + 0.01,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // Particles (exhaust trail)
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; size: number;
      color: string; type: 'flame' | 'smoke' | 'spark';
    }
    const particles: Particle[] = [];

    // Orbit dots
    const orbitDots = Array.from({ length: 5 }, (_, i) => ({
      angle: (i / 5) * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.005,
      radius: 100 + i * 30,
      size: 3 + Math.random() * 3,
      color: ['#6366f1', '#a78bfa', '#818cf8', '#22c55e', '#f59e0b'][i],
    }));

    // Floating icons (abstract shapes representing business concepts)
    const floatingShapes = Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      radius: 140 + Math.random() * 40,
      speed: 0.003 + Math.random() * 0.004,
      size: 8 + Math.random() * 6,
      shape: ['circle', 'diamond', 'square', 'triangle', 'hexagon', 'star'][i] as string,
      color: ['#6366f1', '#a78bfa', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'][i],
    }));

    const spawnParticles = (cx: number, cy: number, rocketBottom: number) => {
      // Flame particles
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 12,
          y: rocketBottom + Math.random() * 8,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 3 + 2,
          life: 1,
          maxLife: 1,
          size: Math.random() * 6 + 4,
          color: Math.random() > 0.5 ? '#f97316' : '#fbbf24',
          type: 'flame',
        });
      }
      // Smoke
      if (Math.random() > 0.6) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: rocketBottom + 10 + Math.random() * 10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * 1.5 + 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 12 + 8,
          color: '#6366f1',
          type: 'smoke',
        });
      }
      // Sparks
      if (Math.random() > 0.7) {
        const a = Math.random() * Math.PI;
        particles.push({
          x: cx + (Math.random() - 0.5) * 8,
          y: rocketBottom,
          vx: Math.cos(a) * (Math.random() * 3 + 1),
          vy: Math.sin(a) * (Math.random() * 2 + 1) + 1,
          life: 1,
          maxLife: 1,
          size: Math.random() * 2.5 + 1,
          color: '#fff',
          type: 'spark',
        });
      }
    };

    const drawRocket = (cx: number, cy: number, scale: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Main body
      const bodyGrad = ctx.createLinearGradient(-14, -35, 14, -35);
      bodyGrad.addColorStop(0, '#e0e7ff');
      bodyGrad.addColorStop(0.5, '#ffffff');
      bodyGrad.addColorStop(1, '#c7d2fe');

      // Nose cone
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.bezierCurveTo(-6, -48, -14, -35, -14, -10);
      ctx.lineTo(-14, 20);
      ctx.lineTo(14, 20);
      ctx.lineTo(14, -10);
      ctx.bezierCurveTo(14, -35, 6, -48, 0, -55);
      ctx.closePath();
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Nose tip accent
      const noseGrad = ctx.createLinearGradient(0, -55, 0, -35);
      noseGrad.addColorStop(0, '#6366f1');
      noseGrad.addColorStop(1, '#a78bfa');
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.bezierCurveTo(-4, -48, -8, -42, -10, -35);
      ctx.lineTo(10, -35);
      ctx.bezierCurveTo(8, -42, 4, -48, 0, -55);
      ctx.closePath();
      ctx.fillStyle = noseGrad;
      ctx.fill();

      // Window
      ctx.beginPath();
      ctx.arc(0, -18, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1b4b';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -18, 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Window shine
      ctx.beginPath();
      ctx.arc(-2, -20, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(165, 180, 252, 0.6)';
      ctx.fill();

      // Body stripe
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(-14, 5, 28, 4);

      // Left fin
      ctx.beginPath();
      ctx.moveTo(-14, 12);
      ctx.lineTo(-26, 28);
      ctx.lineTo(-20, 28);
      ctx.lineTo(-14, 20);
      ctx.closePath();
      const finGradL = ctx.createLinearGradient(-26, 12, -14, 28);
      finGradL.addColorStop(0, '#6366f1');
      finGradL.addColorStop(1, '#4f46e5');
      ctx.fillStyle = finGradL;
      ctx.fill();

      // Right fin
      ctx.beginPath();
      ctx.moveTo(14, 12);
      ctx.lineTo(26, 28);
      ctx.lineTo(20, 28);
      ctx.lineTo(14, 20);
      ctx.closePath();
      const finGradR = ctx.createLinearGradient(14, 12, 26, 28);
      finGradR.addColorStop(0, '#6366f1');
      finGradR.addColorStop(1, '#4f46e5');
      ctx.fillStyle = finGradR;
      ctx.fill();

      // Nozzle
      ctx.beginPath();
      ctx.moveTo(-8, 20);
      ctx.lineTo(-10, 26);
      ctx.lineTo(10, 26);
      ctx.lineTo(8, 20);
      ctx.closePath();
      ctx.fillStyle = '#4338ca';
      ctx.fill();

      ctx.restore();
      return cy + 26 * scale; // return nozzle bottom y
    };

    const drawShape = (x: number, y: number, shape: string, size: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      switch (shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(x, y - size / 2);
          ctx.lineTo(x + size / 2, y);
          ctx.lineTo(x, y + size / 2);
          ctx.lineTo(x - size / 2, y);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'square':
          ctx.strokeRect(x - size / 2, y - size / 2, size, size);
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(x, y - size / 2);
          ctx.lineTo(x + size / 2, y + size / 2);
          ctx.lineTo(x - size / 2, y + size / 2);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'hexagon': {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const px = x + (size / 2) * Math.cos(a);
            const py = y + (size / 2) * Math.sin(a);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case 'star': {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const r = i % 2 === 0 ? size / 2 : size / 4;
            const px = x + r * Math.cos(a);
            const py = y + r * Math.sin(a);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    };

    const drawFlame = (cx: number, nozzleY: number, scale: number, boost: number) => {
      const fm = 1 + boost * 2.5;
      const fh = (18 + Math.sin(time * 20) * 6) * fm;
      const fw = (8 + Math.sin(time * 15) * 3) * (1 + boost * 1.2);
      const fg = ctx.createRadialGradient(cx, nozzleY + fh * 0.3, 2, cx, nozzleY + fh * 0.5, fh * scale);
      fg.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      fg.addColorStop(0.2, 'rgba(251, 191, 36, 0.8)');
      fg.addColorStop(0.5, 'rgba(249, 115, 22, 0.6)');
      fg.addColorStop(0.8, 'rgba(99, 102, 241, 0.3)');
      fg.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - fw * scale * 0.5, nozzleY);
      ctx.quadraticCurveTo(cx, nozzleY + fh * scale * 1.2, cx + fw * scale * 0.5, nozzleY);
      ctx.fillStyle = fg;
      ctx.fill();
      ctx.restore();
    };

    const drawSpeedLines = (cx: number, nozzleY: number, scale: number, boost: number) => {
      const cnt = 6 + Math.floor(boost * 10);
      const spd = 80 + boost * 200;
      for (let i = 0; i < cnt; i++) {
        const spread = (30 + i * 8) * scale;
        const lx = cx + (i % 2 === 0 ? -1 : 1) * spread;
        const ly = nozzleY + 20 + ((time * spd + i * 30) % (120 + boost * 80));
        const la = Math.max(0, 1 - (ly - nozzleY - 20) / (100 + boost * 60));
        const ll = 15 + boost * 25 + Math.random() * 10;
        ctx.save();
        ctx.globalAlpha = la * (0.3 + boost * 0.4);
        ctx.strokeStyle = boost > 0.5 ? '#818cf8' : '#6366f1';
        ctx.lineWidth = 1 + boost;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + ll);
        ctx.stroke();
        ctx.restore();
      }
    };

    const animate = () => {
      const w = W();
      const h = H();
      time += 0.016;

      ctx.clearRect(0, 0, w, h);

      // Draw stars
      stars.forEach((s) => {
        const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * s.twinkleSpeed * 60 + s.twinkleOffset));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${alpha})`;
        ctx.fill();
      });

      // Launch progress
      let launchProg = 0;
      if (launchRef.current) {
        launchTimeRef.current += 0.016;
        launchProg = Math.min(1, launchTimeRef.current / 2.5);
        if (launchProg >= 1 && !launchDoneRef.current) {
          launchDoneRef.current = true;
          onLaunchCompleteRef.current?.();
        }
      }

      if (mode === 'single') {
        // --- SINGLE ROCKET (original behavior) ---
        const cx = w / 2;
        const sp = scrollRef.current;
        const vel = scrollVelRef.current;
        const scrollOffset = sp * h * 0.6;
        const baseY = h * 0.45;
        const hoverAmt = Math.sin(time * 1.5) * (10 - sp * 8);
        const rocketCy = baseY - scrollOffset + hoverAmt;
        const rScale = Math.min(w / 300, 1.2);
        const tilt = Math.max(-0.15, Math.min(0.15, vel * -8));

        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.1 * (1 - sp * 1.5));
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        [100, 130, 160].forEach((r) => {
          ctx.beginPath();
          ctx.ellipse(cx, rocketCy, r * rScale, r * rScale * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();

        orbitDots.forEach((d) => {
          d.angle += d.speed;
          const ox = cx + Math.cos(d.angle) * d.radius * rScale;
          const oy = rocketCy + Math.sin(d.angle) * d.radius * 0.3 * rScale;
          ctx.beginPath();
          ctx.arc(ox, oy, d.size * rScale * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = d.color;
          ctx.globalAlpha = 0.7;
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        floatingShapes.forEach((s) => {
          s.angle += s.speed;
          const sx = cx + Math.cos(s.angle) * s.radius * rScale;
          const sy = rocketCy + Math.sin(s.angle) * s.radius * 0.4 * rScale;
          drawShape(sx, sy, s.shape, s.size * rScale, s.color, 0.4 + 0.2 * Math.sin(time * 2));
        });

        ctx.save();
        ctx.translate(cx, rocketCy);
        ctx.rotate(tilt);
        ctx.translate(-cx, -rocketCy);
        const nozzleY = drawRocket(cx, rocketCy, rScale);
        ctx.restore();

        const boost = Math.min(1, sp * 3);
        spawnParticles(cx, rocketCy, nozzleY);
        if (boost > 0.1) {
          for (let b = 0; b < Math.floor(boost * 5); b++) spawnParticles(cx, rocketCy, nozzleY);
        }
        drawFlame(cx, nozzleY, rScale, boost);
        drawSpeedLines(cx, nozzleY, rScale, boost);
        if (boost > 0.3) {
          stars.forEach((s) => {
            ctx.save();
            ctx.globalAlpha = 0.3 * boost;
            ctx.strokeStyle = '#a5b4fc';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(s.x * w, s.y * h);
            ctx.lineTo(s.x * w, s.y * h + boost * 8);
            ctx.stroke();
            ctx.restore();
          });
        }

      } else if (mode === 'dual') {
        // --- DUAL CROSSING ROCKETS ---
        const sp = scrollRef.current;
        const vel = scrollVelRef.current;
        const hv1 = Math.sin(time * 1.5) * (8 - sp * 6);
        const hv2 = Math.sin(time * 1.5 + 1) * (8 - sp * 6);
        const ds = Math.min(w / 400, 0.95);
        const boost = Math.min(1, sp * 3);

        // Left rocket: bottom-left → upper-right
        const lx = w * 0.2 + sp * w * 0.6;
        const ly = h * 0.72 - sp * h * 0.9 + hv1;
        // Right rocket: bottom-right → upper-left
        const rx = w * 0.8 - sp * w * 0.6;
        const ry = h * 0.72 - sp * h * 0.9 + hv2;

        // Tilt toward travel direction
        const lt = 0.2 - sp * 0.05 + Math.max(-0.1, Math.min(0.1, vel * -4));
        const rt = -0.2 + sp * 0.05 + Math.max(-0.1, Math.min(0.1, vel * -4));

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(lt);
        ctx.translate(-lx, -ly);
        const lNoz = drawRocket(lx, ly, ds);
        ctx.restore();

        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(rt);
        ctx.translate(-rx, -ry);
        const rNoz = drawRocket(rx, ry, ds);
        ctx.restore();

        drawFlame(lx, lNoz, ds, boost);
        drawFlame(rx, rNoz, ds, boost);
        spawnParticles(lx, ly, lNoz);
        spawnParticles(rx, ry, rNoz);
        if (boost > 0.1) {
          for (let b = 0; b < Math.floor(boost * 3); b++) {
            spawnParticles(lx, ly, lNoz);
            spawnParticles(rx, ry, rNoz);
          }
        }
        drawSpeedLines(lx, lNoz, ds, boost * 0.7);
        drawSpeedLines(rx, rNoz, ds, boost * 0.7);
        if (boost > 0.3) {
          stars.forEach((s) => {
            ctx.save();
            ctx.globalAlpha = 0.3 * boost;
            ctx.strokeStyle = '#a5b4fc';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(s.x * w, s.y * h);
            ctx.lineTo(s.x * w, s.y * h + boost * 8);
            ctx.stroke();
            ctx.restore();
          });
        }

      } else if (mode === 'ambient') {
        // --- AMBIENT (auth pages) with launch support ---
        const lp = launchProg;
        const le = lp * lp * lp; // ease-in cubic
        const lo = le * h * 1.5; // vertical launch offset
        const lb = lp * lp;
        const as = Math.min(w / 400, 0.85);
        const hv1 = Math.sin(time * 0.8) * 15;
        const hv2 = Math.sin(time * 0.8 + Math.PI * 0.7) * 15;
        const sw1 = Math.sin(time * 0.5) * 10;
        const sw2 = Math.sin(time * 0.5 + Math.PI) * 10;

        const alx = w * 0.3 + sw1;
        const aly = h * 0.55 + hv1 - lo;
        const arx = w * 0.7 + sw2;
        const ary = h * 0.55 + hv2 - lo;
        const alt = Math.sin(time * 0.3) * 0.05;
        const art = Math.sin(time * 0.3 + Math.PI) * 0.05;

        // Flash during launch
        if (lp > 0.05 && lp < 0.4) {
          ctx.save();
          ctx.fillStyle = `rgba(99, 102, 241, ${Math.sin(lp / 0.4 * Math.PI) * 0.15})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        ctx.save();
        ctx.translate(alx, aly);
        ctx.rotate(alt);
        ctx.translate(-alx, -aly);
        const alNoz = drawRocket(alx, aly, as);
        ctx.restore();

        ctx.save();
        ctx.translate(arx, ary);
        ctx.rotate(art);
        ctx.translate(-arx, -ary);
        const arNoz = drawRocket(arx, ary, as);
        ctx.restore();

        const ab = 0.2 + lb * 3;
        drawFlame(alx, alNoz, as, ab);
        drawFlame(arx, arNoz, as, ab);
        spawnParticles(alx, aly, alNoz);
        spawnParticles(arx, ary, arNoz);
        if (lb > 0.1) {
          for (let b = 0; b < Math.floor(lb * 8); b++) {
            spawnParticles(alx, aly, alNoz);
            spawnParticles(arx, ary, arNoz);
          }
        }
        if (lp > 0.1) {
          drawSpeedLines(alx, alNoz, as, lb);
          drawSpeedLines(arx, arNoz, as, lb);
        }
        if (lp > 0.2) {
          stars.forEach((s) => {
            ctx.save();
            ctx.globalAlpha = 0.4 * lb;
            ctx.strokeStyle = '#a5b4fc';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(s.x * w, s.y * h);
            ctx.lineTo(s.x * w, s.y * h + lb * 20);
            ctx.stroke();
            ctx.restore();
          });
        }
      }

      // Shared: update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.type === 'flame' ? 0.04 : p.type === 'smoke' ? 0.015 : 0.03;
        p.size *= p.type === 'smoke' ? 1.02 : 0.97;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.life * (p.type === 'smoke' ? 0.15 : p.type === 'spark' ? 0.9 : 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }
      while (particles.length > 300) particles.shift();

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  return fullPage ? (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-hidden="true"
      />
    </div>
  ) : (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}

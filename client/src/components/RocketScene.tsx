import { useEffect, useRef } from 'react';

/**
 * Animated rocket scene with flames, smoke, particles, stars, and orbit rings.
 * Canvas-based for smooth 60fps performance.
 */
export default function RocketScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animationId: number;
    let time = 0;

    const resize = () => {
      const parent = canvas.parentElement!;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = parent.clientWidth + 'px';
      canvas.style.height = parent.clientHeight + 'px';
      ctx.scale(dpr, dpr);
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

      const cx = w / 2;
      const rocketCy = h * 0.38 + Math.sin(time * 1.5) * 10;
      const rocketScale = Math.min(w / 300, 1.2);

      // Draw orbit rings (behind rocket)
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1;
      [100, 130, 160].forEach((r) => {
        ctx.beginPath();
        ctx.ellipse(cx, rocketCy, r * rocketScale, r * rocketScale * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();

      // Draw orbiting dots
      orbitDots.forEach((d) => {
        d.angle += d.speed;
        const ox = cx + Math.cos(d.angle) * d.radius * rocketScale;
        const oy = rocketCy + Math.sin(d.angle) * d.radius * 0.3 * rocketScale;
        ctx.beginPath();
        ctx.arc(ox, oy, d.size * rocketScale * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw floating shapes
      floatingShapes.forEach((s) => {
        s.angle += s.speed;
        const sx = cx + Math.cos(s.angle) * s.radius * rocketScale;
        const sy = rocketCy + Math.sin(s.angle) * s.radius * 0.4 * rocketScale;
        drawShape(sx, sy, s.shape, s.size * rocketScale, s.color, 0.4 + 0.2 * Math.sin(time * 2));
      });

      // Draw rocket
      const nozzleY = drawRocket(cx, rocketCy, rocketScale);

      // Spawn exhaust particles
      spawnParticles(cx, rocketCy, nozzleY);

      // Draw main flame
      const flameH = 18 + Math.sin(time * 20) * 6;
      const flameW = 8 + Math.sin(time * 15) * 3;
      const flameGrad = ctx.createRadialGradient(cx, nozzleY + flameH * 0.3, 2, cx, nozzleY + flameH * 0.5, flameH * rocketScale);
      flameGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      flameGrad.addColorStop(0.2, 'rgba(251, 191, 36, 0.8)');
      flameGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.6)');
      flameGrad.addColorStop(0.8, 'rgba(99, 102, 241, 0.3)');
      flameGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - flameW * rocketScale * 0.5, nozzleY);
      ctx.quadraticCurveTo(cx, nozzleY + flameH * rocketScale * 1.2, cx + flameW * rocketScale * 0.5, nozzleY);
      ctx.fillStyle = flameGrad;
      ctx.fill();
      ctx.restore();

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.type === 'flame' ? 0.04 : p.type === 'smoke' ? 0.015 : 0.03;
        p.size *= p.type === 'smoke' ? 1.02 : 0.97;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life * (p.type === 'smoke' ? 0.15 : p.type === 'spark' ? 0.9 : 0.6);

        if (p.type === 'spark') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
        ctx.restore();
      }

      // Speed lines on sides
      const lineCount = 6;
      for (let i = 0; i < lineCount; i++) {
        const lx = cx + (i % 2 === 0 ? -1 : 1) * (30 + i * 15) * rocketScale;
        const ly = nozzleY + 20 + ((time * 80 + i * 40) % 120);
        const lAlpha = Math.max(0, 1 - (ly - nozzleY - 20) / 100);

        ctx.save();
        ctx.globalAlpha = lAlpha * 0.3;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + 15 + Math.random() * 10);
        ctx.stroke();
        ctx.restore();
      }

      // Keep particles under control
      while (particles.length > 200) particles.shift();

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}

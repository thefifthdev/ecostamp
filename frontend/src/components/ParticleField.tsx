'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  life: number; maxLife: number;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (): Particle => ({
      x:       Math.random() * canvas.width,
      y:       canvas.height + 10,
      vx:      (Math.random() - 0.5) * 0.4,
      vy:      -(Math.random() * 0.5 + 0.2),
      size:    Math.random() * 3 + 1,
      opacity: Math.random() * 0.4 + 0.1,
      life:    0,
      maxLife: Math.random() * 300 + 200,
    });

    // Seed initial particles
    for (let i = 0; i < 30; i++) {
      const p = spawn();
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    let frame = 0;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new particles slowly
      if (frame % 12 === 0 && particles.length < 60) {
        particles.push(spawn());
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x   += p.vx;
        p.y   += p.vy;
        p.life++;

        const progress = p.life / p.maxLife;
        const alpha = p.opacity * Math.sin(progress * Math.PI); // fade in/out

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw as tiny leaf/dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#a8e6b8';
        ctx.fill();

        ctx.restore();

        if (p.life >= p.maxLife || p.y < -20) {
          particles.splice(i, 1);
        }
      }

      frame++;
      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}

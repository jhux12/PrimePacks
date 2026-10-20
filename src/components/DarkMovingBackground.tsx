import React, { useEffect, useRef } from 'react';

export type BackgroundTheme = 'cosmic-nebula' | 'cyber-void' | 'golden-horizon' | 'deep-aurora';

interface DarkMovingBackgroundProps {
  theme?: BackgroundTheme;
  accentColor?: string;
  intensity?: number;
}

export const DarkMovingBackground: React.FC<DarkMovingBackgroundProps> = ({
  theme = 'cosmic-nebula',
  accentColor = '#a855f7',
  intensity = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle Stars
    const starCount = Math.min(80, Math.floor((width * height) / 12000));
    const stars: {
      x: number;
      y: number;
      size: number;
      alpha: number;
      speed: number;
      driftX: number;
      pulseSpeed: number;
      pulsePhase: number;
      hue: number;
    }[] = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.6,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.35 + 0.15,
        driftX: (Math.random() - 0.5) * 0.15,
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.6 ? 280 : Math.random() > 0.3 ? 190 : 45
      });
    }

    // Moving Aurora Orbs
    const orbs = [
      { x: width * 0.25, y: height * 0.35, vx: 0.3, vy: 0.2, r: Math.min(width, height) * 0.45, color: '#4c1d95' },
      { x: width * 0.75, y: height * 0.45, vx: -0.25, vy: -0.3, r: Math.min(width, height) * 0.5, color: '#1e1b4b' },
      { x: width * 0.5, y: height * 0.75, vx: 0.2, vy: -0.25, r: Math.min(width, height) * 0.4, color: '#0f172a' }
    ];

    let t = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      t += 0.015;

      // 1. Dark Void Base
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, width, height);

      // 2. Moving Ambient Light Orbs with soft blend
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      orbs.forEach((orb, i) => {
        orb.x += Math.sin(t * 0.5 + i) * 0.6 + orb.vx;
        orb.y += Math.cos(t * 0.4 + i) * 0.5 + orb.vy;

        // Bounce within screen edges softly
        if (orb.x < -100) orb.x = width + 100;
        if (orb.x > width + 100) orb.x = -100;
        if (orb.y < -100) orb.y = height + 100;
        if (orb.y > height + 100) orb.y = -100;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        
        let orbColor = orb.color;
        if (theme === 'golden-horizon') {
          orbColor = i === 0 ? '#78350f' : i === 1 ? '#451a03' : '#1c1917';
        } else if (theme === 'cyber-void') {
          orbColor = i === 0 ? '#0e7490' : i === 1 ? '#1e1b4b' : '#0369a1';
        } else if (theme === 'deep-aurora') {
          orbColor = i === 0 ? '#065f46' : i === 1 ? '#0c4a6e' : '#1e1b4b';
        }

        grad.addColorStop(0, `${orbColor}77`);
        grad.addColorStop(0.5, `${orbColor}33`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Dynamic center pack accent glow
      const centerGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        20,
        width * 0.5,
        height * 0.45,
        Math.min(width, height) * 0.65
      );
      centerGrad.addColorStop(0, `${accentColor}35`);
      centerGrad.addColorStop(0.5, `${accentColor}12`);
      centerGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.45, Math.min(width, height) * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 3. Moving Stardust / Floating Embers
      stars.forEach((star) => {
        star.y -= star.speed;
        star.x += star.driftX;
        star.pulsePhase += star.pulseSpeed;

        if (star.y < -10) {
          star.y = height + 10;
          star.x = Math.random() * width;
        }
        if (star.x < -10) star.x = width + 10;
        if (star.x > width + 10) star.x = -10;

        const currentAlpha = Math.max(0.1, star.alpha + Math.sin(star.pulsePhase) * 0.25) * intensity;

        ctx.save();
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);

        if (star.size > 1.8) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `hsla(${star.hue}, 80%, 70%, ${currentAlpha})`;
        }

        ctx.fillStyle = `hsla(${star.hue}, 70%, 85%, ${currentAlpha})`;
        ctx.fill();
        ctx.restore();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, accentColor, intensity]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      {/* Dynamic Animated Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Grid Lines Overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Deep Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 45%, rgba(4,6,12,0.85) 100%)'
        }}
      />
    </div>
  );
};

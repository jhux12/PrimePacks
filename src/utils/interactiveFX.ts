// Interactive particle, shockwave, and celebratory FX system
import confetti from 'canvas-confetti';

export type ParticleShape = 'diamond' | 'star' | 'circle' | 'spark';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  shape: ParticleShape;
  gravity: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

// Authentic rarity palettes for all tiers
export const RARITY_PALETTES: Record<string, string[]> = {
  Grail: ['#FFD700', '#F59E0B', '#FBBF24', '#FDE68A', '#FFFBEB', '#D97706', '#FFFFFF'],
  Legendary: ['#EC4899', '#F43F5E', '#FB7185', '#E11D48', '#C026D3', '#FDA4AF', '#FFFFFF'],
  'Secret Rare': ['#EC4899', '#F43F5E', '#FB7185', '#E11D48', '#C026D3', '#FDA4AF', '#FFFFFF'],
  Epic: ['#A855F7', '#C084FC', '#818CF8', '#9333EA', '#7C3AED', '#DDD6FE', '#FFFFFF'],
  'Ultra Rare': ['#A855F7', '#C084FC', '#818CF8', '#9333EA', '#7C3AED', '#DDD6FE', '#FFFFFF'],
  Rare: ['#06B6D4', '#22D3EE', '#38BDF8', '#0284C7', '#67E8F9', '#E0F2FE', '#FFFFFF'],
  Uncommon: ['#10B981', '#34D399', '#059669', '#6EE7B7', '#A7F3D0', '#FFFFFF'],
  Common: ['#94A3B8', '#CBD5E1', '#E2E8F0', '#64748B', '#F8FAFC', '#FFFFFF']
};

export const getRarityPalette = (rarity: string): string[] => {
  return RARITY_PALETTES[rarity] || RARITY_PALETTES.Common;
};

class InteractiveFXSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private animId: number | null = null;
  private lastTime = 0;

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.start();
  }

  public resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public destroy() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.particles = [];
    this.shockwaves = [];
  }

  // Generic burst for click/hover interactions
  public spawnBurst(
    x: number,
    y: number,
    colorScheme: 'gold' | 'neon-pink' | 'cyan' | 'purple' | 'emerald' | 'silver' = 'neon-pink',
    count = 22
  ) {
    const paletteMap = {
      gold: RARITY_PALETTES.Grail,
      'neon-pink': RARITY_PALETTES['Secret Rare'],
      purple: RARITY_PALETTES['Ultra Rare'],
      cyan: RARITY_PALETTES.Rare,
      emerald: RARITY_PALETTES.Uncommon,
      silver: RARITY_PALETTES.Common
    };

    const colors = paletteMap[colorScheme] || paletteMap['neon-pink'];

    this.shockwaves.push({
      x,
      y,
      radius: 6,
      maxRadius: 85,
      color: colors[0],
      alpha: 0.85,
      lineWidth: 2.5
    });

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 4.5 + 2.0;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const maxLife = Math.random() * 25 + 30;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3.5 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.4 ? 'diamond' : 'star',
        gravity: 0.08
      });
    }
  }

  // DYNAMIC RARITY REVEAL PARTICLE SYSTEM
  // Scales burst volume, dual shockwaves, sparkling embers, and star shapes based on card rarity & value
  public spawnRarityRevealBurst(x: number, y: number, rarity: string, value: number) {
    const colors = getRarityPalette(rarity);
    const isGrail = rarity === 'Grail' || value >= 25000;
    const isSecret = rarity === 'Secret Rare' || (value >= 5000 && !isGrail);
    const isUltra = rarity === 'Ultra Rare' || (value >= 1000 && !isSecret && !isGrail);
    const isRare = rarity === 'Rare' || (value >= 100 && !isUltra && !isSecret && !isGrail);
    const isUncommon = rarity === 'Uncommon';

    // 1. DYNAMIC SHOCKWAVES (Concentric explosive rings)
    const primaryMaxRadius = isGrail ? 220 : isSecret ? 180 : isUltra ? 140 : isRare ? 110 : isUncommon ? 85 : 65;
    this.shockwaves.push({
      x,
      y,
      radius: 8,
      maxRadius: primaryMaxRadius,
      color: colors[0],
      alpha: isGrail ? 1 : 0.85,
      lineWidth: isGrail ? 4 : 2.5
    });

    if (isGrail || isSecret) {
      // Secondary trailing shockwave for epic & grail tiers
      setTimeout(() => {
        this.shockwaves.push({
          x,
          y,
          radius: 12,
          maxRadius: primaryMaxRadius * 1.35,
          color: colors[1] || colors[0],
          alpha: 0.7,
          lineWidth: 2
        });
      }, 70);
    }

    // 2. RADIAL EXPLOSIVE SPARKS
    const particleCount = isGrail ? 75 : isSecret ? 54 : isUltra ? 42 : isRare ? 30 : isUncommon ? 22 : 15;
    const baseSpeed = isGrail ? 7.5 : isSecret ? 6.5 : isUltra ? 5.5 : isRare ? 4.5 : 3.5;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.35;
      const speed = (Math.random() * 0.7 + 0.3) * baseSpeed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const maxLife = Math.random() * (isGrail ? 45 : 30) + 35;

      const shapeRand = Math.random();
      const shape: ParticleShape =
        isGrail
          ? shapeRand > 0.45
            ? 'star'
            : shapeRand > 0.2
            ? 'diamond'
            : 'spark'
          : isSecret || isUltra
          ? shapeRand > 0.5
            ? 'star'
            : 'diamond'
          : shapeRand > 0.6
          ? 'diamond'
          : 'circle';

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * (isGrail ? 4.5 : 3.5) + (isGrail ? 2.5 : 1.5),
        color,
        alpha: 1,
        life: 0,
        maxLife,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        shape,
        gravity: 0.06
      });
    }

    // 3. RISING STARDUST EMBERS (Float upward around the card slab for high rarity)
    if (isGrail || isSecret || isUltra) {
      const emberCount = isGrail ? 24 : isSecret ? 16 : 10;
      for (let i = 0; i < emberCount; i++) {
        const offsetX = (Math.random() - 0.5) * 160;
        const offsetY = (Math.random() - 0.5) * 120;
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.particles.push({
          x: x + offsetX,
          y: y + offsetY,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -(Math.random() * 2.8 + 1.2), // Rising velocity
          size: Math.random() * 3.5 + 2,
          color,
          alpha: 0.95,
          life: 0,
          maxLife: Math.random() * 35 + 40,
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.15,
          shape: 'star',
          gravity: -0.02 // Gentle upward lift
        });
      }
    }
  }

  private start() {
    const render = (time: number) => {
      this.animId = requestAnimationFrame(render);
      if (!this.ctx || !this.canvas) return;

      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Render & update shockwaves
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += (sw.maxRadius * 2.2) * dt;
        sw.alpha -= 1.6 * dt;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          this.shockwaves.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = sw.color;
        this.ctx.lineWidth = sw.lineWidth;
        this.ctx.globalAlpha = Math.max(0, sw.alpha);
        this.ctx.shadowBlur = 18;
        this.ctx.shadowColor = sw.color;
        this.ctx.stroke();
        this.ctx.restore();
      }

      // Render & update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.vy += p.gravity;
        p.rotation += p.vRot;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = p.color;

        // Render distinct particle geometries
        if (p.shape === 'star') {
          // Radiant 4-pointed sparkle star
          this.ctx.beginPath();
          for (let s = 0; s < 8; s++) {
            const r = s % 2 === 0 ? p.size * 1.3 : p.size * 0.32;
            const a = (s * Math.PI) / 4;
            if (s === 0) this.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          this.ctx.closePath();
          this.ctx.fill();
        } else if (p.shape === 'circle') {
          // Glowing orb
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size * 0.85, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (p.shape === 'spark') {
          // Elongated velocity spark
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.5, 0, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          // Classic faceted diamond
          this.ctx.beginPath();
          this.ctx.moveTo(0, -p.size);
          this.ctx.lineTo(p.size * 0.72, 0);
          this.ctx.lineTo(0, p.size);
          this.ctx.lineTo(-p.size * 0.72, 0);
          this.ctx.closePath();
          this.ctx.fill();
        }

        this.ctx.restore();
      }
    };

    this.animId = requestAnimationFrame(render);
  }
}

export const fxSystem = new InteractiveFXSystem();

// Integrated celebratory confetti matching exact card rarity colors and origin coordinates
export function triggerRarityConfetti(x: number, y: number, rarity: string, value: number) {
  const isGrail = rarity === 'Grail' || value >= 25000;
  const isSecret = rarity === 'Secret Rare' || (value >= 5000 && !isGrail);
  const isUltra = rarity === 'Ultra Rare' || (value >= 1000 && !isSecret && !isGrail);
  const isRare = rarity === 'Rare' || (value >= 100 && !isUltra && !isSecret && !isGrail);
  const isUncommon = rarity === 'Uncommon';

  const xRatio = Math.max(0.08, Math.min(0.92, x / window.innerWidth));
  const yRatio = Math.max(0.12, Math.min(0.88, y / window.innerHeight));

  if (isGrail) {
    // Triple-burst golden cascade: center explosion + left/right cannons
    confetti({
      particleCount: 140,
      spread: 95,
      origin: { x: xRatio, y: yRatio },
      colors: ['#FFD700', '#F59E0B', '#FBBF24', '#FFFFFF', '#EC4899', '#FFFBEB'],
      scalar: 1.25,
      ticks: 280
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.75 },
        colors: ['#FFD700', '#F59E0B', '#FFFFFF'],
        ticks: 240
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.75 },
        colors: ['#FFD700', '#F59E0B', '#FFFFFF'],
        ticks: 240
      });
    }, 140);
  } else if (isSecret) {
    // Neon magenta & electric pink confetti burst
    confetti({
      particleCount: 85,
      spread: 80,
      origin: { x: xRatio, y: yRatio },
      colors: ['#EC4899', '#F43F5E', '#FB7185', '#C026D3', '#FFFFFF'],
      scalar: 1.15,
      ticks: 220
    });
  } else if (isUltra) {
    // Electric purple & violet confetti burst
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { x: xRatio, y: yRatio },
      colors: ['#A855F7', '#C084FC', '#818CF8', '#9333EA', '#FFFFFF'],
      scalar: 1.05,
      ticks: 200
    });
  } else if (isRare) {
    // Crisp electric cyan & diamond silver confetti pop
    confetti({
      particleCount: 35,
      spread: 55,
      origin: { x: xRatio, y: yRatio },
      colors: ['#06B6D4', '#22D3EE', '#38BDF8', '#FFFFFF'],
      scalar: 0.95,
      ticks: 170
    });
  } else if (isUncommon) {
    // Light emerald sparkle confetti pop
    confetti({
      particleCount: 20,
      spread: 45,
      origin: { x: xRatio, y: yRatio },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#FFFFFF'],
      scalar: 0.85,
      ticks: 140
    });
  } else {
    // Subtle silver shimmer pop for common pulls
    confetti({
      particleCount: 12,
      spread: 40,
      origin: { x: xRatio, y: yRatio },
      colors: ['#94A3B8', '#CBD5E1', '#FFFFFF'],
      scalar: 0.75,
      ticks: 110
    });
  }
}

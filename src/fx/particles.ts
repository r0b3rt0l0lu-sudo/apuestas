import Phaser from 'phaser';

export interface PSpec {
  x: number; y: number; vx: number; vy: number;
  tex: string | string[];
  /** Gravedad en px/s². */
  g?: number;
  life: number;
  scale?: number;
  /** Milisegundos por fotograma si `tex` es una lista. */
  frameMs?: number;
  drag?: number;
  tint?: number;
  fade?: boolean;
  /** Rebote contra un suelo (y) con amortiguación. */
  floor?: number;
  bounce?: number;
  depth?: number;
  grow?: number;
}

interface P extends Required<Pick<PSpec, 'vx' | 'vy' | 'life'>> {
  obj: Phaser.GameObjects.Image; x: number; y: number; age: number; spec: PSpec; bounces: number;
}

/** Partículas de píxeles con posiciones ajustadas a la rejilla del arte (nada de subpíxeles). */
export class FX {
  private ps: P[] = [];
  private snap: number;

  constructor(private scene: Phaser.Scene, snap = 2) {
    this.snap = snap;
    const upd = (_t: number, dt: number) => this.update(dt / 1000);
    scene.events.on('update', upd);
    scene.events.once('shutdown', () => { scene.events.off('update', upd); this.ps.forEach((p) => p.obj.destroy()); this.ps = []; });
  }

  add(s: PSpec): void {
    const first = Array.isArray(s.tex) ? (s.tex[0] as string) : s.tex;
    const obj = this.scene.add.image(s.x, s.y, first).setScale(s.scale ?? 2).setDepth(s.depth ?? 800);
    if (s.tint !== undefined) obj.setTint(s.tint);
    this.ps.push({ obj, x: s.x, y: s.y, vx: s.vx, vy: s.vy, life: s.life, age: 0, spec: s, bounces: 0 });
  }

  private update(dt: number): void {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i] as P, s = p.spec;
      p.age += dt;
      if (p.age >= p.life) { p.obj.destroy(); this.ps.splice(i, 1); continue; }
      p.vy += (s.g ?? 0) * dt;
      if (s.drag) { const k = Math.max(0, 1 - s.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (s.floor !== undefined && p.y > s.floor && p.vy > 0) {
        if ((s.bounce ?? 0) > 0 && p.bounces < 3) { p.y = s.floor; p.vy *= -(s.bounce ?? 0.5); p.vx *= 0.7; p.bounces++; } else { p.y = s.floor; p.vy = 0; p.vx *= 0.8; }
      }
      p.obj.setPosition(Math.round(p.x / this.snap) * this.snap, Math.round(p.y / this.snap) * this.snap);
      if (Array.isArray(s.tex)) p.obj.setTexture(s.tex[Math.floor((p.age * 1000) / (s.frameMs ?? 90)) % s.tex.length] as string);
      if (s.fade) p.obj.setAlpha(1 - (p.age / p.life) ** 2);
      if (s.grow) p.obj.setScale((s.scale ?? 2) + Math.floor(p.age * s.grow));
    }
  }

  /** Lluvia de monedas que giran y rebotan. */
  coins(x: number, y: number, n = 24, spread = 500, floor = 760): void {
    for (let i = 0; i < n; i++) {
      this.add({
        x: x + Phaser.Math.Between(-60, 60), y: y + Phaser.Math.Between(-30, 10),
        vx: Phaser.Math.Between(-spread, spread) * 0.5, vy: Phaser.Math.Between(-520, -160), g: 1500,
        tex: ['coinfx-0', 'coinfx-1', 'coinfx-2', 'coinfx-3'], frameMs: 70 + (i % 3) * 20, life: Phaser.Math.FloatBetween(1.6, 2.6),
        scale: 4, floor, bounce: 0.5, fade: true, depth: 850
      });
    }
  }

  sparks(x: number, y: number, n = 12, color?: number, speed = 360): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = Phaser.Math.Between(speed * 0.4, speed);
      this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 500, tex: 'spark', life: Phaser.Math.FloatBetween(0.35, 0.8), scale: Phaser.Math.Between(1, 2), tint: color, fade: true, drag: 1.6 });
    }
  }

  smoke(x: number, y: number, n = 6, up = 80): void {
    for (let i = 0; i < n; i++) {
      this.add({ x: x + Phaser.Math.Between(-12, 12), y, vx: Phaser.Math.Between(-30, 30), vy: -Phaser.Math.Between(up * 0.4, up), tex: `smoke-${Phaser.Math.Between(0, 2)}`, life: Phaser.Math.FloatBetween(0.8, 1.6), scale: 3, fade: true, drag: 0.8, depth: 790, grow: 1.4 });
    }
  }

  dust(x: number, y: number, n = 2): void {
    for (let i = 0; i < n; i++) {
      this.add({ x, y: y + Phaser.Math.Between(-4, 4), vx: -Phaser.Math.Between(60, 160), vy: -Phaser.Math.Between(10, 70), g: 120, tex: 'smoke-0', life: Phaser.Math.FloatBetween(0.35, 0.7), scale: 2, fade: true, tint: 0xb89a6c, depth: 5 });
    }
  }

  /** Confeti de píxeles de colores. */
  confetti(x: number, y: number, n = 40): void {
    const cols = [0xe0503c, 0xe8d27a, 0x41a6f6, 0x38b764, 0xd9cfb0, 0xb13e53];
    for (let i = 0; i < n; i++) {
      this.add({ x: x + Phaser.Math.Between(-80, 80), y, vx: Phaser.Math.Between(-320, 320), vy: -Phaser.Math.Between(300, 760), g: 900, tex: 'px', life: Phaser.Math.FloatBetween(1.4, 2.4), scale: Phaser.Math.Between(2, 3), tint: cols[i % cols.length], drag: 0.6, fade: true, depth: 860 });
    }
  }
}

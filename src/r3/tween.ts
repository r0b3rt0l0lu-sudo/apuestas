export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBounce: (t: number) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
  /** Curva de la rueda de la ruleta: cubic-bezier(.12,.62,.16,1). */
  wheel: (() => {
    const x1 = 0.12, y1 = 0.62, x2 = 0.16, y2 = 1;
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t, sy = (t: number) => ((ay * t + by) * t + cy) * t;
    return (x: number) => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 40; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (x > v) lo = t; else hi = t; t = (lo + hi) / 2; } return sy(t); };
  })()
} satisfies Record<string, Ease>;

export class Cancelled extends Error {}

interface T { t: number; dur: number; fn: (k: number) => void; ease: Ease; done: () => void; fail: (e: Error) => void }

/** Gestor de interpolaciones y esperas ligado a una pantalla: al destruirla se cancelan. */
export class Tweens {
  private list: T[] = [];
  private dead = false;

  tween(ms: number, fn: (k: number) => void, e: Ease = ease.linear): Promise<void> {
    return new Promise((done, fail) => {
      if (this.dead) { fail(new Cancelled()); return; }
      this.list.push({ t: 0, dur: Math.max(1, ms) / 1000, fn, ease: e, done, fail });
    });
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms, () => undefined);
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const x = this.list[i] as T;
      x.t += dt;
      const k = Math.min(1, x.t / x.dur);
      x.fn(x.ease(k));
      if (k >= 1) { this.list.splice(i, 1); x.done(); }
    }
  }

  dispose(): void {
    this.dead = true;
    this.list.forEach((x) => x.fail(new Cancelled()));
    this.list = [];
  }
}

/** Ejecuta un flujo asíncrono ignorando la cancelación al cerrar la pantalla. */
export function run(fn: () => Promise<void>): void {
  fn().catch((e: unknown) => { if (!(e instanceof Cancelled)) console.error(e); });
}

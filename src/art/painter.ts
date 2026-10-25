/** Pequeño lienzo para dibujar sprites píxel a píxel por código. */
export class Painter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(readonly w: number, readonly h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Sin contexto 2D');
    this.ctx = ctx;
  }

  px(x: number, y: number, c: string): this {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
    return this;
  }

  erase(x: number, y: number, w: number, h: number): this {
    this.ctx.clearRect(x, y, w, h);
    return this;
  }

  /** Elipse rellena sin suavizado. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
      this.rect(cx - half, cy + y, half * 2 + 1, 1, c);
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string, width = 1): this {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1);
    const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.rect(x, y, width, width, c);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }

  /** Polígono relleno (par-impar por filas). */
  poly(pts: ReadonlyArray<readonly [number, number]>, c: string): this {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i] as readonly [number, number], b = pts[(i + 1) % pts.length] as readonly [number, number];
        const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
        if (y + 0.5 < lo || y + 0.5 >= hi || lo === hi) continue;
        xs.push(a[0] + ((y + 0.5 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.round(xs[k] as number), xb = Math.round(xs[k + 1] as number);
        this.rect(xa, y, Math.max(1, xb - xa), 1, c);
      }
    }
    return this;
  }

  /** Dibuja un mapa ASCII; '.' es transparente. */
  map(rows: readonly string[], pal: Record<string, string>, ox = 0, oy = 0): this {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x] as string];
        if (col) this.px(ox + x, oy + y, col);
      }
    });
    return this;
  }

  /** Copia otro lienzo encima (con desplazamiento opcional). */
  blit(src: Painter, dx = 0, dy = 0): this {
    this.ctx.drawImage(src.canvas, dx, dy);
    return this;
  }

  /** Contorno de 1 px alrededor de todo lo opaco. */
  outline(c: string): this {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const a = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : (img.data[(y * this.w + x) * 4 + 3] as number));
    const marks: Array<[number, number]> = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (a(x, y) === 0 && (a(x - 1, y) > 0 || a(x + 1, y) > 0 || a(x, y - 1) > 0 || a(x, y + 1) > 0)) marks.push([x, y]);
      }
    }
    marks.forEach(([x, y]) => this.px(x, y, c));
    return this;
  }

  /** Mezcla un color hacia otro (0..1), para sombras como el 62 % de las patas lejanas. */
  static shade(hex: string, k: number): string {
    const n = parseInt(hex.slice(1), 16);
    const ch = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, '0');
    return `#${ch(16)}${ch(8)}${ch(0)}`;
  }
}

// ---------- Color y sombreado ----------

export type Rgb = [number, number, number];
export const toRgb = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const toHex = ([r, g, b]: Rgb): string =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number): string => {
  const x = toRgb(a), y = toRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
};
/** Sombras hacia violeta frío y luces hacia crema cálida, como en el pixel art clásico. */
export const darken = (c: string, t: number): string => mix(c, '#150c22', t);
export const lighten = (c: string, t: number): string => mix(c, '#fff0c4', t);

export interface Ramp { d2: string; d1: string; b: string; l1: string; l2: string }
export const ramp = (base: string): Ramp => ({
  d2: darken(base, 0.7), d1: darken(base, 0.38), b: base, l1: lighten(base, 0.26), l2: lighten(base, 0.55)
});
export const rampList = (r: Ramp): string[] => [r.d2, r.d1, r.b, r.l1, r.l2];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Umbral de tramado ordenado 4×4 en [0, 1). */
export const bayer = (x: number, y: number): number => ((BAYER[((y & 3) << 2) | (x & 3)] as number) + 0.5) / 16;

/** Ruido determinista 0..1 (para fondos y texturas). */
export function hash(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

declare module './painter' {
  interface Painter {
    shadedEllipse(cx: number, cy: number, rx: number, ry: number, r: Ramp, light?: [number, number]): Painter;
    vgrad(x: number, y: number, w: number, h: number, top: string, bottom: string): Painter;
    glow(cx: number, cy: number, radius: number, color: string, strength?: number): Painter;
    outlineSel(dark?: string, mixAmt?: number): Painter;
    ring(cx: number, cy: number, r: number, c: string): Painter;
    scatter(x: number, y: number, w: number, h: number, c: string, density: number, seed?: number): Painter;
    fillBevel(pts: ReadonlyArray<readonly [number, number]>, r: Ramp, opts?: { grad?: boolean; depth?: number }): Painter;
    inside(x: number, y: number): boolean;
    grade(): Painter;
  }
}

Painter.prototype.shadedEllipse = function (this: Painter, cx, cy, rx, ry, r, light = [-0.55, -0.65]) {
  const L = Math.hypot(light[0], light[1], 0.6);
  const lx = light[0] / L, ly = light[1] / L, lz = 0.6 / L;
  const cols = rampList(r);
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const nx = x / (rx + 0.5), ny = y / (ry + 0.5), d = nx * nx + ny * ny;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      const v = (nx * lx + ny * ly + nz * lz + 1) / 2; // 0..1
      const q = v * 4 + (bayer(cx + x, cy + y) - 0.5) * 0.5;
      this.px(cx + x, cy + y, cols[Math.max(0, Math.min(4, Math.round(q)))] as string);
    }
  }
  return this;
};

Painter.prototype.vgrad = function (this: Painter, x, y, w, h, top, bottom) {
  for (let j = 0; j < h; j++) {
    const t = h <= 1 ? 0 : j / (h - 1);
    for (let i = 0; i < w; i++) this.px(x + i, y + j, bayer(x + i, y + j) < (t * 4) % 1 ? mix(top, bottom, Math.min(1, (Math.floor(t * 4) + 1) / 4)) : mix(top, bottom, Math.floor(t * 4) / 4));
  }
  return this;
};

Painter.prototype.glow = function (this: Painter, cx, cy, radius, color, strength = 0.5) {
  const prev = this.ctx.globalAlpha;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const d = Math.hypot(x, y) / radius;
      if (d >= 1) continue;
      const cov = Math.pow(1 - d, 1.6) * strength * 1.6;
      if (bayer(cx + x, cy + y) < cov) { this.ctx.globalAlpha = Math.min(1, 0.22 + cov * 0.4); this.px(cx + x, cy + y, color); }
    }
  }
  this.ctx.globalAlpha = prev;
  return this;
};

Painter.prototype.ring = function (this: Painter, cx, cy, r, c) {
  const n = Math.max(16, Math.round(r * 8));
  for (let i = 0; i < n; i++) this.px(cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r, c);
  return this;
};

Painter.prototype.scatter = function (this: Painter, x, y, w, h, c, density, seed = 1) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (hash(x + i, y + j, seed) < density) this.px(x + i, y + j, c);
  return this;
};

Painter.prototype.inside = function (this: Painter, x, y) {
  if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
  return (this.ctx.getImageData(x, y, 1, 1).data[3] as number) > 0;
};

/**
 * Polígono con bisel: luz en el borde superior izquierdo, sombra en el inferior derecho
 * y un degradado tramado hacia abajo. Da volumen a miembros, cuellos y ropa.
 */
Painter.prototype.fillBevel = function (this: Painter, pts, r, opts = {}) {
  const grad = opts.grad ?? true, depth = opts.depth ?? 2;
  const m = new Painter(this.w, this.h).poly(pts, '#fff');
  const img = m.ctx.getImageData(0, 0, this.w, this.h).data;
  const ins = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && (img[(y * this.w + x) * 4 + 3] as number) > 0;
  const ys = pts.map((q) => q[1]);
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < this.w; x++) {
      if (!ins(x, y)) continue;
      let c = r.b;
      if (grad) {
        const t = (y - y0) / Math.max(1, y1 - y0);
        if (t > 0.55 && bayer(x, y) < (t - 0.55) * 1.6) c = r.d1;
      }
      if (!ins(x - 1, y - 1) || !ins(x, y - 1) && depth > 1) c = r.l1;
      if (depth > 1 && (!ins(x - 1, y - 1) && !ins(x, y - 1))) c = r.l2;
      if (!ins(x + 1, y + 1) || !ins(x + 1, y)) c = r.d1;
      if (depth > 1 && !ins(x + 1, y + 1) && !ins(x, y + 1)) c = r.d2;
      this.px(x, y, c);
    }
  }
  return this;
};

/**
 * Corrección de color global del juego: aplasta los negros, quita los grises medios
 * (curva de contraste) y satura. Se aplica a todas las texturas al crearlas.
 */
export const GRADE = { black: 0.05, gamma: 1.32, sat: 1.28 };
Painter.prototype.grade = function (this: Painter) {
  const img = this.ctx.getImageData(0, 0, this.w, this.h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if ((d[i + 3] as number) === 0) continue;
    let r = (d[i] as number) / 255, g = (d[i + 1] as number) / 255, b = (d[i + 2] as number) / 255;
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    r = l + (r - l) * GRADE.sat; g = l + (g - l) * GRADE.sat; b = l + (b - l) * GRADE.sat;
    const f = (v: number) => Math.pow(Math.max(0, Math.min(1, (v - GRADE.black) / (1 - GRADE.black))), GRADE.gamma);
    d[i] = Math.round(f(r) * 255); d[i + 1] = Math.round(f(g) * 255); d[i + 2] = Math.round(f(b) * 255);
  }
  this.ctx.putImageData(img, 0, 0);
  return this;
};

/** Contorno selectivo: cada borde toma el color del vecino oscurecido, no un negro plano. */
Painter.prototype.outlineSel = function (this: Painter, dark = '#0d0a0e', mixAmt = 0.82) {
  const img = this.ctx.getImageData(0, 0, this.w, this.h);
  const d = img.data, W = this.w, H = this.h;
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= W || y >= H ? -1 : (y * W + x) * 4);
  const marks: Array<[number, number, string]> = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      if ((d[i + 3] as number) > 0) continue;
      let best: Rgb | null = null, lum = -1;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const j = at(x + dx, y + dy);
        if (j >= 0 && (d[j + 3] as number) > 0) {
          const l = (d[j] as number) + (d[j + 1] as number) + (d[j + 2] as number);
          if (l > lum) { lum = l; best = [d[j] as number, d[j + 1] as number, d[j + 2] as number]; }
        }
      }
      if (best) marks.push([x, y, mix(toHex(best), dark, mixAmt)]);
    }
  }
  marks.forEach(([x, y, c]) => this.px(x, y, c));
  return this;
};

/** Fuente de píxeles de 3×5 para los dorsales. */
const DIGITS: Record<string, readonly string[]> = {
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###']
};

export function digit(p: Painter, n: number, x: number, y: number, c: string): void {
  const rows = DIGITS[String(n)];
  rows?.forEach((r, j) => [...r].forEach((ch, i) => ch === '#' && p.px(x + i, y + j, c)));
}

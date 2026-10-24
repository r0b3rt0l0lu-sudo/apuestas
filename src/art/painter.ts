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

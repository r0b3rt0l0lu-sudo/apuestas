import { Painter, bayer, darken, hash, lighten, mix, ramp } from './painter';

/** Texturas de baja resolución para los modelos 3D (se estiran con vecino más cercano). */

export function woodTex(base = '#5a3a22', w = 64, h = 64, planks = 4): Painter {
  const p = new Painter(w, h);
  const r = ramp(base);
  const pw = Math.floor(w / planks);
  for (let x = 0; x < w; x++) {
    const plank = Math.floor(x / pw), tone = hash(plank, 3);
    for (let y = 0; y < h; y++) {
      const grain = hash(Math.floor(y / 3) + plank * 7, x % pw < 2 ? 1 : 2, 5);
      let c = tone < 0.33 ? r.d1 : tone < 0.66 ? r.b : r.l1;
      if (grain < 0.12) c = darken(c, 0.35);
      if (x % pw === 0) c = r.d2;
      p.px(x, y, c);
    }
  }
  return p;
}

export function cobbleTex(base = '#1a0e1c', w = 64, h = 64): Painter {
  const p = new Painter(w, h);
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / 8), off = row % 2 ? 6 : 0;
    for (let x = 0; x < w; x++) {
      const col = Math.floor((x + off) / 12);
      const edge = (x + off) % 12 === 0 || y % 8 === 0;
      const n = hash(col, row, 7);
      p.px(x, y, edge ? darken(base, 0.8) : mix(base, lighten(base, 0.55), n * 0.7));
    }
  }
  return p;
}

export function stripeTex(a: string, b: string, w = 32, h = 16): Painter {
  const p = new Painter(w, h);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) p.px(x, y, Math.floor(x / 4) % 2 ? b : a);
  return p;
}

export function feltTex(base = '#566a38', w = 64, h = 64): Painter {
  const p = new Painter(w, h);
  const r = ramp(base);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = hash(x, y, 2);
    p.px(x, y, n < 0.14 ? r.d2 : n > 0.9 ? r.l1 : bayer(x, y) < 0.2 ? r.d1 : r.b);
  }
  return p;
}

/** Paño con las líneas blancas de la mesa de duelo (zonas de objetos). */
export function dueltableTex(): Painter {
  const p = feltTex('#4a5c30', 128, 128);
  const line = '#c4b494';
  const rect = (x: number, y: number, w: number, h: number) => { p.rect(x, y, w, 1, line).rect(x, y + h, w, 1, line).rect(x, y, 1, h, line).rect(x + w, y, 1, h + 1, line); };
  rect(6, 6, 54, 50); rect(68, 6, 54, 50); rect(6, 72, 54, 50); rect(68, 72, 54, 50);
  p.rect(0, 64, 128, 1, line);
  return p;
}

export function brickTex(base = '#3a1018', w = 64, h = 64): Painter {
  const p = new Painter(w, h);
  const r = ramp(base);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const row = Math.floor(y / 8), off = row % 2 ? 8 : 0;
    const bx = Math.floor((x + off) / 16);
    const mortar = y % 8 === 0 || (x + off) % 16 === 0;
    const n = hash(bx, row, 3);
    p.px(x, y, mortar ? r.d2 : n < 0.3 ? r.d1 : n > 0.75 ? r.l1 : r.b);
  }
  return p;
}

export function curtainTex(base = '#7a1e28', w = 64, h = 16): Painter {
  const p = new Painter(w, h);
  const r = ramp(base);
  for (let x = 0; x < w; x++) {
    const wave = Math.sin(x * 0.7) * 0.5 + 0.5;
    const c = wave > 0.8 ? r.l1 : wave > 0.5 ? r.b : wave > 0.25 ? r.d1 : r.d2;
    for (let y = 0; y < h; y++) p.px(x, y, c);
  }
  return p;
}

export function metalTex(base = '#6a6070', w = 32, h = 32): Painter {
  const p = new Painter(w, h);
  const r = ramp(base);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = hash(x >> 2, y, 4);
    p.px(x, y, n < 0.2 ? r.d1 : n > 0.85 ? r.l1 : r.b);
  }
  return p;
}

export function paperTex(base = '#d6cbae', w = 16, h = 16): Painter {
  const p = new Painter(w, h);
  p.rect(0, 0, w, h, base);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x, y, 9) < 0.06) p.px(x, y, darken(base, 0.2));
  return p;
}

export function noiseTex(base: string, amt = 0.2, w = 32, h = 32): Painter {
  const p = new Painter(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.px(x, y, mix(base, hash(x, y, 6) < 0.5 ? darken(base, 0.6) : lighten(base, 0.4), hash(x, y, 8) * amt));
  return p;
}

/** Cielo nocturno con estrellas: textura panorámica. */
export function skyTex(w = 256, h = 128): Painter {
  const p = new Painter(w, h);
  p.vgrad(0, 0, w, h, '#000000', '#2a0a38');
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(hash(i, 1) * w), y = Math.floor(hash(i, 2) * h * 0.8);
    p.px(x, y, hash(i, 3) < 0.2 ? '#ffffff' : '#9a96c0');
  }
  return p;
}

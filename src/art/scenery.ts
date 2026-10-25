import { C } from '../config';
import { Painter, bayer, darken, hash, lighten, mix, ramp } from './painter';

/** Fondos a 320×200 de «píxel de arte»; se muestran a ×4 para llenar 1280×800. */
export const SW = 320;
export const SH = 200;

const K = C.bg;
const P = () => new Painter(SW, SH);

/** Pendiente de una línea entre dos puntos, evaluada en x. */
const lineY = (x0: number, y0: number, x1: number, y1: number, x: number): number =>
  y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);

function stripedTent(p: Painter, cx: number, baseY: number, halfW: number, wallH: number, roofH: number, a: string, b: string, seed: number): void {
  const left = cx - halfW, right = cx + halfW, apexY = baseY - wallH - roofH;
  // pared
  for (let x = left; x <= right; x++) {
    const stripe = Math.floor((x - left) / 5) % 2 === 0;
    const base = stripe ? a : b;
    const shade = (x - left) / (halfW * 2); // luz desde la izquierda
    const col = shade < 0.3 ? lighten(base, 0.15) : shade > 0.75 ? darken(base, 0.4) : base;
    p.rect(x, baseY - wallH, 1, wallH, col);
  }
  // techo cónico a rayas
  for (let x = left - 3; x <= right + 3; x++) {
    const topY = x < cx ? lineY(left - 3, baseY - wallH, cx, apexY, x) : lineY(cx, apexY, right + 3, baseY - wallH, x);
    const stripe = Math.floor((x - left) / 5) % 2 === 0;
    const base = stripe ? b : a;
    const shade = (x - left) / (halfW * 2);
    const col = shade < 0.35 ? lighten(base, 0.2) : shade > 0.7 ? darken(base, 0.5) : base;
    p.rect(x, Math.round(topY), 1, Math.round(baseY - wallH - topY) + 1, col);
  }
  // borde festoneado
  for (let x = left - 3; x <= right + 3; x += 5) {
    p.ellipse(x + 2, baseY - wallH, 2, 2, ((x - left) / 5) % 2 === 0 ? b : a);
    p.px(x + 2, baseY - wallH + 2, darken(a, 0.7));
  }
  // puerta oscura y rasgones
  p.poly([[cx - 6, baseY], [cx - 3, baseY - wallH + 3], [cx + 3, baseY - wallH + 3], [cx + 6, baseY]], '#0a060e');
  p.rect(cx - 1, baseY - wallH + 4, 2, wallH - 4, '#1c1224');
  for (let i = 0; i < 5; i++) {
    const x = left + 3 + Math.floor(hash(i, seed) * (halfW * 2 - 6)), y = baseY - wallH - Math.floor(hash(i, seed + 9) * roofH * 0.7);
    p.rect(x, y, 2, 3, '#0a060e');
  }
  // mástil y banderín
  p.rect(cx, apexY - 9, 1, 10, '#1a1220');
  p.poly([[cx + 1, apexY - 9], [cx + 8, apexY - 7], [cx + 1, apexY - 5]], mix(a, K, 0.2));
  p.rect(left, baseY - 1, halfW * 2 + 1, 1, '#0d0a12');
}

function cobbles(p: Painter, y0: number, y1: number, base: string): void {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const rowH = 3 + Math.floor(t * 4);
    const row = Math.floor((y - y0) / rowH);
    const wStone = 6 + Math.floor(t * 8);
    for (let x = 0; x < SW; x++) {
      const off = row % 2 === 0 ? 0 : Math.floor(wStone / 2);
      const col = Math.floor((x + off) / wStone);
      const edgeX = (x + off) % wStone === 0, edgeY = (y - y0) % rowH === 0;
      const n = hash(col, row, 7);
      const c = mix(base, lighten(base, 0.35), n * 0.5);
      p.px(x, y, edgeX || edgeY ? darken(base, 0.7) : darken(c, t * 0.25));
    }
  }
}

export interface FairParts {
  bg: Painter;
  /** Tres fotogramas de parpadeo de estrellas (solo estrellas, sobre el fondo). */
  stars: Painter[];
  /** Dos fotogramas de bombillas de la guirnalda. */
  bulbs: Painter[];
  /** Niebla tileable (horizontal). */
  fog: Painter;
}

export function drawFairNight(): FairParts {
  const p = P();
  p.vgrad(0, 0, SW, 130, '#000000', '#2a0a38');
  p.rect(0, 130, SW, 70, '#050208');
  // calima del horizonte
  for (let y = 112; y < 136; y++) for (let x = 0; x < SW; x++) if (bayer(x, y) < (1 - Math.abs(y - 124) / 12) * 0.5) p.px(x, y, '#7a1a4a');
  // luna con cráteres y resplandor
  p.glow(268, 30, 30, '#8c8ab0', 0.55);
  p.shadedEllipse(268, 30, 10, 10, ramp('#cfc6a8'), [-0.7, -0.5]);
  [[264, 26, 2], [272, 34, 2], [269, 24, 1], [263, 34, 1]].forEach(([x, y, r]) => p.ellipse(x!, y!, r!, r!, '#8f8872'));
  // montañas y arboleda lejana
  for (let x = 0; x < SW; x++) {
    const h = 10 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.17 + 2) * 3 + hash(x >> 2, 3) * 4;
    p.rect(x, Math.round(132 - h), 1, Math.round(h) + 4, '#0a0412');
  }
  for (let x = 4; x < SW; x += 9 + Math.floor(hash(x, 1) * 6)) {
    const hh = 8 + Math.floor(hash(x, 2) * 10);
    p.poly([[x, 130], [x - 3, 130], [x - 1, 130 - hh], [x + 1, 130 - hh], [x + 3, 130]], '#06020c');
  }
  // noria: patas (el aro gira aparte)
  p.poly([[232, 92], [226, 92], [206, 152], [212, 152]], '#1a1222').poly([[232, 92], [238, 92], [258, 152], [252, 152]], '#1a1222');
  p.line(214, 130, 250, 130, '#221830', 1);
  // carpas
  stripedTent(p, 36, 152, 30, 14, 26, '#7a1428', '#b08a46', 1);
  stripedTent(p, 124, 150, 22, 10, 20, '#0e4a46', '#8a6a34', 2);
  stripedTent(p, 292, 154, 26, 12, 24, '#7a1428', '#b08a46', 3);
  // suelo
  p.rect(0, 152, SW, 3, '#0a0610');
  cobbles(p, 155, SH, '#1a0e1c');
  // charcos con reflejo
  [[70, 178, 18], [200, 186, 24], [150, 168, 10]].forEach(([x, y, w]) => {
    p.rect(x!, y!, w!, 2, '#0a1a30');
    p.rect(x! + 2, y!, Math.floor(w! / 3), 1, '#2a6aa0');
  });
  // postes con farol
  [48, 272].forEach((x) => {
    p.rect(x, 98, 2, 72, '#120c18').rect(x - 1, 168, 4, 3, '#120c18');
    p.rect(x - 3, 92, 8, 6, '#1d1426').rect(x - 2, 93, 6, 4, C.lamp);
    p.px(x - 1, 94, '#fff6c8').px(x, 94, '#fff6c8');
    p.glow(x + 1, 95, 40, C.lamp, 0.55);
    p.glow(x + 1, 160, 24, C.lamp, 0.25);
  });
  // cable de la guirnalda (las bombillas son otra capa)
  const wire: Array<[number, number]> = [];
  for (let x = 49; x <= 273; x++) {
    const y = 60 + Math.sin(((x - 49) / 224) * Math.PI) * 26 + (x < 160 ? 0 : 0);
    wire.push([x, Math.round(y)]);
    p.px(x, Math.round(y), '#150e1b');
  }
  // cartel torcido en primer plano
  p.rect(14, 150, 2, 40, '#150e1b').rect(8, 156, 30, 14, '#3a2418').rect(9, 157, 28, 12, '#5b3a22');
  p.scatter(9, 157, 28, 12, '#2e1c10', 0.25, 4);
  p.rect(12, 160, 8, 2, '#d9cfb0').rect(22, 160, 10, 2, '#d9cfb0').rect(12, 164, 14, 2, '#d9cfb0');
  p.outlineSel();

  // estrellas
  const starPts = Array.from({ length: 70 }, (_, i) => ({ x: Math.floor(hash(i, 11) * SW), y: Math.floor(hash(i, 12) * 100), o: Math.floor(hash(i, 13) * 3) }));
  const stars = [0, 1, 2].map((f) => {
    const s = P();
    starPts.forEach((st, i) => {
      const lvl = (st.o + f) % 3;
      if (Math.hypot(st.x - 268, st.y - 30) < 18) return;
      s.px(st.x, st.y, lvl === 0 ? '#5a5478' : lvl === 1 ? '#a8a4c8' : '#f4f0ff');
      if (lvl === 2 && i % 3 === 0) s.px(st.x - 1, st.y, '#8a86a8').px(st.x + 1, st.y, '#8a86a8').px(st.x, st.y - 1, '#8a86a8').px(st.x, st.y + 1, '#8a86a8');
    });
    return s;
  });

  // bombillas
  const bulbs = [0, 1].map((f) => {
    const b = P();
    wire.forEach(([x, y], i) => {
      if (i % 11 !== 5) return;
      const k = Math.floor(i / 11);
      const lit = (k + f) % 3 !== 0;
      const col = k % 4 === 0 ? C.danger : k % 4 === 2 ? '#7fb0b0' : C.lamp;
      b.rect(x, y + 1, 1, 2, '#150e1b');
      b.rect(x - 1, y + 3, 3, 3, lit ? col : darken(col, 0.7)).px(x - 1, y + 3, lit ? lighten(col, 0.5) : darken(col, 0.8));
      if (lit) b.glow(x, y + 4, 7, col, 0.35);
    });
    return b;
  });

  // niebla tileable
  const fog = new Painter(SW, 48);
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < SW; x++) {
      const n = (hash(Math.floor(x / 8) % 40, Math.floor(y / 6), 5) + hash((Math.floor(x / 4)) % 80, Math.floor(y / 3), 6) * 0.5) / 1.5;
      const fall = 1 - Math.abs(y - 24) / 24;
      if (bayer(x, y) < n * fall * 0.85) { fog.ctx.globalAlpha = 0.3; fog.px(x, y, '#7a6a90'); }
    }
  }
  fog.ctx.globalAlpha = 1;
  return { bg: p, stars, bulbs, fog };
}

/** Un fotograma de la noria (aro, radios y góndolas que cuelgan siempre rectas). */
export function drawWheelFrame(k: number, n: number): Painter {
  const S = 128, c = 64, R = 56;
  const p = new Painter(S, S);
  const th = (k / n) * Math.PI * 2;
  // radios
  for (let i = 0; i < 12; i++) {
    const a = th + (i / 12) * Math.PI * 2;
    p.line(c, c, c + Math.cos(a) * R, c + Math.sin(a) * R, '#2c2036', 1);
    p.line(c + 1, c, c + Math.cos(a) * R + 1, c + Math.sin(a) * R, '#150e1b', 1);
  }
  // aros
  p.ring(c, c, R, '#3a2c44').ring(c, c, R - 1, '#2a1f33').ring(c, c, R - 3, '#2a1f33').ring(c, c, R - 4, '#150e1b');
  p.ring(c, c, R + 1, '#150e1b');
  p.ring(c, c, 30, '#2a1f33');
  // góndolas
  const gcols = ['#7a2a30', '#8c7442', '#3a5a52', '#6e4a2e'];
  for (let i = 0; i < 12; i++) {
    const a = th + (i / 12) * Math.PI * 2;
    const x = Math.round(c + Math.cos(a) * R), y = Math.round(c + Math.sin(a) * R);
    const broken = i === 5;
    p.rect(x, y, 1, 4, '#150e1b');
    const col = gcols[i % gcols.length] as string;
    if (broken) {
      p.rect(x - 2, y + 3, 5, 3, '#241a2c').px(x + 2, y + 6, '#241a2c');
    } else {
      p.rect(x - 3, y + 4, 7, 6, col).rect(x - 3, y + 4, 7, 1, lighten(col, 0.4)).rect(x - 3, y + 9, 7, 1, darken(col, 0.6));
      p.px(x - 2, y + 6, '#0d0a12').px(x, y + 6, '#0d0a12').px(x + 2, y + 6, '#0d0a12');
    }
  }
  p.shadedEllipse(c, c, 6, 6, ramp(C.brass));
  p.px(c, c, '#0d0a0e');
  return p.outlineSel();
}

/** Interior de caseta de feria para la tragaperras: papel pintado, cortinas, zócalo y apliques. */
export function drawBooth(): { bg: Painter; glow: Painter } {
  const p = P();
  p.rect(0, 0, SW, SH, '#2a0f16');
  for (let y = 0; y < 150; y += 16) for (let x = 0; x < SW; x += 16) {
    const ox = (Math.floor(y / 16) % 2) * 8;
    const cx = x + ox + 8, cy = y + 8;
    p.poly([[cx, cy - 6], [cx + 4, cy], [cx, cy + 6], [cx - 4, cy]], '#3a1621');
    p.px(cx, cy, '#4a1c28');
    p.px(cx, cy - 8, '#34131d').px(cx - 8, cy, '#34131d');
  }
  p.scatter(0, 0, SW, 150, '#1c0a10', 0.08, 3);
  // humedad en el techo
  for (let y = 0; y < 30; y++) for (let x = 0; x < SW; x++) if (bayer(x, y) < (1 - y / 30) * 0.6) p.px(x, y, '#12060a');
  // zócalo de madera
  p.rect(0, 150, SW, 50, '#2e2418');
  for (let x = 0; x < SW; x += 10) p.rect(x, 152, 1, 48, '#1c150e').rect(x + 1, 152, 1, 48, '#3c2f20');
  p.scatter(0, 152, SW, 48, '#4a3a28', 0.05, 8);
  p.rect(0, 148, SW, 2, '#b8973a').rect(0, 150, SW, 1, '#6e5a22').rect(0, 147, SW, 1, '#e8d27a');
  p.rect(0, 190, SW, 10, '#150f0a');
  for (let x = 0; x < SW; x += 24) p.rect(x, 190, 1, 10, '#0a0705');
  // cortinas
  const drape = (x0: number, x1: number, dir: 1 | -1) => {
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0);
      const wave = Math.sin(x * 0.9) * 0.5 + 0.5;
      const dark = dir === 1 ? t : 1 - t;
      const col = wave > 0.8 ? '#a8323c' : wave > 0.5 ? '#7a1e28' : wave > 0.25 ? '#561219' : '#3a0b11';
      p.rect(x, 12, 1, 140, darken(col, dark * 0.35));
    }
    const edge = dir === 1 ? x1 : x0;
    for (let y = 12; y < 152; y++) { const dx = Math.round(Math.sin(y * 0.15) * 1.5); p.px(edge + dx * dir, y, '#3a0b11'); }
  };
  drape(0, 40, 1);
  drape(280, 319, -1);
  // lambrequín dorado
  p.rect(0, 8, SW, 8, '#5a1018').rect(0, 8, SW, 1, '#b8973a').rect(0, 16, SW, 1, '#b8973a');
  for (let x = 0; x < SW; x += 6) { p.rect(x, 17, 1, 4, '#b8973a'); p.px(x, 21, '#e8d27a'); p.rect(x + 2, 17, 1, 3, '#8c7442'); }
  // recogidas
  [[40, 100], [280, 100]].forEach(([x, y]) => {
    p.rect(x! - 3, y!, 6, 3, '#b8973a').rect(x! - 6, y! + 3, 12, 2, '#8c7442');
    for (let i = 0; i < 5; i++) p.rect(x! - 5 + i * 2, y! + 5, 1, 8 + (i % 2) * 2, '#b8973a');
  });
  // apliques de pared (la llama y su luz son otra capa)
  [[56, 66], [264, 66]].forEach(([x, y]) => {
    p.rect(x! - 1, y!, 3, 10, '#8c7442').rect(x! - 4, y! + 9, 9, 2, '#b8973a').rect(x! - 2, y! - 3, 5, 4, '#cfc6a8');
  });
  const glow = P();
  [[56, 62], [264, 62]].forEach(([x, y]) => {
    glow.glow(x!, y!, 34, C.lamp, 0.6);
    glow.ellipse(x!, y! - 3, 1, 3, '#e8a030').px(x!, y! - 4, '#fff6c8').px(x!, y! - 2, C.lamp);
  });
  return { bg: p.outlineSel('#0d0a0e', 0.5), glow };
}

/** Armario de la tragaperras: cuerpo lacado, marquesina, ventanas de rodillos y bandeja. */
export function drawCabinet(): { body: Painter; bulbs: Painter[]; lever: Painter[]; bulbPos: Array<[number, number]> } {
  const p = P();
  const red = ramp('#6a1822'), gold = ramp(C.gold);
  const x0 = 78, x1 = 242, y0 = 14, y1 = 156;
  // sombra y cuerpo
  p.rect(x0 + 3, y0 + 4, x1 - x0, y1 - y0, '#07040a');
  p.poly([[x0, y0 + 10], [x0 + 8, y0], [x1 - 8, y0], [x1, y0 + 10], [x1, y1], [x0, y1]], red.b);
  for (let y = y0; y < y1; y++) { p.rect(x0, y, 3, 1, red.l1); p.rect(x0, y, 1, 1, red.l2); p.rect(x1 - 3, y, 3, 1, red.d1); }
  p.scatter(x0, y0, x1 - x0, y1 - y0, red.d1, 0.06, 5);
  // marquesina
  p.rect(x0 + 6, y0 + 4, x1 - x0 - 12, 24, '#0d0a0e');
  p.rect(x0 + 6, y0 + 4, x1 - x0 - 12, 1, gold.l1).rect(x0 + 6, y0 + 28, x1 - x0 - 12, 1, gold.d1);
  p.rect(x0 + 6, y0 + 4, 1, 25, gold.b).rect(x1 - 7, y0 + 4, 1, 25, gold.d1);
  p.rect(x0 + 8, y0 + 6, x1 - x0 - 16, 20, '#1a0a10');
  // marco de ventanas (ventana 30×72 en centros 123/160/197, y 44..116)
  p.rect(x0 + 8, 40, x1 - x0 - 16, 82, '#0d0a0e');
  p.rect(x0 + 8, 40, x1 - x0 - 16, 1, gold.l2).rect(x0 + 8, 40, 1, 82, gold.l1).rect(x1 - 9, 40, 1, 82, gold.d1).rect(x0 + 8, 121, x1 - x0 - 16, 1, gold.d2);
  [123, 160, 197].forEach((cx) => {
    p.rect(cx - 16, 42, 32, 76, gold.d1).rect(cx - 15, 43, 30, 74, gold.b).rect(cx - 15, 43, 30, 1, gold.l2);
    p.rect(cx - 15, 44, 30, 72, '#0d0a0e'); // hueco: la escena dibuja los símbolos encima
    p.rect(cx - 15, 44, 30, 2, '#000').rect(cx - 15, 114, 30, 2, '#000');
  });
  // bandeja y panel inferior
  p.rect(x0 + 4, 124, x1 - x0 - 8, 8, gold.d1).rect(x0 + 4, 124, x1 - x0 - 8, 1, gold.l2).rect(x0 + 4, 131, x1 - x0 - 8, 1, gold.d2);
  p.rect(x0 + 10, 134, x1 - x0 - 20, 18, '#1a0a10').rect(x0 + 10, 134, x1 - x0 - 20, 1, '#000');
  p.rect(150, 138, 20, 3, '#000').rect(150, 138, 20, 1, '#3a2c1c'); // ranura de monedas
  p.shadedEllipse(100, 144, 4, 4, gold).shadedEllipse(220, 144, 4, 4, gold);
  // pata
  p.rect(x0 + 6, y1, 20, 4, '#150e1b').rect(x1 - 26, y1, 20, 4, '#150e1b');
  // remaches
  for (let x = x0 + 4; x < x1; x += 14) { p.px(x, y0 + 12, gold.l1).px(x, 150, gold.l1); }
  p.outlineSel('#0d0a0e', 0.6);
  // bombillas de la marquesina: dos fotogramas con el chasquido de luces
  const bulbPos: Array<[number, number]> = [];
  for (let i = 0; i < 17; i++) bulbPos.push([x0 + 12 + i * 9, y0 + 8]);
  for (let i = 0; i < 17; i++) bulbPos.push([x0 + 12 + i * 9, y0 + 23]);
  const bulbs = [0, 1, 2].map((f) => {
    const b = P();
    bulbPos.forEach(([x, y], i) => {
      const lit = (i + f) % 3 === 0;
      b.rect(x - 1, y - 1, 3, 3, lit ? '#fff6c8' : '#6e5a22');
      b.px(x, y, lit ? C.lamp : '#3a2c10');
      if (lit) b.glow(x, y, 6, C.lamp, 0.5);
    });
    return b;
  });
  // palanca: 3 posiciones (arriba, media, abajo), con pivote fijo en (10, 62)
  const lever = [0, 1, 2].map((f) => {
    const l = new Painter(40, 80);
    const steel = ramp('#8a869a');
    l.fillBevel([[2, 56], [18, 56], [18, 76], [2, 76]], ramp('#3a3248'), { depth: 1 });
    const th = [0.1, 1.2, 2.25][f] as number, L = 46;
    const tx = Math.round(10 + Math.sin(th) * L * 0.62), ty = Math.round(62 - Math.cos(th) * L);
    l.line(10, 62, tx, ty, steel.d1, 4).line(10, 62, tx, ty, steel.b, 3).line(9, 62, tx - 1, ty, steel.l1, 1);
    l.shadedEllipse(tx, ty, 6, 6, ramp('#b13e53'));
    l.shadedEllipse(10, 62, 4, 4, ramp(C.gold));
    return l.outlineSel();
  });
  return { body: p, bulbs, lever, bulbPos };
}

/** Sala de la ruleta: papel verde oscuro, mesa de fieltro con borde de madera. */
export function drawFeltRoom(): { bg: Painter; flames: Painter[] } {
  const p = P();
  p.rect(0, 0, SW, SH, '#10140c');
  for (let y = 0; y < SH; y += 12) for (let x = 0; x < SW; x += 12) {
    if (((x + y) / 12) % 2 === 0) p.rect(x + 4, y + 4, 4, 4, '#1c2414');
    else p.px(x + 6, y + 6, '#26301a');
  }
  for (let y = 0; y < 60; y++) for (let x = 0; x < SW; x++) if (bayer(x, y) < (1 - y / 60) * 0.55) p.px(x, y, '#050a07');
  // mesa
  const felt = ramp('#5a7a3a');
  p.rect(6, 34, 306, 160, '#150e08');
  p.rect(8, 36, 302, 156, '#3b2616');
  p.rect(8, 36, 302, 2, '#5e3e24').rect(8, 190, 302, 2, '#22140a');
  p.rect(12, 40, 294, 148, '#b8973a').rect(13, 41, 292, 146, '#8c7442');
  p.rect(16, 44, 286, 140, felt.d1);
  for (let y = 44; y < 184; y++) for (let x = 16; x < 302; x++) {
    const n = hash(x, y, 2);
    p.px(x, y, n < 0.12 ? felt.d2 : n > 0.9 ? felt.b : bayer(x, y) < 0.15 ? felt.b : felt.d1);
  }
  // líneas de apuesta desvaídas
  p.rect(190, 60, 100, 1, felt.l1).rect(190, 120, 100, 1, felt.l1).rect(190, 60, 1, 61, felt.l1).rect(290, 60, 1, 61, felt.l1);
  for (let i = 1; i < 3; i++) p.rect(190 + i * 33, 60, 1, 61, felt.l1);
  p.ring(60, 150, 18, felt.l1);
  // candelabro
  p.rect(159, 0, 2, 14, '#150e08');
  p.rect(130, 14, 60, 3, C.brass).rect(130, 14, 60, 1, C.gold);
  for (let i = 0; i < 5; i++) { const x = 134 + i * 13; p.rect(x, 8, 3, 6, '#cfc6a8').rect(x, 8, 1, 6, '#fff0c4'); }
  const flames = [0, 1].map((f) => {
    const l = P();
    for (let i = 0; i < 5; i++) {
      const x = 135 + i * 13;
      l.glow(x, 4, 18, C.lamp, 0.45);
      l.ellipse(x, 4 - (i + f) % 2, 1, 3, '#e8a030').px(x, 3, '#fff6c8').px(x, 5, C.lamp);
    }
    return l;
  });
  return { bg: p.outlineSel('#050a07', 0.4), flames };
}

/** Carpa del tiovivo: lona a rayas que converge, guirnalda y serrín. */
export function drawArena(): { bg: Painter; bulbs: Painter[]; crowd: Painter[] } {
  const p = P();
  p.rect(0, 0, SW, SH, '#140e12');
  for (let y = 0; y < 22; y++) for (let x = 0; x < SW; x++) {
    const a = Math.atan2(y + 30, x - 160);
    const stripe = Math.floor(((a + Math.PI) / Math.PI) * 26) % 2 === 0;
    const d = Math.hypot(x - 160, y + 30) / 190;
    const base = stripe ? '#6a2230' : '#8a7a5e';
    p.px(x, y, darken(base, 0.2 + d * 0.5));
  }
  // festón
  for (let x = 0; x < SW; x += 10) { p.ellipse(x + 5, 22, 5, 3, ((x / 10) % 2 ? '#6a2230' : '#8a7a5e')); }
  p.rect(0, 25, SW, 1, '#0a060a');
  // suelo de serrín
  const sand = ramp('#6e5a3c');
  for (let y = 26; y < SH; y++) for (let x = 0; x < SW; x++) {
    const n = hash(x, y, 4);
    p.px(x, y, n < 0.035 ? sand.d2 : n > 0.975 ? sand.l1 : sand.d1);
  }
  for (let i = 0; i < 6; i++) { p.rect(0, 49 + i * 20, SW, 1, sand.d2); p.rect(0, 50 + i * 20, SW, 1, sand.l1); for (let x = 4; x < SW; x += 12) p.rect(x, 39 + i * 20, 5, 1, sand.d2); }
  p.rect(0, 150, SW, 50, '#0a0608');
  // valla
  p.rect(0, 150, SW, 3, '#3c2f20').rect(0, 150, SW, 1, '#5e4a30');
  for (let x = 0; x < SW; x += 24) p.rect(x, 150, 3, 20, '#2e2418').rect(x, 150, 1, 20, '#4a3a28');
  p.outlineSel('#0a060a', 0.5);
  const bulbs = [0, 1].map((f) => {
    const b = P();
    for (let x = 5; x < SW; x += 10) { const lit = (x / 10 + f) % 2 === 0; b.rect(x - 1, 26, 3, 3, lit ? '#fff6c8' : '#6e5a22'); if (lit) b.glow(x, 27, 7, C.lamp, 0.4); }
    return b;
  });
  const crowd = [0, 1].map((f) => {
    const c = P();
    const tones = ['#1a1218', '#241a22', '#15101a', '#2a1c20'];
    for (let x = 3; x < SW; x += 6) {
      const i = Math.floor(x / 6), up = (i + f) % 2 === 0, tone = tones[i % 4] as string;
      const y = 14 - (up ? 1 : 0);
      c.ellipse(x + 2, y + 1, 2, 2, tone).rect(x - 1, y + 3, 6, 6, tone).px(x + 1, y, '#3a2c34');
      if (up) c.rect(x - 2, y - 3, 1, 5, tone).rect(x + 5, y - 2, 1, 4, tone);
    }
    return c;
  });
  return { bg: p, bulbs, crowd };
}

/** Sala de Deudores: ladrillo viejo, cortina sangre, baldosas en perspectiva y foco. */
export function drawDuelRoom(): { bg: Painter; beam: Painter } {
  const p = P();
  const brick = ramp('#3a1e22');
  for (let y = 0; y < 140; y++) for (let x = 0; x < SW; x++) {
    const row = Math.floor(y / 6), off = row % 2 ? 6 : 0;
    const bx = Math.floor((x + off) / 14), mortar = y % 6 === 0 || (x + off) % 14 === 0;
    const n = hash(bx, row, 3);
    const c = mortar ? '#120a0e' : n < 0.3 ? brick.d1 : n > 0.75 ? brick.l1 : brick.b;
    p.px(x, y, darken(c, 0.3 + Math.abs(x - 160) / 160 * 0.45));
  }
  for (let y = 0; y < 140; y++) for (let x = 0; x < SW; x++) if (bayer(x, y) < Math.pow(1 - y / 140, 2) * 0.5) p.px(x, y, '#050205');
  // cortina de fondo
  for (let x = 90; x < 230; x++) {
    const wave = Math.sin(x * 0.55) * 0.5 + 0.5;
    const col = wave > 0.75 ? '#7a1e1e' : wave > 0.45 ? '#561212' : wave > 0.2 ? '#3a0a0c' : '#230608';
    p.rect(x, 10, 1, 132, col);
  }
  p.rect(90, 8, 140, 6, '#2a0608').rect(90, 8, 140, 1, C.brass);
  for (let x = 90; x < 230; x += 4) p.px(x, 14, '#b8973a');
  // suelo ajedrezado en perspectiva
  for (let y = 140; y < SH; y++) {
    const t = (y - 140) / 60;
    const sz = 8 + t * 18;
    for (let x = 0; x < SW; x++) {
      const px = (x - 160) / (1 + t * 0.9);
      const cx = Math.floor(px / (sz * 0.6) + 50), cy = Math.floor((y - 140) / (3 + t * 5));
      p.px(x, y, (cx + cy) % 2 === 0 ? mix('#1a0a10', '#3a1018', t) : mix('#050204', '#0c0508', t));
    }
  }
  p.rect(0, 139, SW, 2, '#0a0508');
  p.outlineSel('#050205', 0.4);
  const beam = P();
  beam.poly([[148, 0], [172, 0], [226, 170], [94, 170]], '#fff0c4');
  // dejar solo un tramado: rejilla de puntos
  const b2 = P();
  b2.ctx.globalAlpha = 0.09;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    if ((beam.ctx.getImageData(x, y, 1, 1).data[3] as number) > 0 && bayer(x, y) < 0.7) b2.px(x, y, '#fff0c4');
  }
  return { bg: p, beam: b2 };
}

/** Cielo del amanecer con tramado y colinas; el sol va aparte para animarlo. */
export function drawDawnSky(): { bg: Painter; sun: Painter } {
  const p = P();
  const stops = ['#120a24', '#2a1840', '#5a2a52', '#a04658', '#e07c50', '#f4b868'];
  for (let y = 0; y < 150; y++) {
    const t = (y / 150) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(t)), f = t - i;
    for (let x = 0; x < SW; x++) p.px(x, y, bayer(x, y) < f ? (stops[i + 1] as string) : (stops[i] as string));
  }
  for (let i = 0; i < 40; i++) { const x = Math.floor(hash(i, 21) * SW), y = Math.floor(hash(i, 22) * 50); p.px(x, y, '#cfc6e8'); }
  [['#4a2a4a', 128, 18], ['#2a1a34', 140, 14], ['#150e1d', 150, 10]].forEach(([col, base, amp], k) => {
    for (let x = 0; x < SW; x++) {
      const h = (amp as number) + Math.sin(x * 0.04 + k * 2) * ((amp as number) * 0.5) + Math.sin(x * 0.13 + k) * 3;
      p.rect(x, Math.round((base as number) - h), 1, SH, col as string);
    }
  });
  p.rect(0, 150, SW, 50, '#0c0812');
  p.scatter(0, 150, SW, 50, '#150e1d', 0.15, 3);
  const sun = new Painter(80, 80);
  sun.glow(40, 40, 38, '#f4d890', 0.7);
  sun.shadedEllipse(40, 40, 16, 16, ramp('#f0b050'), [-0.2, -0.6]);
  return { bg: p.outlineSel('#0a0610', 0.3), sun };
}

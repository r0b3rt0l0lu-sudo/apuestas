import { C } from '../config';
import { Painter, bayer, hash, lighten, mix, ramp } from './painter';

export type Mood = 'acecho' | 'sonrisa' | 'cobra';
export const MOODS: readonly Mood[] = ['acecho', 'sonrisa', 'cobra'];
export const SIZE = 96;

const K = '#06020a';
const COIN = ramp('#dccfa4'), BRASS = ramp('#a89870'), VERD = ramp('#5a8a4a'), BONE = ramp('#e8dcc0');
const COAT = ramp('#241632'), HAT = ramp('#2a1c38'), INK = ramp('#160a24'), RED = ramp('#c8281c');
const HC = { x: 48, y: 47, r: 30 }; // moneda-cabeza
const LS = { x: 34, y: 47 }; // cuenca vacía
const RE = { x: 62, y: 45 }; // ojo del monóculo
const P = () => new Painter(SIZE, SIZE);

/** Trazado de la grieta principal (la que sangra tinta). */
export const CRACK: ReadonlyArray<readonly [number, number]> = [
  [47, 16], [46, 19], [45, 22], [46, 25], [48, 28], [49, 31], [48, 34], [46, 37], [46, 40], [47, 43], [48, 46]
];

function pts(cx: number, cy: number, r: number, n: number, a0 = 0): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2;
    return [Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)];
  });
}

/** Cuerpo: levita negra y rota que se funde con la oscuridad, hombros de cuervo. */
export function drawBody(): Painter {
  const p = P();
  p.fillBevel([[0, 96], [8, 80], [22, 72], [34, 68], [62, 68], [74, 72], [88, 80], [96, 96]], COAT);
  // solapas y botones-moneda
  p.fillBevel([[34, 70], [47, 74], [44, 96], [28, 96]], ramp('#2a1a38'), { depth: 1 });
  p.fillBevel([[62, 70], [49, 74], [52, 96], [68, 96]], ramp('#2a1a38'), { depth: 1 });
  p.rect(47, 74, 2, 22, K);
  [[48, 80], [48, 87], [48, 94]].forEach(([x, y]) => p.shadedEllipse(x!, y!, 2, 2, COIN));
  // cuello alto y corbatín sangre
  p.fillBevel([[38, 62], [58, 62], [60, 74], [36, 74]], COAT, { depth: 1 });
  p.poly([[40, 70], [48, 73], [40, 78]], RED.b).poly([[56, 70], [48, 73], [56, 78]], RED.d1);
  p.px(48, 73, RED.l2).rect(41, 71, 5, 1, RED.l1);
  // reloj de bolsillo
  p.line(30, 80, 38, 76, COIN.b);
  p.shadedEllipse(27, 82, 4, 4, COIN);
  p.px(27, 82, K).px(28, 81, COIN.l2);
  // jirones al fondo y desvanecido a transparencia (sin grises)
  for (let y = 84; y < 96; y++) for (let x = 0; x < 96; x++) {
    const cov = (y - 84) / 12 + (hash(x >> 1, y, 7) - 0.5) * 0.7;
    if (bayer(x, y) < cov) p.erase(x, y, 1, 1);
  }
  return p.outlineSel(K, 0.9);
}

/** Zarcillos de sombra que suben desde los hombros (4 fotogramas de ondulación). */
export function drawTendrils(frame: number): Painter {
  const p = P();
  const roots: Array<[number, number, number]> = [[12, 84, -1], [20, 78, -1], [28, 72, -1], [68, 72, 1], [76, 78, 1], [84, 84, 1], [6, 90, -1], [90, 90, 1]];
  roots.forEach(([x0, y0, dir], i) => {
    const len = 26 + (i % 3) * 7;
    for (let t = 0; t < len; t++) {
      const k = t / len;
      const x = x0 + dir * (t * 0.5 + Math.sin(k * 5 + frame * 1.571 + i) * 3 * k);
      const y = y0 - t * 1.05;
      const w = Math.max(1, Math.round(3 * (1 - k)));
      p.rect(Math.round(x), Math.round(y), w, 1, INK.d2);
      if (w > 1) p.px(Math.round(x), Math.round(y), INK.b);
    }
  });
  return p;
}

/** Cara: moneda corroída con relieve, cuencas, monóculo, cardenillo y grietas. */
export function drawHead(): Painter {
  const p = P();
  const { x: cx, y: cy, r } = HC;
  p.shadedEllipse(cx, cy, r, r, COIN, [-0.5, -0.7]);
  pts(cx, cy, r, 150).forEach(([x, y], i) => { if (i % 2 === 0) p.px(x, y, COIN.d2); });
  pts(cx, cy, r - 1, 150).forEach(([x, y], i) => { if (i % 2 === 1) p.px(x, y, COIN.d1); });
  pts(cx, cy, 25, 120).forEach(([x, y]) => p.px(x, y, COIN.d2));
  pts(cx, cy, 24, 120).forEach(([x, y]) => p.px(x, y, COIN.l1));
  pts(cx, cy, 27, 84).forEach(([x, y], i) => { if (i % 3 !== 2) p.px(x, y, i % 2 ? COIN.d1 : COIN.l1); }); // leyenda
  // meseta de la cara: bandas duras y rayones
  for (let y = -24; y <= 24; y++) for (let x = -24; x <= 24; x++) {
    const d = Math.hypot(x, y); if (d > 23.5) continue;
    const lt = (-x - y) / 34 + 0.45 - d / 70;
    const n = hash(cx + x, cy + y, 11);
    p.px(cx + x, cy + y, lt > 0.62 ? COIN.l1 : lt < 0.14 ? COIN.d1 : COIN.b);
    if (n < 0.035) p.px(cx + x, cy + y, COIN.d2);
    else if (n > 0.985) p.px(cx + x, cy + y, COIN.l2);
  }
  for (let i = 0; i < 14; i++) { const a = hash(i, 3) * 6.28, d0 = 8 + hash(i, 4) * 12; p.line(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0, cx + Math.cos(a) * (d0 + 5), cy + Math.sin(a) * (d0 + 5), COIN.d1); }
  // cardenillo que trepa desde el borde
  const verd = (bx: number, by: number, rx: number, ry: number) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1) continue;
      if (hash(bx + x, by + y, 9) < 0.85 - d * 0.5) p.px(bx + x, by + y, d < 0.3 ? VERD.l1 : d < 0.7 ? VERD.b : VERD.d1);
    }
  };
  verd(24, 32, 6, 5); verd(76, 62, 7, 6); verd(30, 72, 7, 4); verd(68, 26, 5, 6); verd(52, 76, 6, 3);
  // arcos de las cejas, nariz en relieve y mejillas hundidas
  p.line(23, 38, 33, 34, COIN.l2).line(33, 34, 44, 38, COIN.l1);
  p.line(23, 40, 33, 36, COIN.d2).line(33, 36, 44, 40, COIN.d2);
  p.line(48, 40, 48, 57, COIN.l1).line(49, 40, 49, 57, COIN.d2).px(46, 59, K).px(47, 59, K).px(50, 59, K).px(51, 59, K);
  for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
    if (Math.hypot(x, y) < 9 && bayer(x, y) < 0.45 * (1 - Math.hypot(x, y) / 9)) { p.px(LS.x - 2 + x, 61 + y, COIN.d2); p.px(RE.x + 2 + x, 59 + y, COIN.d2); }
  }
  // cuenca vacía: negro absoluto con bisel
  p.ellipse(LS.x, LS.y, 10, 11, COIN.d2).ellipse(LS.x, LS.y, 9, 10, K);
  p.px(LS.x - 8, LS.y - 5, COIN.l1).px(LS.x - 7, LS.y - 7, COIN.l1).px(LS.x - 5, LS.y - 9, COIN.l2);
  // monóculo
  p.shadedEllipse(RE.x, RE.y, 14, 14, BRASS);
  p.ellipse(RE.x, RE.y, 11, 11, K);
  pts(RE.x, RE.y, 12, 80).forEach(([x, y]) => p.px(x, y, COIN.l1));
  pts(RE.x, RE.y, 13, 80).forEach(([x, y], i) => i % 2 === 0 && p.px(x, y, COIN.d1));
  // grietas
  const crack = (path: Array<[number, number]>, w = 1) => { for (let i = 0; i + 1 < path.length; i++) p.line(path[i]![0], path[i]![1], path[i + 1]![0], path[i + 1]![1], K, w); };
  crack(CRACK.map(([x, y]) => [x, y] as [number, number]), 2);
  crack([[45, 22], [39, 24], [34, 28], [30, 33]]); crack([[48, 28], [55, 27], [59, 31]]);
  crack([[70, 55], [66, 62], [70, 68], [64, 74], [60, 78]]); crack([[26, 54], [23, 62], [28, 68], [26, 74]]);
  crack([[40, 68], [38, 74], [42, 80]]);
  return p.outlineSel(K, 0.88);
}

export function drawHat(frame: 0 | 1): Painter {
  const p = P();
  const s = frame;
  p.fillBevel([[34 + s, 24], [37 + s, 3], [62 + s, 5], [62, 24]], HAT);
  p.rect(38 + s, 6, 2, 16, HAT.l1).rect(40 + s, 6, 1, 16, HAT.l2);
  p.ellipse(49 + s, 5, 12, 2, HAT.l1).ellipse(49 + s, 4, 9, 1, HAT.l2);
  // cinta con puntadas
  p.rect(35, 17, 28, 4, RED.d1).rect(35, 17, 28, 1, RED.b);
  for (let x = 36; x < 62; x += 3) p.px(x, 19, K);
  // ala deformada
  p.ellipse(48, 26, 25, 5, HAT.d1).ellipse(48, 25, 25, 5, HAT.b);
  for (let x = 24; x <= 72; x++) { const t = Math.abs(x - 48) / 25; p.px(x, 21 + Math.round(t * t * 3), HAT.l1); }
  p.ellipse(48, 27, 22, 3, K);
  // agujeros y rasgones
  p.erase(44 + s, 8, 3, 4).erase(53 + s, 11, 2, 3).erase(27, 25, 3, 2).erase(66, 27, 2, 2);
  p.line(41 + s, 12, 38, 18, K).line(57 + s, 6, 60, 12, K);
  // pagaré «DEBE» clavado
  p.poly([[62, 8], [78, 11], [75, 28], [60, 25]], BONE.l2);
  p.line(62, 8, 78, 11, BONE.d1).line(60, 25, 75, 28, BONE.d1);
  [[64, 13], [66, 13], [68, 13], [71, 14], [64, 17], [67, 17], [69, 18], [72, 18], [65, 22], [70, 23]].forEach(([x, y]) => p.px(x!, y!, RED.b));
  p.shadedEllipse(68, 10, 2, 2, ramp(C.brass)); // clavo
  return p.outlineSel(K, 0.9);
}

/** Globo del ojo del monóculo (la mirada se pinta aparte para poder seguir el ratón). */
export function drawEyeWhite(mood: Mood): Painter {
  const p = P();
  const sc = mood === 'cobra' ? ramp('#e8a890') : ramp('#e8dcb0');
  const r = mood === 'cobra' ? 10 : 9;
  p.shadedEllipse(RE.x, RE.y, r, r, sc, [-0.35, -0.5]);
  const vein = mood === 'cobra' ? '#ff3020' : '#b02a22';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 6.28 + 0.3;
    p.line(RE.x + Math.cos(a) * r, RE.y + Math.sin(a) * r, RE.x + Math.cos(a) * (r - 4 - (i % 3)), RE.y + Math.sin(a) * (r - 4 - (i % 3)), vein);
    if (i % 2) p.px(RE.x + Math.cos(a + 0.2) * (r - 2), RE.y + Math.sin(a + 0.2) * (r - 2), vein);
  }
  if (mood === 'sonrisa') { // mejilla que sube y entorna el ojo
    p.poly([[RE.x - 11, RE.y + 3], [RE.x + 11, RE.y + 3], [RE.x + 11, RE.y + 12], [RE.x - 11, RE.y + 12]], COIN.b);
    p.line(RE.x - 10, RE.y + 3, RE.x + 10, RE.y + 3, COIN.d2);
    p.poly([[RE.x - 11, RE.y - 12], [RE.x + 11, RE.y - 12], [RE.x + 9, RE.y - 5], [RE.x - 9, RE.y - 5]], COIN.d1);
  }
  // reflejo en el cristal
  p.px(RE.x - 6, RE.y - 7, '#fff').px(RE.x - 5, RE.y - 8, '#fff').px(RE.x - 7, RE.y - 6, '#fff');
  return p;
}

/** Pupila + iris como sprite aparte de 12×14 (se desplaza hacia el puntero). */
export function drawPupil(mood: Mood): Painter {
  const p = new Painter(12, 14);
  const iris = mood === 'cobra' ? ramp('#d01810') : mood === 'sonrisa' ? ramp('#e08820') : ramp('#d86a18');
  p.shadedEllipse(6, 7, 5, 6, iris, [-0.3, -0.5]);
  const w = mood === 'cobra' ? 1 : 2;
  p.rect(6 - Math.floor(w / 2), 1, w, 12, K);
  p.px(3, 4, '#fff6c8');
  return p;
}

export function drawLid(frame: number): Painter {
  const p = P();
  if (frame === 0) return p;
  const { x, y } = RE;
  if (frame === 1) {
    p.poly([[x - 11, y - 11], [x + 11, y - 11], [x + 11, y - 1], [x - 11, y - 1]], COIN.d1);
    p.line(x - 10, y - 1, x + 10, y - 1, K);
    for (let i = -9; i <= 9; i += 3) p.px(x + i, y, K);
  } else {
    p.ellipse(x, y, 10, 10, COIN.d1);
    p.line(x - 10, y, x + 10, y, K).line(x - 10, y + 1, x + 10, y + 1, COIN.d2);
    for (let i = -9; i <= 9; i += 2) p.px(x + i, y + 2, K).px(x + i, y + 3, K);
  }
  return p;
}

/** Luz diminuta en el fondo de la cuenca vacía: algo hay dentro. */
export function drawSocketLight(frame: number, red: boolean): Painter {
  const p = P();
  const c = red ? '#ff3a20' : '#a02818';
  if (frame === 0) { p.px(LS.x - 3, LS.y - 2, c); if (red) p.px(LS.x - 2, LS.y - 2, c); }
  if (frame === 1) { p.px(LS.x + 2, LS.y + 3, c).px(LS.x + 3, LS.y + 3, mix(c, K, 0.5)); }
  if (frame === 2) { p.px(LS.x - 1, LS.y + 1, c).px(LS.x + 1, LS.y - 3, mix(c, K, 0.4)); }
  return p;
}

/** Tercer ojo en la frente: cerrado, entreabierto y abierto. */
export function drawThird(frame: number): Painter {
  const p = P();
  const x = 48, y = 35;
  if (frame === 0) { p.line(x - 4, y, x + 4, y, K); for (let i = -3; i <= 3; i += 2) p.px(x + i, y + 1, K); return p; }
  if (frame === 1) { p.ellipse(x, y, 4, 1, '#3a0a0a'); p.px(x, y, '#ff3020').line(x - 5, y - 1, x + 5, y - 1, K); return p; }
  p.ellipse(x, y, 5, 3, K).ellipse(x, y, 4, 2, '#e8a890').ellipse(x, y, 2, 2, '#e02010');
  p.rect(x, y - 2, 1, 5, K).px(x - 3, y - 1, '#ff6050');
  for (let i = -4; i <= 4; i += 2) p.px(x + i, y - 4 + Math.abs(i) / 3, K);
  return p;
}

export function drawBrow(mood: Mood): Painter {
  const p = P();
  if (mood === 'cobra') {
    p.line(22, 33, 34, 40, K, 2).line(76, 32, 63, 40, K, 2).line(49, 30, 48, 36, K);
  } else if (mood === 'sonrisa') {
    p.line(23, 38, 34, 34, K, 2).line(54, 32, 62, 31, K, 2).line(62, 31, 72, 35, K, 2);
  } else {
    p.line(23, 38, 34, 35, K, 2).line(52, 35, 62, 33, K).line(62, 33, 73, 34, K, 2);
  }
  return p;
}

function curveY(x: number, x0: number, x1: number, yEnd: number, yMid: number): number {
  const t = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
  return Math.round(yMid + (yEnd - yMid) * t * t);
}

/** Boca cosida con dientes de aguja; en `cobra` la mandíbula se descuelga (frames 0..3). */
export function drawMouth(mood: Mood, frame: number): Painter {
  const p = P();
  const x0 = mood === 'acecho' ? 27 : 20, x1 = mood === 'acecho' ? 69 : 76;
  const yEnd = mood === 'acecho' ? 66 : 61, yMid = mood === 'sonrisa' ? 70 : 67;
  const open = mood === 'cobra' ? [3, 7, 15, 24][frame] as number : mood === 'sonrisa' ? 4 + (frame % 2) : 2 + (frame % 2);
  for (let x = x0; x <= x1; x++) {
    const yc = curveY(x, x0, x1, yEnd, mood === 'cobra' ? 66 : yMid);
    const t = Math.abs(x - 48) / 28;
    const h = Math.max(1, Math.round(open * (1 - t * t * 0.75)));
    p.rect(x, yc - Math.floor(h / 2), 1, h, K);
    // dientes: arriba cuelgan, abajo suben (desfasados y de altura irregular)
    if (x % 3 === 0) {
      const th = 2 + Math.floor(hash(x, 5) * 3) + (mood === 'acecho' ? 0 : 1);
      p.rect(x, yc - Math.floor(h / 2), 1, th, BONE.l2).px(x, yc - Math.floor(h / 2) + th, BONE.d1);
    }
    if (x % 3 === 1) {
      const th = 2 + Math.floor(hash(x, 6) * 3) + (mood === 'acecho' ? 0 : 1);
      p.rect(x, yc + Math.ceil(h / 2) - th, 1, th, BONE.l1).px(x, yc + Math.ceil(h / 2) - th - 1, BONE.d1);
    }
  }
  if (mood === 'cobra' && frame >= 2) { // lengua de ceniza y ojillos en la oscuridad
    p.ellipse(48, 66 + Math.floor(open / 3), 7, 2, '#5a0a10');
    if (frame === 3) { [[40, 68], [56, 68], [48, 74]].forEach(([x, y]) => p.px(x!, y!, '#ff2a1a').px(x! + 1, y!, '#ff2a1a')); }
  }
  // puntadas: hilo que atraviesa los labios
  for (let x = x0 + 3; x <= x1 - 3; x += 6) {
    const yc = curveY(x, x0, x1, yEnd, mood === 'cobra' ? 66 : yMid);
    const half = mood === 'cobra' && frame >= 2 ? Math.floor(open / 2) + 3 : 4;
    if (mood === 'cobra' && frame === 3) { p.line(x, yc - half, x - 1, yc - half + 3, '#2a1a10'); continue; } // hilos rotos
    p.rect(x, yc - half, 1, half * 2, '#2a1a10').px(x, yc - half, '#7a6a50').px(x, yc + half, '#7a6a50');
  }
  return p;
}

export function drawGlow(frame: 0 | 1, red: boolean): Painter {
  const p = P();
  CRACK.forEach(([x, y], i) => {
    if ((i + frame) % 2 === 0) p.px(x, y, red ? '#ff3020' : '#ffb040').px(x + 1, y, red ? '#a01408' : '#c88020');
  });
  return p;
}

/** Tinta negra que rezuma de la grieta y gotea por la cara (4 fotogramas). */
export function drawOoze(frame: number): Painter {
  const p = P();
  const x = 48;
  const len = [3, 11, 22, 8][frame] as number;
  p.rect(x - 1, 46, 3, len, INK.b).rect(x, 46, 1, len, INK.d2).px(x - 1, 47, INK.l1).px(x - 1, 49, INK.l1);
  p.ellipse(x, 46 + len, 2, 2, INK.b).px(x - 1, 45 + len, INK.l2);
  if (frame === 3) p.ellipse(x, 70, 1, 2, INK.b).px(x, 69, INK.l2); // gota suelta
  if (frame === 0) p.ellipse(x, 48, 2, 2, INK.b).px(x - 1, 47, INK.l1);
  return p;
}

export function drawHalo(frame: 0 | 1, red: boolean): Painter {
  const p = P();
  const c = red ? '#ff3020' : '#e8a030';
  pts(RE.x, RE.y, 15.2, 48).forEach(([x, y], i) => (i + frame) % 2 === 0 && p.px(x, y, c));
  if (frame === 1) pts(RE.x, RE.y, 16.4, 48).forEach(([x, y], i) => i % 3 === 0 && p.px(x, y, mix(c, K, 0.5)));
  return p;
}

function finger(p: Painter, x: number, y: number, ang: number, segs: number[], curl: number): void {
  let cx = x, cy = y, a = ang;
  segs.forEach((len, i) => {
    const nx = cx + Math.sin(a) * len, ny = cy - Math.cos(a) * len;
    p.line(cx + 1, cy, nx + 1, ny, BONE.d1, 2).line(cx, cy, nx, ny, BONE.b, 2).line(cx - 1, cy, nx - 1, ny, BONE.l1, 1);
    p.px(Math.round(nx), Math.round(ny), BONE.l2);
    cx = nx; cy = ny; a += curl * (i + 1);
  });
  p.px(Math.round(cx), Math.round(cy), K); // uña negra
}

/** Mano derecha (del espectador): dedos larguísimos que tamborilean uno a uno. */
export function drawRightHand(frame: number): Painter {
  const p = P();
  p.fillBevel([[78, 96], [80, 80], [90, 72], [96, 96]], COAT); // manga
  p.fillBevel([[74, 72], [92, 70], [92, 80], [76, 82]], BONE, { depth: 1 });
  for (let i = 0; i < 4; i++) {
    const lift = frame === i;
    finger(p, 77 + i * 5, 71, -0.1 + i * 0.07, lift ? [8, 6, 3] : [9, 8, 6], lift ? 0.55 : 0.12);
  }
  finger(p, 74, 78, -0.9, [7, 6], 0.2); // pulgar
  p.shadedEllipse(90, 76, 3, 3, ramp(C.gold)); // anillo
  return p.outlineSel(K, 0.9);
}

/** Mano izquierda: cuelga con dedos goteando, se crispa en el segundo fotograma. */
export function drawLeftHand(frame: number): Painter {
  const p = P();
  p.fillBevel([[0, 92], [2, 78], [14, 72], [18, 92]], COAT);
  p.fillBevel([[2, 86], [16, 86], [16, 92], [2, 92]], BONE, { depth: 1 });
  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 4, tw = frame ? (i % 2 ? 0.25 : -0.25) : 0;
    finger(p, x, 92, Math.PI + 0.05 * (i - 1.5) + tw, [8, 8, 6], 0.05);
  }
  return p.outlineSel(K, 0.9);
}

/** Moneda colgando de un hilo del pulgar; oscila (4 fotogramas). */
export function drawPendulum(frame: number): Painter {
  const p = P();
  const off = [-5, 0, 5, 0][frame] as number;
  const cx = 74 + off, cy = 92;
  p.line(74, 80, cx, cy - 4, '#7a6a50');
  p.shadedEllipse(cx, cy, 4, 4, COIN);
  p.px(cx, cy, K).px(cx - 1, cy - 1, COIN.l2);
  return p.outlineSel(K, 0.85);
}

/** Cadena del monóculo, balanceándose (3 fotogramas). */
export function drawChain(frame: number): Painter {
  const p = P();
  const sw = [-2, 0, 2][frame] as number;
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = 70 + Math.sin(t * 2.4) * 6 + sw * t, y = 56 + t * 26;
    p.px(Math.round(x), Math.round(y), i % 2 ? COIN.b : COIN.l1).px(Math.round(x) + 1, Math.round(y), COIN.d2);
  }
  return p;
}

export function drawMoth(frame: 0 | 1): Painter {
  const p = new Painter(11, 8);
  const w = frame === 0 ? [[1, 1], [2, 1], [1, 2], [2, 2], [3, 3], [9, 1], [8, 1], [9, 2], [8, 2], [7, 3]] : [[1, 5], [2, 5], [1, 4], [2, 4], [3, 4], [9, 5], [8, 5], [9, 4], [8, 4], [7, 4]];
  w.forEach(([x, y], i) => p.px(x!, y!, i % 3 === 0 ? BONE.l2 : BONE.b));
  p.rect(4, 2, 3, 5, BONE.d1).px(5, 1, K).px(4, 0, K).px(6, 0, K);
  p.px(2, frame === 0 ? 2 : 4, '#e02010').px(8, frame === 0 ? 2 : 4, '#e02010');
  return p;
}

export function drawGlint(): Painter {
  return P().px(RE.x - 8, RE.y - 9, '#fff').px(RE.x - 7, RE.y - 10, '#fff').px(RE.x - 9, RE.y - 8, '#fff').px(RE.x + 7, RE.y + 6, '#fff').px(RE.x + 8, RE.y + 5, '#fff');
}

/** Todas las capas fijas de una expresión en un solo lienzo (sirve para glitch y vista previa). */
export function composeStill(mood: Mood, o: { frame?: number; pupil?: [number, number] } = {}): Painter {
  const p = P();
  p.blit(drawTendrils(o.frame ?? 0)).blit(drawBody()).blit(drawLeftHand(0)).blit(drawHead());
  p.blit(drawSocketLight(0, mood === 'cobra')).blit(drawEyeWhite(mood));
  const pu = drawPupil(mood), [dx, dy] = o.pupil ?? [0, 0];
  p.ctx.drawImage(pu.canvas, RE.x - 6 + dx, RE.y - 7 + dy);
  p.blit(drawBrow(mood)).blit(drawThird(mood === 'cobra' ? 2 : 0)).blit(drawMouth(mood, mood === 'cobra' ? 3 : 0));
  p.blit(drawGlow(0, mood === 'cobra')).blit(drawOoze(1)).blit(drawHalo(0, mood === 'cobra')).blit(drawHat(0)).blit(drawRightHand(1)).blit(drawPendulum(1)).blit(drawChain(1));
  return p;
}

/** Fotograma glitch: la cara verdadera. `soft` no desplaza ni invierte franjas. */
export function drawGlitch(mood: Mood, soft: boolean): Painter {
  const p = composeStill('cobra', { pupil: [0, 2] });
  // ojos extra por todo el rostro y boca desbordada
  ([[24, 32], [74, 60], [30, 72], [70, 28], [52, 76], [20, 56]] as const).forEach(([x, y]) => { p.ellipse(x, y, 2, 1, '#e8a890').px(x, y, '#e02010'); });
  p.line(10, 58, 20, 74, K, 2).line(20, 74, 48, 84, K, 2).line(48, 84, 76, 74, K, 2).line(76, 74, 86, 58, K, 2);
  for (let i = 0; i < 12; i++) { p.px(12 + i * 6, 62 + Math.round(Math.sin(i / 11 * Math.PI) * 18), BONE.l2); }
  p.shadedEllipse(LS.x, LS.y, 7, 8, ramp('#d01810')); p.ellipse(LS.x, LS.y, 2, 5, K);
  if (!soft) {
    const copy = new Painter(SIZE, SIZE).blit(p);
    p.erase(0, 36, SIZE, 10).ctx.drawImage(copy.canvas, 0, 36, SIZE, 10, 6, 36, SIZE, 10);
    p.ctx.globalCompositeOperation = 'difference';
    p.rect(14, 62, 68, 3, '#30c0ff');
    p.ctx.globalCompositeOperation = 'source-over';
  }
  void mood;
  return p;
}

export const lightenC = lighten;

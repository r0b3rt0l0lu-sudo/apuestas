import { C } from '../config';
import { Painter, bayer, darken, hash, lighten, ramp } from './painter';

export type Mood = 'acecho' | 'sonrisa' | 'cobra';
export const MOODS: readonly Mood[] = ['acecho', 'sonrisa', 'cobra'];
export const SIZE = 64;

const K = '#0d0a0e';
const GOLD = ramp(C.gold), BRASS = ramp(C.brass), PATINA = ramp(C.patina), BONE = ramp(C.bone);
const COAT = ramp('#2a2036'), HAT = ramp('#1f1828'), RED = ramp(C.danger);
const CX = 32, CY = 33; // centro de la moneda

const CRACK: ReadonlyArray<readonly [number, number]> = [
  [41, 17], [40, 18], [40, 19], [39, 20], [39, 21], [38, 22], [37, 23], [37, 24], [36, 25], [35, 26], [35, 27], [34, 28], [34, 29], [33, 30]
];

const P = () => new Painter(SIZE, SIZE);

function circle(cx: number, cy: number, r: number, steps = 72): Array<[number, number]> {
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)];
  });
}

/** Moneda, chistera, levita, mano y monóculo: lo que no cambia con la expresión. */
export function drawBase(): Painter {
  const p = P();
  // levita (hombros) con solapas y botones
  p.fillBevel([[4, 63], [10, 54], [22, 49], [42, 49], [54, 54], [60, 63]], COAT);
  p.fillBevel([[20, 51], [30, 52], [27, 63], [14, 63]], ramp('#3a2c4a'), { depth: 1 });
  p.fillBevel([[44, 51], [34, 52], [37, 63], [50, 63]], ramp('#3a2c4a'), { depth: 1 });
  p.rect(31, 54, 2, 9, K);
  [[31, 57], [31, 60]].forEach(([x, y]) => p.shadedEllipse(x!, y!, 1, 1, GOLD));
  // camisa y corbatín
  p.poly([[28, 50], [36, 50], [32, 58]], BONE.l1).poly([[30, 50], [34, 50], [32, 55]], BONE.b);
  p.poly([[26, 51], [32, 53], [26, 56]], RED.b).poly([[38, 51], [32, 53], [38, 56]], RED.d1);
  p.rect(26, 51, 6, 1, RED.l1).shadedEllipse(32, 53, 1, 1, RED.d1 ? ramp(C.blood) : RED);
  // reloj de bolsillo con cadena
  p.line(14, 57, 22, 53, GOLD.b);
  p.line(14, 58, 22, 54, GOLD.d1);
  p.shadedEllipse(13, 58, 3, 3, GOLD);
  p.px(13, 58, K).px(13, 57, GOLD.l2).px(14, 58, GOLD.l2);
  // chistera
  p.fillBevel([[22, 14], [24, 3], [40, 3], [42, 14]], HAT);
  p.rect(25, 4, 1, 9, HAT.l2).rect(26, 4, 1, 9, HAT.l1);
  p.ellipse(32, 3, 8, 1, HAT.l1).ellipse(32, 3, 6, 0, HAT.l2);
  p.fillBevel([[22, 11], [42, 11], [43, 14], [21, 14]], ramp(C.blood), { grad: false, depth: 1 }); // cinta
  p.rect(22, 11, 21, 1, RED.b);
  p.ellipse(32, 17, 18, 3, HAT.d1).ellipse(32, 16, 18, 3, HAT.b);
  for (let x = 15; x <= 49; x++) { const t = Math.abs(x - 32) / 18; p.px(x, 14 + Math.round(t * 0.8), HAT.l1); }
  p.ellipse(32, 17, 17, 2, HAT.d1);
  // rasgones y agujeros
  p.erase(27, 6, 2, 3).erase(35, 8, 1, 3).erase(18, 16, 2, 1).erase(44, 17, 2, 1);
  p.rect(36, 4, 1, 2, K);
  // pagaré «DEBE»
  p.poly([[41, 8], [50, 10], [48, 20], [39, 18]], BONE.l2);
  p.line(41, 8, 50, 10, BONE.d1).line(39, 18, 48, 20, BONE.d1);
  [[42, 11], [43, 11], [45, 11], [47, 12], [42, 14], [44, 14], [45, 15], [47, 15], [43, 17], [46, 17]].forEach(([x, y]) => p.px(x!, y!, C.danger));
  // moneda: sombreado esférico + canto estriado
  p.shadedEllipse(CX, CY, 18, 18, GOLD);
  circle(CX, CY, 18, 90).forEach(([x, y], i) => { if (i % 2 === 0) p.px(x, y, GOLD.d2); });
  circle(CX, CY, 17, 90).forEach(([x, y], i) => { if (i % 2 === 1) p.px(x, y, GOLD.d1); });
  // cara plana con reborde y leyenda
  p.ring(CX, CY, 15, GOLD.d2).ring(CX, CY, 14.4, GOLD.d1);
  circle(CX, CY, 16, 64).forEach(([x, y], i) => p.px(x, y, i % 4 < 2 ? GOLD.d1 : GOLD.l1));
  p.ellipse(CX, CY, 13, 13, GOLD.b);
  for (let y = -13; y <= 13; y++) for (let x = -13; x <= 13; x++) {
    const d = Math.hypot(x, y); if (d > 13.4) continue;
    const lt = (-x - y) / 18 + 0.4 - d / 40; // luz suave desde arriba izquierda
    const edge = Math.abs(lt - 0.6) < 0.05 || Math.abs(lt - 0.2) < 0.05;
    p.px(CX + x, CY + y, lt > 0.6 ? (edge && bayer(x, y) < 0.5 ? GOLD.b : GOLD.l1) : lt < 0.2 ? (edge && bayer(x, y) < 0.5 ? GOLD.b : GOLD.d1) : GOLD.b);
  }
  // brillo especular
  [[22, 21], [23, 20], [24, 19], [21, 22], [22, 20]].forEach(([x, y]) => p.px(x!, y!, GOLD.l2));
  // cardenillo
  const patch = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1) continue;
      if (hash(cx + x, cy + y, 9) < 0.75 - d * 0.3) p.px(cx + x, cy + y, d < 0.35 ? PATINA.l1 : d < 0.7 ? PATINA.b : PATINA.d1);
    }
  };
  patch(45, 24, 4, 3); patch(21, 46, 4, 3); patch(47, 37, 3, 4); patch(27, 18, 3, 2); patch(38, 46, 3, 2);
  // grieta
  CRACK.forEach(([x, y]) => p.px(x, y, K));
  [[41, 18], [40, 20], [38, 23], [36, 26]].forEach(([x, y]) => p.px(x!, y!, darken(GOLD.d2, 0.5)));
  // cuenca izquierda vacía (profunda, con borde)
  p.ellipse(24, 32, 6, 6, GOLD.d2).ellipse(24, 32, 5, 5, '#07040a');
  p.ellipse(24, 33, 3, 3, '#000');
  [[19, 29], [20, 28], [21, 27]].forEach(([x, y]) => p.px(x!, y!, GOLD.l1));
  // monóculo: aro dorado, cristal y cadena
  p.shadedEllipse(41, 32, 8, 8, BRASS);
  p.ellipse(41, 32, 6, 6, '#c8d0cc');
  p.ellipse(41, 32, 5, 5, '#e8ece0');
  circle(41, 32, 6, 40).forEach(([x, y]) => p.px(x, y, GOLD.l1));
  p.px(46, 30, GOLD.l2).px(47, 31, GOLD.l1);
  for (let i = 0; i < 9; i++) { const t = i / 8; p.px(Math.round(48 + Math.sin(t * 2.4) * 4), Math.round(38 + t * 12), i % 2 ? GOLD.b : GOLD.l1); }
  // mano huesuda a la derecha
  p.fillBevel([[48, 63], [49, 56], [58, 55], [62, 58], [62, 63]], BONE);
  [[53, 55, 3], [56, 56, 3]].forEach(([x, y]) => p.px(x!, y!, GOLD.l1));
  p.rect(54, 57, 3, 2, GOLD.b).px(54, 57, GOLD.l2); // anillo
  return p.outlineSel(K, 0.85);
}

export function drawEye(mood: Mood): Painter {
  const p = P();
  const scl = mood === 'cobra' ? ramp(C.eyeRed) : ramp('#e8e0c8');
  p.shadedEllipse(41, 32, 4, 4, scl, [-0.3, -0.5]);
  if (mood === 'cobra') {
    p.rect(41, 29, 1, 7, K).px(40, 31, C.blood).px(42, 33, C.blood);
    p.ellipse(41, 32, 1, 1, '#2a0808').rect(41, 30, 1, 5, K);
  } else if (mood === 'sonrisa') {
    p.ellipse(41, 33, 2, 2, ramp(C.lamp).b).rect(41, 31, 1, 4, K);
    p.rect(36, 27, 11, 3, BRASS.d1).rect(36, 29, 11, 1, BRASS.b); // párpado entornado
  } else {
    p.ellipse(41, 32, 2, 2, ramp(C.lamp).b).rect(41, 29, 1, 7, K).px(40, 31, ramp(C.lamp).l2);
  }
  return p;
}

export function drawBrow(mood: Mood): Painter {
  const p = P();
  if (mood === 'cobra') {
    p.line(17, 24, 27, 28, K).line(18, 24, 27, 27, GOLD.d2);
    p.line(35, 28, 46, 23, K).line(35, 27, 45, 23, GOLD.d2);
  } else if (mood === 'sonrisa') {
    p.line(17, 26, 21, 23, K).line(21, 23, 28, 25, K);
    p.line(35, 24, 40, 21, K).line(40, 21, 47, 25, K);
  } else {
    p.line(17, 25, 28, 25, K).line(19, 24, 26, 24, GOLD.d2);
    p.line(35, 25, 47, 23, K);
  }
  return p;
}

export function drawMouth(mood: Mood): Painter {
  const p = P();
  if (mood === 'cobra') {
    p.ellipse(32, 44, 9, 5, '#07040a');
    for (let x = 24; x <= 40; x += 2) { p.rect(x, 39, 1, 3, BONE.l2).px(x, 41, BONE.d1); p.rect(x, 47, 1, 3, BONE.l1); }
    p.ellipse(32, 46, 4, 2, ramp(C.blood).b).px(32, 45, RED.b);
    p.line(22, 40, 23, 38, K).line(42, 40, 41, 38, K);
  } else if (mood === 'sonrisa') {
    p.line(21, 40, 24, 43, K).line(24, 43, 32, 46, K).line(32, 46, 40, 43, K).line(40, 43, 43, 40, K);
    for (let x = 25; x <= 39; x += 2) { p.rect(x, 43 + Math.round(Math.abs(x - 32) * -0.1 + 1.5), 1, 2, BONE.l2); }
    p.line(24, 44, 32, 47, '#07040a').line(32, 47, 40, 44, '#07040a');
  } else {
    p.line(24, 43, 29, 44, K).line(29, 44, 36, 44, K).line(36, 44, 40, 42, K);
    p.px(24, 42, GOLD.d2).px(40, 41, GOLD.d2);
  }
  return p;
}

export function drawGlow(frame: 0 | 1, red: boolean): Painter {
  const p = P();
  CRACK.forEach(([x, y], i) => {
    if ((i + frame) % 2 === 0) p.px(x, y, red ? C.eyeRed : C.lamp).px(x + 1, y, red ? C.blood : GOLD.l1);
    else if (red) p.px(x, y, C.blood);
  });
  return p;
}

export function drawHalo(frame: 0 | 1, red: boolean): Painter {
  const p = P();
  const c = red ? C.eyeRed : C.lamp;
  circle(41, 32, 9.4, 36).forEach(([x, y], i) => (i + frame) % 2 === 0 && p.px(x, y, c));
  if (frame === 1) circle(41, 32, 10.6, 36).forEach(([x, y], i) => i % 3 === 0 && p.px(x, y, darken(c, 0.4)));
  return p;
}

export function drawSocketDot(): Painter {
  return P().px(24, 33, BRASS.b).px(25, 32, BRASS.d1).px(23, 34, '#3a2c10');
}

export function drawMoth(frame: 0 | 1): Painter {
  const p = P();
  const wing = frame === 0
    ? [[17, 25], [18, 24], [19, 23], [16, 24], [15, 23], [14, 22], [15, 22], [20, 24], [21, 23], [22, 22], [23, 22], [22, 23]]
    : [[17, 26], [18, 27], [16, 27], [15, 28], [14, 28], [15, 27], [20, 27], [21, 28], [22, 28], [23, 28], [21, 27], [19, 26]];
  wing.forEach(([x, y], i) => p.px(x!, y!, i % 3 === 0 ? BONE.l2 : BONE.b));
  p.rect(18, 25, 2, 4, BONE.d1).px(18, 29, BONE.d2);
  p.px(17, 23, K).px(16, 22, K).px(20, 23, K).px(21, 22, K); // antenas
  p.px(15, frame === 0 ? 23 : 28, C.eyeRed).px(22, frame === 0 ? 23 : 28, C.eyeRed); // ojos en las alas
  return p.outlineSel(K, 0.8);
}

export function drawFingers(frame: 0 | 1): Painter {
  const p = P();
  for (let i = 0; i < 4; i++) {
    const down = frame === 1 && i === 2;
    const x = 50 + i * 3, y0 = down ? 52 : 49, len = down ? 4 : 7;
    p.fillBevel([[x, y0], [x + 2, y0], [x + 2, y0 + len], [x, y0 + len]], BONE, { grad: false, depth: 1 });
    p.px(x + 1, y0 + 3, BONE.d1);
  }
  p.shadedEllipse(56, 46, 4, 4, GOLD);
  p.px(56, 46, K).px(55, 45, GOLD.l2);
  return p.outlineSel(K, 0.85);
}

export function drawGlint(): Painter {
  return P().px(38, 28, '#fff').px(39, 27, '#fff').px(37, 29, '#fff').px(40, 26, lighten('#fff', 0)).px(45, 36, '#fff');
}

/** Fotograma glitch: lo que de verdad hay dentro. `soft` no desplaza franjas (reducir destellos). */
export function drawGlitch(mood: Mood, soft: boolean): Painter {
  const p = P();
  p.blit(drawBase()).blit(drawEye(mood)).blit(drawBrow(mood)).blit(drawMouth(mood));
  p.ellipse(24, 32, 4, 4, C.eyeRed).ellipse(24, 32, 2, 2, '#2a0808').px(24, 32, '#fff'); // ojo rojo en la cuenca vacía
  ([[45, 24], [47, 25], [21, 46], [47, 37], [27, 18], [38, 46]] as const).forEach(([x, y]) => p.px(x, y, C.eyeRed).px(x + 1, y, K).px(x, y + 1, C.blood));
  // sonrisa que se sale de la moneda
  p.line(6, 40, 14, 54, K).line(14, 54, 32, 60, K).line(32, 60, 50, 54, K).line(50, 54, 58, 40, K);
  for (let i = 0; i < 8; i++) { p.px(8 + i * 2, 42 + Math.round(i * 1.5), BONE.l2); p.px(56 - i * 2, 42 + Math.round(i * 1.5), BONE.l2); }
  if (!soft) {
    const copy = new Painter(SIZE, SIZE).blit(p);
    p.erase(0, 26, SIZE, 9).ctx.drawImage(copy.canvas, 0, 26, SIZE, 9, 4, 26, SIZE, 9);
  }
  return p;
}

export function outlined(p: Painter): Painter {
  return p.outlineSel(K, 0.85);
}

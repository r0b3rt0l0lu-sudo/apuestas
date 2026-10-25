import { C } from '../config';
import { Painter, darken, hash, lighten, ramp } from './painter';

const K = '#0d0a0e';
export const PAPER_COLOR = '#D6CBAE';
const PAPER = ramp(PAPER_COLOR);
const BONE = ramp('#eadfae');
const S = 24;

const paper = (): Painter => {
  const p = new Painter(S, S);
  p.rect(0, 0, S, S, PAPER.b);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (hash(x, y, 3) < 0.035) p.px(x, y, PAPER.d1);
  return p;
};

export type EyeLook = 'abierto' | 'izq' | 'der' | 'cerrado';

/** Ojo con parpadeo y mirada lateral. */
export function drawEyeSymbol(look: EyeLook): Painter {
  const p = paper();
  const dx = look === 'izq' ? -4 : look === 'der' ? 4 : 0;
  const sclera = ramp('#f0e8d0');
  if (look === 'cerrado') {
    p.fillBevel([[2, 12], [8, 8], [16, 8], [22, 12], [16, 16], [8, 16]], ramp('#b08a70'), { depth: 1 });
    p.line(2, 12, 9, 15, K).line(9, 15, 15, 15, K).line(15, 15, 22, 12, K);
    for (let i = 0; i < 7; i++) p.line(4 + i * 2, 13 + (i % 2), 3 + i * 2, 17 + (i % 2), K);
    p.line(4, 9, 20, 9, PAPER.d1);
    return p;
  }
  p.fillBevel([[1, 12], [7, 6], [17, 6], [23, 12], [17, 18], [7, 18]], sclera, { depth: 1 });
  p.line(1, 12, 7, 6, K).line(7, 6, 17, 6, K).line(17, 6, 23, 12, K).line(23, 12, 17, 18, K).line(17, 18, 7, 18, K).line(7, 18, 1, 12, K);
  // venas
  [[4, 11, 8, 12], [20, 11, 16, 13], [5, 14, 9, 13]].forEach(([a, b, c, d]) => p.line(a!, b!, c!, d!, '#c0584a'));
  // iris con volumen y pupila rasgada
  p.shadedEllipse(12 + dx, 12, 5, 5, ramp(C.eyeRed), [-0.4, -0.6]);
  p.rect(12 + dx, 8, 1, 9, K).px(11 + dx, 11, '#fff').px(10 + dx, 10, '#ffd0c0');
  // pliegue del párpado y pestañas
  p.line(2, 9, 8, 4, PAPER.d1).line(8, 4, 16, 4, PAPER.d1).line(16, 4, 22, 9, PAPER.d1);
  for (let i = 0; i < 6; i++) { p.px(5 + i * 3, 5 - (i % 2), K); p.px(5 + i * 3, 19 + (i % 2), K); }
  return p;
}

export function drawTooth(): Painter {
  const p = paper();
  p.fillBevel([[4, 5], [8, 2], [16, 2], [20, 5], [21, 11], [18, 14], [15, 13], [12, 12], [9, 13], [6, 14], [3, 11]], BONE);
  p.fillBevel([[5, 12], [10, 12], [9, 21], [6, 21]], ramp('#d8cfb0'), { depth: 1 });
  p.fillBevel([[13, 12], [18, 12], [18, 21], [14, 21]], ramp('#cfc6a8'), { depth: 1 });
  p.px(7, 16, '#8a5230').px(7, 17, '#8a5230').px(6, 18, '#6e4a2e').px(16, 17, '#8a5230').px(16, 18, '#6e4a2e').px(15, 19, '#4a3020');
  p.px(7, 6, '#fff').px(8, 5, '#fff').px(6, 7, lighten('#fff', 0)).px(15, 9, '#b8a888').px(14, 10, '#b8a888');
  return p.outline('#2a2030');
}

export function drawMoth(): Painter {
  const p = paper();
  const wing = ramp('#bfb08a');
  p.fillBevel([[11, 11], [3, 3], [1, 11], [4, 17], [11, 15]], wing);
  p.fillBevel([[13, 11], [21, 3], [23, 11], [20, 17], [13, 15]], wing);
  p.fillBevel([[11, 14], [5, 18], [6, 22], [11, 18]], ramp('#a09070'), { depth: 1 });
  p.fillBevel([[13, 14], [19, 18], [18, 22], [13, 18]], ramp('#a09070'), { depth: 1 });
  [[6, 10], [18, 10]].forEach(([x, y]) => { p.ellipse(x!, y!, 2, 2, K).px(x!, y!, C.eyeRed).px(x! - 1, y! - 1, '#fff'); p.ring(x!, y!, 3, '#8f8872'); });
  p.rect(11, 6, 2, 14, ramp('#7a6a54').b).rect(11, 6, 1, 14, '#a08a6a').px(11, 5, K).px(12, 5, K);
  p.line(11, 5, 8, 1, K).line(12, 5, 15, 1, K).px(8, 1, '#8f8872').px(15, 1, '#8f8872');
  for (let i = 0; i < 6; i++) p.px(3 + i, 13 + (i % 2), wing.d1).px(20 - i, 13 + (i % 2), wing.d1);
  return p.outlineSel(K, 0.85);
}

export function drawKey(): Painter {
  const p = paper();
  const rust = ramp('#8a4a26');
  p.shadedEllipse(12, 6, 5, 5, rust);
  p.ellipse(12, 6, 2, 2, PAPER.b).ring(12, 6, 2, K);
  p.fillBevel([[11, 10], [14, 10], [14, 21], [11, 21]], rust, { depth: 1 });
  p.fillBevel([[14, 14], [19, 14], [19, 17], [14, 17]], rust, { depth: 1 });
  p.fillBevel([[14, 18], [18, 18], [18, 21], [14, 21]], rust, { depth: 1 });
  [[9, 4], [10, 3], [11, 2]].forEach(([x, y]) => p.px(x!, y!, '#e08a4a'));
  p.px(11, 13, '#e08a4a').px(15, 15, '#e08a4a').px(12, 17, darken('#8a4a26', 0.6)).px(13, 19, '#4a2a16');
  p.scatter(11, 9, 8, 13, '#c0662a', 0.12, 6);
  return p.outlineSel(K, 0.85);
}

export function drawSkull(): Painter {
  const p = paper();
  p.shadedEllipse(12, 10, 8, 8, BONE);
  p.fillBevel([[6, 14], [18, 14], [17, 21], [7, 21]], BONE, { depth: 1 });
  p.ellipse(8, 10, 3, 3, K).ellipse(16, 10, 3, 3, K).px(8, 10, C.eyeRed).px(7, 9, '#5a1010');
  p.poly([[12, 13], [10, 16], [14, 16]], K);
  for (let x = 8; x <= 16; x += 2) p.rect(x, 18, 1, 3, K);
  p.rect(7, 17, 11, 1, K);
  p.px(6, 6, '#fff').px(7, 5, '#fff').px(8, 4, lighten(BONE.l2, 0.5));
  p.line(15, 3, 17, 6, '#9c9278').px(18, 7, '#9c9278');
  return p.outlineSel(K, 0.85);
}

/** Siete oxidado que gotea (la gota baja con el fotograma). */
export function drawSeven(frame: 0 | 1): Painter {
  const p = paper();
  const rust = ramp('#a24a2a');
  p.fillBevel([[4, 3], [20, 3], [20, 8], [4, 8]], rust);
  p.fillBevel([[13, 7], [20, 7], [12, 21], [7, 21]], rust);
  p.px(6, 4, '#e08a4a').px(7, 4, '#e08a4a').px(18, 8, '#e08a4a').px(14, 12, '#e08a4a');
  p.scatter(4, 3, 16, 18, '#d07a3a', 0.07, 2);
  p.scatter(4, 3, 16, 18, '#4a2016', 0.09, 5);
  // gotas que resbalan
  p.rect(9, 21, 1, 1 + frame * 2, rust.d1).px(9, 23, frame ? '#8a3a20' : PAPER.b);
  p.rect(16, 8, 1, 2 + (1 - frame), rust.d1);
  return p.outlineSel(K, 0.85);
}

export function drawCandle(lit: boolean, frame: 0 | 1): Painter {
  const p = new Painter(16, 16);
  const wax = ramp('#e4dcc0');
  p.fillBevel([[5, 6], [11, 6], [11, 14], [5, 14]], wax, { depth: 1 });
  p.rect(4, 14, 8, 2, ramp(C.brass).b).rect(4, 14, 8, 1, ramp(C.brass).l1);
  p.rect(5, 7, 6, 1, wax.d1).px(7, 8, wax.d1).px(7, 9, wax.d1).px(10, 8, wax.d1);
  p.px(8, 5, K);
  if (lit) {
    p.ellipse(8, 2, 1 + frame, 3, '#E07B1E').ellipse(8, 3, 1, 2, C.lamp).px(8, 3, '#fff6c8').px(8, 4 - frame, '#fff6c8');
    p.px(8, -1 + frame, '#E07B1E');
  } else {
    p.px(8, 4, '#6a6070').px(9, 3 - frame, '#6a6070').px(8, 2 - frame, '#4a4258').px(9, 1, '#3a3248');
  }
  return p.outlineSel(K, 0.85);
}

export function drawItem(item: 'monoculo' | 'moneda' | 'vela' | 'reloj' | 'polvora'): Painter {
  const p = new Painter(16, 16);
  const gold = ramp(C.gold);
  switch (item) {
    case 'monoculo':
      p.shadedEllipse(8, 7, 6, 6, gold);
      p.ellipse(8, 7, 4, 4, '#dfe8e4').ellipse(8, 7, 2, 2, '#9ab0a8').px(8, 7, K).px(6, 5, '#fff').px(7, 5, '#fff');
      for (let i = 0; i < 5; i++) p.px(9 + Math.round(Math.sin(i) * 1.5), 12 + i % 3, i % 2 ? gold.b : gold.l1);
      break;
    case 'moneda':
      p.shadedEllipse(8, 8, 7, 7, gold);
      p.ellipse(8, 8, 5, 5, gold.b).ring(8, 8, 5, gold.d1).rect(8, 4, 1, 9, K).px(7, 5, gold.l2).px(6, 6, gold.l2);
      p.px(9, 11, gold.d2);
      break;
    case 'vela':
      return drawCandle(true, 0);
    case 'reloj':
      p.rect(3, 1, 10, 2, ramp(C.brass).b).rect(3, 1, 10, 1, ramp(C.brass).l1).rect(3, 13, 10, 2, ramp(C.brass).b).rect(3, 14, 10, 1, ramp(C.brass).d1);
      p.fillBevel([[4, 3], [12, 3], [9, 7], [9, 9], [12, 13], [4, 13], [7, 9], [7, 7]], ramp('#dfe8e4'), { depth: 1, grad: false });
      p.poly([[6, 12], [10, 12], [11, 13], [5, 13]], ramp(C.lamp).b).px(8, 8, C.lamp).px(8, 10, C.lamp);
      break;
    case 'polvora':
      p.shadedEllipse(8, 9, 5, 6, ramp('#7a4a2a'));
      p.rect(3, 6, 10, 1, gold.b).rect(3, 12, 10, 1, gold.b).rect(3, 6, 10, 1, gold.l1).px(6, 8, '#c0884a').px(7, 8, '#c0884a');
      p.px(8, 2, '#6a6070').px(9, 1, C.lamp).px(8, 3, '#b0a090').px(9, 0, '#fff6c8');
      break;
  }
  return p.outlineSel(K, 0.85);
}

/** Trabuco 48×24, apuntando a la izquierda. */
export function drawBlunderbuss(): Painter {
  const p = new Painter(48, 24);
  const steel = ramp('#7a7488'), wood = ramp('#7a4a2a'), brass = ramp(C.brass);
  p.fillBevel([[0, 6], [12, 9], [12, 15], [0, 18]], brass, { depth: 2 }); // boca acampanada
  p.ellipse(1, 12, 1, 5, '#07040a');
  p.fillBevel([[12, 9], [34, 9], [34, 14], [12, 14]], steel);
  p.rect(12, 9, 22, 1, steel.l2).rect(12, 13, 22, 1, steel.d1);
  [16, 24].forEach((x) => p.rect(x, 8, 2, 8, brass.b).rect(x, 8, 1, 8, brass.l1));
  p.fillBevel([[34, 10], [47, 13], [47, 22], [38, 19], [34, 15]], wood);
  for (let i = 0; i < 5; i++) p.line(37 + i * 2, 13 + i, 38 + i * 2, 17 + i, wood.d1);
  p.rect(30, 14, 4, 4, brass.b).rect(31, 17, 2, 3, brass.d1); // gatillo
  p.px(20, 10, '#fff').px(21, 10, steel.l2);
  return p.outlineSel(K, 0.85);
}

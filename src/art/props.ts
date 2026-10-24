import { C } from '../config';
import { Painter } from './painter';

const K = C.bg;
const PAPER = '#D6CBAE';
const sym = () => new Painter(16, 16);
const PAL: Record<string, string> = { k: K, w: C.textBright, r: C.eyeRed, o: '#7A4A22', y: C.gold, l: C.lamp, b: C.bone, d: C.textDim, n: C.rust, g: C.patina, p: '#5D275D', s: '#8F8A78', R: C.blood };

export type EyeLook = 'abierto' | 'izq' | 'der' | 'cerrado';

/** Ojo con parpadeo y mirada lateral. */
export function drawEyeSymbol(look: EyeLook): Painter {
  const p = sym().rect(0, 0, 16, 16, PAPER);
  p.ellipse(8, 8, 7, 4, K).ellipse(8, 8, 6, 3, C.textBright);
  if (look === 'cerrado') {
    p.rect(1, 7, 14, 2, K).rect(2, 9, 12, 1, C.textDim);
    return p;
  }
  const dx = look === 'izq' ? -3 : look === 'der' ? 3 : 0;
  p.ellipse(8 + dx, 8, 2, 3, C.eyeRed).rect(8 + dx, 6, 1, 5, K).px(7 + dx, 7, C.textBright);
  p.rect(2, 3, 12, 1, C.textDim).rect(2, 13, 12, 1, C.textDim);
  return p;
}

export function drawTooth(): Painter {
  const p = sym().rect(0, 0, 16, 16, PAPER);
  p.ellipse(8, 5, 5, 4, C.textBright).rect(3, 6, 11, 3, C.textBright);
  p.poly([[4, 9], [7, 9], [6, 15], [5, 15]], C.textBright).poly([[9, 9], [12, 9], [11, 15], [10, 15]], C.textBright);
  p.px(5, 12, C.rust).px(5, 13, C.rust).px(11, 11, C.rust).px(10, 13, '#7A4A22').px(10, 14, '#7A4A22'); // raíz manchada
  p.px(6, 3, C.bone).px(5, 4, C.bone);
  return p.outline(K);
}

export function drawMoth(): Painter {
  const p = sym().rect(0, 0, 16, 16, PAPER);
  p.poly([[7, 7], [1, 3], [0, 9], [3, 12], [7, 10]], C.bone).poly([[9, 7], [15, 3], [16, 9], [13, 12], [9, 10]], C.bone);
  p.rect(7, 4, 2, 10, C.textDim).px(6, 2, K).px(5, 1, K).px(9, 2, K).px(10, 1, K);
  [[3, 7], [12, 7]].forEach(([x, y]) => p.ellipse(x!, y!, 1, 1, K).px(x!, y!, C.eyeRed)); // ojos en las alas
  p.px(2, 10, C.textDim).px(13, 10, C.textDim);
  return p.outline(K);
}

export function drawKey(): Painter {
  const p = sym().rect(0, 0, 16, 16, PAPER);
  p.ellipse(8, 4, 3, 3, C.rust).ellipse(8, 4, 1, 1, PAPER);
  p.rect(7, 7, 2, 7, C.rust).rect(9, 11, 3, 1, C.rust).rect(9, 13, 2, 1, C.rust);
  p.px(7, 3, '#B5651D').px(8, 8, '#B5651D').px(7, 10, '#B5651D').px(10, 11, '#B5651D');
  return p.outline(K);
}

export function drawSkull(): Painter {
  const p = sym().rect(0, 0, 16, 16, PAPER);
  p.ellipse(8, 7, 6, 5, C.bone).rect(4, 10, 8, 4, C.bone);
  p.ellipse(5, 7, 2, 2, K).ellipse(11, 7, 2, 2, K).px(5, 7, C.eyeRed);
  p.poly([[8, 9], [7, 11], [9, 11]], K);
  for (let x = 5; x <= 11; x += 2) p.rect(x, 12, 1, 3, K);
  p.px(4, 4, C.textBright).px(5, 3, C.textBright);
  return p.outline(K);
}

/** Siete oxidado que gotea (la gota baja con el fotograma). */
export function drawSeven(frame: 0 | 1): Painter {
  const p = sym().rect(0, 0, 16, 16, PAPER);
  p.rect(3, 2, 10, 3, C.rust).poly([[10, 5], [13, 5], [8, 14], [5, 14]], C.rust);
  p.px(4, 2, '#B5651D').px(5, 2, '#B5651D').px(11, 6, '#B5651D').px(9, 9, '#B5651D');
  p.px(6, 14 + frame, C.rust).px(6, 15, frame ? C.rust : PAPER);
  return p.outline(K);
}

export function drawCandle(lit: boolean, frame: 0 | 1): Painter {
  const p = sym();
  p.rect(5, 6, 6, 9, C.bone).rect(5, 6, 1, 9, C.textBright).rect(10, 6, 1, 9, C.textDim).rect(4, 14, 8, 2, C.brass);
  p.rect(5, 7, 6, 1, C.textDim).px(8, 8, C.textDim).px(8, 9, C.textDim);
  p.px(8, 5, K);
  if (lit) {
    p.ellipse(8, 3, 1 + frame, 2, C.lamp).px(8, 4, C.textBright).px(8, 2 - frame, '#E07B1E');
  } else {
    p.px(8, 4, C.textDim).px(9, 3 - frame, C.textDim);
  }
  return p.outline(K);
}

export function drawItem(item: 'monoculo' | 'moneda' | 'vela' | 'reloj' | 'polvora'): Painter {
  const p = sym();
  switch (item) {
    case 'monoculo':
      p.ellipse(8, 7, 5, 5, C.gold).ellipse(8, 7, 4, 4, C.textBright).ellipse(8, 7, 2, 2, C.lamp).px(8, 7, K).px(6, 5, C.textBright);
      p.line(8, 12, 11, 15, C.brass);
      break;
    case 'moneda':
      p.ellipse(8, 8, 6, 6, C.gold).ellipse(8, 8, 4, 4, C.brass).ellipse(8, 8, 3, 3, C.lamp).rect(8, 4, 1, 8, K).px(5, 5, C.textBright);
      break;
    case 'vela':
      return drawCandle(true, 0);
    case 'reloj':
      p.rect(3, 1, 10, 2, C.brass).rect(3, 13, 10, 2, C.brass);
      p.poly([[4, 3], [12, 3], [8, 8]], C.textBright).poly([[8, 8], [4, 13], [12, 13]], C.textBright);
      p.poly([[6, 11], [10, 11], [11, 13], [5, 13]], C.lamp).px(8, 8, C.lamp);
      break;
    case 'polvora':
      p.ellipse(8, 8, 5, 6, C.rust).rect(3, 5, 10, 1, C.brass).rect(3, 11, 10, 1, C.brass).px(6, 7, '#B5651D').px(7, 7, '#B5651D');
      p.px(8, 1, C.textDim).px(9, 0, C.lamp);
      break;
  }
  return p.outline(K);
}

/** Trabuco 32×16, apuntando a la izquierda (hacia el Cobrador, arriba). */
export function drawBlunderbuss(): Painter {
  const p = new Painter(32, 16);
  p.poly([[0, 3], [8, 6], [8, 10], [0, 13]], C.brass); // boca acampanada
  p.ellipse(1, 8, 1, 4, K);
  p.rect(8, 6, 14, 4, C.textDim).rect(8, 6, 14, 1, C.bone).rect(8, 9, 14, 1, C.brass);
  p.rect(12, 5, 1, 6, C.brass).rect(17, 5, 1, 6, C.brass);
  p.poly([[22, 6], [31, 8], [31, 14], [24, 12], [22, 10]], C.rust).px(25, 9, '#B5651D').px(27, 10, '#B5651D');
  p.rect(20, 10, 3, 3, C.gold); // gatillo
  return p.outline(K);
}

export const PAPER_COLOR = PAPER;
export { PAL };

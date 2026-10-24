import { C } from '../config';
import { Painter } from './painter';

export type Mood = 'acecho' | 'sonrisa' | 'cobra';
export const MOODS: readonly Mood[] = ['acecho', 'sonrisa', 'cobra'];
export const SIZE = 48;

const K = C.bg;
const CRACK: ReadonlyArray<readonly [number, number]> = [
  [30, 13], [29, 14], [29, 15], [28, 16], [28, 17], [27, 18], [27, 19], [26, 20], [26, 21]
];

const P = () => new Painter(SIZE, SIZE);

function circlePts(cx: number, cy: number, r: number, steps: number): Array<[number, number]> {
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)];
  });
}

/** Moneda, chistera, levita y monóculo: todo lo que no cambia con la expresión. */
export function drawBase(): Painter {
  const p = P();
  // Levita
  p.poly([[5, 47], [12, 40], [36, 40], [43, 47]], C.wood);
  p.poly([[5, 47], [12, 40], [16, 40], [14, 47]], C.panel);
  p.poly([[43, 47], [36, 40], [32, 40], [34, 47]], C.panel);
  p.poly([[20, 40], [28, 40], [24, 46]], C.bone); // camisa
  p.rect(21, 40, 7, 3, C.danger).rect(24, 41, 1, 1, C.blood); // corbatín
  p.line(14, 43, 20, 46, C.gold);
  p.ellipse(13, 44, 2, 2, C.gold).px(13, 44, C.lamp); // reloj de bolsillo
  // Chistera
  p.rect(17, 2, 14, 9, C.panel).rect(17, 2, 2, 9, C.wood).rect(17, 2, 14, 1, C.wood);
  p.rect(12, 10, 24, 2, C.panel).rect(12, 10, 24, 1, C.wood);
  p.rect(17, 8, 14, 2, C.blood).rect(17, 8, 14, 1, C.danger);
  p.erase(21, 4, 2, 2).erase(26, 5, 1, 2).erase(13, 10, 2, 1); // rasgones
  p.rect(30, 6, 5, 6, C.textBright).px(31, 8, C.danger).px(32, 8, C.danger).px(34, 8, C.danger)
    .px(31, 10, C.danger).px(33, 10, C.danger).px(34, 10, C.danger); // pagaré «DEBE»
  // Moneda: canto estriado, cardenillo e inscripción
  p.ellipse(24, 26, 14, 14, C.brass).ellipse(24, 26, 13, 13, C.gold);
  circlePts(24, 26, 14, 40).forEach(([x, y], i) => i % 2 === 0 && p.px(x, y, C.rust));
  p.ellipse(24, 26, 11, 11, C.brass).ellipse(24, 26, 10, 10, C.gold);
  circlePts(24, 26, 11.4, 46).forEach(([x, y], i) => p.px(x, y, i % 3 === 0 ? C.gold : C.brass));
  [[17, 15], [18, 14], [19, 14], [15, 18], [14, 20]].forEach(([x, y]) => p.px(x as number, y as number, C.lamp));
  p.ellipse(31, 18, 3, 2, C.patina).ellipse(16, 34, 3, 2, C.patina).ellipse(35, 29, 2, 3, C.patina).ellipse(22, 14, 2, 1, C.patina);
  CRACK.forEach(([x, y]) => p.px(x, y, K));
  // Cuenca vacía y monóculo
  p.ellipse(19, 25, 3, 3, K);
  circlePts(29, 25, 5, 28).forEach(([x, y]) => p.px(x, y, C.brass));
  circlePts(29, 25, 4.4, 24).forEach(([x, y]) => p.px(x, y, C.gold));
  p.line(32, 29, 35, 33, C.brass).line(35, 33, 35, 39, C.brass);
  // Mano
  p.rect(38, 41, 8, 5, C.bone).rect(38, 45, 8, 1, C.textDim);
  p.px(41, 41, C.gold).px(42, 41, C.lamp); // anillo
  return p;
}

export function drawEye(mood: Mood): Painter {
  const p = P();
  p.ellipse(29, 25, 3, 3, mood === 'cobra' ? C.eyeRed : C.textBright);
  if (mood === 'cobra') {
    p.rect(29, 24, 1, 3, K);
    p.px(28, 23, C.blood).px(30, 27, C.blood);
  } else if (mood === 'sonrisa') {
    p.rect(26, 22, 7, 2, C.brass); // párpado
    p.rect(29, 24, 1, 2, K).px(28, 25, C.lamp).px(30, 25, C.lamp);
  } else {
    p.rect(29, 23, 1, 4, K).px(28, 25, C.lamp).px(30, 25, C.lamp);
  }
  return p;
}

export function drawBrow(mood: Mood): Painter {
  const p = P();
  if (mood === 'cobra') {
    p.line(15, 19, 21, 22, K, 1).line(27, 22, 33, 19, K, 1);
    p.px(16, 20, K).px(32, 20, K);
  } else if (mood === 'sonrisa') {
    p.line(15, 20, 18, 18, K).line(18, 18, 21, 19, K).line(26, 19, 29, 17, K).line(29, 17, 33, 19, K);
  } else {
    p.line(15, 20, 21, 20, K).line(26, 20, 33, 19, K);
  }
  return p;
}

export function drawMouth(mood: Mood): Painter {
  const p = P();
  if (mood === 'cobra') {
    p.ellipse(24, 35, 7, 4, K);
    for (let x = 18; x <= 30; x += 2) p.rect(x, 31, 1, 2, C.bone).rect(x, 38, 1, 2, C.bone);
    p.rect(21, 36, 6, 2, C.blood);
  } else if (mood === 'sonrisa') {
    p.line(15, 32, 17, 34, K).line(17, 34, 24, 36, K).line(24, 36, 31, 34, K).line(31, 34, 33, 32, K);
    for (let x = 18; x <= 30; x += 2) p.rect(x, 34, 1, 2, C.bone);
    p.rect(18, 36, 13, 1, K);
  } else {
    p.line(19, 34, 22, 35, K).line(22, 35, 27, 35, K).line(27, 35, 29, 34, K);
  }
  return p;
}

export function drawGlow(frame: 0 | 1, red: boolean): Painter {
  const p = P();
  CRACK.forEach(([x, y], i) => {
    if ((i + frame) % 2 === 0) p.px(x, y, red ? C.eyeRed : C.lamp);
    else if (red) p.px(x, y, C.blood);
  });
  return p;
}

export function drawHalo(frame: 0 | 1, red: boolean): Painter {
  const p = P();
  circlePts(29, 25, 6.2, 20).forEach(([x, y], i) => (i + frame) % 2 === 0 && p.px(x, y, red ? C.eyeRed : C.lamp));
  return p;
}

export function drawSocketDot(): Painter {
  return P().px(19, 25, C.brass).px(20, 24, C.rust);
}

export function drawMoth(frame: 0 | 1): Painter {
  const p = P();
  const w = frame === 0
    ? [[15, 19], [16, 19], [18, 19], [19, 19], [15, 18], [19, 18], [14, 17], [20, 17]]
    : [[15, 20], [16, 20], [18, 20], [19, 20], [14, 21], [20, 21], [15, 21], [19, 21]];
  w.forEach(([x, y]) => p.px(x as number, y as number, C.bone));
  p.px(17, 20, C.textDim).px(17, 21, C.textDim).px(16, 18, C.textDim).px(18, 18, C.textDim);
  return p;
}

export function drawFingers(frame: 0 | 1): Painter {
  const p = P();
  for (let i = 0; i < 4; i++) {
    const down = frame === 1 && i === 2;
    p.rect(38 + i * 2, down ? 39 : 37, 1, down ? 2 : 4, C.bone).px(38 + i * 2, down ? 39 : 37, C.textDim);
  }
  p.ellipse(45, 38, 2, 2, C.lamp).px(45, 38, C.gold); // moneda entre los dedos
  return p;
}

export function drawGlint(): Painter {
  return P().px(27, 23, C.textBright).px(28, 22, C.textBright).px(26, 24, C.textBright).px(30, 27, C.textBright);
}

/** Fotograma glitch: lo que de verdad hay dentro. `soft` no desplaza franjas (reducir destellos). */
export function drawGlitch(mood: Mood, soft: boolean): Painter {
  const p = P();
  p.blit(drawBase()).blit(drawEye(mood)).blit(drawBrow(mood)).blit(drawMouth(mood));
  p.ellipse(19, 25, 2, 2, C.eyeRed).px(19, 25, C.textBright); // ojo rojo en la cuenca vacía
  ([[31, 18], [32, 19], [16, 34], [35, 28], [22, 14]] as const).forEach(([x, y]) => p.px(x, y, C.eyeRed).px(x + 1, y, K));
  // sonrisa que se sale de la moneda
  p.line(5, 32, 12, 41, K).line(12, 41, 24, 44, K).line(24, 44, 36, 41, K).line(36, 41, 43, 32, K);
  for (let i = 0; i < 6; i++) p.px(7 + i * 2, 34 + Math.round(i * 1.4), C.bone).px(41 - i * 2, 34 + Math.round(i * 1.4), C.bone);
  if (!soft) {
    const copy = new Painter(SIZE, SIZE).blit(p);
    p.erase(0, 20, SIZE, 7).ctx.drawImage(copy.canvas, 0, 20, SIZE, 7, 3, 20, SIZE, 7);
  }
  return p;
}

export function outlined(p: Painter): Painter {
  return p.outline(K);
}

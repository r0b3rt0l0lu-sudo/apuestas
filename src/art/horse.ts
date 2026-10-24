import { C } from '../config';
import type { Skin } from '../games/race';
import { Painter, digit } from './painter';

export const HW = 48;
export const HH = 40;
const K = C.bg;

export interface HorseLook {
  skin: Skin;
  body: string;
  mane: string;
  num: number;
}

/** Skins sin dorsal propio de la lista de carreras (solo arte de referencia). */
export const SKIN_LOOKS: Record<Skin, { body: string; mane: string }> = {
  clasico: { body: '#BFB8A8', mane: '#5E5640' },
  esqueleto: { body: '#E8E0C8', mane: '#9C9278' },
  quemado: { body: '#3A302A', mane: '#241C18' },
  ahogado: { body: '#5E7A72', mane: '#2E4A3A' },
  luto: { body: '#2E2834', mane: '#0D0A0E' },
  porcelana: { body: '#E6E4DE', mane: '#B8B6B0' },
  trapo: { body: '#A08A6A', mane: '#5E4A32' }
};

/** Barra dorada con espiral: capa aparte y estática (no sube con el galope). */
export function drawPole(): Painter {
  const p = new Painter(HW, HH);
  p.rect(22, 0, 3, HH, C.gold);
  for (let y = 0; y < HH; y += 2) p.px(22 + ((y / 2) % 2), y, C.lamp).px(24 - ((y / 2) % 2), y + 1, C.brass);
  p.rect(20, 0, 7, 2, C.brass).rect(20, 38, 7, 2, C.brass);
  return p;
}

/** Cuerpo del caballito (sin barra). `frame` 0/1: galope; en el 1 sube 1 px. */
export function drawHorse(look: HorseLook, frame: 0 | 1, glitch = false): Painter {
  const p = new Painter(HW, HH);
  const { skin } = look;
  const body = look.body, mane = look.mane;
  const dark = Painter.shade(body, 0.62); // patas lejanas al 62 %
  const lg = frame === 0
    ? { fn: [[31, 22], [36, 26], [41, 29]], ff: [[29, 22], [33, 27], [37, 30]], hn: [[14, 22], [10, 27], [6, 30]], hf: [[17, 22], [13, 28], [9, 31]] }
    : { fn: [[31, 22], [34, 28], [33, 32]], ff: [[29, 22], [30, 27], [28, 31]], hn: [[14, 22], [17, 28], [14, 32]], hf: [[17, 22], [20, 28], [18, 32]] };
  const leg = (pts: number[][], c: string) => {
    const [a, b, d] = pts as [number[], number[], number[]];
    p.line(a[0]!, a[1]!, b[0]!, b[1]!, c, 2).line(b[0]!, b[1]!, d[0]!, d[1]!, c, 2);
    p.rect(d[0]! - 1, d[1]!, 3, 2, skin === 'esqueleto' ? C.textDim : K); // pezuña
  };
  leg(lg.ff, dark);
  leg(lg.hf, dark);

  // cola y cuerpo
  p.poly([[10, 12], [4, 14], [2, 23], [5, 25], [7, 17]], mane);
  p.ellipse(22, 17, 13, 7, body);
  p.poly([[29, 11], [35, 3], [41, 5], [37, 15], [31, 17]], body); // cuello
  p.poly([[35, 3], [42, 4], [47, 10], [44, 12], [40, 10], [36, 9]], body); // cabeza
  p.poly([[28, 10], [33, 2], [36, 3], [31, 12]], mane); // crin
  p.poly([[37, 3], [38, 0], [40, 3]], body).px(38, 1, K); // oreja mellada
  leg(lg.fn, body);
  leg(lg.hn, body);

  // pintura desconchada
  [[14, 14], [15, 14], [26, 20], [27, 20], [33, 8], [19, 22], [11, 18]].forEach(([x, y]) => p.px(x!, y!, skin === 'esqueleto' ? C.textDim : C.rust));
  if (skin === 'clasico' || skin === 'luto') [[24, 12], [30, 14]].forEach(([x, y]) => p.px(x!, y!, K));

  // silla, ribete, joyas, borlas
  const saddle = skin === 'luto' ? '#1A1418' : '#6E1F2A';
  const trim = skin === 'luto' ? C.textDim : C.gold;
  p.ellipse(22, 11, 7, 3, saddle).rect(15, 12, 15, 1, trim);
  p.px(19, 10, C.eyeRed).px(22, 9, C.lamp).px(25, 10, skin === 'luto' ? C.textBright : C.patina);
  p.rect(14, 19, 1, 3, trim).rect(30, 19, 1, 3, trim);
  p.rect(17, 14, 7, 6, trim).rect(18, 15, 5, 4, K);
  digit(p, look.num, 19, 15, C.textBright);

  // guirnalda marchita y brida
  [[33, 5], [34, 8], [33, 11], [32, 14], [35, 11]].forEach(([x, y], i) => p.px(x!, y!, i % 2 ? C.dangerText : C.textDim));
  p.line(38, 5, 42, 12, C.brass).px(40, 6, C.lamp).px(42, 9, C.lamp);

  // cara
  const open = glitch;
  p.ellipse(41, 6, open ? 2 : 1, open ? 2 : 1, K);
  if (open) p.px(41, 6, C.textBright).px(42, 6, K);
  else p.px(41, 6, frame === 0 ? C.eyeRed : K); // el punto rojo parpadea
  p.rect(43, 10, open ? 4 : 3, open ? 2 : 1, K).px(44, 10, C.bone).px(46, 10, C.bone).px(45, 9, C.bone);
  if (open) p.px(43, 12, C.eyeRed);
  p.px(40, 8, glitch ? C.eyeRed : C.rust); // lágrima de óxido

  skinDetails(p, skin, frame, look);
  if (frame === 1) {
    const up = new Painter(HW, HH);
    up.ctx.drawImage(p.canvas, 0, -1);
    return up.outline(K);
  }
  return p.outline(K);
}

function skinDetails(p: Painter, skin: Skin, frame: 0 | 1, look: HorseLook): void {
  switch (skin) {
    case 'esqueleto':
      for (let x = 14; x <= 28; x += 3) p.rect(x, 12, 1, 7, C.textDim);
      for (let y = 5; y < 14; y += 3) p.rect(31 + Math.floor((14 - y) / 3), y, 4, 1, C.textDim);
      p.ellipse(41, 6, 2, 2, K).px(41, 6, C.eyeRed);
      for (let x = 43; x <= 46; x++) p.px(x, 11, C.bone);
      break;
    case 'quemado':
      [[16, 14], [17, 15], [18, 16], [24, 13], [25, 14], [29, 18], [30, 19]].forEach(([x, y]) => p.px(x!, y!, C.eyeRed));
      [[30, 4], [32, 3], [34, 5], [8, 15], [5, 18], [4, 22]].forEach(([x, y], i) => p.px(x!, y!, (i + frame) % 2 ? C.lamp : '#E07B1E'));
      p.px(35, 0 + frame, C.textDim).px(34, 1 - frame, C.textDim);
      break;
    case 'ahogado':
      [[18, 24], [22, 24], [26, 24]].forEach(([x, y], i) => {
        for (let k = 0; k < 6; k++) p.px(x! + ((k + frame + i) % 2), y! + k, C.patina);
      });
      [[12, 14], [20, 16], [28, 12], [34, 10]].forEach(([x, y]) => p.px(x!, y!, C.textDim));
      p.px(24, 28 + frame * 3, '#7FB0B0').px(8, 27 - frame, '#7FB0B0');
      break;
    case 'luto':
      for (let y = 2; y < 12; y++) for (let x = 34; x < 46; x++) if ((x + y) % 3 === 0) p.px(x, y, C.textDim);
      p.ellipse(41, 6, 1, 1, C.textBright);
      if (frame === 0) p.px(41, 6, C.textBright);
      break;
    case 'porcelana':
      [[14, 14], [16, 16], [25, 15], [27, 18], [32, 9]].forEach(([x, y]) => p.px(x!, y!, '#3B5DC9').px(x! + 1, y!, '#41A6F6'));
      p.line(10, 12, 14, 19, K).line(34, 10, 38, 14, K);
      p.ellipse(27, 19, 2, 2, K).px(27, 19, C.eyeRed);
      break;
    case 'trapo':
      for (let x = 12; x < 33; x += 2) p.px(x, 17, K);
      for (let y = 4; y < 14; y += 2) p.px(36, y, K);
      p.rect(25, 13, 4, 4, '#5D275D').px(25, 13, K).px(28, 16, K);
      p.px(41, 6, C.textBright).px(40, 6, K).px(42, 6, K);
      for (let x = 43; x <= 46; x += 1) p.px(x, 10 + (x % 2), K);
      break;
    case 'clasico':
      break;
  }
  void look;
}

import { C } from '../config';
import type { Skin } from '../games/race';
import { Painter, type Ramp, darken, digit, hash, ramp } from './painter';

export const HW = 48;
export const HH = 40;
const K = '#0d0a0e';

export interface HorseLook {
  skin: Skin;
  body: string;
  mane: string;
  num: number;
}

/** Colores base de cada skin (las skins sin caballo en carrera son solo arte de referencia). */
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
  const g = ramp(C.gold);
  for (let y = 0; y < HH; y++) {
    p.px(22, y, g.l1).px(23, y, g.b).px(24, y, g.d1);
    const s = (y + 1) % 6;
    if (s < 3) p.px(22 + (s % 3), y, g.l2).px(23 + (s % 2), y, g.d2);
  }
  p.shadedEllipse(23, 1, 4, 2, g).shadedEllipse(23, 38, 4, 2, g);
  return p.outlineSel(K, 0.8);
}

/** Pata gruesa con luz a la izquierda y sombra a la derecha. */
function limb(p: Painter, pts: number[][], r: Ramp, hoof: string): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [pts[i] as number[], pts[i + 1] as number[]];
    p.line(a[0]! + 1, a[1]!, b[0]! + 1, b[1]!, r.d1, 2);
    p.line(a[0]!, a[1]!, b[0]!, b[1]!, r.b, 2);
    p.line(a[0]!, a[1]!, b[0]!, b[1]!, r.l1, 1);
  }
  const e = pts[pts.length - 1] as number[];
  p.rect(e[0]! - 1, e[1]!, 4, 2, hoof).px(e[0]! - 1, e[1]!, '#5a5060');
}

/** Cuerpo del caballito (sin barra). `frame` 0/1: galope; en el 1 sube 1 px. */
export function drawHorse(look: HorseLook, frame: 0 | 1, glitch = false): Painter {
  const p = new Painter(HW, HH);
  const { skin } = look;
  const body = ramp(look.body), mane = ramp(look.mane);
  const far = ramp(Painter.shade(look.body, 0.62)); // patas lejanas al 62 %
  const hoof = skin === 'esqueleto' ? '#9c9278' : '#2a2030';
  const lg = frame === 0
    ? { fn: [[31, 22], [36, 26], [41, 29]], ff: [[28, 22], [33, 27], [37, 30]], hn: [[14, 22], [10, 27], [6, 30]], hf: [[17, 22], [13, 28], [9, 31]] }
    : { fn: [[31, 22], [34, 28], [33, 32]], ff: [[28, 22], [30, 27], [28, 31]], hn: [[14, 22], [17, 28], [14, 32]], hf: [[17, 22], [20, 28], [18, 32]] };
  limb(p, lg.ff, far, hoof);
  limb(p, lg.hf, far, hoof);

  // cola con mechones
  p.fillBevel([[11, 11], [5, 13], [2, 21], [4, 27], [7, 25], [6, 18], [9, 15]], mane);
  p.line(5, 15, 3, 24, mane.l1).line(7, 14, 5, 22, mane.d1);
  // tronco, cuello y cabeza
  p.fillBevel([[9, 13], [15, 9], [29, 9], [36, 13], [36, 21], [31, 25], [15, 25], [8, 20]], body);
  p.fillBevel([[29, 12], [33, 3], [41, 3], [39, 15], [32, 19]], body);
  p.fillBevel([[35, 3], [43, 3], [47, 9], [46, 12], [42, 12], [38, 9]], body, { depth: 1 });
  // crin y oreja mellada
  p.fillBevel([[27, 10], [31, 1], [35, 2], [33, 8], [30, 13]], mane, { depth: 1 });
  for (let i = 0; i < 4; i++) p.line(28 + i, 11 - i * 2, 31 + i, 4 - i, i % 2 ? mane.l2 : mane.l1);
  p.poly([[36, 3], [37, 0], [40, 3]], body.b).px(37, 0, K).px(38, 1, body.d1);
  limb(p, lg.fn, body, hoof);
  limb(p, lg.hn, body, hoof);
  // músculo: pecho y anca
  p.line(31, 15, 33, 21, body.d1).line(14, 13, 12, 20, body.d1);
  p.px(18, 12, body.l2).px(19, 12, body.l2).px(20, 12, body.l1);

  // pintura desconchada: la madera asoma
  const wood = skin === 'esqueleto' ? C.textDim : '#8c6a42';
  [[14, 14, 2], [15, 14, 1], [26, 21, 2], [27, 22, 1], [33, 9, 1], [20, 23, 2], [11, 18, 1]].forEach(([x, y, w]) => { p.rect(x!, y!, w!, 1, wood); p.px(x!, y! + 1, darken(wood, 0.5)); });

  // silla, ribete, joyas, borlas
  const saddle = ramp(skin === 'luto' ? '#1a1620' : '#7a1f2c');
  const trim = ramp(skin === 'luto' ? '#cfc6d0' : C.gold);
  p.fillBevel([[15, 10], [29, 10], [30, 14], [14, 14]], saddle, { depth: 1 });
  p.rect(14, 14, 17, 1, trim.b).rect(14, 14, 17, 1, trim.l1);
  p.px(18, 11, C.eyeRed).px(22, 10, C.lamp).px(26, 11, skin === 'luto' ? '#fff' : C.patina);
  p.rect(13, 15, 1, 4, trim.b).px(13, 19, trim.l1).rect(31, 15, 1, 4, trim.b).px(31, 19, trim.l1);
  p.rect(17, 15, 8, 7, trim.d1).rect(18, 16, 6, 5, K);
  digit(p, look.num, 20, 16, '#EDE4C6');

  // guirnalda marchita y brida con remaches
  [[33, 4], [34, 7], [33, 10], [32, 13], [36, 11]].forEach(([x, y], i) => p.px(x!, y!, i % 2 ? '#c27a6a' : '#8f8872'));
  p.line(39, 4, 43, 11, ramp(C.brass).b).px(41, 6, C.lamp).px(43, 9, C.lamp).px(40, 5, ramp(C.brass).l2);

  // cara: cuenca con punto rojo (parpadea), nariz, sonrisa con dientes y lágrima
  const open = glitch;
  p.ellipse(41, 6, open ? 2 : 1, open ? 2 : 1, K);
  if (open) p.px(41, 6, '#EDE4C6').px(42, 6, K).px(40, 5, '#fff');
  else p.px(41, 6, frame === 0 ? C.eyeRed : K);
  p.px(46, 8, K).px(46, 9, body.d2);
  p.rect(43, 10, open ? 4 : 3, open ? 2 : 1, K).px(44, 10, '#EDE4C6').px(46, 10, '#EDE4C6').px(45, 9, '#EDE4C6');
  if (open) p.px(43, 12, C.eyeRed);
  p.px(40, 8, glitch ? C.eyeRed : '#8a5230').px(40, 9, glitch ? C.eyeRed : '#6e4a2e'); // lágrima de óxido

  skinDetails(p, skin, frame);
  const out = frame === 1 ? new Painter(HW, HH) : p;
  if (frame === 1) out.ctx.drawImage(p.canvas, 0, -1);
  return out.outlineSel(K, 0.86);
}

function skinDetails(p: Painter, skin: Skin, frame: 0 | 1): void {
  switch (skin) {
    case 'esqueleto':
      for (let x = 14; x <= 28; x += 3) p.line(x, 12, x - 1, 19, C.textDim).px(x - 1, 20, K);
      for (let y = 5; y < 14; y += 3) p.rect(31 + Math.floor((14 - y) / 3), y, 4, 1, C.textDim);
      p.ellipse(41, 6, 2, 2, K).px(41, 6, C.eyeRed).px(40, 5, '#5a1010');
      for (let x = 43; x <= 46; x++) p.px(x, 11, '#EDE4C6').px(x, 12, K);
      break;
    case 'quemado':
      [[16, 14], [17, 15], [18, 16], [24, 13], [25, 14], [29, 18], [30, 19], [12, 19], [11, 20]].forEach(([x, y]) => p.px(x!, y!, C.eyeRed).px(x! + 1, y!, '#E07B1E'));
      [[30, 4], [32, 3], [34, 5], [8, 15], [5, 18], [4, 22]].forEach(([x, y], i) => p.px(x!, y!, (i + frame) % 2 ? C.lamp : '#E07B1E'));
      p.px(35, 0 + frame, C.textDim).px(34, 1 - frame, '#6a6070');
      break;
    case 'ahogado':
      [[18, 24], [22, 24], [26, 24]].forEach(([x, y], i) => { for (let k = 0; k < 6; k++) p.px(x! + ((k + frame + i) % 2), y! + k, C.patina).px(x! + ((k + frame + i) % 2) + 1, y! + k, '#2e4a3a'); });
      [[12, 14], [20, 16], [28, 12], [34, 10]].forEach(([x, y]) => p.px(x!, y!, '#cfc6a8').px(x! + 1, y!, '#8f8872'));
      p.px(24, 28 + frame * 3, '#7FB0B0').px(8, 27 - frame, '#7FB0B0');
      break;
    case 'luto':
      for (let y = 2; y < 12; y++) for (let x = 34; x < 46; x++) if ((x + y) % 3 === 0 || (x * y) % 7 === 0) p.px(x, y, '#9c9278');
      p.ellipse(41, 6, 1, 1, '#EDE4C6');
      break;
    case 'porcelana':
      [[14, 14], [16, 16], [25, 15], [27, 18], [32, 9]].forEach(([x, y]) => p.px(x!, y!, '#3B5DC9').px(x! + 1, y!, '#41A6F6').px(x!, y! + 1, '#27408a'));
      p.line(10, 12, 14, 19, K).line(34, 10, 38, 14, K);
      p.ellipse(27, 19, 2, 2, K).px(27, 19, C.eyeRed);
      break;
    case 'trapo':
      for (let x = 12; x < 33; x += 2) p.px(x, 17, K);
      for (let y = 4; y < 14; y += 2) p.px(36, y, K);
      p.rect(25, 13, 4, 4, '#5D275D').px(25, 13, K).px(28, 16, K).px(26, 14, '#8a4a8a');
      p.px(41, 6, '#EDE4C6').px(40, 6, K).px(42, 6, K);
      for (let x = 43; x <= 46; x += 1) p.px(x, 10 + (x % 2), K);
      break;
    case 'clasico':
      [[24, 12], [30, 14]].forEach(([x, y]) => p.px(x!, y!, K));
      break;
  }
  void hash;
}

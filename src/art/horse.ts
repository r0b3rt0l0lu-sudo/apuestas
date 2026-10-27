import { C } from '../config';
import type { Skin } from '../games/race';
import { Painter, type Ramp, digit, hash, ramp } from './painter';

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
  clasico: { body: '#A8A4B4', mane: '#2E2A3C' },
  esqueleto: { body: '#E8E0C8', mane: '#9C9278' },
  quemado: { body: '#3A302A', mane: '#241C18' },
  ahogado: { body: '#5E7A72', mane: '#2E4A3A' },
  luto: { body: '#2E2834', mane: '#0D0A0E' },
  porcelana: { body: '#E6E4DE', mane: '#B8B6B0' },
  trapo: { body: '#A08A6A', mane: '#5E4A32' }
};

/** Pata gruesa con luz a la izquierda y sombra a la derecha. */
function limb(p: Painter, pts: number[][], r: Ramp, hoof: string, wrap = ''): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [pts[i] as number[], pts[i + 1] as number[]];
    p.line(a[0]! + 1, a[1]!, b[0]! + 1, b[1]!, r.d1, 2);
    p.line(a[0]!, a[1]!, b[0]!, b[1]!, r.b, 2);
    p.line(a[0]!, a[1]!, b[0]!, b[1]!, r.l1, 1);
  }
  const e = pts[pts.length - 1] as number[];
  p.rect(e[0]! - 1, e[1]!, 4, 2, hoof).px(e[0]! - 1, e[1]!, '#5a5060');
  if (wrap) p.rect(e[0]! - 1, e[1]! - 3, 4, 3, wrap).px(e[0]!, e[1]! - 2, K); // venda de carreras
}

/** Colores de la manta (la cuadra de cada caballo) según su número. */
const CLOTH = ['#c24a3a', '#3a6ab0', '#e8d27a', '#e07b1e', '#3a8a6a', '#8a4a8a'] as const;

/** Caballo de carreras en pleno galope, sin barra ni silla de tiovivo. `frame` 0/1: galope; en el 1 sube 1 px. */
export function drawHorse(look: HorseLook, frame: 0 | 1, glitch = false): Painter {
  const p = new Painter(HW, HH);
  const { skin } = look;
  const body = ramp(look.body), mane = ramp(look.mane);
  const far = ramp(Painter.shade(look.body, 0.62)); // patas lejanas al 62 %
  const hoof = skin === 'esqueleto' ? '#9c9278' : '#2a2030';
  const lg = frame === 0
    ? { fn: [[31, 22], [36, 27], [42, 32]], ff: [[28, 22], [33, 28], [38, 33]], hn: [[14, 22], [9, 28], [5, 33]], hf: [[17, 22], [12, 29], [8, 34]] }
    : { fn: [[31, 22], [34, 29], [33, 35]], ff: [[28, 22], [30, 28], [28, 34]], hn: [[14, 22], [17, 29], [14, 35]], hf: [[17, 22], [20, 29], [18, 35]] };
  const cloth = ramp(CLOTH[(look.num - 1) % CLOTH.length] ?? CLOTH[0]);
  const wrapCol = skin === 'esqueleto' || skin === 'porcelana' ? '#9c9278' : '#ece0c0';
  limb(p, lg.ff, far, hoof, wrapCol);
  limb(p, lg.hf, far, hoof, wrapCol);

  // cola con mechones
  p.fillBevel([[11, 11], [4, 12], [0, 20], [1, 30], [5, 28], [5, 19], [9, 15]], mane);
  p.line(4, 15, 1, 27, mane.l1).line(7, 14, 4, 24, mane.d1);
  // tronco, cuello y cabeza
  p.fillBevel([[9, 13], [15, 9], [29, 9], [36, 13], [36, 21], [31, 25], [15, 25], [8, 20]], body);
  p.fillBevel([[29, 12], [33, 3], [41, 3], [39, 15], [32, 19]], body);
  p.fillBevel([[35, 3], [43, 3], [47, 9], [46, 12], [42, 12], [38, 9]], body, { depth: 1 });
  // crin y oreja mellada
  p.fillBevel([[27, 10], [31, 1], [35, 2], [33, 8], [30, 13]], mane, { depth: 1 });
  for (let i = 0; i < 4; i++) p.line(28 + i, 11 - i * 2, 31 + i, 4 - i, i % 2 ? mane.l2 : mane.l1);
  p.poly([[36, 3], [37, 0], [40, 3]], body.b).px(37, 0, K).px(38, 1, body.d1);
  limb(p, lg.fn, body, hoof, wrapCol);
  limb(p, lg.hn, body, hoof, wrapCol);
  // músculo: pecho y anca
  p.line(31, 15, 33, 21, body.d1).line(14, 13, 12, 20, body.d1);
  p.px(18, 12, body.l2).px(19, 12, body.l2).px(20, 12, body.l1);

  // manta con el dorsal de la cuadra, cincha de cuero, cintas en la crin y bridón con cabezada
  p.fillBevel([[15, 10], [29, 10], [30, 15], [14, 15]], cloth, { depth: 1 });
  p.rect(14, 15, 17, 1, cloth.d2).rect(15, 10, 14, 1, cloth.l1);
  p.line(21, 15, 21, 23, '#3a2418').line(22, 15, 22, 23, '#5a3a22'); // cincha
  p.rect(17, 15, 8, 7, '#241c28').rect(18, 16, 6, 5, K);
  digit(p, look.num, 20, 16, '#EDE4C6');
  p.px(31, 4, cloth.b).px(32, 4, cloth.l1).px(33, 6, cloth.b).px(30, 7, cloth.l1).px(29, 10, cloth.b);
  p.line(39, 4, 43, 11, '#3a2418').px(41, 6, '#5a3a22').px(40, 5, '#5a3a22').rect(38, 9, 3, 2, '#241c28');

  // cara: cuenca con punto rojo (parpadea), nariz, sonrisa con dientes y lágrima
  const open = glitch;
  p.ellipse(41, 6, open ? 2 : 1, open ? 2 : 1, K);
  if (open) p.px(41, 6, '#EDE4C6').px(42, 6, K).px(40, 5, '#fff');
  else p.px(41, 6, frame === 0 ? C.eyeRed : K);
  p.px(46, 8, K).px(46, 9, body.d2);
  p.rect(43, 10, open ? 4 : 3, open ? 2 : 1, K).px(44, 10, '#EDE4C6').px(46, 10, '#EDE4C6').px(45, 9, '#EDE4C6');
  if (open) p.px(43, 12, C.eyeRed);
  p.px(40, 8, glitch ? C.eyeRed : body.d1).px(40, 9, glitch ? C.eyeRed : body.d2); // lágrima

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

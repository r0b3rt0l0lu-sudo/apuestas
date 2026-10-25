import { C } from '../config';
import { type Pocket, colorOf } from '../games/roulette';
import { Painter, bayer, hash, ramp } from './painter';

export const WHEEL_PX = 160;

const RED = ramp('#a8323c'), BLK = ramp('#241c2e'), GRN = ramp('#2f6a48');
const WOOD = ramp('#5a3a22'), STEEL = ramp('#8a869a'), GOLD = ramp(C.gold), COAT = ramp('#2a2036');

/** Rueda de la ruleta en pixel art; la casilla 0 de `wheel` queda centrada arriba. */
export function drawWheel(wheel: readonly Pocket[]): Painter {
  const s = WHEEL_PX, c = s / 2;
  const p = new Painter(s, s);
  const step = (Math.PI * 2) / wheel.length;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
      if (d > 79) continue;
      const lt = (-dx - dy) / (d + 0.001); // luz desde arriba izquierda: -1..1
      let col: string;
      if (d > 74) { // borde de madera con veta
        col = lt > 0.5 ? WOOD.l1 : lt < -0.5 ? WOOD.d1 : hash(Math.floor(Math.atan2(dy, dx) * 14), Math.floor(d), 3) < 0.25 ? WOOD.d1 : WOOD.b;
        if (d > 78) col = WOOD.d2;
      } else if (d > 67) { // pista de la bola, metal pulido
        col = lt > 0.6 ? STEEL.l2 : lt > 0.1 ? STEEL.l1 : lt > -0.4 ? STEEL.b : STEEL.d1;
        if (d > 73) col = STEEL.d2;
      } else if (d > 44) { // bolsillos
        const a = (Math.atan2(dx, -dy) + Math.PI * 2 + step / 2) % (Math.PI * 2);
        const i = Math.floor(a / step), frac = (a / step) % 1;
        const pocket = wheel[i] as Pocket;
        const r = colorOf(pocket) === 'rojo' ? RED : colorOf(pocket) === 'negro' ? BLK : GRN;
        const depth = (d - 44) / 23; // más oscuro hacia dentro
        if (frac < 0.08 || frac > 0.92) col = lt > 0 ? GOLD.l1 : GOLD.b; // separadores dorados
        else if (d > 65) col = r.l1;
        else col = depth < 0.18 ? r.d2 : depth < 0.4 ? (bayer(x, y) < 0.5 ? r.d1 : r.d2) : depth < 0.7 ? r.b : (bayer(x, y) < 0.5 ? r.b : r.l1);
        if (d < 46) col = r.d2;
      } else if (d > 37) { // aro de latón
        col = lt > 0.3 ? GOLD.l2 : lt > -0.2 ? GOLD.b : GOLD.d1;
      } else { // cono central con ranuras
        const g = (Math.floor(d) % 8 === 0) ? COAT.d2 : null;
        col = g ?? (lt > 0.5 ? COAT.l1 : lt > -0.3 ? COAT.b : COAT.d1);
        if (d < 18) col = lt > 0.4 ? GOLD.l1 : lt > -0.3 ? GOLD.b : GOLD.d1;
      }
      p.px(x, y, col);
    }
  }
  // radios del cono con puntas esféricas
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    p.line(c + Math.cos(a) * 8, c + Math.sin(a) * 8, c + Math.cos(a) * 30, c + Math.sin(a) * 30, GOLD.b, 2);
    p.shadedEllipse(Math.round(c + Math.cos(a) * 31), Math.round(c + Math.sin(a) * 31), 3, 3, GOLD);
  }
  p.shadedEllipse(c, c, 12, 12, GOLD);
  return p.outlineSel('#0d0a0e', 0.7);
}

import { C } from '../config';
import { type Pocket, colorOf } from '../games/roulette';
import { Painter } from './painter';

export const WHEEL_PX = 160;

const FILL = { rojo: C.danger, negro: '#1A1418', verde: C.patina } as const;

/** Rueda de la ruleta en pixel art; la casilla 0 de `wheel` queda centrada arriba. */
export function drawWheel(wheel: readonly Pocket[]): Painter {
  const s = WHEEL_PX, c = s / 2;
  const p = new Painter(s, s);
  p.ellipse(c, c, 79, 79, C.wood).ellipse(c, c, 74, 74, C.brass).ellipse(c, c, 70, 70, C.bg);
  const step = (Math.PI * 2) / wheel.length;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy);
      if (d > 68 || d < 44) continue;
      const a = (Math.atan2(dx, -dy) + Math.PI * 2 + step / 2) % (Math.PI * 2);
      const i = Math.floor(a / step);
      const frac = (a / step) % 1;
      const pocket = wheel[i] as Pocket;
      p.px(x, y, frac < 0.07 || frac > 0.93 ? C.gold : FILL[colorOf(pocket)]);
    }
  }
  p.ellipse(c, c, 43, 43, C.brass).ellipse(c, c, 40, 40, '#1B1620').ellipse(c, c, 30, 30, C.panel);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.line(c, c, c + Math.sin(a) * 40, c - Math.cos(a) * 40, C.brass);
  }
  return p;
}

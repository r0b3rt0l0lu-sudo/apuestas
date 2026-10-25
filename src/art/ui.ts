import { C } from '../config';
import { Painter, bayer, darken, hash, ramp } from './painter';

const K = '#0d0a0e';
const BR = ramp(C.brass), GD = ramp(C.gold);

export type FrameKind = 'btn' | 'btn-f' | 'btn-t' | 'btn-d' | 'panel' | 'dialog';

/**
 * Marco de 24×24 para NineSlice (esquinas de 8 px). Borde biselado de latón con
 * remaches en las esquinas y centro liso para poder estirarlo.
 */
export function drawFrame(kind: FrameKind): Painter {
  const p = new Painter(24, 24);
  const focus = kind === 'btn-f', toggled = kind === 'btn-t', dis = kind === 'btn-d';
  const edge = focus ? ramp(C.lamp) : toggled ? GD : dis ? ramp('#4a4234') : BR;
  const fill = kind === 'panel' ? '#120e10' : kind === 'dialog' ? '#16110f' : toggled ? '#2e2418' : focus ? '#1f1a14' : '#141012';
  p.rect(0, 0, 24, 24, K);
  p.rect(1, 1, 22, 22, edge.d1);
  p.rect(1, 1, 21, 21, edge.b);
  p.rect(1, 1, 22, 1, edge.l2).rect(1, 1, 1, 22, edge.l1);
  p.rect(1, 22, 22, 1, edge.d2).rect(22, 1, 1, 22, edge.d2);
  p.rect(3, 3, 18, 18, K);
  p.rect(4, 4, 16, 16, darken(fill, 0.25));
  p.rect(5, 5, 14, 14, fill);
  // luz interior en el borde superior izquierdo
  p.rect(4, 4, 16, 1, darken(fill, 0.1)).rect(4, 4, 1, 16, darken(fill, 0.1));
  // remaches
  if (kind !== 'btn-d') [[2, 2], [21, 2], [2, 21], [21, 21]].forEach(([x, y]) => p.px(x!, y!, GD.l2));
  // vetas sutiles solo en el borde
  for (let i = 0; i < 24; i++) if (hash(i, 2, 4) < 0.3) { p.px(i, 2, edge.l1); p.px(2, i, edge.d1); }
  if (focus) { p.rect(3, 3, 18, 1, ramp(C.lamp).d1).rect(3, 20, 18, 1, ramp(C.lamp).d1); }
  return p;
}

export function drawGauge(): Painter {
  const p = new Painter(16, 16);
  p.rect(0, 0, 16, 16, K).rect(1, 1, 14, 14, BR.d1).rect(1, 1, 14, 1, BR.l1).rect(1, 1, 1, 14, BR.b).rect(2, 2, 12, 12, '#07040a');
  p.px(2, 2, GD.l2).px(13, 2, GD.l2).px(2, 13, GD.l2).px(13, 13, GD.l2);
  return p;
}

/** Ficha de 12×12 para el saldo. */
export function drawChip(): Painter {
  const p = new Painter(12, 12);
  p.shadedEllipse(6, 6, 5, 5, GD);
  p.ellipse(6, 6, 3, 3, GD.d1).ellipse(6, 6, 2, 2, GD.b).px(5, 5, GD.l2);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.px(6 + Math.cos(a) * 5, 6 + Math.sin(a) * 5, i % 2 ? GD.d2 : GD.l1); }
  return p.outlineSel(K, 0.85);
}

/** Marca de acción: vela pequeña encendida/apagada de 6×14. */
export function drawTick(on: boolean): Painter {
  const p = new Painter(8, 16);
  if (on) {
    p.rect(2, 6, 4, 9, '#e4dcc0').rect(2, 6, 1, 9, '#fff6e0').rect(5, 6, 1, 9, '#a09878');
    p.rect(2, 14, 4, 1, BR.b);
    p.ellipse(4, 3, 1, 2, '#E07B1E').px(4, 3, C.lamp).px(4, 4, '#fff6c8');
  } else {
    p.rect(2, 8, 4, 7, '#4a4234').rect(2, 8, 1, 7, '#5a5242').rect(2, 14, 4, 1, BR.d1);
    p.px(4, 7, '#2a2418');
  }
  return p.outlineSel(K, 0.8);
}

export function drawSpark(): Painter {
  const p = new Painter(7, 7);
  p.rect(3, 0, 1, 7, '#fff0c4').rect(0, 3, 7, 1, '#fff0c4').rect(2, 2, 3, 3, '#fff').px(3, 3, '#fff');
  p.px(1, 1, '#e8d27a').px(5, 1, '#e8d27a').px(1, 5, '#e8d27a').px(5, 5, '#e8d27a');
  return p;
}

/** Cuatro fotogramas de una moneda que gira (8×8). */
export function drawCoinSpin(frame: number): Painter {
  const p = new Painter(8, 8);
  const w = [3, 2, 1, 2][frame] as number;
  p.shadedEllipse(4, 4, w, 3, GD);
  if (w === 1) p.rect(3, 1, 2, 6, GD.d1).px(3, 1, GD.l2);
  return p.outlineSel(K, 0.8);
}

/** Nubes de humo en tres tamaños, con borde tramado. */
export function drawSmoke(size: 0 | 1 | 2): Painter {
  const r = [3, 5, 8][size] as number;
  const p = new Painter(r * 2 + 3, r * 2 + 3);
  const c = r + 1;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y) / r;
    if (d > 1) continue;
    const n = hash(x + c, y + c, size + 3);
    if (d < 0.6 || bayer(x, y) < (1 - d) * 2.2) p.px(c + x, c + y, n < 0.5 ? '#5a5268' : '#7a7088');
  }
  return p;
}

/** Fogonazo del trabuco en 3 fotogramas (de más grande a más pequeño). */
export function drawMuzzle(frame: number): Painter {
  const r = [11, 8, 5][frame] as number;
  const p = new Painter(r * 2 + 3, r * 2 + 3);
  const c = r + 1;
  p.glow(c, c, r + 1, '#E07B1E', 0.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, len = i % 2 === 0 ? r : r * 0.6;
    p.line(c, c, c + Math.cos(a) * len, c + Math.sin(a) * len, i % 2 ? '#E07B1E' : '#f4d890', 1);
  }
  p.ellipse(c, c, Math.round(r / 2.5), Math.round(r / 2.5), '#fff0c4');
  p.ellipse(c, c, Math.max(1, Math.round(r / 4)), Math.max(1, Math.round(r / 4)), '#fff');
  return p;
}

export const px2 = (): Painter => new Painter(2, 2).rect(0, 0, 2, 2, '#ffffff');

/** Murciélago / pájaro de 11×6 en dos fotogramas de aleteo. */
export function drawBat(frame: 0 | 1): Painter {
  const p = new Painter(13, 8);
  const c = '#0d0a0e';
  if (frame === 0) p.poly([[6, 4], [1, 0], [3, 3], [0, 4], [4, 5]], c).poly([[6, 4], [11, 0], [9, 3], [12, 4], [8, 5]], c);
  else p.poly([[6, 4], [1, 7], [3, 5], [0, 4], [4, 4]], c).poly([[6, 4], [11, 7], [9, 5], [12, 4], [8, 4]], c);
  p.rect(5, 3, 3, 3, c).px(5, 2, c).px(7, 2, c);
  p.px(6, 4, '#E0503C');
  return p;
}

import * as THREE from 'three';
import { Painter } from '../art/painter';
import * as props from '../art/props';
import { drawSeven } from '../art/props';
import { SYMBOLS, type SlotSymbol } from '../games/slots';
import { canvasTex } from './tex';

export const symPainter = (s: SlotSymbol): Painter => ({ ojo: () => props.drawEyeSymbol('abierto'), diente: props.drawTooth, polilla: props.drawMoth, llave: props.drawKey, calavera: props.drawSkull, siete: () => drawSeven(0) } as Record<SlotSymbol, () => Painter>)[s]();

/** Banda del tambor: un símbolo por cara, girado 90° para que se vea derecho sobre el cilindro. */
export function stripTexture(): THREE.CanvasTexture {
  const p = new Painter(24 * 6, 24);
  SYMBOLS.forEach((s, i) => {
    const sp = symPainter(s);
    p.ctx.save();
    p.ctx.translate(i * 24 + 12, 12);
    p.ctx.rotate(Math.PI / 2);
    p.ctx.drawImage(sp.canvas, -12, -12);
    p.ctx.restore();
  });
  return canvasTex(p.canvas);
}

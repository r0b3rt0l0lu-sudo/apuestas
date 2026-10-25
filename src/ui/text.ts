import Phaser from 'phaser';
import { C, FONT_TITLE, FONT_UI } from '../config';

export interface TextOpts {
  size?: number;
  color?: string;
  title?: boolean;
  align?: 'left' | 'center' | 'right';
  origin?: [number, number];
  wrap?: number;
  depth?: number;
}

/** Texto con las fuentes del juego (VT323 interfaz, Special Elite títulos). */
export function label(scene: Phaser.Scene, x: number, y: number, s: string, o: TextOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, s, {
    fontFamily: o.title ? FONT_TITLE : FONT_UI,
    fontSize: `${o.size ?? 32}px`,
    color: o.color ?? C.text,
    align: o.align ?? 'left',
    wordWrap: o.wrap ? { width: o.wrap } : undefined,
    lineSpacing: 2
  });
  const [ox, oy] = o.origin ?? (o.align === 'center' ? [0.5, 0] : [0, 0]);
  t.setOrigin(ox, oy).setResolution(1).setShadow(2, 2, '#000000', 0, false, true);
  if (o.depth !== undefined) t.setDepth(o.depth);
  return t;
}

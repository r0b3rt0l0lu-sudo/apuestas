import * as THREE from 'three';
import { type Card, rankLabel } from '../games/blackjack';
import { cv, px } from './pixel';

const INK = '#0b0305';
const PAPER = '#d6cbae';
const RED = '#7a1e1e';

// palos de 7 columnas (X = píxel)
const SUITS: string[][] = [
  ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], // corazones
  ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], // diamantes
  ['..XXX..', '..XXX..', '.XXXXX.', 'XX.X.XX', 'XXXXXXX', '...X...', '..XXX..'], // tréboles
  ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XX.XX.', '...X...', '..XXX..'] // picas
];

const drawSuit = (g: CanvasRenderingContext2D, suit: number, x: number, y: number, col: string, s = 1): void => {
  (SUITS[suit] ?? []).forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === 'X') px(g, col, x + rx * s, y + ry * s, s, s); }));
};

const faces = new Map<string, THREE.CanvasTexture>();
let back: THREE.CanvasTexture | null = null;

/** Cara de la carta: papel viejo, número en las esquinas y el palo grande en el centro (24×32 píxeles). */
export function cardTex(c: Card): THREE.CanvasTexture {
  const key = `${c.rank}-${c.suit}`;
  const hit = faces.get(key);
  if (hit) return hit;
  const t = cv(24, 32, (g) => {
    const col = c.suit < 2 ? RED : INK;
    px(g, INK, 0, 0, 24, 32); px(g, PAPER, 1, 1, 22, 30);
    px(g, '#b8ad90', 1, 29, 22, 2); // sombra del canto
    const corner = (): void => {
      g.fillStyle = col;
      g.font = "21px 'VT323', monospace";
      g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText(rankLabel(c), c.rank === 10 ? 0 : 3, -2);
      drawSuit(g, c.suit, 2, 11, col, 1);
    };
    corner();
    g.save(); g.translate(24, 32); g.rotate(Math.PI); corner(); g.restore();
    drawSuit(g, c.suit, 8, 14, col, 2); // palo grande abajo a la derecha
  });
  faces.set(key, t);
  return t;
}

/** Dorso: granate con un entramado de rombos y un ojo en el centro. */
export function backTex(): THREE.CanvasTexture {
  if (back) return back;
  back = cv(24, 32, (g) => {
    px(g, INK, 0, 0, 24, 32); px(g, PAPER, 1, 1, 22, 30); px(g, '#7a1428', 3, 3, 18, 26);
    for (let y = 3; y < 29; y++) for (let x = 3; x < 21; x++) if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) px(g, '#561a1a', x, y);
    px(g, PAPER, 8, 14, 8, 4); px(g, INK, 10, 15, 4, 2); px(g, '#c24a3a', 11, 15, 2, 2);
  });
  return back;
}

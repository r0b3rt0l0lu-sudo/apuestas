import Phaser from 'phaser';
import { H, W } from '../config';
import { session } from '../core/session';

const COLS = 40, ROWS = 25, CELL = 32;
const thr = Array.from({ length: COLS * ROWS }, (_, i) => {
  const c = i % COLS, r = Math.floor(i / COLS);
  const h = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return (c / COLS) * 0.35 + (r / ROWS) * 0.25 + (h - Math.floor(h)) * 0.4;
});

/**
 * Transición por bloques de píxeles: los cuadrados negros cubren o descubren la
 * pantalla en orden irregular. Con «reducir destellos» se usa un fundido suave.
 */
export function wipe(scene: Phaser.Scene, dir: 'out' | 'in', ms = 560): Promise<void> {
  return new Promise((resolve) => {
    if (session.options.reduceFlash) {
      const r = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, dir === 'out' ? 0 : 1).setDepth(2000);
      scene.tweens.add({ targets: r, alpha: dir === 'out' ? 1 : 0, duration: Math.max(ms, 500), onComplete: () => { if (dir === 'in') r.destroy(); resolve(); } });
      return;
    }
    const g = scene.add.graphics().setDepth(2000);
    const draw = (t: number) => {
      g.clear().fillStyle(0x000000, 1);
      for (let i = 0; i < thr.length; i++) {
        const k = Math.max(0, Math.min(1, ((dir === 'out' ? t : 1 - t) - (thr[i] as number)) * 3.2));
        if (k <= 0) continue;
        const s = Math.ceil(k * CELL / 4) * 4; // crece en saltos de 4 px
        const c = i % COLS, r = Math.floor(i / COLS);
        g.fillRect(c * CELL + (CELL - s) / 2, r * CELL + (CELL - s) / 2, s, s);
      }
    };
    draw(0);
    scene.tweens.addCounter({
      from: 0, to: 1.25, duration: ms,
      onUpdate: (tw) => draw(Math.min(1.25, tw.getValue() ?? 0)),
      onComplete: () => { if (dir === 'in') g.destroy(); else draw(1.25); resolve(); }
    });
  });
}

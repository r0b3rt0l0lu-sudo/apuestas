import type Phaser from 'phaser';
import { session } from '../core/session';

/** Temblor de cámara. Con «reducir destellos y temblores» no se mueve nada: solo un fundido breve. */
export function shake(scene: Phaser.Scene, cycles = 5, cycleMs = 150, px = 6): void {
  if (session.options.reduceFlash) {
    softFade(scene, 0x000000, 0.25, cycles * cycleMs);
    return;
  }
  const cam = scene.cameras.main;
  const total = cycles * cycleMs;
  let n = 0;
  const ev = scene.time.addEvent({
    delay: cycleMs / 2,
    repeat: cycles * 2 - 1,
    callback: () => {
      n++;
      cam.setScroll(n % 2 === 0 ? 0 : (n % 4 === 1 ? px : -px), 0);
      if (n >= cycles * 2) cam.setScroll(0, 0);
    }
  });
  scene.time.delayedCall(total + 20, () => { cam.setScroll(0, 0); ev.remove(); });
}

/** Fundido suave de un color (sustituye a los destellos). */
export function softFade(scene: Phaser.Scene, color: number, alpha: number, ms: number): void {
  const r = scene.add.rectangle(640, 400, 1280, 800, color, alpha).setDepth(900);
  scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
}

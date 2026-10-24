import type Phaser from 'phaser';
import { session } from '../core/session';
import { softFade } from './shake';

/** Destello de pantalla; con «reducir destellos» se convierte en un fundido suave. */
export function flash(scene: Phaser.Scene, color: number, ms = 600, alpha = 0.9): void {
  if (session.options.reduceFlash) {
    softFade(scene, color, Math.min(0.3, alpha), Math.max(ms, 500));
    return;
  }
  softFade(scene, color, alpha, ms);
}

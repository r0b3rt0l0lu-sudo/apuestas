import Phaser from 'phaser';
import { session } from '../core/session';

/**
 * Parpadeo de lámpara: escalonado y aleatorio, con caídas de opacidad a 0,35–0,7.
 * Con «reducir destellos» las caídas son leves.
 */
export function lampFlicker(scene: Phaser.Scene, targets: Array<{ setAlpha(v: number): unknown }>, base = 1): void {
  const tick = () => {
    const soft = session.options.reduceFlash;
    const dip = soft ? Phaser.Math.FloatBetween(0.8, 0.95) : Phaser.Math.FloatBetween(0.35, 0.7);
    targets.forEach((t) => t.setAlpha(base * dip));
    scene.time.delayedCall(Phaser.Math.Between(40, 120), () => {
      targets.forEach((t) => t.setAlpha(base));
      scene.time.delayedCall(Phaser.Math.Between(700, 3200), tick);
    });
  };
  scene.time.delayedCall(Phaser.Math.Between(500, 2000), tick);
}

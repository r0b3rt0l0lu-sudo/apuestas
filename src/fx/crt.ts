import Phaser from 'phaser';
import { H, W } from '../config';

/** Scanlines + viñeta, siempre activos por encima de todas las escenas. */
export class CrtScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Crt', active: false });
  }

  create(): void {
    if (!this.textures.exists('scan')) {
      const c = this.textures.createCanvas('scan', 4, 4);
      const x = c?.getContext();
      if (x) { x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, 0, 4, 1); c?.refresh(); }
      const v = this.textures.createCanvas('vignette', 128, 80);
      const vx = v?.getContext();
      if (vx) {
        const g = vx.createRadialGradient(64, 40, 28, 64, 40, 78);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
        g.addColorStop(1, 'rgba(0,0,0,0.88)');
        vx.fillStyle = g; vx.fillRect(0, 0, 128, 80); v?.refresh();
      }
    }
    this.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H);
    this.add.tileSprite(W / 2, H / 2, W, H, 'scan');
    this.scene.bringToTop();
  }
}

import Phaser from 'phaser';
import { buildScenery, buildTextures } from '../art/textures';
import { C, H, W } from '../config';
import { label } from '../ui/text';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0a0e);
    const t = label(this, W / 2, H / 2 - 20, 'Encendiendo las luces…', { size: 32, color: C.textDim, align: 'center' });
    // dejar pintar el texto antes del trabajo pesado de generar fondos
    this.time.delayedCall(60, () => {
      buildTextures(this);
      buildScenery(this);
      t.destroy();
      this.scene.launch('Crt');
      this.scene.start('Title');
    });
  }
}

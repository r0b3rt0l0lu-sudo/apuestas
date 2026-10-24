import Phaser from 'phaser';
import { buildTextures } from '../art/textures';

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  create(): void {
    buildTextures(this);
    this.scene.launch('Crt');
    this.scene.start('Title');
  }
}

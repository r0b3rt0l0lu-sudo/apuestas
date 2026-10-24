import Phaser from 'phaser';
import { FONT_TITLE, FONT_UI } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    // Las fuentes autoalojadas deben estar listas antes de pintar texto.
    const load = Promise.all([document.fonts.load(`32px "${FONT_UI}"`), document.fonts.load(`32px "${FONT_TITLE}"`)]);
    const go = () => this.scene.start('Preload');
    load.then(go, go);
  }
}

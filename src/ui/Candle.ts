import Phaser from 'phaser';

/** Vela de 16×16 con llama que parpadea. */
export class Candle extends Phaser.GameObjects.Image {
  lit = true;
  private f = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, scale_ = 3) {
    super(scene, x, y, 'candle-lit-0');
    this.setScale(scale_);
    scene.add.existing(this);
    scene.time.addEvent({ delay: 220, loop: true, callback: () => { this.f = (this.f + 1) % 2; this.refresh(); } });
  }

  setLit(v: boolean): this {
    this.lit = v;
    this.refresh();
    return this;
  }

  private refresh(): void {
    this.setTexture(`candle-${this.lit ? 'lit' : 'out'}-${this.f}`);
  }
}

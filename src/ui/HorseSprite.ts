import Phaser from 'phaser';

/** Caballito de tiovivo: galope de 2 fotogramas cada 300 ms; la barra no se mueve. */
export class HorseSprite extends Phaser.GameObjects.Container {
  running = false;
  private horse: Phaser.GameObjects.Image;
  private frame: 0 | 1 = 0;
  private tick: number;

  constructor(scene: Phaser.Scene, x: number, y: number, private idx: number, px = 2) {
    super(scene, x, y);
    this.horse = scene.add.image(0, 0, `horse-${idx}-0`).setScale(px);
    const pole = scene.add.image(0, 0, 'pole').setScale(px);
    this.add([this.horse, pole]);
    this.setSize(48 * px, 40 * px);
    this.tick = idx * 7;
    scene.add.existing(this);
    scene.time.addEvent({ delay: 150, loop: true, callback: () => this.step() });
  }

  private step(): void {
    this.tick++;
    if (this.running && this.tick % 2 === 0) this.frame = this.frame === 0 ? 1 : 0;
    if (!this.running) this.frame = 0;
    // fotograma glitch: dos periodos primos combinados (43 y 61 ticks)
    const glitch = this.tick % 43 === 0 || this.tick % 61 === 0;
    this.horse.setTexture(`horse-${this.idx}-${glitch ? 'g' : this.frame}`);
  }
}

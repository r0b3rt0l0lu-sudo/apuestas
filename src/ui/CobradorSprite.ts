import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { session } from '../core/session';
import type { Mood } from '../art/cobrador';

/**
 * El Cobrador por capas (boca, cejas y ojo se combinan sin una hoja por mezcla).
 * Tick de 150 ms: respiración, halo/grieta, polilla, dedos, parpadeo y glitch.
 */
export class CobradorSprite extends Phaser.GameObjects.Container {
  mood: Mood = 'acecho';
  private tick = Phaser.Math.Between(0, 40);
  private layers: Record<string, Phaser.GameObjects.Image> = {};
  private glitchImg: Phaser.GameObjects.Image;
  private glitchLeft = 0;
  private breath = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, private px = 5) {
    super(scene, x, y);
    const mk = (k: string, tex: string) => {
      const im = scene.add.image(0, 0, tex).setScale(px);
      this.layers[k] = im;
      this.add(im);
      return im;
    };
    mk('base', 'cb-base');
    mk('glow', 'cb-glow-0');
    mk('socket', 'cb-socket');
    mk('moth', 'cb-moth-0');
    mk('fingers', 'cb-fingers-0');
    mk('eye', 'cb-eye-acecho');
    mk('halo', 'cb-halo-0');
    mk('brow', 'cb-brow-acecho');
    mk('mouth', 'cb-mouth-acecho');
    mk('glint', 'cb-glint').setVisible(false);
    this.glitchImg = scene.add.image(0, 0, 'cb-glitch-acecho').setScale(px).setVisible(false);
    this.add(this.glitchImg);
    this.setSize(48 * px, 48 * px);
    scene.add.existing(this);
    scene.time.addEvent({ delay: 150, loop: true, callback: () => this.step() });
    this.step();
  }

  setMood(m: Mood): this {
    this.mood = m;
    this.layers.eye?.setTexture(`cb-eye-${m}`);
    this.layers.brow?.setTexture(`cb-brow-${m}`);
    this.layers.mouth?.setTexture(`cb-mouth-${m}`);
    return this;
  }

  /** Fuerza el fotograma glitch ahora. */
  glitch(): void {
    this.glitchLeft = 1;
    this.showGlitch(true);
  }

  private showGlitch(on: boolean): void {
    const soft = session.options.reduceFlash;
    this.glitchImg.setTexture(`cb-glitch${soft ? 'soft' : ''}-${this.mood}`).setVisible(on);
    Object.entries(this.layers).forEach(([k, im]) => { if (k !== 'glint') im.setVisible(!on); });
    if (on && !soft) sfx.glitch();
  }

  private step(): void {
    this.tick++;
    const t = this.tick, red = this.mood === 'cobra';
    this.layers.glow?.setTexture(`cb-glow${red ? 'r' : ''}-${Math.floor(t / 3) % 2}`);
    this.layers.halo?.setTexture(`cb-halo${red ? 'r' : ''}-${Math.floor(t / 3) % 2}`);
    this.layers.moth?.setTexture(`cb-moth-${t % 2}`);
    this.layers.fingers?.setTexture(`cb-fingers-${Math.floor(t / 6) % 2}`);
    this.layers.socket?.setVisible(t % 17 < 3 && this.glitchLeft === 0);
    this.layers.glint?.setVisible(!red && t % 50 < 2 && this.glitchLeft === 0);
    this.breath = Math.floor(t / 10) % 2; // sube y baja 1 px cada 1,5 s
    Object.values(this.layers).forEach((im) => im.setY(-this.breath * this.px));
    this.glitchImg.setY(-this.breath * this.px);
    // glitch irregular: dos periodos primos combinados (43 y 61 ticks)
    if (this.glitchLeft > 0) {
      this.glitchLeft--;
      if (this.glitchLeft === 0) this.showGlitch(false);
    } else if (t % 43 === 0 || t % 61 === 0) {
      this.glitchLeft = 1;
      this.showGlitch(true);
    }
  }
}

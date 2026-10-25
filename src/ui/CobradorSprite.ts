import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { session } from '../core/session';
import type { Mood } from '../art/cobrador';

const N = 96; // lado del sprite en píxeles de arte
const RE = { x: 62 - 48, y: 45 - 48 }; // ojo del monóculo, relativo al centro

/**
 * El Cobrador por capas con tick de 150 ms: respira, se balancea, parpadea con
 * párpados irregulares, su mirada sigue al puntero, la tinta gotea, los dedos tamborilean,
 * las polillas lo rodean y de vez en cuando enseña su cara de verdad (glitch).
 */
export class CobradorSprite extends Phaser.GameObjects.Container {
  mood: Mood = 'acecho';
  private tick = Phaser.Math.Between(0, 40);
  private L: Record<string, Phaser.GameObjects.Image> = {};
  private head: Phaser.GameObjects.Container;
  private glitchImg: Phaser.GameObjects.Image;
  private pupil: Phaser.GameObjects.Image;
  private moths: Phaser.GameObjects.Image[] = [];
  private glitchLeft = 0;
  private blinkAt = 0;
  private blinkStep = -1;
  private thirdUntil = 0;
  private jawStep = 0;
  private pup = { x: 0, y: 0 };
  private shakeAmt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, private px = 4) {
    super(scene, x, y);
    const mk = (parent: Phaser.GameObjects.Container, k: string, tex: string) => {
      const im = scene.add.image(0, 0, tex).setScale(px);
      this.L[k] = im;
      parent.add(im);
      return im;
    };
    mk(this, 'tend', 'cb-tend-0');
    mk(this, 'body', 'cb-body');
    mk(this, 'lhand', 'cb-lhand-0');
    // la cabeza es un grupo para balancearla entera
    this.head = scene.add.container(0, 0);
    this.add(this.head);
    mk(this.head, 'head', 'cb-head');
    mk(this.head, 'sock', 'cb-sock-0');
    mk(this.head, 'eyew', 'cb-eyew-acecho');
    this.pupil = scene.add.image(RE.x * px, RE.y * px, 'cb-pupil-acecho').setScale(px);
    this.head.add(this.pupil);
    mk(this.head, 'lid', 'cb-lid-0');
    mk(this.head, 'brow', 'cb-brow-acecho');
    mk(this.head, 'third', 'cb-third-0');
    mk(this.head, 'mouth', 'cb-mouth-acecho-0');
    mk(this.head, 'glow', 'cb-glow-0');
    mk(this.head, 'ooze', 'cb-ooze-0');
    mk(this.head, 'halo', 'cb-halo-0');
    mk(this.head, 'glint', 'cb-glint').setVisible(false);
    mk(this, 'hat', 'cb-hat-0');
    mk(this, 'rhand', 'cb-rhand-0');
    mk(this, 'pend', 'cb-pend-0');
    mk(this, 'chain', 'cb-chain-0');
    for (let i = 0; i < 3; i++) this.moths.push(scene.add.image(0, 0, 'cb-moth-0').setScale(Math.max(1, px - 1)));
    this.add(this.moths);
    this.glitchImg = scene.add.image(0, 0, 'cb-glitch-acecho').setScale(px).setVisible(false);
    this.add(this.glitchImg);
    this.setSize(N * px, N * px);
    scene.add.existing(this);
    this.blinkAt = this.tick + Phaser.Math.Between(25, 70);
    scene.time.addEvent({ delay: 150, loop: true, callback: () => this.step() });
    const upd = (_t: number, dt: number) => this.follow(dt / 1000);
    scene.events.on('update', upd);
    scene.events.once('shutdown', () => scene.events.off('update', upd));
    this.step();
  }

  setMood(m: Mood, silent = false): this {
    if (m === this.mood) return this;
    this.mood = m;
    this.L.eyew?.setTexture(`cb-eyew-${m}`);
    this.pupil.setTexture(`cb-pupil-${m}`);
    this.L.brow?.setTexture(`cb-brow-${m}`);
    this.jawStep = 0;
    if (m === 'cobra') { this.thirdUntil = this.tick + 9999; if (!silent) this.lunge(); } else if (this.thirdUntil > this.tick + 100) this.thirdUntil = 0;
    return this;
  }

  /** Salta hacia delante, como si fuera a salir de la pantalla. */
  lunge(): void {
    if (session.options.reduceFlash) return;
    this.scene.tweens.add({ targets: this, scale: { from: 1.1, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  /** Se sacude de risa (o de rabia): la mandíbula tiembla y el cuerpo se agita. */
  laugh(): void {
    if (session.options.reduceFlash) return;
    this.shakeAmt = 8;
    this.scene.time.delayedCall(1100, () => { this.shakeAmt = 0; });
  }

  /** Retrocede al recibir un golpe. */
  flinch(dir = 1): void {
    const x0 = this.x, y0 = this.y;
    this.glitch();
    this.scene.tweens.add({ targets: this, x: x0 + 24 * dir, y: y0 - 10, duration: 90, yoyo: true, ease: 'Quad.easeOut', onComplete: () => this.setPosition(x0, y0) });
  }

  /** Fuerza el fotograma glitch ahora. */
  glitch(): void {
    this.glitchLeft = 1;
    this.showGlitch(true);
  }

  private showGlitch(on: boolean): void {
    const soft = session.options.reduceFlash;
    this.glitchImg.setTexture(`cb-glitch${soft ? 'soft' : ''}-${this.mood}`).setVisible(on);
    this.list.forEach((o) => { if (o !== this.glitchImg) (o as Phaser.GameObjects.Image).setVisible(!on); });
    if (!on) this.L.glint?.setVisible(false);
    if (on && !soft) sfx.glitch();
  }

  /** La mirada sigue al puntero (se ajusta a la rejilla del arte). */
  private follow(dt: number): void {
    const ptr = this.scene.input.activePointer;
    const cx = this.x + (this.head.x + RE.x * this.px) * this.scaleX, cy = this.y + (this.head.y + RE.y * this.px) * this.scaleY;
    const dx = Phaser.Math.Clamp((ptr.worldX - cx) / 120, -1, 1), dy = Phaser.Math.Clamp((ptr.worldY - cy) / 120, -1, 1);
    const k = 1 - Math.pow(0.0005, dt);
    this.pup.x += (dx * 3 - this.pup.x) * k;
    this.pup.y += (dy * 3 - this.pup.y) * k;
    this.pupil.setPosition(Math.round(this.pup.x) * this.px + RE.x * this.px, Math.round(this.pup.y) * this.px + RE.y * this.px);
  }

  private step(): void {
    this.tick++;
    const t = this.tick, red = this.mood === 'cobra', px = this.px;
    const f = (id: string, tex: string) => this.L[id]?.setTexture(tex);
    f('tend', `cb-tend-${Math.floor(t / 2) % 4}`);
    f('hat', `cb-hat-${Math.floor(t / 7) % 2}`);
    f('rhand', `cb-rhand-${Math.floor(t / 5) % 4}`);
    f('lhand', `cb-lhand-${Math.floor(t / 9) % 2}`);
    f('pend', `cb-pend-${Math.floor(t / 3) % 4}`);
    f('chain', `cb-chain-${Math.floor(t / 4) % 3}`);
    f('glow', `cb-glow${red ? 'r' : ''}-${Math.floor(t / 3) % 2}`);
    f('halo', `cb-halo${red ? 'r' : ''}-${Math.floor(t / 3) % 2}`);
    f('ooze', `cb-ooze-${Math.floor(t / 3) % 4}`);
    f('sock', `cb-sock${red ? 'r' : ''}-${[0, 0, 1, 0, 2, 2][t % 6]}`);
    this.moths.forEach((m, i) => {
      const a = t * 0.19 + i * 2.1;
      m.setPosition(Math.round((Math.cos(a) * 40 + Math.sin(a * 2.3) * 6) * px / 2) * 2, Math.round((Math.sin(a * 1.3) * 26 - 6) * px / 2) * 2);
      m.setTexture(`cb-moth-${(t + i) % 2}`);
      m.setDepth(Math.cos(a) > 0 ? 3 : -1);
    });
    // respiración y balanceo de la cabeza (saltos de 1 px de arte)
    const breath = Math.floor(t / 10) % 2;
    const sway = Math.round(Math.sin(t * 0.13) * 1.2);
    const jit = this.shakeAmt ? Phaser.Math.Between(-1, 1) : 0;
    this.head.setPosition((sway + jit) * px, (-breath + (this.shakeAmt ? Phaser.Math.Between(0, 1) : 0)) * px);
    this.L.hat?.setPosition((sway * 2 + jit) * px, (-breath) * px);
    this.L.body?.setY(-breath * px * 0.5 * 0);
    // parpadeo irregular del ojo grande (párpado pesado) y tercer ojo
    if (this.blinkStep >= 0) {
      const seq = [1, 2, 2, 1, 0];
      f('lid', `cb-lid-${seq[this.blinkStep]}`);
      if (++this.blinkStep >= seq.length) { this.blinkStep = -1; this.blinkAt = t + Phaser.Math.Between(30, 80); }
    } else if (t >= this.blinkAt && !red) this.blinkStep = 0;
    else if (red) f('lid', 'cb-lid-0');
    if (!red && t % 97 === 0) this.thirdUntil = t + 7;
    const open = red ? 2 : t < this.thirdUntil ? (this.thirdUntil - t > 2 ? 1 : 0) : 0;
    f('third', `cb-third-${open}`);
    // boca: respira; en `cobra` se descuelga en 4 pasos y tiembla
    if (red) {
      this.jawStep = Math.min(3, this.jawStep + 1);
      f('mouth', `cb-mouth-cobra-${this.jawStep === 3 && t % 2 ? 2 : this.jawStep}`);
    } else f('mouth', `cb-mouth-${this.mood}-${Math.floor(t / 6) % 2}`);
    this.L.glint?.setVisible(!red && t % 50 < 2 && this.glitchLeft === 0);
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

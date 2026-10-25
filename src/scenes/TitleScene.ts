import Phaser from 'phaser';
import { setLight } from '../fx/look';
import { sfx } from '../audio/sfx';
import { C, H, W } from '../config';
import { session, sceneForPhase } from '../core/session';
import { lampFlicker } from '../fx/flicker';
import { FX } from '../fx/particles';
import { fadeIn } from './common';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { Overlay } from '../ui/Overlay';
import { openOptions } from '../ui/options';
import { fairBackdrop } from '../ui/scenic';
import { label } from '../ui/text';

let warned = false;

export class TitleScene extends Phaser.Scene {
  private group!: FocusGroup;

  constructor() { super('Title'); }

  create(): void {
    fadeIn(this);
    setLight(640, 400, 1000, 0.28);
    fairBackdrop(this);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.35).setDepth(-4);
    const fx = new FX(this, 2);
    // brasas que suben desde el suelo
    this.time.addEvent({ delay: 260, loop: true, callback: () => fx.add({ x: Phaser.Math.Between(80, 1200), y: 790, vx: Phaser.Math.Between(-30, 30), vy: -Phaser.Math.Between(60, 160), tex: 'px', tint: Phaser.Math.Between(0, 2) ? 0xe07b1e : 0xe8d27a, life: Phaser.Math.FloatBetween(2, 4), scale: 2, fade: true, depth: 5 }) });

    const title = label(this, W / 2, 34, T.title, { title: true, size: 80, color: C.textBright, align: 'center', depth: 10 });
    title.setShadow(0, 6, '#7A1E1E', 0, false, true);
    lampFlicker(this, [title], 1);
    const sub = label(this, W / 2, 128, T.subtitle, { size: 32, color: C.textDim, align: 'center', depth: 10 });
    this.tweens.add({ targets: sub, alpha: { from: 0.55, to: 1 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const cb = new CobradorSprite(this, W / 2, 410, 5);
    cb.setDepth(8);
    this.tweens.add({ targets: cb, y: 400, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.group = new FocusGroup(this);
    this.buildMenu();
    sfx.ambience('hub');
    if (!warned) this.showWarning();
  }

  private buildMenu(): void {
    this.group.clear();
    const y0 = 690;
    const items: Array<[string, () => void]> = [];
    if (session.hasSave()) items.push([T.continue, () => this.go(true)]);
    items.push([T.newGame, () => (session.hasSave() ? this.confirmNew() : this.go(false))]);
    items.push([T.options, () => openOptions(this)]);
    items.forEach(([text, fn], i) => {
      const x = W / 2 + (i - (items.length - 1) / 2) * 360;
      const b = new Button(this, x, y0, 330, 80, text, fn, { size: 40 });
      b.setDepth(10);
      this.group.add(b);
    });
    label(this, W / 2, 750, T.keysHint, { size: 24, color: C.textDim, align: 'center', depth: 10 });
  }

  private showWarning(): void {
    const ov = new Overlay(this, T.warnTitle, T.warnBody, [{ text: T.warnOk, onClick: () => { warned = true; ov.close(); this.group.focusFirst(); } }], { w: 1000 });
  }

  private confirmNew(): void {
    const ov = new Overlay(this, T.newGame, [T.confirmNew], [
      { text: T.yes, onClick: () => { ov.close(); this.go(false); } },
      { text: T.no, onClick: () => ov.close() }
    ], { w: 800 });
  }

  private go(resume: boolean): void {
    if (resume) session.continueRun(); else session.startNew();
    const next = sceneForPhase(session.run.phase);
    import('./common').then(({ fadeTo }) => fadeTo(this, next));
  }
}

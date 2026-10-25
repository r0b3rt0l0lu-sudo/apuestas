import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, W } from '../config';
import { LAST_NIGHT, nightDef } from '../core/nights';
import { session } from '../core/session';
import { quotaOf } from '../core/state';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { FX } from '../fx/particles';
import { wipe } from '../fx/wipe';
import { dawnBackdrop } from '../ui/scenic';
import { fadeIn, goPhase } from './common';

export class DawnScene extends Phaser.Scene {
  constructor() { super('Dawn'); }

  create(): void {
    const r = session.run;
    if (r.phase !== 'dawn') { goPhase(this); return; }
    fadeIn(this, 560);
    sfx.ambience('hub');
    dawnBackdrop(this);
    const fx = new FX(this, 2);
    this.time.delayedCall(900, () => fx.confetti(W / 2, 300, 30));
    this.add.nineslice(W / 2, 252, 'ui-panel', undefined, 200, 38, 8, 8, 8, 8).setScale(2).setDepth(4).setAlpha(0.94);
    const title = label(this, W / 2, 56, T.dawn.title, { title: true, size: 64, align: 'center', color: C.textBright, depth: 5 });
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, y: 64, duration: 900, ease: 'Quad.easeOut' });
    const q = quotaOf(r);
    const lines = [
      r.forgiven ? T.dawn.forgiven : T.dawn.paid(q),
      T.dawn.left(r.forgiven ? r.balance : r.balance - q)
    ];
    label(this, W / 2, 208, lines.join('\n'), { size: 40, align: 'center', color: C.lamp, depth: 5 });
    const cb = new CobradorSprite(this, 330, 500, 5).setMood('sonrisa').setDepth(6);
    this.tweens.add({ targets: cb, y: { from: 560, to: 500 }, alpha: { from: 0, to: 1 }, duration: 800, ease: 'Back.easeOut' });
    const next = r.night >= LAST_NIGHT ? T.dawn.lastNext : T.dawn.next(T.night.nextWords[nightDef(r.night + 1).night - 1] ?? '');
    this.add.nineslice(880, 372, 'ui-dialog', undefined, 300, 36, 8, 8, 8, 8).setScale(2).setDepth(4);
    label(this, 612, 352, next, { size: 40, color: C.textBright, wrap: 560, depth: 5 });
    const group = new FocusGroup(this);
    group.add(new Button(this, 900, 600, 620, 90, T.dawn.go, () => this.go(), { size: 36 }).setDepth(6));
  }

  private go(): void {
    session.dispatch({ type: 'nextNight' });
    void wipe(this, 'out', 560).then(() => goPhase(this));
  }
}

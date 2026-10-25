import Phaser from 'phaser';
import { setLight } from '../fx/look';
import { sfx } from '../audio/sfx';
import { C, W } from '../config';
import { session } from '../core/session';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { FX } from '../fx/particles';
import { dawnBackdrop } from '../ui/scenic';
import { fadeIn, fadeTo, goPhase } from './common';

export class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create(): void {
    if (session.run.phase !== 'ending') { goPhase(this); return; }
    fadeIn(this, 800);
    sfx.ambience('none');
    dawnBackdrop(this, true);
    setLight(640, 420, 1700, 0.95);
    const fx = new FX(this, 2);
    this.time.addEvent({ delay: 1400, loop: true, callback: () => fx.confetti(Phaser.Math.Between(200, 1080), 260, 16) });
    const t = label(this, W / 2, 50, T.ending.title, { title: true, size: 80, align: 'center', color: C.lamp, depth: 6 });
    t.setAlpha(0); this.tweens.add({ targets: t, alpha: 1, y: 64, duration: 1600 });
    this.add.nineslice(W / 2, 330, 'ui-panel', undefined, 240, 130, 8, 8, 8, 8).setScale(2).setDepth(4).setAlpha(0.9);
    label(this, W / 2, 220, T.ending.lines.join('\n\n'), { size: 36, align: 'center', color: C.textBright, wrap: 900, depth: 5 });
    new CobradorSprite(this, W / 2, 560, 3).setMood('acecho').setDepth(6);
    const g = new FocusGroup(this);
    g.add(new Button(this, W / 2, 730, 520, 80, T.ending.again, () => { session.startNew(); fadeTo(this, 'Hub'); }, { size: 36 }));
  }
}

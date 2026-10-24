import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, H, W, hex } from '../config';
import { session } from '../core/session';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { fadeIn, fadeTo, goPhase } from './common';

export class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create(): void {
    if (session.run.phase !== 'ending') { goPhase(this); return; }
    fadeIn(this, 800);
    sfx.ambience('none');
    this.add.rectangle(W / 2, H / 2, W, H, hex(C.bg));
    this.add.rectangle(W / 2, 700, W, 300, hex('#3A2E1C'), 0.7);
    label(this, W / 2, 70, T.ending.title, { title: true, size: 80, align: 'center', color: C.lamp });
    label(this, W / 2, 220, T.ending.lines.join('\n\n'), { size: 36, align: 'center', color: C.textBright, wrap: 900 });
    new CobradorSprite(this, W / 2, 560, 3).setMood('acecho');
    const g = new FocusGroup(this);
    g.add(new Button(this, W / 2, 730, 520, 80, T.ending.again, () => { session.startNew(); fadeTo(this, 'Hub'); }, { size: 36 }));
  }
}

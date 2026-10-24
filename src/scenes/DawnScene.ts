import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, H, W, hex } from '../config';
import { LAST_NIGHT, nightDef } from '../core/nights';
import { session } from '../core/session';
import { quotaOf } from '../core/state';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { fadeIn, goPhase } from './common';

export class DawnScene extends Phaser.Scene {
  constructor() { super('Dawn'); }

  create(): void {
    const r = session.run;
    if (r.phase !== 'dawn') { goPhase(this); return; }
    fadeIn(this, 500);
    sfx.ambience('hub');
    this.add.rectangle(W / 2, H / 2, W, H, hex(C.bg));
    this.add.rectangle(W / 2, 620, W, 360, hex('#2A2218'), 0.7);
    this.add.ellipse(W / 2, 700, 900, 260, hex(C.lamp), 0.12);
    label(this, W / 2, 60, T.dawn.title, { title: true, size: 64, align: 'center', color: C.textBright });
    const q = quotaOf(r);
    const lines = [
      r.forgiven ? T.dawn.forgiven : T.dawn.paid(q),
      T.dawn.left(r.forgiven ? r.balance : r.balance - q)
    ];
    label(this, W / 2, 170, lines.join('\n'), { size: 40, align: 'center', color: C.lamp });
    const cb = new CobradorSprite(this, 330, 470, 5).setMood('sonrisa');
    void cb;
    const next = r.night >= LAST_NIGHT ? T.dawn.lastNext : T.dawn.next(T.night.nextWords[nightDef(r.night + 1).night - 1] ?? '');
    label(this, 600, 340, next, { size: 40, color: C.textBright, wrap: 560 });
    const group = new FocusGroup(this);
    group.add(new Button(this, 900, 600, 620, 90, T.dawn.go, () => this.go(), { size: 36 }));
  }

  private go(): void {
    session.dispatch({ type: 'nextNight' });
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => goPhase(this));
  }
}

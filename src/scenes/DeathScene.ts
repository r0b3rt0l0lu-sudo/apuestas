import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, H, W, hex } from '../config';
import { session } from '../core/session';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { Candle } from '../ui/Candle';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { fadeTo, goPhase } from './common';

export class DeathScene extends Phaser.Scene {
  constructor() { super('Death'); }

  create(): void {
    const r = session.run;
    if (r.phase !== 'dead') { goPhase(this); return; }
    sfx.ambience('none');
    this.add.rectangle(W / 2, H / 2, W, H, hex('#0A0608'));
    const candle = new Candle(this, 140, 650, 6);
    const cb = new CobradorSprite(this, W / 2, 400, 5).setMood('cobra').setScale(0.45).setAlpha(0.9);
    const black = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1).setDepth(100).setAlpha(0);
    const title = label(this, W / 2, 250, T.death.title, { title: true, size: 96, align: 'center', color: C.eyeRed, depth: 101 }).setAlpha(0);
    const sub = label(this, W / 2, 400, [...T.death.sub, T.death.nights(r.night)].join('\n'), { size: 40, align: 'center', color: C.text, depth: 101 }).setAlpha(0);
    const group = new FocusGroup(this);
    const btn = new Button(this, W / 2, 620, 520, 90, T.death.again, () => { session.startNew(); fadeTo(this, 'Hub'); }, { size: 40 });
    btn.setDepth(101).setAlpha(0).setEnabled(false);
    group.add(btn);

    // Secuencia: 0,6 s se acerca (3,2 s, ×0,45→×1,7) · 1,2 s la vela se apaga (2,2 s) · 3,6 s negro ·
    // 4,2 s título · 5 s subtítulos · 6,2 s botones
    this.time.delayedCall(600, () => {
      sfx.whisper();
      this.tweens.addCounter({ from: 0.45, to: 1.7, duration: 3200, onUpdate: (t) => cb.setScale(Math.round((t.getValue() ?? 1) * 20) / 20) });
    });
    this.time.delayedCall(1200, () => this.tweens.add({ targets: candle, alpha: 0.2, duration: 2200, onComplete: () => candle.setLit(false) }));
    this.time.delayedCall(3600, () => { black.setAlpha(1); candle.setVisible(false); cb.setVisible(false); });
    this.time.delayedCall(4200, () => this.tweens.add({ targets: title, alpha: 1, duration: 400 }));
    this.time.delayedCall(5000, () => this.tweens.add({ targets: sub, alpha: 1, duration: 500 }));
    this.time.delayedCall(6200, () => { btn.setAlpha(1).setEnabled(true); group.focusFirst(); });
  }
}

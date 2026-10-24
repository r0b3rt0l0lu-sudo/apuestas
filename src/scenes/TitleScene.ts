import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, H, W, hex } from '../config';
import { session, sceneForPhase } from '../core/session';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { Overlay } from '../ui/Overlay';
import { label } from '../ui/text';
import { lampFlicker } from '../fx/flicker';
import { openOptions } from '../ui/options';

let warned = false;

export class TitleScene extends Phaser.Scene {
  private group!: FocusGroup;

  constructor() { super('Title'); }

  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, hex(C.bg));
    const halo = this.add.ellipse(W / 2, 330, 760, 520, hex(C.wood), 0.55);
    this.add.ellipse(W / 2, 330, 460, 340, hex(C.rust), 0.18);
    lampFlicker(this, [halo], 0.55);
    label(this, W / 2, 40, T.title, { title: true, size: 72, color: C.textBright, align: 'center' });
    label(this, W / 2, 130, T.subtitle, { size: 32, color: C.textDim, align: 'center' });
    new CobradorSprite(this, W / 2, 400, 6);
    this.group = new FocusGroup(this);
    this.buildMenu();
    sfx.ambience('hub');
    if (!warned) this.showWarning();
  }

  private buildMenu(): void {
    this.group.clear();
    const y0 = 640;
    const items: Array<[string, () => void]> = [];
    if (session.hasSave()) items.push([T.continue, () => this.go(true)]);
    items.push([T.newGame, () => (session.hasSave() ? this.confirmNew() : this.go(false))]);
    items.push([T.options, () => openOptions(this)]);
    items.forEach(([text, fn], i) => {
      const x = W / 2 + (i - (items.length - 1) / 2) * 360;
      this.group.add(new Button(this, x, y0, 330, 80, text, fn, { size: 40 }));
    });
    label(this, W / 2, 750, T.keysHint, { size: 24, color: C.textDim, align: 'center' });
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
    this.scene.start(sceneForPhase(session.run.phase));
  }
}

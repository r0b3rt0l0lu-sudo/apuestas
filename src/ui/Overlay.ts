import type Phaser from 'phaser';
import { C, H, W, hex } from '../config';
import { Button, FocusGroup } from './Button';
import { label } from './text';

export interface OverlayBtn {
  text: string;
  onClick: () => void;
}

interface OverlayOpts {
  w?: number;
  /** Alto reservado para controles propios entre el texto y los botones. */
  extraHeight?: number;
  /** Crea los controles propios; `y` es la coordenada donde empiezan. */
  extra?: (add: (o: Phaser.GameObjects.GameObject) => void, group: FocusGroup, y: number) => void;
}

/** Panel modal con botones y foco de teclado propio. */
export class Overlay {
  private objs: Phaser.GameObjects.GameObject[] = [];
  private group: FocusGroup;

  constructor(scene: Phaser.Scene, title: string, body: string[], buttons: OverlayBtn[], opts: OverlayOpts = {}) {
    const w = opts.w ?? 900;
    const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(500).setInteractive();
    const t0 = label(scene, W / 2, 0, title, { title: true, size: 40, align: 'center', color: C.textBright, depth: 501 });
    const t1 = label(scene, W / 2, 0, body.join('\n\n'), { size: 32, align: 'center', wrap: w - 80, depth: 501 });
    const extraH = opts.extraHeight ?? 0;
    const h = 40 + t0.height + 24 + t1.height + 24 + extraH + 100 + 30;
    const top = H / 2 - h / 2;
    const panel = scene.add.rectangle(W / 2, H / 2, w, h, hex(C.panel)).setStrokeStyle(6, hex(C.brass)).setDepth(500);
    t0.setY(top + 40);
    t1.setY(top + 40 + t0.height + 24);
    this.objs.push(dim, panel, t0, t1);
    this.group = new FocusGroup(scene);
    opts.extra?.((o) => this.objs.push(o), this.group, t1.y + t1.height + 24);
    const bw = Math.min(400, (w - 60) / buttons.length - 20);
    buttons.forEach((b, i) => {
      const x = W / 2 + (i - (buttons.length - 1) / 2) * (bw + 20);
      const btn = new Button(scene, x, top + h - 70, bw, 70, b.text, () => b.onClick(), { size: 32 });
      btn.setDepth(502);
      this.objs.push(btn);
      this.group.add(btn);
    });
  }

  get focusGroup(): FocusGroup {
    return this.group;
  }

  close(): void {
    this.group.destroy();
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
}

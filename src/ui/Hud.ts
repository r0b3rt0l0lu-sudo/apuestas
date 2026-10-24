import Phaser from 'phaser';
import { C, W, hex } from '../config';
import { session, quotaOfRun } from '../core/session';
import { nightDef } from '../core/nights';
import { fmt, T } from '../i18n/es';
import { label } from './text';

/** Barra superior compartida: noche, cuota, saldo y acciones. */
export class Hud {
  private fill: Phaser.GameObjects.Rectangle;
  private night: Phaser.GameObjects.Text;
  private bal: Phaser.GameObjects.Text;
  private quota: Phaser.GameObjects.Text;
  private acts: Phaser.GameObjects.Text;
  private ticks: Phaser.GameObjects.Graphics;
  private unsub: () => void;
  private frozen = false;

  constructor(scene: Phaser.Scene) {
    scene.add.rectangle(W / 2, 40, W, 80, hex(C.panel2)).setDepth(100);
    scene.add.rectangle(W / 2, 80, W, 4, hex(C.brass)).setDepth(100);
    this.night = label(scene, 24, 10, '', { size: 32, color: C.textBright, depth: 101 });
    scene.add.rectangle(640, 54, 420, 14, hex(C.bg)).setStrokeStyle(2, hex(C.brass)).setDepth(101);
    this.fill = scene.add.rectangle(430, 54, 0, 10, hex(C.gold)).setOrigin(0, 0.5).setDepth(102);
    this.bal = label(scene, 640, 6, '', { size: 32, color: C.lamp, align: 'center', depth: 101 });
    this.quota = label(scene, 880, 40, '', { size: 24, color: C.text, depth: 101 });
    this.acts = label(scene, W - 24, 10, '', { size: 32, color: C.textBright, align: 'right', origin: [1, 0], depth: 101 });
    this.ticks = scene.add.graphics().setDepth(101);
    this.unsub = session.subscribe(() => this.refresh());
    scene.events.once('shutdown', () => this.unsub());
    this.refresh();
  }

  /** Congela el HUD mientras una animación no ha revelado el resultado. */
  freeze(v: boolean): void {
    this.frozen = v;
    if (!v) this.refresh();
  }

  refresh(): void {
    if (this.frozen) return;
    const r = session.run, q = quotaOfRun(r), d = nightDef(r.night);
    this.night.setText(`${T.hud.night} ${r.night}/7`);
    this.bal.setText(`${T.hud.balance} ${fmt(r.balance)}`);
    this.quota.setText(`${T.hud.quota} ${fmt(q)}`);
    this.fill.setSize(Math.min(1, r.balance / q) * 416, 10).setFillStyle(hex(r.balance >= q ? C.lamp : C.gold));
    this.acts.setText(`${T.hud.actions} ${r.actionsLeft}`);
    this.ticks.clear().fillStyle(hex(C.brass));
    for (let i = 0; i < d.actions; i++) {
      this.ticks.fillStyle(hex(i < r.actionsLeft ? C.lamp : C.wood));
      this.ticks.fillRect(W - 24 - d.actions * 10 + i * 10, 52, 6, 16);
    }
  }
}

import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, W, hex } from '../config';
import { nightDef } from '../core/nights';
import { quotaOfRun, session } from '../core/session';
import { T, fmt } from '../i18n/es';
import { label } from './text';

const GX = 250, GW = 420; // calibre de la cuota

/** Barra superior compartida: noche, saldo animado, cuota segmentada y acciones como velas. */
export class Hud {
  private night: Phaser.GameObjects.Text;
  private bal: Phaser.GameObjects.Text;
  private quota: Phaser.GameObjects.Text;
  private acts: Phaser.GameObjects.Text;
  private gauge: Phaser.GameObjects.Graphics;
  private ticks: Phaser.GameObjects.Image[] = [];
  private unsub: () => void;
  private frozen = false;
  private shown: number;
  private target: number;
  private tw: Phaser.Tweens.Tween | null = null;
  private pulse = 0;
  private lastActions: number;

  constructor(private scene: Phaser.Scene) {
    scene.add.nineslice(W / 2, 42, 'ui-panel', undefined, W / 2, 42, 8, 8, 8, 8).setScale(2).setDepth(100);
    this.night = label(scene, 24, 8, '', { size: 32, color: C.textBright, depth: 101 });
    scene.add.nineslice(GX + GW / 2, 58, 'ui-gauge', undefined, GW / 2, 10, 4, 4, 4, 4).setScale(2).setDepth(101);
    this.gauge = scene.add.graphics().setDepth(102);
    scene.add.image(GX + GW / 2 - 78, 24, 'ui-chip').setScale(2).setDepth(101);
    this.bal = label(scene, GX + GW / 2 + 8, 8, '', { size: 32, color: C.lamp, align: 'center', depth: 101 });
    this.quota = label(scene, GX + GW + 16, 44, '', { size: 24, color: C.text, depth: 101 });
    this.acts = label(scene, W - 24, 8, '', { size: 32, color: C.textBright, align: 'right', origin: [1, 0], depth: 101 });
    this.shown = this.target = session.run.balance;
    this.lastActions = session.run.actionsLeft;
    this.unsub = session.subscribe(() => this.refresh());
    const upd = (_t: number, dt: number) => { this.pulse += dt; this.drawGauge(); };
    scene.events.on('update', upd);
    scene.events.once('shutdown', () => { this.unsub(); scene.events.off('update', upd); });
    this.refresh();
  }

  /** Congela el HUD mientras una animación no ha revelado el resultado. */
  freeze(v: boolean): void {
    this.frozen = v;
    if (!v) this.refresh();
  }

  private drawGauge(): void {
    const r = session.run, q = quotaOfRun(r);
    const segs = 28, segW = Math.floor((GW - 16) / segs), filled = Math.floor(Math.min(1, this.shown / q) * segs + 0.001);
    const met = this.shown >= q;
    this.gauge.clear();
    for (let i = 0; i < segs; i++) {
      const on = i < filled;
      const hot = met && Math.floor(this.pulse * 4) % 2 === 0;
      const col = on ? (met ? (hot ? C.textBright : C.lamp) : i > segs * 0.75 ? C.lamp : C.gold) : '#241c14';
      this.gauge.fillStyle(hex(col)).fillRect(GX + 8 + i * segW, 50, segW - 2, 16);
      if (on) this.gauge.fillStyle(hex('#fff0c4'), 0.35).fillRect(GX + 8 + i * segW, 50, segW - 2, 3);
    }
  }

  refresh(): void {
    if (this.frozen) return;
    const r = session.run, q = quotaOfRun(r), d = nightDef(r.night);
    this.night.setText(`${T.hud.night} ${r.night}/7`);
    this.quota.setText(`${T.hud.quota} ${fmt(q)}`);
    this.acts.setText(`${T.hud.actions} ${r.actionsLeft}`);
    // saldo: cuenta hasta el nuevo valor y suelta un número flotante con la diferencia
    if (r.balance !== this.target) {
      const delta = r.balance - this.target;
      this.target = r.balance;
      this.tw?.stop();
      const from = this.shown;
      this.tw = this.scene.tweens.addCounter({
        from, to: r.balance, duration: Math.min(900, 250 + Math.abs(delta) * 2),
        onUpdate: (t) => { this.shown = Math.round(t.getValue() ?? r.balance); this.bal.setText(fmt(this.shown)); },
        onComplete: () => { this.shown = r.balance; this.bal.setText(fmt(r.balance)); }
      });
      this.floatDelta(delta);
      if (delta > 0) sfx.reelTick();
    } else if (!this.tw?.isPlaying()) {
      this.shown = r.balance;
      this.bal.setText(fmt(r.balance));
    }
    // velas de acciones: la que se acaba de gastar se apaga con un parpadeo
    const total = d.actions;
    while (this.ticks.length < total) {
      const i = this.ticks.length;
      this.ticks.push(this.scene.add.image(W - 24 - total * 17 + i * 17 + 8, 66, 'ui-tick-on').setScale(2).setDepth(101));
    }
    this.ticks.forEach((t, i) => {
      const on = i < r.actionsLeft;
      t.setTexture(on ? 'ui-tick-on' : 'ui-tick-off').setVisible(i < total);
      if (!on && i === r.actionsLeft && this.lastActions > r.actionsLeft) {
        this.scene.tweens.add({ targets: t, scaleY: { from: 2.8, to: 2 }, duration: 260, ease: 'Bounce.easeOut' });
      }
    });
    this.lastActions = r.actionsLeft;
  }

  private floatDelta(delta: number): void {
    if (delta === 0) return;
    const t = label(this.scene, GX + GW / 2 + 90, 36, `${delta > 0 ? '+' : ''}${fmt(delta)}`, { size: 32, color: delta > 0 ? C.lamp : C.dangerText, depth: 120 });
    this.scene.tweens.add({ targets: t, y: 74, alpha: { from: 1, to: 0 }, duration: 1300, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }
}

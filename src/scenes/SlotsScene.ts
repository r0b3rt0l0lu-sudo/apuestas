import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, W, hex } from '../config';
import { session, quotaOfRun } from '../core/session';
import { rngOf } from '../core/state';
import { cursesFor } from '../core/nights';
import { SYMBOLS, TRIPLE_PAY, type SlotSymbol, moodAfter, spin, stopTimes } from '../games/slots';
import { symbolKey } from '../art/textures';
import { PAPER_COLOR } from '../art/props';
import { easeOutCubic } from '../fx/ease';
import { T, fmt } from '../i18n/es';
import { Button } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { phrase } from './common';
import { TableScene } from './TableScene';

const STEP = 96; // 80 px de símbolo + 16 de hueco
const WIN_H = 288;
const CY = 320;

interface Reel {
  x: number;
  items: Phaser.GameObjects.Image[];
  syms: SlotSymbol[];
  offset: number;
  target: number;
  lastIdx: number;
  stopped: boolean;
  center: SlotSymbol;
}

export class SlotsScene extends TableScene {
  private reels: Reel[] = [];
  private spinning = false;
  private t = 0;
  private stops: number[] = [0, 0, 0];
  private pull!: Button;
  private result!: Phaser.GameObjects.Text;
  private bulbs: Phaser.GameObjects.Arc[] = [];
  private pendingEnd = false;

  constructor() { super('Slots', 'slots', 'slots'); }

  protected build(): void {
    this.reels = [];
    this.spinning = false;
    const curses = cursesFor(session.run.night);
    this.add.rectangle(W / 2, 338, 580, 424, hex(C.panel)).setStrokeStyle(8, hex(C.brass)).setDepth(-1);
    label(this, W / 2, 86, T.slots.title, { title: true, size: 32, align: 'center', color: C.textBright, depth: 5 });
    this.cb = new CobradorSprite(this, 150, 340, 4);

    [490, 640, 790].forEach((x, i) => {
      this.add.rectangle(x, CY, 124, WIN_H + 8, hex(C.bg)).setStrokeStyle(4, hex(C.gold)).setDepth(1);
      this.add.rectangle(x, CY, 116, WIN_H, hex(PAPER_COLOR)).setDepth(2);
      const items: Phaser.GameObjects.Image[] = [];
      const center = SYMBOLS[(i * 2) % SYMBOLS.length] as SlotSymbol;
      const im = this.add.image(x, CY, symbolKey(center)).setScale(5).setDepth(3);
      items.push(im);
      this.reels.push({ x, items, syms: [center], offset: 0, target: 0, lastIdx: 0, stopped: true, center });
      const burnt = i === 2 && curses.includes('slotReel3'); // bombilla fundida
      this.bulbs.push(this.add.circle(x, 130, 9, hex(burnt ? C.wood : C.lamp)).setDepth(4).setAlpha(burnt ? 1 : 0.9));
    });
    this.add.rectangle(640, CY, 500, 4, hex(C.danger)).setDepth(6);
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.idleAnim() });

    // tabla de pagos
    label(this, 990, 150, T.slots.paytable, { size: 28, color: C.textDim, depth: 5 });
    SYMBOLS.forEach((s, i) => {
      this.add.image(1010, 215 + i * 62, symbolKey(s)).setScale(3).setDepth(5);
      label(this, 1050, 197 + i * 62, `×${TRIPLE_PAY[s]}`, { size: 32, color: C.lamp, depth: 5 });
    });
    label(this, 990, 590, T.slots.twoEyes, { size: 24, color: C.textDim, wrap: 260, depth: 5 });

    this.result = label(this, W / 2, 500, '', { size: 48, color: C.lamp, align: 'center', depth: 8 });
    this.betRow(W / 2, 580, 130, 14, 36);
    this.pull = new Button(this, W / 2, 662, 460, 76, T.slots.pull, () => this.pullLever(), { size: 40 });
    this.group.add(this.pull, ' ');
    this.say(T.night.intro(session.run.night));
    this.group.focus(this.pull);
  }

  protected onStateChange(): void {
    this.pull?.setEnabled(!this.busy && this.affordable());
  }

  private idleAnim(): void {
    const looks = ['abierto', 'izq', 'der', 'cerrado', 'abierto'] as const;
    const look = looks[Phaser.Math.Between(0, looks.length - 1)] as (typeof looks)[number];
    const drip = Phaser.Math.Between(0, 1);
    this.reels.forEach((r) => r.items.forEach((im, i) => {
      const s = r.syms[i];
      if (s === 'ojo') im.setTexture(`sym-ojo-${look}`);
      if (s === 'siete') im.setTexture(`sym-siete-${drip}`);
    }));
  }

  private pullLever(): void {
    if (this.busy || !this.affordable()) return;
    const r = session.run, bet = this.bet;
    const rng = rngOf(r);
    const res = spin(rng, bet);
    // La jugada se resuelve y se guarda ya; la animación solo la revela.
    this.hud.freeze(true);
    session.dispatch({ type: 'resolve', game: 'slots', bet, payout: res.payout, rng: rng.state });
    this.setBusy(true);
    this.result.setText('');
    sfx.lever();
    this.say('');
    this.stops = stopTimes(cursesFor(r.night));
    this.reels.forEach((reel, i) => {
      reel.items.forEach((im) => im.destroy());
      const n = 16 + i * 5;
      const syms: SlotSymbol[] = [reel.center];
      for (let k = 1; k < n; k++) syms.push(SYMBOLS[Phaser.Math.Between(0, SYMBOLS.length - 1)] as SlotSymbol);
      syms.push(res.reels[i] as SlotSymbol);
      reel.syms = syms;
      reel.items = syms.map((s) => this.add.image(reel.x, CY, symbolKey(s)).setScale(5).setDepth(3));
      this.layout(reel);
      reel.target = (syms.length - 1) * STEP;
      reel.offset = 0;
      reel.lastIdx = 0;
      reel.stopped = false;
      reel.center = res.reels[i] as SlotSymbol;
    });
    this.t = 0;
    this.spinning = true;
    this.pendingEnd = true;
    this.paid = res.payout;
  }

  private paid = 0;

  /** Coloca los símbolos y recorta lo que sale de la ventana (sin máscaras). */
  private layout(reel: Reel): void {
    const top = CY - WIN_H / 2, bottom = CY + WIN_H / 2;
    reel.items.forEach((im, j) => {
      const y = CY + reel.offset - j * STEP;
      im.setY(y);
      const a = Math.max(top, y - 40), b = Math.min(bottom, y + 40);
      if (b <= a) { im.setVisible(false); return; }
      im.setVisible(true).setCrop(0, (a - (y - 40)) / 5, 16, (b - a) / 5);
    });
  }

  update(_t: number, dt: number): void {
    if (!this.spinning) return;
    this.t += dt;
    this.reels.forEach((reel, i) => {
      if (reel.stopped) return;
      const k = Math.min(1, this.t / (this.stops[i] as number));
      const raw = easeOutCubic(k) * reel.target;
      reel.offset = Math.round(raw / 5) * 5; // pasos de 1 px de arte, nunca subpíxeles
      this.layout(reel);
      const idx = Math.floor(reel.offset / STEP);
      if (idx !== reel.lastIdx) { reel.lastIdx = idx; sfx.reelTick(); }
      if (k >= 1) { reel.stopped = true; sfx.reelStop(); }
    });
    if (this.pendingEnd && this.reels.every((r) => r.stopped)) {
      this.pendingEnd = false;
      this.spinning = false;
      this.time.delayedCall(350, () => this.reveal());
    }
  }

  private reveal(): void {
    const win = this.paid, bet = this.bet;
    const r = session.run;
    const lost = win === 0;
    this.result.setText(lost ? '—' : `+${fmt(win)}`).setColor(win > bet ? C.lamp : C.text);
    this.cb.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (win > 0) sfx.prize(); else sfx.lose();
    this.say(lost ? phrase(T.lines.slotsLose) : phrase(T.lines.slotsWin));
    if (r.actionsLeft <= 3 && r.balance < quotaOfRun(r) && lost) this.say(phrase(T.lines.low));
    this.finishPlay();
  }
}

import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { PAPER_COLOR } from '../art/props';
import { symbolKey } from '../art/textures';
import { C, W, hex } from '../config';
import { cursesFor } from '../core/nights';
import { quotaOfRun, session } from '../core/session';
import { rngOf } from '../core/state';
import { easeOutCubic } from '../fx/ease';
import { lampFlicker } from '../fx/flicker';
import { FX } from '../fx/particles';
import { shake } from '../fx/shake';
import { SYMBOLS, TRIPLE_PAY, type SlotSymbol, moodAfter, spin, stopTimes } from '../games/slots';
import { T, fmt } from '../i18n/es';
import { Button } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { boothBackdrop } from '../ui/scenic';
import { label } from '../ui/text';
import { phrase } from './common';
import { TableScene } from './TableScene';

const STEP = 96; // símbolos de 24 px a ×4
const WIN_H = 288;
const CY = 320;
const XS = [492, 640, 788];

interface Reel {
  x: number;
  items: Phaser.GameObjects.Image[];
  syms: SlotSymbol[];
  offset: number;
  target: number;
  lastIdx: number;
  stopped: boolean;
  center: SlotSymbol;
  bounce: number;
}

export class SlotsScene extends TableScene {
  private reels: Reel[] = [];
  private spinning = false;
  private t = 0;
  private stops: number[] = [0, 0, 0];
  private pull!: Button;
  private result!: Phaser.GameObjects.Text;
  private marquee!: Phaser.GameObjects.Text;
  private lever!: Phaser.GameObjects.Image;
  private fx!: FX;
  private tension!: Phaser.GameObjects.Rectangle;
  private pendingEnd = false;
  private paid = 0;

  constructor() { super('Slots', 'slots', 'slots'); }

  protected backdrop(): void {
    this.lever = boothBackdrop(this).lever;
  }

  protected build(): void {
    this.reels = [];
    this.spinning = false;
    this.fx = new FX(this, 2);
    const curses = cursesFor(session.run.night);
    this.marquee = label(this, W / 2, 106, T.slots.title, { title: true, size: 32, align: 'center', color: C.lamp, depth: 5 });
    lampFlicker(this, [this.marquee], 1);
    this.cb = new CobradorSprite(this, 150, 340, 4).setDepth(8);

    XS.forEach((x, i) => {
      this.add.rectangle(x, CY, 120, WIN_H, hex(PAPER_COLOR)).setDepth(2);
      const center = SYMBOLS[(i * 2) % SYMBOLS.length] as SlotSymbol;
      const im = this.add.image(x, CY, symbolKey(center)).setScale(4).setDepth(3);
      this.reels.push({ x, items: [im], syms: [center], offset: 0, target: 0, lastIdx: 0, stopped: true, center, bounce: 0 });
      // sombreado de tambor: más oscuro arriba y abajo
      for (let k = 0; k < 6; k++) {
        const a = 0.34 - k * 0.055;
        this.add.rectangle(x, CY - WIN_H / 2 + k * 8 + 4, 120, 8, 0x150c22, a).setDepth(4);
        this.add.rectangle(x, CY + WIN_H / 2 - k * 8 - 4, 120, 8, 0x150c22, a).setDepth(4);
      }
      // bombilla fundida de la maldición de la noche 3
      if (i === 2 && curses.includes('slotReel3')) this.add.rectangle(x, 150, 8, 8, hex('#3a2c10')).setDepth(6);
    });
    this.add.rectangle(640, CY, 420, 4, hex(C.danger)).setDepth(6);
    this.add.rectangle(640, CY - 2, 420, 2, hex('#ff8070'), 0.5).setDepth(6);
    this.tension = this.add.rectangle(640, CY, 400, WIN_H + 20, hex(C.danger), 0).setDepth(7);
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.idleAnim() });

    // tabla de pagos a la derecha de la palanca
    label(this, 1180, 150, T.slots.paytable, { size: 24, color: C.textDim, align: 'center', depth: 5 });
    SYMBOLS.forEach((s, i) => {
      this.add.image(1130, 214 + i * 66, symbolKey(s)).setScale(2).setDepth(5);
      label(this, 1166, 196 + i * 66, `×${TRIPLE_PAY[s]}`, { size: 32, color: C.lamp, depth: 5 });
    });
    label(this, 1180, 612, T.slots.twoEyes, { size: 22, color: C.textDim, align: 'center', wrap: 190, depth: 5 });

    this.result = label(this, W / 2, 548, '', { size: 48, color: C.lamp, align: 'center', depth: 8 });
    this.betRow(400, 690, 120, 12, 32);
    this.pull = new Button(this, 860, 690, 380, 68, T.slots.pull, () => this.pullLever(), { size: 36 });
    this.group.add(this.pull, ' ');
    this.say(T.night.intro(session.run.night));
    this.group.focus(this.pull);
    this.reels.forEach((r) => r.items.forEach((im) => im.setCrop(0, 0, 24, 24)));
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
    this.animateLever();
    this.stops = stopTimes(cursesFor(r.night));
    this.reels.forEach((reel, i) => {
      reel.items.forEach((im) => im.destroy());
      const n = 16 + i * 5;
      const syms: SlotSymbol[] = [reel.center];
      for (let k = 1; k < n; k++) syms.push(SYMBOLS[Phaser.Math.Between(0, SYMBOLS.length - 1)] as SlotSymbol);
      syms.push(res.reels[i] as SlotSymbol);
      reel.syms = syms;
      reel.items = syms.map((s) => this.add.image(reel.x, CY, symbolKey(s)).setScale(4).setDepth(3));
      reel.target = (syms.length - 1) * STEP;
      reel.offset = 0;
      reel.lastIdx = 0;
      reel.stopped = false;
      reel.bounce = 0;
      reel.center = res.reels[i] as SlotSymbol;
      this.layout(reel);
    });
    this.t = 0;
    this.spinning = true;
    this.pendingEnd = true;
    this.paid = res.payout;
  }

  /** La palanca baja y vuelve a subir en tres fotogramas. */
  private animateLever(): void {
    const seq = [1, 2, 2, 1, 0];
    seq.forEach((f, i) => this.time.delayedCall(i * 90, () => this.lever.setTexture(`cab-lever-${f}`)));
    this.fx.sparks(1010, 520, 6, 0xe8d27a, 200);
  }

  /** Coloca los símbolos y recorta lo que sale de la ventana (sin máscaras). */
  private layout(reel: Reel): void {
    const top = CY - WIN_H / 2, bottom = CY + WIN_H / 2;
    reel.items.forEach((im, j) => {
      const y = CY + reel.offset - j * STEP + reel.bounce;
      im.setY(y);
      const a = Math.max(top, y - 48), b = Math.min(bottom, y + 48);
      if (b <= a) { im.setVisible(false); return; }
      im.setVisible(true).setCrop(0, (a - (y - 48)) / 4, 24, (b - a) / 4);
    });
  }

  update(_t: number, dt: number): void {
    if (!this.spinning) return;
    this.t += dt;
    this.reels.forEach((reel, i) => {
      if (reel.stopped) return;
      const k = Math.min(1, this.t / (this.stops[i] as number));
      const raw = easeOutCubic(k) * reel.target;
      reel.offset = Math.round(raw / 4) * 4; // pasos de 1 px de arte, nunca subpíxeles
      this.layout(reel);
      const idx = Math.floor(reel.offset / STEP);
      if (idx !== reel.lastIdx) { reel.lastIdx = idx; sfx.reelTick(); }
      if (k >= 1) {
        reel.stopped = true;
        sfx.reelStop();
        // rebote al frenar
        this.tweens.addCounter({ from: 12, to: 0, duration: 260, ease: 'Bounce.easeOut', onUpdate: (tw) => { reel.bounce = Math.round((tw.getValue() ?? 0) / 4) * 4; this.layout(reel); } });
        this.fx.sparks(reel.x, CY + WIN_H / 2, 6, 0xe8d27a, 180);
        if (i === 1 && this.reels[0]?.center === reel.center) this.startTension();
      }
    });
    if (this.pendingEnd && this.reels.every((r) => r.stopped)) {
      this.pendingEnd = false;
      this.spinning = false;
      this.tweens.killTweensOf(this.tension);
      this.tension.setAlpha(0);
      this.time.delayedCall(350, () => this.reveal());
    }
  }

  /** Dos iguales y falta el tercero: la ventana late en rojo. */
  private startTension(): void {
    this.tweens.add({ targets: this.tension, alpha: { from: 0, to: 0.22 }, duration: 160, yoyo: true, repeat: -1 });
    shake(this, 3, 180, 3);
    sfx.aim();
  }

  private reveal(): void {
    const win = this.paid, bet = this.bet;
    const r = session.run;
    const lost = win === 0;
    this.result.setText(lost ? '—' : `+${fmt(win)}`).setColor(win > bet ? C.lamp : C.text);
    this.cb.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (win > 0) {
      sfx.prize();
      this.fx.coins(640, 130, Math.min(60, 12 + Math.round((win / bet) * 3)));
      XS.forEach((x) => this.fx.sparks(x, CY, 8, 0xfff0c4, 300));
      this.tweens.add({ targets: this.result, scale: { from: 1.6, to: 1 }, duration: 380, ease: 'Back.easeOut' });
      this.tweens.add({ targets: this.marquee, scale: { from: 1.25, to: 1 }, duration: 600, ease: 'Elastic.easeOut' });
      if (win >= bet * 15) { this.fx.confetti(640, 600, 60); this.cb.flinch(-1); }
    } else {
      sfx.lose();
      this.fx.smoke(640, 520, 5, 60);
      this.cb.laugh();
    }
    this.say(lost ? phrase(T.lines.slotsLose) : phrase(T.lines.slotsWin));
    if (r.actionsLeft <= 3 && r.balance < quotaOfRun(r) && lost) this.say(phrase(T.lines.low));
    this.finishPlay();
  }
}

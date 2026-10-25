import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { drawWheel } from '../art/wheel';
import { C, hex } from '../config';
import { cursesFor } from '../core/nights';
import { quotaOfRun, session } from '../core/session';
import { rngOf } from '../core/state';
import { wheelEase } from '../fx/ease';
import { FX } from '../fx/particles';
import { type RouletteBet, OUTSIDE_KINDS, colorOf, finalAngle, labelOf, payoutFor, spin, wheelFor } from '../games/roulette';
import { moodAfter } from '../games/slots';
import { T, fmt } from '../i18n/es';
import { Button } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { feltBackdrop } from '../ui/scenic';
import { label } from '../ui/text';
import { phrase } from './common';
import { TableScene } from './TableScene';

const CX = 360, CY = 400, SCALE = 3, TURNS = 5, DUR = 4000;
const PCOL = { rojo: '#a8323c', negro: '#241c2e', verde: '#2f6a48' } as const;

interface Anim { t: number; angle: number; pocket: number; payout: number; ballTurns: number; lastTick: number; hops: Array<{ at: number; dr: number }>; landed: boolean }

export class RouletteScene extends TableScene {
  private wheel!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private eye!: Phaser.GameObjects.Image;
  private bet_: RouletteBet = { kind: 'rojo' };
  private pleno = 17;
  private kindBtns = new Map<string, Button>();
  private plenoBtn!: Button;
  private spinBtn!: Button;
  private plenoLabel!: Phaser.GameObjects.Text;
  private chip!: Phaser.GameObjects.Rectangle;
  private chipTxt!: Phaser.GameObjects.Text;
  private chipFrame!: Phaser.GameObjects.NineSlice;
  private pointer!: Phaser.GameObjects.Graphics;
  private fx!: FX;
  private anim: Anim | null = null;
  private wheelPockets: readonly number[] = [];

  constructor() { super('Roulette', 'roulette', 'roulette'); }

  protected backdrop(): void { feltBackdrop(this); }

  protected build(): void {
    this.anim = null;
    this.kindBtns.clear();
    this.fx = new FX(this, 2);
    const curses = cursesFor(session.run.night);
    this.wheelPockets = wheelFor(curses);
    if (this.textures.exists('wheel')) this.textures.remove('wheel');
    this.textures.addCanvas('wheel', drawWheel(this.wheelPockets).canvas)?.setFilter(0);
    this.add.ellipse(CX + 6, CY + 12, 520, 500, 0x000000, 0.35).setDepth(1); // sombra sobre el fieltro
    this.wheel = this.add.image(CX, CY, 'wheel').setScale(SCALE).setDepth(2);
    this.eye = this.add.image(CX, CY, 'sym-ojo-abierto').setScale(2).setDepth(3);
    this.ball = this.add.image(CX, CY - 215, 'ball').setScale(4).setDepth(4);
    this.pointer = this.add.graphics().setDepth(5);
    this.drawPointer(false);
    this.cb = new CobradorSprite(this, 675, 270, 2).setDepth(6);
    this.time.addEvent({ delay: 700, loop: true, callback: () => { if (!this.anim) this.eye.setTexture(`sym-ojo-${Phaser.Utils.Array.GetRandom(['abierto', 'izq', 'der', 'cerrado', 'abierto'])}`); } });

    // casilla ganadora
    this.chipFrame = this.add.nineslice(675, 440, 'ui-panel', undefined, 60, 52, 8, 8, 8, 8).setScale(2).setDepth(6);
    this.chip = this.add.rectangle(675, 440, 96, 70, hex(C.felt)).setDepth(6);
    this.chipTxt = label(this, 675, 440, '', { size: 56, color: C.textBright, align: 'center', origin: [0.5, 0.5], depth: 7 });

    // apuestas exteriores
    OUTSIDE_KINDS.forEach((k, i) => {
      const b = new Button(this, 830 + (i % 3) * 165, 190 + Math.floor(i / 3) * 76, 155, 64, T.roulette.kinds[k] as string, () => this.pickKind(k), { size: 32 });
      this.kindBtns.set(k, b);
      this.group.add(b, String(i + 1));
    });
    label(this, 750, 350, T.roulette.pleno, { size: 32, color: C.textDim, depth: 5 });
    this.group.add(new Button(this, 930, 400, 70, 64, '<', () => this.changePleno(-1), { size: 36 }), 'q');
    this.plenoLabel = label(this, 1030, 380, '', { size: 48, color: C.textBright, align: 'center', depth: 5 });
    this.group.add(new Button(this, 1130, 400, 70, 64, '>', () => this.changePleno(1), { size: 36 }), 'e');
    this.plenoBtn = new Button(this, 1030, 470, 360, 60, `${T.roulette.pleno} ×36`, () => this.pickKind('pleno'), { size: 32 });
    this.group.add(this.plenoBtn);
    label(this, 750, 520, T.roulette.plenoHelp, { size: 22, color: C.textDim, depth: 5 });
    label(this, 750, 556, T.roulette.bet, { size: 28, color: C.textDim, depth: 5 });
    this.betRow(1030, 620, 100, 10, 30);
    this.spinBtn = new Button(this, 1030, 696, 380, 70, T.roulette.spin, () => this.start(), { size: 36 });
    this.group.add(this.spinBtn, ' ');
    this.pickKind('rojo');
    this.say(T.night.intro(session.run.night));
    this.group.focus(this.spinBtn);
  }

  private drawPointer(lit: boolean): void {
    this.pointer.clear().fillStyle(hex(lit ? '#fff6c8' : C.lamp)).fillTriangle(CX - 16, CY - 270, CX + 16, CY - 270, CX, CY - 236);
    this.pointer.fillStyle(hex(C.gold)).fillRect(CX - 16, CY - 274, 32, 6).fillStyle(0x0d0a0e).fillRect(CX - 2, CY - 262, 4, 4);
  }

  private pickKind(k: string): void {
    this.bet_ = k === 'pleno' ? { kind: 'pleno', n: this.pleno } : { kind: k as Exclude<RouletteBet['kind'], 'pleno'> };
    this.kindBtns.forEach((b, key) => b.setToggled(key === k));
    this.plenoBtn.setToggled(k === 'pleno');
    this.plenoLabel.setText(labelOf(this.pleno));
  }

  private changePleno(d: number): void {
    const list = this.wheelPockets.slice().sort((a, b) => a - b);
    const i = list.indexOf(this.pleno);
    this.pleno = list[(i + d + list.length) % list.length] as number;
    this.pickKind('pleno');
    this.tweens.add({ targets: this.plenoLabel, scale: { from: 1.3, to: 1 }, duration: 140 });
  }

  protected onStateChange(): void {
    this.spinBtn?.setEnabled(!this.busy && this.affordable());
  }

  private start(): void {
    if (this.busy || !this.affordable()) return;
    const r = session.run, bet = this.bet;
    const rng = rngOf(r);
    const pocket = spin(rng, cursesFor(r.night));
    const payout = payoutFor(this.bet_, bet, pocket);
    this.hud.freeze(true);
    session.dispatch({ type: 'resolve', game: 'roulette', bet, payout, rng: rng.state });
    this.setBusy(true);
    this.chipTxt.setText('');
    this.chip.setFillStyle(hex(C.felt));
    this.say('');
    sfx.lever();
    // saltitos de la bola al caer: instantes y alturas fijados al empezar
    const hops = [{ at: 0.74, dr: 26 }, { at: 0.82, dr: 16 }, { at: 0.89, dr: 9 }, { at: 0.94, dr: 4 }];
    this.anim = { t: 0, pocket, payout, lastTick: 0, angle: finalAngle(this.wheelPockets, pocket, TURNS), ballTurns: -(TURNS + 3), hops, landed: false };
  }

  update(_t: number, dt: number): void {
    const a = this.anim;
    if (!a) return;
    a.t += dt;
    const k = Math.min(1, a.t / DUR), e = wheelEase(k);
    this.wheel.setRotation(Math.round(a.angle * e * 180) / 180); // pasos de 1/180 de vuelta
    const ang = a.ballTurns * Math.PI * 2 * (1 - e);
    let rad = k < 0.7 ? 215 : 215 - 47 * ((k - 0.7) / 0.3);
    // rebotes entre casillas
    for (const h of a.hops) { const d = k - h.at; if (d >= 0 && d < 0.05) rad += Math.sin((d / 0.05) * Math.PI) * h.dr; }
    const bx = Math.round((CX + Math.sin(ang) * rad) / 4) * 4, by = Math.round((CY - Math.cos(ang) * rad) / 4) * 4;
    this.ball.setPosition(bx, by);
    // el ojo sigue a la bola
    this.eye.setTexture(`sym-ojo-${bx < CX - 40 ? 'izq' : bx > CX + 40 ? 'der' : 'abierto'}`);
    const tick = Math.floor(a.t * (k < 0.7 ? 18 : 9));
    if (tick !== a.lastTick && k < 0.97) { a.lastTick = tick; sfx.ballTick(); if (k > 0.72) this.fx.sparks(bx, by, 1, 0xfff0c4, 120); }
    if (!a.landed && k >= 0.95) { a.landed = true; this.drawPointer(true); this.eye.setTexture('sym-ojo-abierto'); }
    if (k >= 1) { this.anim = null; this.time.delayedCall(300, () => this.reveal(a)); }
  }

  private reveal(a: { pocket: number; payout: number }): void {
    const r = session.run, lost = a.payout === 0;
    const c = colorOf(a.pocket);
    this.drawPointer(false);
    this.chip.setFillStyle(hex(PCOL[c]));
    this.chipTxt.setText(labelOf(a.pocket));
    this.tweens.add({ targets: [this.chip, this.chipTxt, this.chipFrame], scale: { from: 1.7, to: 1 }, duration: 360, ease: 'Back.easeOut' });
    this.cb.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (lost) { sfx.lose(); this.fx.smoke(CX, CY - 150, 4, 60); this.cb.laugh(); }
    else {
      sfx.prize();
      this.fx.coins(CX, CY - 120, Math.min(60, 14 + Math.round(a.payout / this.bet * 4)), 600, 780);
      this.fx.sparks(CX, CY - 160, 16, 0xfff0c4, 420);
      if (a.payout >= this.bet * 10) this.fx.confetti(CX, CY, 70);
      this.say(`+${fmt(a.payout)}  ${phrase(T.lines.rouletteWin)}`);
    }
    if (lost) this.say(phrase(T.lines.rouletteLose));
    this.finishPlay();
  }
}

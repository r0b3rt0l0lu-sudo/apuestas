import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { drawWheel } from '../art/wheel';
import { C, W, hex } from '../config';
import { cursesFor } from '../core/nights';
import { quotaOfRun, session } from '../core/session';
import { rngOf } from '../core/state';
import { wheelEase } from '../fx/ease';
import { type RouletteBet, OUTSIDE_KINDS, colorOf, finalAngle, labelOf, payoutFor, spin, wheelFor } from '../games/roulette';
import { moodAfter } from '../games/slots';
import { T, fmt } from '../i18n/es';
import { Button } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { phrase } from './common';
import { TableScene } from './TableScene';

const CX = 360, CY = 400, SCALE = 3, TURNS = 5, DUR = 4000;

export class RouletteScene extends TableScene {
  private wheel!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private eye!: Phaser.GameObjects.Image;
  private bet_: RouletteBet = { kind: 'rojo' };
  private pleno = 17;
  private kindBtns = new Map<string, Button>();
  private plenoBtn!: Button;
  private spinBtn!: Button;
  private result!: Phaser.GameObjects.Text;
  private plenoLabel!: Phaser.GameObjects.Text;
  private anim: { t: number; angle: number; pocket: number; payout: number; wheel: readonly number[]; ballTurns: number; lastTick: number } | null = null;
  private wheelPockets: readonly number[] = [];

  constructor() { super('Roulette', 'roulette', 'roulette'); }

  protected build(): void {
    this.anim = null;
    this.kindBtns.clear();
    const curses = cursesFor(session.run.night);
    this.wheelPockets = wheelFor(curses);
    label(this, W / 2, 86, T.roulette.title, { title: true, size: 32, align: 'center', color: C.textBright, depth: 5 });
    if (this.textures.exists('wheel')) this.textures.remove('wheel');
    this.textures.addCanvas('wheel', drawWheel(this.wheelPockets).canvas)?.setFilter(0);
    this.wheel = this.add.image(CX, CY, 'wheel').setScale(SCALE).setDepth(2);
    this.eye = this.add.image(CX, CY, 'sym-ojo-abierto').setScale(3).setDepth(3);
    this.ball = this.add.image(CX, CY - 215, 'ball').setScale(4).setDepth(4);
    this.add.graphics().setDepth(5).fillStyle(hex(C.lamp)).fillTriangle(CX - 16, CY - 268, CX + 16, CY - 268, CX, CY - 238); // puntero
    this.cb = new CobradorSprite(this, 675, 270, 2);
    this.time.addEvent({ delay: 700, loop: true, callback: () => {
      const looks = ['abierto', 'izq', 'der', 'cerrado', 'abierto'];
      this.eye.setTexture(`sym-ojo-${looks[Phaser.Math.Between(0, looks.length - 1)]}`);
    } });

    // apuestas exteriores
    OUTSIDE_KINDS.forEach((k, i) => {
      const b = new Button(this, 830 + (i % 3) * 165, 190 + Math.floor(i / 3) * 76, 155, 64, T.roulette.kinds[k] as string, () => this.pickKind(k), { size: 32 });
      this.kindBtns.set(k, b);
      this.group.add(b, String(i + 1));
    });
    // pleno
    label(this, 840 - 90, 350, T.roulette.pleno, { size: 32, color: C.textDim, depth: 5 });
    this.group.add(new Button(this, 930, 400, 70, 64, '<', () => this.changePleno(-1), { size: 36 }), 'q');
    this.plenoLabel = label(this, 1030, 380, '', { size: 48, color: C.textBright, align: 'center', depth: 5 });
    this.group.add(new Button(this, 1130, 400, 70, 64, '>', () => this.changePleno(1), { size: 36 }), 'e');
    this.plenoBtn = new Button(this, 1030, 470, 360, 60, `${T.roulette.pleno} ×36`, () => this.pickKind('pleno'), { size: 32 });
    this.group.add(this.plenoBtn);
    label(this, 840 - 90, 520, T.roulette.plenoHelp, { size: 22, color: C.textDim, depth: 5 });

    label(this, 840 - 90, 556, T.roulette.bet, { size: 28, color: C.textDim, depth: 5 });
    this.betRow(1030, 620, 100, 10, 30);
    this.spinBtn = new Button(this, 1030, 696, 380, 70, T.roulette.spin, () => this.start(), { size: 36 });
    this.group.add(this.spinBtn, ' ');
    this.result = label(this, CX, 640, '', { size: 40, color: C.lamp, align: 'center', depth: 8 });
    this.pickKind('rojo');
    this.say(T.night.intro(session.run.night));
    this.group.focus(this.spinBtn);
  }

  private pickKind(k: string): void {
    this.bet_ = k === 'pleno' ? { kind: 'pleno', n: this.pleno } : { kind: k as Exclude<RouletteBet['kind'], 'pleno'> };
    this.kindBtns.forEach((b, key) => b.setToggled(key === k));
    this.plenoBtn.setToggled(k === 'pleno');
    this.refreshLabels();
  }

  private changePleno(d: number): void {
    const list = this.wheelPockets.slice().sort((a, b) => a - b);
    const i = list.indexOf(this.pleno);
    this.pleno = list[(i + d + list.length) % list.length] as number;
    this.pickKind('pleno');
  }

  private refreshLabels(): void {
    this.plenoLabel.setText(labelOf(this.pleno));
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
    this.result.setText('');
    this.say('');
    sfx.lever();
    this.anim = {
      t: 0, pocket, payout, wheel: this.wheelPockets, lastTick: 0,
      angle: finalAngle(this.wheelPockets, pocket, TURNS), ballTurns: -(TURNS + 3)
    };
  }

  update(_t: number, dt: number): void {
    const a = this.anim;
    if (!a) return;
    a.t += dt;
    const k = Math.min(1, a.t / DUR), e = wheelEase(k);
    this.wheel.setRotation(a.angle * e);
    // la bola gira al revés y cae sobre la casilla ganadora, bajo el puntero
    const ang = a.ballTurns * Math.PI * 2 * (1 - e);
    const rad = k < 0.7 ? 215 : 215 - 47 * ((k - 0.7) / 0.3);
    this.ball.setPosition(Math.round(CX + Math.sin(ang) * rad), Math.round(CY - Math.cos(ang) * rad));
    const tick = Math.floor(a.t * 16);
    if (tick !== a.lastTick && k < 0.97) { a.lastTick = tick; sfx.ballTick(); }
    if (k >= 1) { this.anim = null; this.time.delayedCall(300, () => this.reveal(a)); }
  }

  private reveal(a: { pocket: number; payout: number }): void {
    const r = session.run, lost = a.payout === 0;
    const c = colorOf(a.pocket);
    const lab = labelOf(a.pocket);
    this.result.setText(`${lab} ${c}${lost ? '' : `  +${fmt(a.payout)}`}`).setColor(c === 'rojo' ? C.dangerText : c === 'verde' ? C.lamp : C.textBright);
    this.cb.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (lost) sfx.lose(); else sfx.prize();
    this.say(phrase(lost ? T.lines.rouletteLose : T.lines.rouletteWin));
    this.finishPlay();
  }
}

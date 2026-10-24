import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, W, hex } from '../config';
import { cursesFor } from '../core/nights';
import { quotaOfRun, session } from '../core/session';
import { rngOf } from '../core/state';
import { HORSES, progress, probsFor, run, type RaceResult } from '../games/race';
import { moodAfter } from '../games/slots';
import { T, fmt } from '../i18n/es';
import { Button } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { HorseSprite } from '../ui/HorseSprite';
import { label } from '../ui/text';
import { phrase } from './common';
import { TableScene } from './TableScene';

const LANE_Y0 = 120, LANE_H = 80, X0 = 330, X1 = 1180;

export class RaceScene extends TableScene {
  private horses: HorseSprite[] = [];
  private laneBtns: Button[] = [];
  private pick = 0;
  private goBtn!: Button;
  private result: RaceResult | null = null;
  private t = 0;
  private racing = false;
  private banner!: Phaser.GameObjects.Text;
  private places: Phaser.GameObjects.Text[] = [];

  constructor() { super('Race', 'race', 'race'); }

  protected build(): void {
    this.horses = [];
    this.laneBtns = [];
    this.places = [];
    this.racing = false;
    this.result = null;
    const probs = probsFor(cursesFor(session.run.night));
    label(this, W / 2, 86, T.race.title, { title: true, size: 32, align: 'center', color: C.textBright, depth: 5 });
    HORSES.forEach((h, i) => {
      const y = LANE_Y0 + i * LANE_H;
      this.add.rectangle(X0 + (X1 - X0) / 2 - 60, y + LANE_H / 2, X1 - X0 + 120, LANE_H - 6, hex(i % 2 ? C.wood : C.panel)).setDepth(0);
      const b = new Button(this, 150, y + LANE_H / 2, 270, LANE_H - 10, `${h.num} ${h.name}`, () => { this.pick = i; this.refreshPick(); }, {
        size: 28, sub: `×${h.pays} · ${Math.round((probs[i] ?? 0) * 100)} %`
      });
      this.laneBtns.push(b);
      this.group.add(b, String(i + 1));
      const hs = new HorseSprite(this, X0 + 48, y + LANE_H / 2, i, 2).setDepth(2);
      this.horses.push(hs);
      this.places.push(label(this, X1 + 40, y + LANE_H / 2 - 16, '', { size: 32, color: C.lamp, depth: 6 }));
    });
    // meta ajedrezada
    const g = this.add.graphics().setDepth(1);
    for (let y = 0; y < 6 * LANE_H; y += 12) for (let k = 0; k < 2; k++) {
      g.fillStyle((y / 12 + k) % 2 ? hex(C.bone) : hex(C.bg)).fillRect(X1 + 8 + k * 12, LANE_Y0 + y, 12, 12);
    }
    this.cb = new CobradorSprite(this, 1190, 690, 2);
    this.banner = label(this, W / 2, 330, '', { size: 56, color: C.lamp, align: 'center', depth: 20 });
    label(this, 40, 646, T.race.bet, { size: 28, color: C.textDim, depth: 5 });
    this.betRow(560, 660, 130, 14, 32);
    this.goBtn = new Button(this, 940, 660, 360, 70, T.race.go, () => this.start(), { size: 40 });
    this.group.add(this.goBtn, ' ');
    this.refreshPick();
    this.say(T.night.intro(session.run.night));
    this.group.focus(this.goBtn);
  }

  private refreshPick(): void {
    this.laneBtns.forEach((b, i) => b.setToggled(i === this.pick));
  }

  protected onStateChange(): void {
    this.goBtn?.setEnabled(!this.busy && this.affordable());
    this.laneBtns.forEach((b) => b.setEnabled(!this.busy));
  }

  private start(): void {
    if (this.busy || !this.affordable()) return;
    const r = session.run, bet = this.bet;
    const rng = rngOf(r);
    const res = run(rng, cursesFor(r.night));
    this.hud.freeze(true);
    session.dispatch({ type: 'resolve', game: 'race', bet, payout: res.payout(this.pick, bet), rng: rng.state });
    this.setBusy(true);
    this.say('');
    this.places.forEach((p) => p.setText(''));
    this.result = res;
    this.t = -3000;
    this.racing = true;
    this.banner.setText('3');
    sfx.slowOrgan(1);
  }

  update(_t: number, dt: number): void {
    if (!this.racing || !this.result) return;
    const res = this.result;
    const prev = this.t;
    this.t += dt;
    if (this.t < 0) {
      const n = Math.ceil(-this.t / 1000);
      if (Math.ceil(-prev / 1000) !== n) sfx.click();
      this.banner.setText(String(n));
      return;
    }
    this.banner.setText('');
    this.horses.forEach((h) => { h.running = true; });
    const end = Math.max(...res.times);
    this.horses.forEach((h, i) => {
      const p = progress(i, this.t, res.times[i] as number);
      h.setX(Math.round(X0 + 48 + p * (X1 - X0 - 96)));
      if (this.t >= (res.times[i] as number)) {
        h.running = false;
        const place = res.order.indexOf(i) + 1;
        this.places[i]?.setText(`${place}º`);
      }
    });
    sfx.slowOrgan(1 + Math.max(0, (this.t - (Math.min(...res.times) - 1500)) / 2500)); // el organillo se ralentiza al acabar
    if (this.t >= end + 400) { this.racing = false; this.reveal(res); }
  }

  private reveal(res: RaceResult): void {
    const r = session.run, bet = this.bet;
    const pay = res.payout(this.pick, bet);
    const lost = pay === 0;
    this.horses.forEach((h) => { h.running = false; });
    this.banner.setText(T.race.winner(HORSES[res.winner]?.name ?? '') + (lost ? '' : `  +${fmt(pay)}`));
    this.cb.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (lost) sfx.lose(); else sfx.prize();
    sfx.slowOrgan(1);
    this.say(phrase(lost ? T.lines.raceLose : T.lines.raceWin));
    this.finishPlay();
    this.time.delayedCall(3500, () => this.banner.setText(''));
  }
}

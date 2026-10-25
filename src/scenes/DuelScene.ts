import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, W, hex } from '../config';
import { cursesFor } from '../core/nights';
import { session } from '../core/session';
import { Rng } from '../core/rng';
import { type DuelAction, type DuelState, type Item, decide, newDuel, shoot, useItem } from '../games/duel';
import { easeOutBack } from '../fx/ease';
import { flash } from '../fx/flash';
import { shake } from '../fx/shake';
import { T } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { Candle } from '../ui/Candle';
import { CobradorSprite } from '../ui/CobradorSprite';
import { label } from '../ui/text';
import { Typewriter } from '../ui/Typewriter';
import { FX } from '../fx/particles';
import { duelBackdrop } from '../ui/scenic';
import { fadeIn, goPhase } from './common';

const wait = (s: Phaser.Scene, ms: number) => new Promise<void>((res) => { s.time.delayedCall(ms, () => res()); });

export class DuelScene extends Phaser.Scene {
  private d!: DuelState;
  private rng!: Rng;
  private cb!: CobradorSprite;
  private gun!: Phaser.GameObjects.Image;
  private candlesP: Candle[] = [];
  private candlesB: Candle[] = [];
  private info!: Phaser.GameObjects.Text;
  private msg!: Phaser.GameObjects.Text;
  private tw!: Typewriter;
  private known!: Phaser.GameObjects.Text;
  private group!: FocusGroup;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private bossIcons: Phaser.GameObjects.Image[] = [];
  private pow!: Phaser.GameObjects.Text;
  private fx!: FX;
  private shells: Phaser.GameObjects.Rectangle[] = [];

  constructor() { super('Duel'); }

  create(): void {
    if (session.run.phase !== 'duel') { goPhase(this); return; }
    fadeIn(this);
    sfx.ambience('duel');
    const r = session.run;
    this.rng = new Rng(r.seed ^ (r.night * 7919) ^ 0xd0e1);
    this.d = newDuel(this.rng, cursesFor(r.night));
    this.candlesP = []; this.candlesB = []; this.ui = []; this.bossIcons = [];

    duelBackdrop(this);
    this.fx = new FX(this, 2);
    this.add.nineslice(W / 2, 40, 'ui-panel', undefined, 190, 22, 8, 8, 8, 8).setScale(2).setDepth(4);
    label(this, W / 2, 14, T.duel.title, { title: true, size: 32, align: 'center', color: C.textBright, depth: 5 });
    this.cb = new CobradorSprite(this, W / 2, 286, 5);
    this.cb.setDepth(3);
    this.tweens.add({ targets: this.cb, y: { from: -40 + 286, to: 286 }, duration: 800, ease: 'Bounce.easeOut' });
    this.gun = this.add.image(W / 2, 560, 'trabuco-up').setScale(4).setDepth(10);
    this.info = label(this, W / 2, 78, '', { size: 32, color: C.lamp, align: 'center', depth: 5 });
    this.msg = label(this, W / 2, 436, '', { size: 32, color: C.textBright, align: 'center', wrap: 1000, depth: 5 });
    this.tw = new Typewriter(this, this.msg, 50);
    this.known = label(this, W / 2, 474, '', { size: 28, color: C.lamp, align: 'center', depth: 5 });
    this.pow = label(this, 40, 480, '', { size: 24, color: C.dangerText, depth: 5 });

    label(this, 60, 140, 'COBRADOR', { size: 28, color: C.textDim, depth: 5 });
    label(this, 60, 470, 'TÚ', { size: 28, color: C.textDim, depth: 5 });
    for (let i = 0; i < this.d.maxHp.boss; i++) this.candlesB.push(new Candle(this, 80 + i * 56, 210, 3).setDepth(5));
    for (let i = 0; i < this.d.maxHp.player; i++) this.candlesP.push(new Candle(this, 80 + i * 56, 540, 3).setDepth(5));
    this.group = new FocusGroup(this);
    void this.run();
  }

  private refreshCandles(): void {
    const snuff = (c: Candle, lit: boolean) => { if (c.lit && !lit) this.fx.smoke(c.x, c.y - 24, 4, 70); c.setLit(lit); };
    this.candlesB.forEach((c, i) => snuff(c, i < this.d.hp.boss));
    this.candlesP.forEach((c, i) => snuff(c, i < this.d.hp.player));
    this.bossIcons.forEach((i) => i.destroy());
    this.bossIcons = this.d.items.boss.map((it, i) => this.add.image(1060 + (i % 3) * 56, 190 + Math.floor(i / 3) * 56, `item-${it}`).setScale(3).setDepth(5));
    this.pow.setText([this.d.powder.player ? 'Pólvora lista' : '', this.d.powder.boss ? 'El Cobrador carga pólvora' : '', this.d.skip.player ? 'Perderás tu turno' : ''].filter(Boolean).join(' · '));
    this.known.setText(this.d.known.player ? T.duel.seen(this.d.known.player) : '');
  }

  private async say(s: string, ms = 700): Promise<void> {
    await this.tw.say(s);
    await wait(this, ms);
  }

  /** Cartuchos de la ronda: se enseñan 3 s con su color y luego se tapan. */
  private drawShells(show: boolean): void {
    this.shells.forEach((r) => r.destroy());
    const n = this.d.chamber.length;
    const real = this.d.loaded.real;
    this.shells = Array.from({ length: n }, (_, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * 34;
      const col = show ? (i < real ? C.danger : C.textDim) : C.wood;
      const r = this.add.rectangle(x, 128, 22, 34, hex(col)).setStrokeStyle(2, 0x0d0a0e).setDepth(5);
      this.tweens.add({ targets: r, scaleY: { from: 0.1, to: 1 }, duration: 180, delay: i * 40, ease: 'Back.easeOut' });
      return r;
    });
  }

  private showCounts(): string {
    return T.duel.counts(this.d.loaded.real, this.d.loaded.fogueo);
  }

  private async announceRound(): Promise<void> {
    this.info.setText(this.showCounts());
    this.drawShells(true);
    sfx.aim();
    await wait(this, 3000);
    this.info.setText(`${T.duel.hidden} (${this.d.chamber.length})`);
    this.drawShells(false);
  }

  private async run(): Promise<void> {
    this.refreshCandles();
    for (const l of T.duel.intro) await this.say(l, 500);
    await this.announceRound();
    this.refreshCandles();
    while (!this.d.winner) {
      if (this.d.turn === 'player') await this.playerTurn();
      else await this.bossTurn();
      this.refreshCandles();
    }
    await this.finish();
  }

  // ---- turno del jugador ----
  private playerTurn(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.msg.setText(T.duel.yourTurn);
      this.buildControls(true, (a) => { this.clearControls(); void this.exec('player', a).then(resolve); });
    });
  }

  private buildControls(enabled: boolean, onPick: (a: DuelAction) => void): void {
    this.clearControls();
    const items = this.d.items.player;
    items.forEach((it, i) => {
      const x = 140 + i * 200;
      const b = new Button(this, x, 640, 190, 80, T.duel.items[it] as string, () => onPick({ kind: 'use', item: it }), { size: 24, icon: `item-${it}` });
      b.setEnabled(enabled);
      this.ui.push(b);
      this.group.add(b, String(i + 1));
    });
    const a = new Button(this, 400, 740, 440, 70, T.duel.shootBoss, () => onPick({ kind: 'shoot', target: 'other' }), { size: 36 });
    const b = new Button(this, 880, 740, 440, 70, T.duel.shootSelf, () => onPick({ kind: 'shoot', target: 'self' }), { size: 36 });
    [a, b].forEach((x) => { x.setEnabled(enabled); this.ui.push(x); });
    this.group.add(a, 'a');
    this.group.add(b, 's');
    this.group.focusFirst();
    if (items.length) this.group.focus(a);
  }

  private clearControls(): void {
    this.group.clear();
    this.ui = [];
  }

  // ---- turno del Cobrador ----
  private async bossTurn(): Promise<void> {
    this.buildControls(false, () => undefined);
    this.msg.setText(T.duel.bossTurn);
    await wait(this, 1100);
    const act = decide(this.d, this.rng);
    await this.exec('boss', act);
  }

  private async exec(who: 'player' | 'boss', a: DuelAction): Promise<void> {
    if (a.kind === 'use') {
      const name = T.duel.items[a.item] as string;
      await this.say(who === 'boss' ? T.duel.bossUses(name) : name, 400);
      this.d = useItem(this.d, a.item as Item);
      sfx.click();
      if (who === 'player' && a.item === 'monoculo' && this.d.known.player) this.msg.setText(T.duel.seen(this.d.known.player));
      this.refreshCandles();
      await wait(this, 700);
      return;
    }
    const round = this.d.round;
    const skipFlag = who === 'player' ? this.d.skip.boss : this.d.skip.player;
    const onSelf = a.target === 'self';
    this.msg.setText(who === 'player' ? (onSelf ? T.duel.youShootSelf : T.duel.youShootBoss) : (onSelf ? T.duel.bossShootsSelf : T.duel.bossShootsYou));
    // apuntar (0,55 s, easeOutBack) y esperar hasta 1,3 s desde el inicio del apuntado
    const towardsBoss = (who === 'player') !== onSelf;
    const restY = who === 'player' ? 560 : 330;
    this.gun.setTexture(towardsBoss ? 'trabuco-up' : 'trabuco-down').setPosition(W / 2, restY).setVisible(true);
    sfx.aim();
    const targetY = restY + (towardsBoss ? -70 : 70);
    const start = this.time.now;
    await new Promise<void>((res) => this.tweens.add({ targets: this.gun, y: targetY, duration: 550, ease: (t: number) => easeOutBack(t), onComplete: () => res() }));
    await wait(this, Math.max(0, 1300 - (this.time.now - start)));
    const { state, event } = shoot(this.d, this.rng, a.target);
    this.d = state;
    const victimIsPlayer = event.target === 'player';
    if (event.shell === 'real') {
      sfx.shot();
      const muzzleY = targetY + (towardsBoss ? -110 : 110);
      const mz = this.add.image(W / 2, muzzleY, 'muzzle-0').setScale(4).setDepth(11);
      [1, 2].forEach((f, i) => this.time.delayedCall(70 * (i + 1), () => mz.setTexture(`muzzle-${f}`)));
      this.time.delayedCall(260, () => mz.destroy());
      this.fx.smoke(W / 2, muzzleY, 8, 110);
      this.fx.sparks(W / 2, muzzleY, 14, 0xf4d890, 520);
      this.tweens.add({ targets: this.gun, y: targetY + (towardsBoss ? 26 : -26), duration: 70, yoyo: true, ease: 'Quad.easeOut' }); // retroceso
      flash(this, hex(C.lamp), 600, 0.5);
      if (victimIsPlayer) { shake(this, 5, 150, 8); flash(this, hex(C.blood), 700, 0.6); this.cb.setMood('sonrisa'); }
      else { this.cb.flinch(1); this.fx.sparks(W / 2, 270, 18, 0xe0503c, 380); this.cb.setMood(this.d.hp.boss <= 1 ? 'cobra' : 'acecho'); }
      this.msg.setText(T.duel.bang);
    } else {
      sfx.blank();
      this.msg.setText(T.duel.click);
    }
    this.refreshCandles();
    await wait(this, 1000);
    this.gun.setPosition(W / 2, restY);
    if (skipFlag && !event.extraTurn && !this.d.winner) await this.say(T.duel.skipped, 600);
    if (!this.d.winner && this.d.round !== round) {
      await this.say(T.duel.newRound, 400);
      await this.announceRound();
    }
  }

  private async finish(): Promise<void> {
    this.clearControls();
    const won = this.d.winner === 'player';
    this.gun.setVisible(false);
    this.cb.setMood(won ? 'sonrisa' : 'cobra');
    await this.say(won ? T.duel.win : T.duel.lose, 1800);
    session.dispatch({ type: 'duelResult', won });
    goPhase(this);
  }
}

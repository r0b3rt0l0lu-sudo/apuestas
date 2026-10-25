import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, W } from '../config';
import { type Game, TABLES } from '../core/economy';
import { session } from '../core/session';
import { quotaOf } from '../core/state';
import { T, fmt } from '../i18n/es';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { Hud } from '../ui/Hud';
import { label } from '../ui/text';
import { afterResolve, fadeIn, goPhase, leaveTable } from './common';
import type { Mood } from '../art/cobrador';

const BET: Record<Game, number> = { slots: 50, roulette: 50, race: 100 };

/** Base común de las tres mesas: HUD, fondo, Cobrador, apuesta y salida al pasillo. */
export abstract class TableScene extends Phaser.Scene {
  protected hud!: Hud;
  protected cb!: CobradorSprite;
  protected group!: FocusGroup;
  protected lineText!: Phaser.GameObjects.Text;
  protected busy = false;
  private betBtns: Button[] = [];
  private backBtn!: Button;

  constructor(key: string, protected table: Game, private ambience: 'slots' | 'roulette' | 'race') {
    super(key);
  }

  protected abstract build(): void;
  /** Cada mesa pinta su propio fondo animado. */
  protected abstract backdrop(): void;
  /** Se llama cuando cambia la apuesta o el saldo, para reactivar botones. */
  protected onStateChange(): void { /* opcional */ }

  create(): void {
    this.busy = false;
    this.betBtns = [];
    if (session.run.phase === 'hub') session.dispatch({ type: 'enterTable' });
    if (session.run.phase !== 'playing') { goPhase(this); return; }
    fadeIn(this);
    this.backdrop();
    this.hud = new Hud(this);
    sfx.ambience(this.ambience);
    this.group = new FocusGroup(this);
    this.group.onBack = () => this.back();
    this.lineText = label(this, W / 2, 748, '', { size: 28, color: C.textBright, align: 'center', depth: 60 });
    this.build();
    this.backBtn = new Button(this, 130, 756, 220, 50, T.slots.back, () => this.back(), { size: 24 });
    this.group.add(this.backBtn, 'Escape');
    this.refreshBets();
  }

  protected get bet(): number { return BET[this.table]; }

  protected say(s: string): void { this.lineText.setText(s); }

  protected back(): void {
    if (this.busy) return;
    leaveTable(this);
  }

  /** ¿Se puede jugar ahora con la apuesta elegida? */
  protected affordable(): boolean {
    const r = session.run;
    return r.phase === 'playing' && r.balance >= this.bet && r.actionsLeft >= TABLES[this.table].cost;
  }

  /** Fila de fichas/apuestas centrada en (cx, y). */
  protected betRow(cx: number, y: number, w = 130, gap = 14, size = 32): void {
    const bets = TABLES[this.table].bets;
    bets.forEach((b, i) => {
      const x = cx + (i - (bets.length - 1) / 2) * (w + gap);
      const btn = new Button(this, x, y, w, 60, fmt(b), () => { BET[this.table] = b; this.refreshBets(); }, { size });
      this.betBtns.push(btn);
      this.group.add(btn);
    });
  }

  protected refreshBets(): void {
    const r = session.run;
    const bets = TABLES[this.table].bets;
    if (this.bet > r.balance) BET[this.table] = [...bets].reverse().find((b) => b <= r.balance) ?? bets[0] as number;
    this.betBtns.forEach((btn, i) => {
      const b = bets[i] as number;
      btn.setToggled(b === this.bet).setEnabled(!this.busy && b <= r.balance);
    });
    this.onStateChange();
  }

  protected setBusy(v: boolean): void {
    this.busy = v;
    this.backBtn?.setEnabled(!v);
    this.refreshBets();
  }

  protected mood(m: Mood): void { this.cb.setMood(m); }

  protected get quota(): number { return quotaOf(session.run); }

  /** Termina la jugada: revela el HUD y, si la noche se cierra, cambia de escena. */
  protected finishPlay(): void {
    this.hud.freeze(false);
    this.setBusy(false);
    afterResolve(this, (s) => this.say(s));
  }
}

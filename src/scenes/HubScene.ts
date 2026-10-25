import Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { C, W } from '../config';
import { GAMES, type Game, TABLES, canPlay, minBet } from '../core/economy';
import { session } from '../core/session';
import { quotaMet } from '../core/state';
import { T } from '../i18n/es';
import { fairBackdrop } from '../ui/scenic';
import { Button, FocusGroup } from '../ui/Button';
import { CobradorSprite } from '../ui/CobradorSprite';
import { Hud } from '../ui/Hud';
import { openOptions } from '../ui/options';
import { dialogue, fadeIn, fadeTo, goPhase } from './common';

const TABLE_SCENE: Record<Game, string> = { slots: 'Slots', roulette: 'Roulette', race: 'Race' };

export class HubScene extends Phaser.Scene {
  private group!: FocusGroup;
  private cb!: CobradorSprite;
  private say!: (s: string) => Promise<void>;
  private waiting: (() => void) | null = null;
  private locked = false;

  constructor() { super('Hub'); }

  create(): void {
    const ph = session.run.phase;
    if (ph !== 'hub' && ph !== 'playing') { goPhase(this); return; }
    if (ph === 'playing') session.dispatch({ type: 'leaveTable' });
    fadeIn(this);
    fairBackdrop(this);
    new Hud(this);
    sfx.ambience('hub');
    this.add.text(W / 2, 100, T.hub.title, { fontFamily: 'Special Elite', fontSize: '40px', color: C.textBright }).setOrigin(0.5, 0).setResolution(1);

    this.cb = new CobradorSprite(this, 240, 430, 4).setDepth(8);
    this.cb.setAlpha(0);
    this.tweens.add({ targets: this.cb, alpha: 1, x: { from: 200, to: 240 }, duration: 700, ease: 'Quad.easeOut' });
    const d = dialogue(this, 40, 640, 1200, 140);
    this.say = (s) => d.tw.say(s, true);

    this.group = new FocusGroup(this);
    this.group.onBack = () => openOptions(this);
    this.buildButtons();
    this.group.buttons.forEach((b, i) => {
      const x = b.x;
      b.setX(x + 420).setAlpha(0);
      this.tweens.add({ targets: b, x, alpha: 1, duration: 420, delay: 120 + i * 110, ease: 'Back.easeOut' });
    });

    const advance = () => { if (!d.tw.skip()) this.waiting?.(); };
    this.input.on('pointerdown', advance);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => { if (this.locked && (e.key === 'Enter' || e.key === ' ')) advance(); });

    void this.intro();
  }

  private buildButtons(): void {
    const r = session.run;
    this.group.clear();
    GAMES.forEach((g, i) => {
      const ok = canPlay(g, r.balance, r.actionsLeft);
      const b = new Button(this, 900, 210 + i * 125, 620, 108, T.hub[g], () => this.enter(g), {
        size: 40, sub: ok ? T.hub.cost(TABLES[g].cost, minBet(g)) : T.hub.unavailable
      });
      b.setEnabled(ok && !this.locked);
      b.on('hover', () => this.lean());
      this.group.add(b, String(i + 1));
    });
    if (quotaMet(r)) {
      this.group.add(new Button(this, 900, 600, 620, 70, T.hub.sleep, () => this.sleep(), { size: 36 }).setEnabled(!this.locked), 'e');
    }
    this.group.add(new Button(this, 150, 600, 220, 56, T.options, () => openOptions(this), { size: 28 }).setEnabled(true));
    this.group.focusFirst();
  }

  /** El Cobrador se inclina hacia el botón elegido. */
  private lean(): void {
    this.tweens.add({ targets: this.cb, x: 252, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
  }

  private lock(v: boolean): void {
    this.locked = v;
    if (v) this.group.buttons.forEach((b) => b.setEnabled(false));
    else this.buildButtons();
  }

  private async intro(): Promise<void> {
    const r = session.run;
    const key = `intro-${r.night}`;
    const mood = r.actionsLeft <= 3 && !quotaMet(r) ? 'cobra' : 'acecho';
    this.cb.setMood(mood);
    if (r.flags[key]) {
      await this.say(quotaMet(r) ? T.hub.quotaMet : T.night.intro(r.night));
      return;
    }
    this.lock(true);
    session.dispatch({ type: 'flag', key });
    if (r.night === 1 && !r.flags.tutorial) {
      for (const line of T.tutorial) {
        await this.say(line);
        await new Promise<void>((res) => { this.waiting = () => { this.waiting = null; res(); }; });
      }
      session.dispatch({ type: 'flag', key: 'tutorial' });
    }
    await this.say(T.night.intro(r.night));
    const curse = T.night.curseLine(r.night);
    if (curse) {
      await new Promise<void>((res) => { this.waiting = () => { this.waiting = null; res(); }; });
      this.cb.setMood('sonrisa');
      await this.say(`«${curse}»`);
    }
    this.lock(false);
  }

  private enter(g: Game): void {
    if (this.locked) return;
    session.dispatch({ type: 'enterTable' });
    fadeTo(this, TABLE_SCENE[g]);
  }

  private sleep(): void {
    if (this.locked) return;
    session.dispatch({ type: 'sleep' });
    goPhase(this);
  }
}


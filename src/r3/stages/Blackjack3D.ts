import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { quotaOfRun, session } from '../../core/session';
import { rngOf } from '../../core/state';
import { type Card, type Outcome, dealerMustHit, handValue, isBlackjack, isBust, newDeck, outcomeOf, payoutFor } from '../../games/blackjack';
import { moodAfter } from '../../games/slots';
import { T, fmt } from '../../i18n/es';
import { btn, el } from '../../ui/dom/kit';
import { backTex, cardTex } from '../cards';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { Fx3D } from '../fx3d';
import { box, cyl, glow, lam, mesh, textures } from '../models';
import { cv, px } from '../pixel';
import { phraseFor } from '../phrases';
import { ease } from '../tween';
import { TableStage } from './TableStage';
import { feltTex } from '../../art/tex3d';
import { tex } from '../tex';

const DECK = new THREE.Vector3(2.5, 1.02, -0.9);
const CARD_W = 0.98, CARD_H = 1.3;

interface Dealt { card: Card; g: THREE.Group }

/** Blackjack contra El Cobrador: baraja de 52, blackjack 3 a 2, él se planta con 17 y puedes doblar. */
export class Blackjack3D extends TableStage {
  readonly kind = 'blackjack';
  private cob!: Cobrador3D;
  private fx!: Fx3D;
  private mine: Dealt[] = [];
  private theirs: Dealt[] = [];
  private deck: Card[] = [];
  private next = 0;
  private doubled = false;
  private rngState = 0;
  private result!: HTMLElement;
  private totals!: HTMLElement;
  private playRow!: HTMLElement;
  private hit!: HTMLButtonElement;
  private stand!: HTMLButtonElement;
  private dbl!: HTMLButtonElement;
  private dealBtn!: HTMLButtonElement;
  private flames: THREE.Mesh[] = [];

  constructor() {
    super('blackjack', 'roulette');
  }

  protected build(): void {
    this.light(640, 380, 1000, 0.3);
    const sc = this.scene;
    sc.background = new THREE.Color(0);
    sc.fog = new THREE.Fog(0x080408, 7, 19);
    sc.add(new THREE.AmbientLight(0x4a3a50, 1.2));
    this.fx = new Fx3D(sc);
    // suelo y mesa con tapete de fieltro
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), lam(0x140a08, textures.wood('#140a08', [6, 6])));
    floor.rotation.x = -Math.PI / 2;
    sc.add(floor);
    const wood = lam(0x3a1810, textures.wood('#3a1810'));
    box(6.4, 0.9, 3.5, wood, 0, 0.45, 0, sc);
    const feltMat = lam(0xffffff, tex('bj-felt', () => feltTex('#2a5a3a'), [3, 2]));
    const felt = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.1), feltMat);
    felt.rotation.x = -Math.PI / 2; felt.position.y = 0.92;
    sc.add(felt);
    for (const [w, d, x, z] of [[6.2, 0.14, 0, 1.66], [6.2, 0.14, 0, -1.66], [0.14, 3.4, -3.1, 0], [0.14, 3.4, 3.1, 0]] as const) box(w, 0.1, d, wood, x, 0.95, z, sc);
    // rótulos pintados en el tapete y el arco de apuesta
    const lettering = cv(120, 20, (g) => {
      g.fillStyle = 'rgba(230,210,140,0.85)'; g.font = "16px 'VT323', monospace"; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('BLACKJACK PAGA 3 A 2', 60, 8); g.fillText('SE PLANTA CON 17', 60, 17);
    });
    const letters = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.56), new THREE.MeshBasicMaterial({ map: lettering, transparent: true }));
    letters.rotation.x = -Math.PI / 2; letters.position.set(0, 0.935, 0.15);
    sc.add(letters);
    const arc = cv(64, 32, (g) => { g.strokeStyle = 'rgba(200,170,80,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.arc(32, 2, 28, 0.15, Math.PI - 0.15); g.stroke(); });
    const arcM = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: arc, transparent: true }));
    arcM.rotation.x = -Math.PI / 2; arcM.position.set(0, 0.934, -0.05);
    sc.add(arcM);
    // baraja, fichas y velas
    for (let i = 0; i < 5; i++) mesh(new THREE.PlaneGeometry(CARD_W * 0.92, CARD_H * 0.92), new THREE.MeshLambertMaterial({ map: backTex(), emissive: 0x2a2018, emissiveMap: backTex() }), DECK.x + i * 0.012, 0.96 + i * 0.045, DECK.z, sc).rotation.x = -Math.PI / 2;
    for (const [x, col] of [[-2.5, 0x7a1e1e], [-2.3, 0x3a4226], [-2.7, 0xc4b494]] as const) for (let i = 0; i < 5; i++) cyl(0.17, 0.17, 0.05, lam(col), x, 0.97 + i * 0.052, 0.9, sc, 10);
    for (const x of [-2.9, 2.9]) {
      cyl(0.05, 0.07, 0.3, lam(0xcfc6a8, null, { emissive: 0x2a2418 }), x, 1.1, -1.4, sc, 6);
      const f = mesh(new THREE.SphereGeometry(0.05, 6, 5), glow(0xffb040), x, 1.32, -1.4, sc);
      f.scale.y = 1.6;
      this.flames.push(f);
    }
    // luces
    const key = new THREE.SpotLight(0xf0d8a0, 90, 14, 0.8, 0.6, 1.3);
    key.position.set(0, 5, 3);
    key.target.position.set(0, 0.9, 0);
    sc.add(key, key.target);
    const rim = new THREE.PointLight(0x9c3c28, 16, 10, 1.5);
    rim.position.set(0, 3.4, -2.4);
    sc.add(rim);
    // el Cobrador reparte desde el otro lado
    this.cob = new Cobrador3D(0.034).anchor(0, 2.55, -3.1);
    sc.add(this.cob);

    this.camera.position.set(0, 3.9, 4.5);
    this.camera.lookAt(0, 0.9, 0.1);

    // interfaz
    const pan = el('div', 'abs frame panel', '', this.ui);
    Object.assign(pan.style, { left: '16px', top: '100px', width: '300px', padding: '6px 10px 10px', fontSize: '28px', lineHeight: '1.1' });
    this.totals = el('div', 'txt', '', pan);
    const help = el('div', '', T.blackjack.help, pan);
    Object.assign(help.style, { fontSize: '20px', color: '#948068', marginTop: '6px' });
    this.result = el('div', 'msg txt', '', this.ui);
    Object.assign(this.result.style, { top: '420px', fontSize: '56px', color: '#ece0c0' });

    this.playRow = el('div', 'row hit', '', this.ui);
    Object.assign(this.playRow.style, { position: 'absolute', left: '0', right: '0', bottom: '150px', gap: '16px', display: 'none' });
    this.hit = btn(this.playRow, T.blackjack.hit, () => void this.onHit(), { cls: 'big', hotkey: 'p', style: { width: '240px' } });
    this.stand = btn(this.playRow, T.blackjack.stand, () => void this.onStand(), { cls: 'big', hotkey: 's', style: { width: '240px' } });
    this.dbl = btn(this.playRow, T.blackjack.double, () => void this.onDouble(), { cls: 'big', hotkey: 'd', style: { width: '240px' } });

    const row = el('div', 'row', '', this.bar);
    this.betRow(row, 120);
    this.dealBtn = btn(row, T.blackjack.deal, () => this.deal(), { cls: 'big', hotkey: 'space', style: { width: '300px', marginLeft: '24px' } });
    this.actions.push(this.dealBtn);
    this.say(T.night.intro(session.run.night, session.run.difficulty));
    this.refreshTotals(false);
    queueMicrotask(() => this.dealBtn.focus());
  }

  // ---------- cartas ----------

  private cardGroup(card: Card, faceUp: boolean): THREE.Group {
    const g = new THREE.Group();
    const front = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshLambertMaterial({ map: cardTex(card), emissive: 0x302820, emissiveMap: cardTex(card) }));
    front.rotation.x = -Math.PI / 2;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), new THREE.MeshLambertMaterial({ map: backTex(), emissive: 0x2a2018, emissiveMap: backTex() }));
    back.rotation.x = Math.PI / 2;
    g.add(front, back);
    g.rotation.z = faceUp ? 0 : Math.PI;
    return g;
  }

  private slot(who: 'player' | 'dealer', i: number): THREE.Vector3 {
    return new THREE.Vector3(-1.5 + i * 0.8, 0.96 + i * 0.012, who === 'player' ? 0.95 : -0.85);
  }

  /** Reparte una carta con una pequeña animación desde la baraja. */
  private async give(who: 'player' | 'dealer', faceUp = true): Promise<void> {
    const card = this.deck[this.next++];
    if (!card) return;
    const hand = who === 'player' ? this.mine : this.theirs;
    const g = this.cardGroup(card, faceUp);
    g.position.copy(DECK);
    g.rotation.y = 0.4;
    this.scene.add(g);
    hand.push({ card, g });
    sfx.reelTick();
    const to = this.slot(who, hand.length - 1), ry = (Math.random() - 0.5) * 0.12;
    const from = DECK.clone();
    await this.tweens.tween(360, (k) => {
      g.position.lerpVectors(from, to, k);
      g.position.y += Math.sin(k * Math.PI) * 0.5;
      g.rotation.y = 0.4 * (1 - k) + ry * k;
    }, ease.outQuad);
    this.refreshTotals(false);
  }

  private async flip(d: Dealt): Promise<void> {
    sfx.click();
    await this.tweens.tween(260, (k) => { d.g.rotation.z = Math.PI * (1 - k); d.g.position.y = 0.96 + Math.sin(k * Math.PI) * 0.35; }, ease.inOutCubic);
    d.g.position.y = 0.96;
  }

  private clearCards(): void {
    [...this.mine, ...this.theirs].forEach((d) => this.scene.remove(d.g));
    this.mine = []; this.theirs = [];
  }

  private refreshTotals(revealed: boolean): void {
    const mine = this.mine.map((d) => d.card), theirs = this.theirs.map((d) => d.card);
    const m = mine.length ? String(handValue(mine).total) : '–';
    const first = this.theirs[0];
    const dealerText = !theirs.length ? '–' : revealed ? String(handValue(theirs).total) : `${first ? handValue([first.card]).total : ''} + ${T.blackjack.hidden}`;
    this.totals.textContent = '';
    el('div', '', `${T.blackjack.you}: ${m}${this.doubled ? ' ×2' : ''}`, this.totals);
    el('div', '', `${T.blackjack.dealer}: ${dealerText}`, this.totals);
  }

  // ---------- la mano ----------

  private deal(): void {
    if (this.busy || !this.affordable()) return;
    const bet = this.bet, rng = rngOf(session.run);
    this.deck = newDeck(rng);
    this.next = 0;
    this.doubled = false;
    this.rngState = rng.state;
    session.dispatch({ type: 'deal', bet, rng: this.rngState });
    this.setBusy(true);
    this.clearCards();
    this.result.textContent = '';
    this.say('');
    this.cob.setMood('acecho');
    this.run(async () => {
      await this.give('player');
      await this.give('dealer');
      await this.give('player');
      await this.give('dealer', false);
      const mine = this.mine.map((d) => d.card), theirs = this.theirs.map((d) => d.card);
      if (isBlackjack(mine) || isBlackjack(theirs)) { await this.reveal(); this.settle(); return; }
      this.showControls();
    });
  }

  private showControls(): void {
    const r = session.run;
    this.playRow.style.display = 'flex';
    this.dbl.disabled = this.mine.length !== 2 || this.doubled || r.balance < r.pending;
    this.hit.disabled = false; this.stand.disabled = false;
    this.hit.focus();
  }

  private hideControls(): void {
    this.playRow.style.display = 'none';
  }

  private async onHit(): Promise<void> {
    if (this.playRow.style.display === 'none') return;
    this.hideControls();
    await this.give('player');
    const mine = this.mine.map((d) => d.card);
    if (isBust(mine)) { await this.reveal(); this.settle(); return; }
    if (handValue(mine).total === 21) { await this.dealerTurn(); return; }
    this.showControls();
  }

  private async onStand(): Promise<void> {
    if (this.playRow.style.display === 'none') return;
    this.hideControls();
    await this.dealerTurn();
  }

  private async onDouble(): Promise<void> {
    if (this.playRow.style.display === 'none' || this.dbl.disabled) return;
    this.hideControls();
    this.doubled = true;
    await this.give('player');
    if (isBust(this.mine.map((d) => d.card))) { await this.reveal(); this.settle(); return; }
    await this.dealerTurn();
  }

  private async reveal(): Promise<void> {
    const hole = this.theirs[1];
    if (hole) await this.flip(hole);
    this.refreshTotals(true);
  }

  private async dealerTurn(): Promise<void> {
    await this.reveal();
    while (dealerMustHit(this.theirs.map((d) => d.card))) {
      await this.tweens.wait(450);
      await this.give('dealer');
      this.refreshTotals(true);
    }
    await this.tweens.wait(350);
    this.settle();
  }

  /** Cuenta la mano, cobra en el estado y anima el resultado. */
  private settle(): void {
    const r0 = session.run, bet = r0.pending;
    const outcome: Outcome = outcomeOf(this.mine.map((d) => d.card), this.theirs.map((d) => d.card));
    const stake = this.doubled ? bet * 2 : bet;
    const chips = payoutFor(outcome, stake);
    session.dispatch({ type: 'collect', chips, extra: this.doubled ? bet : 0 });
    const r = session.run, net = chips - stake, lost = net < 0;
    const dealerBust = isBust(this.theirs.map((d) => d.card)) && outcome === 'win';
    const label: Record<Outcome, string> = { blackjack: T.blackjack.blackjack, win: dealerBust ? T.blackjack.dealerBust : T.blackjack.win, push: T.blackjack.push, lose: T.blackjack.lose, bust: T.blackjack.bust };
    this.result.textContent = `${label[outcome]}${net > 0 ? `  +${fmt(net)}` : net < 0 ? `  −${fmt(-net)}` : ''}`;
    this.cob.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (net > 0) {
      sfx.prize();
      this.fx.coins(new THREE.Vector3(0, 3.0, 1.0), Math.min(60, 10 + Math.round((net / Math.max(1, bet)) * 6)), 0.95);
      if (outcome === 'blackjack') { this.fx.confetti(new THREE.Vector3(0, 3.4, 0.6), 50); engine.flash('#ece0c0', 0.3); }
    } else if (lost) {
      sfx.lose();
      this.fx.smoke(new THREE.Vector3(0, 1.1, 1.0), 6, 0.7);
      this.cob.laugh();
    } else sfx.blank();
    this.say(phraseFor('blackjack', lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    this.doubled = false;
    this.refreshTotals(true);
    this.finishPlay();
  }

  update(dt: number, t: number): void {
    this.fx.update(dt);
    const p = engine.pointer;
    this.cob.setGaze((p.x - 640) / 420, (p.y - 360) / 260);
    this.cob.update(dt);
    this.flames.forEach((f, i) => { f.scale.y = 1.4 + Math.sin(t * 17 + i * 3) * 0.35; });
    this.camera.position.set(Math.sin(t * 0.2) * 0.15 + (p.x - 640) / 640 * 0.25, 3.9 + Math.sin(t * 0.5) * 0.03, 4.5);
    this.camera.lookAt(0, 0.9, 0.1);
  }
}
void px;

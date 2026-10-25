import * as THREE from 'three';
import { drawItem } from '../../art/props';
import { sfx } from '../../audio/sfx';
import { cursesFor } from '../../core/nights';
import { Rng } from '../../core/rng';
import { session } from '../../core/session';
import { type DuelAction, type DuelState, type Item, decide, newDuel, shoot, useItem } from '../../games/duel';
import { T } from '../../i18n/es';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { Typewriter } from '../../ui/dom/typewriter';
import { Cobrador3D } from '../cobrador3d';
import { blunderbuss, candle, itemMesh, shell, spotCan } from '../duelprops';
import { engine } from '../engine';
import { box, lam, mesh, textures } from '../models';
import { Stage } from '../stage';
import { canvasTex } from '../tex';
import { dueltableTex } from '../../art/tex3d';
import { ease } from '../tween';
import { goPhase } from '../router';

const icons = new Map<Item, string>();
const icon = (i: Item): string => { let u = icons.get(i); if (!u) { u = drawItem(i).canvas.toDataURL(); icons.set(i, u); } return u; };

const PLAYER_Z = 1.25, BOSS_Z = -1.3;
const slotX = (i: number) => -1.25 + i * 0.5;

/** Última oportunidad: mesa de fieltro entre dos focos, trabuco, velas y El Cobrador al fondo. */
export class Duel3D extends Stage {
  readonly kind = 'duel';
  private d!: DuelState;
  private rng!: Rng;
  private cob!: Cobrador3D;
  private gun!: THREE.Group;
  private flash!: THREE.PointLight;
  private candlesP: ReturnType<typeof candle>[] = [];
  private candlesB: ReturnType<typeof candle>[] = [];
  private itemObjs: THREE.Object3D[] = [];
  private shells: THREE.Mesh[] = [];
  private table = new THREE.Group();
  private tw!: Typewriter;
  private info!: HTMLElement;
  private msg!: HTMLElement;
  private known!: HTMLElement;
  private pow!: HTMLElement;
  private ctrl!: HTMLElement;
  private detach: () => void = () => undefined;
  private pick: ((a: DuelAction) => void) | null = null;
  private smoke: Array<{ m: THREE.Mesh; v: THREE.Vector3; life: number }> = [];
  private tmp = new THREE.Vector3();

  init(): void {
    const r = session.run;
    if (r.phase !== 'duel') { goPhase(); return; }
    this.light(640, 390, 820, 0.2);
    sfx.ambience('duel');
    this.rng = new Rng(r.seed ^ (r.night * 7919) ^ 0xd0e1);
    this.d = newDuel(this.rng, cursesFor(r.night));
    const sc = this.scene;
    sc.background = new THREE.Color(0);
    sc.fog = new THREE.Fog(0x080008, 5, 17);
    sc.add(new THREE.AmbientLight(0x4a3050, 0.9));

    // mesa
    const felt = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), new THREE.MeshLambertMaterial({ map: canvasTex(dueltableTex().canvas) }));
    felt.rotation.x = -Math.PI / 2; felt.position.set(0, 1.0, -0.1); felt.receiveShadow = true;
    sc.add(felt);
    const wood = lam(0x3a1810, textures.wood('#3a1810'));
    box(3.9, 0.14, 0.15, wood, 0, 1.03, 2.2, sc); box(3.9, 0.14, 0.15, wood, 0, 1.03, -2.4, sc);
    box(0.15, 0.14, 4.6, wood, -1.9, 1.03, -0.1, sc); box(0.15, 0.14, 4.6, wood, 1.9, 1.03, -0.1, sc);
    box(3.7, 0.9, 4.5, lam(0x1a0a0e), 0, 0.45, -0.1, sc);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), lam(0x120610));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    sc.add(floor);
    // paredes de ladrillo a los lados y focos colgados
    for (const x of [-6, 6]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), lam(0x6a4a50, textures.brick()));
      w.position.set(x, 4, -2); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      sc.add(w);
    }
    ([[-2.1, 4.1], [2.1, 4.1]] as const).forEach(([x, y]) => {
      const c = spotCan();
      c.position.set(x, y, -0.4);
      c.lookAt(0, 1, -0.6);
      sc.add(c);
      const sp = new THREE.SpotLight(0xf0d8a0, 48, 14, 0.6, 0.7, 1.4);
      sp.position.set(x, y - 0.1, -0.3);
      sp.target.position.set(0, 1, -0.6);
      sp.castShadow = true;
      sp.shadow.mapSize.set(512, 512);
      sc.add(sp, sp.target);
    });
    // cables
    for (const s of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 5, 6, -4), new THREE.Vector3(s * 2.6, 5.2, -1), new THREE.Vector3(s * 2.1, 4.3, -0.4)]);
      mesh(new THREE.TubeGeometry(curve, 12, 0.03, 4), lam(0x120c18), 0, 0, 0, sc);
    }

    // Cobrador, flotando al fondo
    this.cob = new Cobrador3D(0.034).anchor(0, 2.5, -4.6);
    sc.add(this.cob);
    const back = new THREE.PointLight(0x9c3c28, 30, 9, 1.4);
    back.position.set(0, 3.2, -3.6);
    sc.add(back);

    // trabuco y fogonazo
    this.gun = blunderbuss();
    this.gun.position.set(0, 1.08, PLAYER_Z - 0.2);
    sc.add(this.gun);
    this.flash = new THREE.PointLight(0xffb050, 0, 8, 1.5);
    sc.add(this.flash);
    sc.add(this.table);

    // velas de vida
    for (let i = 0; i < this.d.maxHp.player; i++) { const c = candle(); c.group.position.set(-1.6 + i * 0.32, 1.02, 1.95); c.group.scale.setScalar(0.75); this.table.add(c.group); this.candlesP.push(c); }
    for (let i = 0; i < this.d.maxHp.boss; i++) { const c = candle(); c.group.position.set(1.6 - i * 0.32, 1.02, -2.1); c.group.scale.setScalar(0.75); this.table.add(c.group); this.candlesB.push(c); }

    this.camera.position.set(0, 2.35, 5.0);
    this.camera.lookAt(0, 0.9, -1.0);

    // interfaz
    const title = el('div', 'title center abs', T.duel.title, this.ui);
    Object.assign(title.style, { left: '0', right: '0', top: '12px', fontSize: '36px', color: '#ece0c0' });
    this.info = el('div', 'msg', '', this.ui); this.info.style.top = '58px'; this.info.style.color = '#c4b494';
    this.msg = el('div', 'msg', '', this.ui); this.msg.style.top = '470px';
    this.known = el('div', 'msg', '', this.ui); this.known.style.top = '506px'; this.known.style.fontSize = '26px'; this.known.style.color = '#c4b494';
    this.pow = el('div', 'tag', '', this.ui); this.pow.style.left = '24px'; this.pow.style.top = '120px';
    this.tw = new Typewriter(this.msg, 50);
    this.ctrl = el('div', 'hit', '', this.ui);
    Object.assign(this.ctrl.style, { position: 'absolute', left: '0', right: '0', bottom: '16px' });
    this.detach = attachNav(this.ctrl);
    this.refresh();
    this.run(() => this.flow());
  }

  // ---------- presentación ----------
  private refresh(): void {
    const d = this.d;
    this.candlesB.forEach((c, i) => { const on = i < d.hp.boss; if (c.flame.visible && !on) this.puff(c.group.getWorldPosition(this.tmp.clone()).add(new THREE.Vector3(0, 0.4, 0)), 5); c.setLit(on); });
    this.candlesP.forEach((c, i) => { const on = i < d.hp.player; if (c.flame.visible && !on) this.puff(c.group.getWorldPosition(this.tmp.clone()).add(new THREE.Vector3(0, 0.4, 0)), 5); c.setLit(on); });
    // objetos sobre la mesa (los del jugador se pueden pulsar)
    this.itemObjs.forEach((o) => { this.table.remove(o); this.clickables.splice(0, this.clickables.length, ...this.clickables.filter((c) => c.obj !== o)); });
    this.itemObjs = [];
    (['player', 'boss'] as const).forEach((who) => {
      d.items[who].forEach((it, i) => {
        const o = itemMesh(it);
        o.position.set(slotX(i), 1.02, who === 'player' ? PLAYER_Z : BOSS_Z);
        o.rotation.y = who === 'player' ? 0.3 * (i % 3 - 1) : Math.PI + 0.3 * (i % 3 - 1);
        o.scale.setScalar(1.15);
        this.table.add(o);
        this.itemObjs.push(o);
        if (who === 'player') this.click(o, () => this.pick?.({ kind: 'use', item: it }), { enabled: () => !!this.pick, hover: (on) => o.scale.setScalar(on ? 1.4 : 1.15) });
      });
    });
    this.pow.textContent = [d.powder.player ? 'Pólvora lista' : '', d.powder.boss ? 'El Cobrador carga pólvora' : '', d.skip.player ? 'Perderás tu turno' : ''].filter(Boolean).join(' · ');
    this.known.textContent = d.known.player ? T.duel.seen(d.known.player) : '';
  }

  private puff(at: THREE.Vector3, n: number): void {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0x5a5268, transparent: true, opacity: 0.7 }));
      m.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1));
      this.scene.add(m);
      this.smoke.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.25), life: 1.2 + Math.random() });
    }
  }

  private drawShells(show: boolean): void {
    this.shells.forEach((s) => this.table.remove(s));
    const n = this.d.chamber.length, real = this.d.loaded.real;
    this.shells = Array.from({ length: n }, (_, i) => {
      const s = shell(show && i < real);
      if (!show) (s.material as THREE.MeshLambertMaterial).color.set(0x2a1a1a);
      else if (i >= real) (s.material as THREE.MeshLambertMaterial).color.set(0x7a7068);
      s.position.set(-1.45, 1.06, -0.9 + i * 0.22);
      s.rotation.y = Math.PI / 2 + 0.2 * Math.sin(i);
      this.table.add(s);
      return s;
    });
  }

  private async say(s: string, ms = 700): Promise<void> {
    await this.tw.say(s, true);
    await this.tweens.wait(ms);
  }

  private async announce(): Promise<void> {
    this.info.textContent = T.duel.counts(this.d.loaded.real, this.d.loaded.fogueo);
    this.drawShells(true);
    sfx.aim();
    await this.tweens.wait(3000);
    this.info.textContent = `${T.duel.hidden} (${this.d.chamber.length})`;
    this.drawShells(false);
  }

  // ---------- flujo ----------
  private async flow(): Promise<void> {
    for (const l of T.duel.intro) await this.say(l, 500);
    await this.announce();
    this.refresh();
    while (!this.d.winner) {
      if (this.d.turn === 'player') await this.playerTurn(); else await this.bossTurn();
      this.refresh();
    }
    await this.finish();
  }

  private playerTurn(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.msg.textContent = T.duel.yourTurn;
      this.buildControls(true, (a) => { this.pick = null; this.clearControls(); void this.exec('player', a).then(resolve).catch(() => undefined); });
      this.pick = (a) => { this.pick = null; this.clearControls(); void this.exec('player', a).then(resolve).catch(() => undefined); };
    });
  }

  private buildControls(enabled: boolean, onPick: (a: DuelAction) => void): void {
    this.clearControls();
    const items = el('div', 'row', '', this.ctrl);
    this.d.items.player.forEach((it, i) => {
      const b = btn(items, T.duel.items[it] as string, () => onPick({ kind: 'use', item: it }), { hotkey: String(i + 1), style: { width: '196px', minHeight: '64px' } });
      const im = el('img', '', '', b) as HTMLImageElement;
      im.src = icon(it);
      Object.assign(im.style, { width: '32px', height: '32px', imageRendering: 'pixelated' });
      b.insertBefore(im, b.firstChild);
      b.style.flexDirection = 'row'; b.style.gap = '6px';
      b.querySelector('span')!.style.fontSize = '24px';
      b.disabled = !enabled;
    });
    const acts = el('div', 'row', '', this.ctrl);
    acts.style.marginTop = '6px';
    const a = btn(acts, T.duel.shootBoss, () => onPick({ kind: 'shoot', target: 'other' }), { cls: 'big', hotkey: 'a', style: { width: '440px', minHeight: '72px' } });
    const s = btn(acts, T.duel.shootSelf, () => onPick({ kind: 'shoot', target: 'self' }), { cls: 'big', hotkey: 's', style: { width: '440px', minHeight: '72px' } });
    a.disabled = s.disabled = !enabled;
    if (enabled) queueMicrotask(() => a.focus());
  }

  private clearControls(): void {
    this.ctrl.textContent = '';
  }

  private async bossTurn(): Promise<void> {
    this.buildControls(false, () => undefined);
    this.msg.textContent = T.duel.bossTurn;
    await this.tweens.wait(1100);
    await this.exec('boss', decide(this.d, this.rng));
  }

  private muzzle(): THREE.Vector3 {
    return this.gun.localToWorld(new THREE.Vector3(0, 0, -1.25));
  }

  private async exec(who: 'player' | 'boss', a: DuelAction): Promise<void> {
    if (a.kind === 'use') {
      const name = T.duel.items[a.item] as string;
      await this.say(who === 'boss' ? T.duel.bossUses(name) : name, 400);
      this.d = useItem(this.d, a.item as Item);
      sfx.click();
      if (who === 'player' && a.item === 'monoculo' && this.d.known.player) this.msg.textContent = T.duel.seen(this.d.known.player);
      this.refresh();
      await this.tweens.wait(700);
      return;
    }
    const round = this.d.round;
    const skipFlag = who === 'player' ? this.d.skip.boss : this.d.skip.player;
    const onSelf = a.target === 'self';
    this.msg.textContent = who === 'player' ? (onSelf ? T.duel.youShootSelf : T.duel.youShootBoss) : (onSelf ? T.duel.bossShootsSelf : T.duel.bossShootsYou);
    // apuntar: -z mira al Cobrador, +z mira al jugador
    const towardsBoss = (who === 'player') !== onSelf;
    const rest = new THREE.Vector3(0, 1.08, who === 'player' ? PLAYER_Z - 0.2 : BOSS_Z + 0.6);
    const aim = rest.clone().add(new THREE.Vector3(0, 0.45, who === 'player' ? (towardsBoss ? -0.5 : 0.7) : (towardsBoss ? -0.4 : 0.6)));
    const rotY = towardsBoss ? 0 : Math.PI;
    this.gun.position.copy(rest); this.gun.rotation.set(0, rotY, 0);
    sfx.aim();
    const t0 = performance.now();
    await this.tweens.tween(550, (k) => { this.gun.position.lerpVectors(rest, aim, k); }, ease.outBack);
    await this.tweens.wait(Math.max(0, 1300 - (performance.now() - t0)));
    const { state, event } = shoot(this.d, this.rng, a.target);
    this.d = state;
    const victimIsPlayer = event.target === 'player';
    if (event.shell === 'real') {
      sfx.shot();
      const mz = this.muzzle();
      this.flash.position.copy(mz); this.flash.intensity = 160;
      this.puff(mz, 12);
      this.tweens.tween(260, (k) => { this.flash.intensity = 160 * (1 - k); }).catch(() => undefined);
      this.tweens.tween(90, (k) => { this.gun.position.z = aim.z + (towardsBoss ? 1 : -1) * 0.18 * Math.sin(k * Math.PI); }).catch(() => undefined); // retroceso
      engine.flash('#f4d890', 0.45);
      if (victimIsPlayer) { engine.shake(0.14, 750); engine.flash('#7a1e1e', 0.6); this.cob.setMood('sonrisa'); this.cob.laugh(); }
      else { this.cob.flinch(1); this.cob.setMood(this.d.hp.boss <= 1 ? 'cobra' : 'acecho'); }
      this.msg.textContent = T.duel.bang;
    } else {
      sfx.blank();
      this.msg.textContent = T.duel.click;
    }
    this.refresh();
    await this.tweens.wait(1000);
    await this.tweens.tween(300, (k) => { this.gun.position.lerpVectors(aim, rest, k); });
    this.gun.rotation.y = who === 'player' ? 0 : Math.PI;
    if (skipFlag && !event.extraTurn && !this.d.winner) await this.say(T.duel.skipped, 600);
    if (!this.d.winner && this.d.round !== round) { await this.say(T.duel.newRound, 400); await this.announce(); }
  }

  private async finish(): Promise<void> {
    this.clearControls();
    const won = this.d.winner === 'player';
    this.cob.setMood(won ? 'sonrisa' : 'cobra');
    await this.say(won ? T.duel.win : T.duel.lose, 1800);
    session.dispatch({ type: 'duelResult', won });
    goPhase();
  }

  update(dt: number, t: number): void {
    const p = engine.pointer;
    this.cob.setGaze((p.x - 640) / 420, (p.y - 420) / 260);
    this.cob.update(dt);
    // el Cobrador se mece y se asoma
    this.cob.anchor(Math.sin(t * 0.4) * 0.15, 2.5 + Math.sin(t * 0.9) * 0.05, -4.6 + (this.cob.mood === 'cobra' ? 1.0 : 0));
    this.camera.position.set(Math.sin(t * 0.3) * 0.06 + (p.x - 640) / 640 * 0.12, 2.35 + Math.sin(t * 0.7) * 0.025, 5.0);
    this.camera.lookAt(0, 0.9 - (p.y - 400) / 400 * 0.1, -1.0);
    [...this.candlesP, ...this.candlesB].forEach((c, i) => { c.flame.scale.set(1, 0.85 + 0.25 * Math.sin(t * 11 + i * 2), 1); });
    this.smoke = this.smoke.filter((s) => {
      s.life -= dt;
      s.m.position.addScaledVector(s.v, dt);
      (s.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, s.life / 2) * 0.7;
      s.m.scale.multiplyScalar(1 + dt * 0.8);
      if (s.life <= 0) { s.m.removeFromParent(); return false; }
      return true;
    });
  }

  dispose(): void {
    this.detach();
    this.tw?.stop();
    super.dispose();
  }
}

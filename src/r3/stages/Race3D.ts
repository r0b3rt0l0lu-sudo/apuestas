import * as THREE from 'three';
import { drawArena } from '../../art/scenery';
import { drawHorse } from '../../art/horse';
import { sfx } from '../../audio/sfx';
import { cursesFor } from '../../core/nights';
import { quotaOfRun, session } from '../../core/session';
import { rngOf } from '../../core/state';
import { HORSES, probsFor, progress, run as runRace, type RaceResult } from '../../games/race';
import { moodAfter } from '../../games/slots';
import { T, fmt } from '../../i18n/es';
import { btn, el } from '../../ui/dom/kit';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { Fx3D } from '../fx3d';
import { box, lam, mesh, textures } from '../models';
import { phraseFor } from '../phrases';
import { canvasTex, spriteMat, tex } from '../tex';
import { TableStage } from './TableStage';
import { Painter } from '../../art/painter';

const X0 = -3.6, X1 = 5.6, LANE = 1.15, PX = 0.05;
const laneZ = (i: number) => (i - 2.5) * LANE;

/** Carreras de caballitos en 3D: seis carriles de serrín, caballitos de feria con su barra y público en las sombras. */
export class Race3D extends TableStage {
  readonly kind = 'race';
  private cob!: Cobrador3D;
  private fx!: Fx3D;
  private horses: Array<{ g: THREE.Group; body: THREE.Mesh; shadow: THREE.Mesh; i: number }> = [];
  private pick = 0;
  private laneBtns: HTMLButtonElement[] = [];
  private goBtn!: HTMLButtonElement;
  private banner!: HTMLElement;
  private places!: HTMLElement;
  private racing = false;
  private result: RaceResult | null = null;
  private t = 0;
  private tick = 0;
  private acc = 0;
  private dustT = 0;
  private bulbs!: THREE.Mesh;
  private crowd!: THREE.Mesh;
  private crowdFrames: THREE.CanvasTexture[] = [];
  private cheering = false;

  constructor() { super('race', 'race'); }

  protected build(): void {
    this.light(640, 380, 1150, 0.46);
    const sc = this.scene;
    sc.background = new THREE.Color(0);
    sc.fog = new THREE.Fog(0x10040a, 14, 40);
    sc.add(new THREE.AmbientLight(0x4a3040, 1.4));
    this.fx = new Fx3D(sc);

    // fondo: la carpa del tiovivo pintada (público y bombillas animados)
    const ar = drawArena();
    const wall = (p: Painter, z: number, key: string) => mesh(new THREE.PlaneGeometry(36, 22.5), new THREE.MeshBasicMaterial({ map: tex(key, () => p), transparent: true, fog: false }), 0, 8.5, z, sc);
    wall(ar.bg, -9, 'arena-bg').castShadow = false;
    this.crowdFrames = [canvasTex(ar.crowd[0]!.canvas), canvasTex(ar.crowd[1]!.canvas)];
    this.crowd = mesh(new THREE.PlaneGeometry(36, 22.5), new THREE.MeshBasicMaterial({ map: this.crowdFrames[0], transparent: true, fog: false }), 0, 8.5, -8.9, sc);
    this.crowd.castShadow = false;
    this.bulbs = mesh(new THREE.PlaneGeometry(36, 22.5), new THREE.MeshBasicMaterial({ map: canvasTex(ar.bulbs[0]!.canvas), transparent: true, fog: false }), 0, 8.5, -8.8, sc);
    this.bulbs.castShadow = false;

    // pista de serrín con carriles
    const sand = tex('sand', () => { const p = new Painter(64, 32); for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) p.px(x, y, ((x * 7 + y * 13) % 17) < 2 ? '#8a6a44' : '#6e5a3c'); return p; }, [8, 1]);
    for (let i = 0; i < 6; i++) {
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(13.6, LANE - 0.06), lam(0xffffff, sand));
      lane.rotation.x = -Math.PI / 2; lane.position.set(1.0, 0.01, laneZ(i)); lane.receiveShadow = true;
      sc.add(lane);
      box(13.6, 0.06, 0.05, lam(0xc4b494), 1.0, 0.04, laneZ(i) + LANE / 2, sc);
    }
    const chk = tex('chk', () => { const p = new Painter(16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.px(x, y, ((x >> 2) + (y >> 2)) % 2 ? '#ece0c0' : '#06020a'); return p; }, [1, 6]);
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(0.5, LANE * 6), new THREE.MeshBasicMaterial({ map: chk }));
    fin.rotation.x = -Math.PI / 2; fin.position.set(X1 + 0.9, 0.03, 0);
    sc.add(fin);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), lam(0x140a08, textures.wood('#140a08', [6, 6])));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02;
    sc.add(floor);

    // caballos de carreras (sin barra)
    for (let i = 0; i < 6; i++) {
      const h = HORSES[i]!;
      const g = new THREE.Group();
      const look = { skin: h.skin, body: h.body, mane: h.mane, num: h.num };
      const body = new THREE.Mesh(new THREE.PlaneGeometry(48 * PX, 40 * PX), spriteMat(canvasTex(drawHorse(look, 0).canvas)));
      body.position.y = 1.15;
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.03, 0.05);
      shadow.scale.set(1, 0.35, 1);
      g.add(body, shadow);
      g.position.set(X0, 0, laneZ(i));
      sc.add(g);
      this.horses.push({ g, body, shadow, i });
    }
    const key = new THREE.SpotLight(0xe8d0a0, 90, 30, 0.9, 0.7, 1.2);
    key.position.set(0, 9, 6); key.target.position.set(0, 0, 0);
    sc.add(key, key.target);
    this.cob = new Cobrador3D(0.034).anchor(7.4, 3.4, -4.2);
    sc.add(this.cob);

    this.camera.position.set(1.4, 5.6, 11.2);
    this.camera.lookAt(1.3, 0.6, 0);

    // interfaz: carriles a la izquierda
    const probs = probsFor(cursesFor(session.run.night));
    const col = el('div', 'abs hit', '', this.ui);
    Object.assign(col.style, { left: '8px', top: '96px', width: '270px' });
    HORSES.forEach((h, i) => {
      const b = btn(col, `${h.num} ${h.name}`, () => { this.pick = i; this.refreshPick(); }, { hotkey: String(i + 1), sub: `×${String(h.pays).replace('.', ',')} · ${Math.round((probs[i] ?? 0) * 100)} %`, style: { width: '100%', minHeight: '66px', marginBottom: '4px' } });
      this.laneBtns.push(b);
    });
    this.banner = el('div', 'msg txt', '', this.ui);
    Object.assign(this.banner.style, { top: '300px', fontSize: '64px', color: '#ece0c0' });
    this.places = el('div', 'abs txt', '', this.ui);
    Object.assign(this.places.style, { right: '12px', top: '470px', fontSize: '30px', color: '#ece0c0', textAlign: 'right' });
    const row = el('div', 'row', '', this.bar);
    this.betRow(row, 130);
    this.goBtn = btn(row, T.race.go, () => this.start(), { cls: 'big', hotkey: 'space', style: { width: '320px', marginLeft: '24px' } });
    this.actions.push(this.goBtn);
    this.refreshPick();
    this.say(T.night.intro(session.run.night, session.run.difficulty));
    queueMicrotask(() => this.goBtn.focus());
  }

  private refreshPick(): void {
    this.laneBtns.forEach((b, i) => b.classList.toggle('sel', i === this.pick));
  }

  protected onChange(): void {
    this.laneBtns.forEach((b) => { b.disabled = this.busy; });
  }

  private start(): void {
    if (this.busy || !this.affordable()) return;
    const r = session.run, bet = this.bet;
    const rng = rngOf(r);
    const res = runRace(rng, cursesFor(r.night));
    this.hud.freeze(true);
    session.dispatch({ type: 'resolve', game: 'race', bet, payout: res.payout(this.pick, bet), rng: rng.state });
    this.setBusy(true);
    this.say('');
    this.places.textContent = '';
    this.result = res;
    this.t = -3000;
    this.racing = true;
    this.banner.textContent = '3';
    sfx.slowOrgan(1);
  }

  update(dt: number, t: number): void {
    this.fx.update(dt);
    this.cob.update(dt);
    const p = engine.pointer;
    this.cob.setGaze((p.x - 1000) / 400, (p.y - 300) / 260);
    // luces de la carpa y público
    // tick de los caballitos
    this.acc += dt;
    while (this.acc >= 0.15) { this.acc -= 0.15; this.tick++; this.stepHorses(); }
    if (this.racing && this.result) this.runRace(dt);
    this.camera.position.set(1.4 + Math.sin(t * 0.2) * 0.3 + (p.x - 640) / 640 * 0.6, 5.6 + Math.sin(t * 0.5) * 0.04, 11.2);
    this.camera.lookAt(1.3, 0.6, 0);
  }

  private stepHorses(): void {
    const running = this.racing && this.t >= 0;
    this.horses.forEach((h) => {
      const g = HORSES[h.i]!;
      const look = { skin: g.skin, body: g.body, mane: g.mane, num: g.num };
      const glitch = (this.tick + h.i * 7) % 43 === 0 || (this.tick + h.i * 7) % 61 === 0;
      const frame = (running && this.tick % 2 === 0) ? 1 : 0;
      const key = `h${h.i}-${glitch ? 'g' : frame}`;
      (h.body.material as THREE.MeshBasicMaterial).map = tex(key, () => drawHorse(look, glitch ? 0 : (frame as 0 | 1), glitch));
      (h.body.material as THREE.MeshBasicMaterial).needsUpdate = true;
    });
    const f = this.cheering ? this.tick % 2 : Math.floor(this.tick / 5) % 2;
    (this.crowd.material as THREE.MeshBasicMaterial).map = this.crowdFrames[f] as THREE.Texture;
  }

  private runRace(dt: number): void {
    const res = this.result!;
    const prev = this.t;
    this.t += dt * 1000;
    if (this.t < 0) {
      const n = Math.ceil(-this.t / 1000);
      if (Math.ceil(-prev / 1000) !== n) { sfx.click(); this.banner.textContent = String(n); }
      return;
    }
    if (prev < 0) { this.banner.textContent = '¡YA!'; this.cheering = true; sfx.shot(); this.tweens.wait(500).then(() => { if (this.racing) this.banner.textContent = ''; }).catch(() => undefined); }
    this.dustT += dt;
    const end = Math.max(...res.times);
    let lead = X0;
    this.horses.forEach((h) => {
      const pr = progress(h.i, this.t, res.times[h.i] as number);
      h.g.position.x = X0 + pr * (X1 - X0);
      h.body.position.y = 1.15 + (this.tick % 2 ? 0.06 : 0);
      lead = Math.max(lead, h.g.position.x);
      if (this.dustT > 0.09 && pr > 0 && pr < 1) this.fx.smoke(new THREE.Vector3(h.g.position.x - 1.0, 0.15, h.g.position.z), 1, 0.3);
    });
    if (this.dustT > 0.09) this.dustT = 0;
    void lead;
    sfx.slowOrgan(1 + Math.max(0, (this.t - (Math.min(...res.times) - 1500)) / 2500));
    if (this.t >= end + 400) { this.racing = false; this.reveal(res); }
  }

  private reveal(res: RaceResult): void {
    const r = session.run, bet = this.bet, pay = res.payout(this.pick, bet), lost = pay === 0;
    this.cheering = false;
    this.banner.textContent = T.race.winner(HORSES[res.winner]?.name ?? '') + (lost ? '' : `  +${fmt(pay)}`);
    this.places.innerHTML = res.order.map((h, k) => `${k + 1}º ${HORSES[h]!.name}`).join('<br>');
    this.cob.setMood(moodAfter(lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    if (lost) sfx.lose(); else sfx.prize();
    sfx.slowOrgan(1);
    const w = this.horses[res.winner]!;
    this.fx.confetti(w.g.position.clone().add(new THREE.Vector3(0, 1.5, 0)), lost ? 14 : 50);
    if (!lost) this.fx.coins(new THREE.Vector3(0, 6, 1), 28, 0.1);
    this.run(async () => { for (let i = 0; i < 4; i++) { await this.tweens.tween(170, (k) => { w.g.position.y = 0.4 * Math.sin(k * Math.PI); }); } w.g.position.y = 0; });
    this.say(phraseFor('race', lost, r.actionsLeft, r.balance, quotaOfRun(r)));
    this.finishPlay();
    this.tweens.wait(3800).then(() => { this.banner.textContent = ''; }).catch(() => undefined);
  }
}
void box;

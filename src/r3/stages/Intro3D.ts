import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { brickTex, curtainTex, noiseTex, woodTex } from '../../art/tex3d';
import { session } from '../../core/session';
import { T } from '../../i18n/es';
import { btn, el } from '../../ui/dom/kit';
import { Typewriter } from '../../ui/dom/typewriter';
import { Cigarette } from '../cigarette';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { FpsControls } from '../fps';
import { box, cyl, glow, lam, lampPost, mesh, reelDrum, rouletteTable, sky, slotMachine } from '../models';
import { goPhase } from '../router';
import { Stage } from '../stage';
import { stripTexture } from '../strip';
import { canvasTex, tex } from '../tex';
import { drawWheel } from '../../art/wheel';
import { ease } from '../tween';

const EYE = 1.65;
const FRONT_Z = -6; // fachada del casino
const BACK_Z = -24;
const TRIGGER_Z = -15.5; // al pasar de aquí, te llevan

/** La partida nueva empieza en el parking de un casino; solo se ve una vez por partida. */
export const needsIntro = (): boolean => {
  const r = session.run;
  return r.night === 1 && !r.flags.casino && !r.flags['intro-1'];
};

/** Prólogo: aparcas, caminas hasta el casino, entras en el vestíbulo y alguien te lleva. */
export class Intro3D extends Stage {
  readonly kind = 'intro';
  private fps!: FpsControls;
  private cig!: Cigarette;
  private tw!: Typewriter;
  private goal!: HTMLElement;
  private cob!: Cobrador3D;
  private lights: Array<{ l: THREE.Light; base: number; flicker: number }> = [];
  private glowK = 1;
  private neon!: THREE.Mesh;
  private cut = false;
  private whispered = false;
  private hands: THREE.Group[] = [];
  private detachKeys: () => void = () => undefined;

  init(): void {
    if (!needsIntro()) { goPhase(); return; }
    this.light(640, 400, 1300, 0.45);
    sfx.ambience('hub');
    const sc = this.scene;
    sc.background = new THREE.Color(0x000000);
    sc.fog = new THREE.Fog(0x0c0414, 8, 34);
    const amb = new THREE.AmbientLight(0x3c3050, 1.7);
    sc.add(amb, sky());
    this.lights.push({ l: amb, base: 1.7, flicker: 0 });
    this.buildParking();
    this.buildFacade();
    this.buildLobby();

    this.fps = new FpsControls(this.camera, engine.canvas, { minX: -14, maxX: 14, minZ: BACK_Z + 0.5, maxZ: 15 });
    this.fps.pos.set(0, EYE, 12.5);
    this.fps.solids.push(...this.solids);
    this.fps.apply();
    this.fps.bind();
    sc.add(this.camera);
    this.cig = new Cigarette(sc, this.camera);

    this.cob = new Cobrador3D(0.04).anchor(0, 2.2, BACK_Z + 1.5).setMood('acecho', true);
    this.cob.visible = false;
    sc.add(this.cob);
    this.buildHands();

    const goal = el('div', 'abs txt', T.intro.goal, this.ui);
    Object.assign(goal.style, { left: '0', right: '0', top: '70px', textAlign: 'center', fontSize: '38px', color: '#ece0c0', textShadow: '2px 2px 0 #000' });
    this.goal = goal;
    const hint = el('div', 'abs txt', T.intro.controls, this.ui);
    this.hint = hint;
    hint.style.display = session.options.hints ? '' : 'none';
    Object.assign(hint.style, { left: '0', right: '0', top: '24px', textAlign: 'center', fontSize: '22px', color: '#9c9278', textShadow: '2px 2px 0 #000' });
    const dlg = el('div', 'dlg frame dialog hit', '', this.ui);
    Object.assign(dlg.style, { opacity: '0', transition: 'opacity .3s' });
    this.tw = new Typewriter(el('div', '', '', dlg));
    this.dlg = dlg;
    const skip = btn(this.ui, T.intro.skip, () => this.finish(true), { cls: 'small', hotkey: 'k', style: { position: 'absolute', right: '16px', bottom: '16px' } });
    skip.classList.add('hit');
    const onKey = (e: KeyboardEvent): void => { if (e.key.toLowerCase() === 'e' && !e.repeat && !this.cut && this.fps.enabled) this.cig.press(); };
    window.addEventListener('keydown', onKey);
    this.detachKeys = () => window.removeEventListener('keydown', onKey);
  }

  private dlg!: HTMLElement;
  private hint!: HTMLElement;
  private solids: Array<{ x: number; z: number; hx: number; hz: number }> = [];

  // ---------- exterior ----------

  private addLight(l: THREE.Light, flicker = 0): THREE.Light {
    this.lights.push({ l, base: l.intensity, flicker });
    this.scene.add(l);
    return l;
  }

  private car(color: number, x: number, z: number, ry = 0, lit = false): void {
    const g = new THREE.Group();
    const body = lam(color), dark = lam(0x08060a);
    box(1.9, 0.7, 4.1, body, 0, 0.62, 0, g);
    box(1.6, 0.62, 2.1, lam(color), 0, 1.25, -0.2, g);
    box(1.52, 0.46, 2.0, lam(0x10141c, null, { emissive: 0x0a0e16 }), 0, 1.27, -0.2, g); // cristales
    [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]].forEach(([wx, wz]) => cyl(0.36, 0.36, 0.26, dark, wx, 0.36, wz, g, 10).rotation.z = Math.PI / 2);
    box(0.4, 0.16, 0.06, glow(lit ? 0xfff0c0 : 0x3a3440), -0.6, 0.72, 2.07, g);
    box(0.4, 0.16, 0.06, glow(lit ? 0xfff0c0 : 0x3a3440), 0.6, 0.72, 2.07, g);
    box(0.4, 0.14, 0.06, glow(0x9c1c20), -0.6, 0.78, -2.07, g);
    box(0.4, 0.14, 0.06, glow(0x9c1c20), 0.6, 0.78, -2.07, g);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.scene.add(g);
    this.solids.push({ x, z, hx: 1.05, hz: 2.2 });
    if (lit) {
      const l = new THREE.PointLight(0xfff0c0, 10, 14, 1.4);
      l.position.set(x, 0.9, z - 2.6);
      this.addLight(l);
    }
  }

  private buildParking(): void {
    const sc = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), lam(0xffffff, tex('asphalt', () => noiseTex('#26202c', 0.14), [10, 10])));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    sc.add(ground);
    // plazas
    for (let i = -4; i <= 4; i++) {
      [9, 2].forEach((z) => box(0.1, 0.02, 4.4, lam(0x8a8478), i * 3.1 + 1.55, 0.02, z, sc));
    }
    // pasillo central y paso de cebra hacia la puerta
    for (let i = 0; i < 6; i++) box(2.6, 0.02, 0.5, lam(0x948068), 0, 0.02, -2.2 - i * 0.9 + 3.2, sc);
    // coches: el tuyo con los faros encendidos detrás de ti
    this.car(0x2a3a5a, 3.4, 14.2, 0, true);
    this.car(0x6a1c20, -7.8, 9, 0);
    this.car(0x3a3a34, -4.7, 9, 0);
    this.car(0x1c3a32, 6.2, 9, 0);
    this.car(0x58505a, 9.3, 9, 0);
    this.car(0x5a4a22, -9.3, 2, 0);
    this.car(0x2a2430, 7.7, 2, 0);
    this.car(0x4a1c3a, -1.55, 2.2, 0);
    // farolas
    ([[-4.5, 6.5], [5, 5.5], [-9, -1], [9, -2]] as const).forEach(([x, z], i) => {
      const lp = lampPost(0xe8b868, 18, 20);
      lp.group.position.set(x, 0, z);
      sc.add(lp.group);
      this.lights.push({ l: lp.light, base: 18, flicker: i === 1 ? 2.5 : i === 2 ? 1 : 0.4 });
    });
  }

  // ---------- fachada ----------

  private buildFacade(): void {
    const sc = this.scene;
    const brick = (w: number, h: number): THREE.MeshLambertMaterial => lam(0xffffff, tex(`ca-brick-${w}-${h}`, () => brickTex('#2e1018'), [w / 2, h / 2]));
    const wall = (w: number, h: number, x: number, y: number, z: number): void => { box(w, h, 0.7, brick(w, h), x, y, z, sc); };
    wall(12, 9.5, -8, 4.75, FRONT_Z);
    wall(12, 9.5, 8, 4.75, FRONT_Z);
    wall(4, 5.9, 0, 6.55, FRONT_Z); // dintel sobre la puerta
    this.solids.push({ x: -8, z: FRONT_Z, hx: 6, hz: 0.5 }, { x: 8, z: FRONT_Z, hx: 6, hz: 0.5 });
    // marco dorado y marquesina roja
    box(0.18, 3.6, 0.5, lam(0xc4a050), -2.0, 1.8, FRONT_Z + 0.35, sc);
    box(0.18, 3.6, 0.5, lam(0xc4a050), 2.0, 1.8, FRONT_Z + 0.35, sc);
    box(4.2, 0.2, 0.5, lam(0xc4a050), 0, 3.6, FRONT_Z + 0.35, sc);
    const awn = box(5.2, 0.16, 2.2, lam(0x7a1428), 0, 3.9, FRONT_Z + 1.4, sc);
    awn.rotation.x = 0.12;
    cyl(0.05, 0.05, 3.8, lam(0xc4a050), -2.5, 1.9, FRONT_Z + 2.4, sc, 6);
    cyl(0.05, 0.05, 3.8, lam(0xc4a050), 2.5, 1.9, FRONT_Z + 2.4, sc, 6);
    // la luz del vestíbulo se derrama por la puerta
    const spill = new THREE.PointLight(0xffb060, 26, 15, 1.3);
    spill.position.set(0, 2.6, FRONT_Z + 1);
    this.addLight(spill, 0.5);
    // cartel de neón
    const c = document.createElement('canvas');
    c.width = 320; c.height = 96;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#05010a'; g.fillRect(0, 0, 320, 96);
      g.textAlign = 'center';
      g.shadowColor = '#e0503c'; g.shadowBlur = 10;
      g.fillStyle = '#ff7a5a';
      g.font = "64px 'Special Elite', serif";
      g.fillText(T.intro.sign[0] ?? '', 160, 56);
      g.fillStyle = '#e8d27a'; g.shadowColor = '#e8d27a';
      g.font = "26px 'VT323', monospace";
      g.fillText(T.intro.sign[1] ?? '', 160, 86);
    }
    this.neon = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.9), new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, fog: false }));
    this.neon.position.set(0, 7.4, FRONT_Z + 0.4);
    sc.add(this.neon);
    const nl = new THREE.PointLight(0xe0503c, 14, 14, 1.5);
    nl.position.set(0, 7, FRONT_Z + 3);
    this.addLight(nl, 1.5);
  }

  // ---------- vestíbulo ----------

  private buildLobby(): void {
    const sc = this.scene;
    const w = 20, d = FRONT_Z - BACK_Z, h = 5.2, cz = (FRONT_Z + BACK_Z) / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0xffffff, tex('lobby-carpet', () => woodTex('#3a1018'), [8, 9])));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, cz);
    sc.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lam(0x0c060c));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, h, cz);
    sc.add(ceil);
    const sideWall = (x: number, ry: number): void => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d, h), lam(0xffffff, tex('lobby-brick', () => brickTex('#3a1018'), [9, 2])));
      m.position.set(x, h / 2, cz);
      m.rotation.y = ry;
      sc.add(m);
    };
    sideWall(-w / 2, Math.PI / 2);
    sideWall(w / 2, -Math.PI / 2);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(0xffffff, tex('lobby-curtain', () => curtainTex('#7a1428'), [6, 1])));
    back.position.set(0, h / 2, BACK_Z);
    sc.add(back);
    // zonas fuera del edificio
    this.solids.push({ x: -12.4, z: cz, hx: 2.5, hz: d / 2 }, { x: 12.4, z: cz, hx: 2.5, hz: d / 2 });
    // máquinas a ambos lados
    const strip = stripTexture();
    for (let i = 0; i < 5; i++) {
      const z = -9 - i * 3;
      ([-1, 1] as const).forEach((side) => {
        const m = slotMachine();
        m.group.position.set(side * 8.6, 0, z);
        m.group.rotation.y = side * -Math.PI / 2;
        m.group.scale.setScalar(1.2);
        m.reelAnchors.forEach((a, k) => { const dr = reelDrum(strip, 0.36, 0.4); dr.rotation.x = (Math.PI / 3) * (((i + k) * 2 + side + 6) % 6 + 0.5); a.add(dr); });
        sc.add(m.group);
        this.solids.push({ x: side * 8.9, z, hx: 0.9, hz: 1.2 });
      });
    }
    // ruleta
    const wheelTex = canvasTex(drawWheel([0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]).canvas);
    const rt = rouletteTable(wheelTex);
    rt.group.position.set(-2.2, 0, -14);
    sc.add(rt.group);
    this.solids.push({ x: -2.2, z: -14, hx: 2.4, hz: 1.6 });
    // columnas
    ([-4.6, 4.6] as const).forEach((x) => [-9.5, -17.5].forEach((z) => {
      cyl(0.32, 0.36, h, lam(0x3a2418, tex('lobby-col', () => woodTex('#3a2418'), [1, 3])), x, h / 2, z, sc, 8);
      this.solids.push({ x, z, hx: 0.36, hz: 0.36 });
    }));
    // lámparas del techo
    ([-8, -14, -20] as const).forEach((z, i) => {
      mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(0xf0d890), 0, h - 0.5, z, sc);
      const l = new THREE.PointLight(i === 2 ? 0xc03a2a : 0xe8b868, i === 2 ? 14 : 20, 12, 1.4);
      l.position.set(0, h - 0.7, z);
      this.addLight(l, i === 2 ? 1.2 : 0.3);
    });
  }

  private buildHands(): void {
    const skin = lam(0xc89a78, null, { emissive: 0x3a2014 });
    const sleeve = lam(0x14101a, null, { emissive: 0x08060c });
    ([-1, 1] as const).forEach((side) => {
      const g = new THREE.Group();
      box(0.16, 0.14, 0.9, sleeve, 0, 0, 0.5, g);
      box(0.13, 0.1, 0.3, skin, 0, 0, -0.1, g);
      for (let k = 0; k < 4; k++) box(0.025, 0.04, 0.2, skin, -0.045 + k * 0.03, 0, -0.35, g);
      g.position.set(side * 1.1, -0.5, -0.9);
      g.rotation.set(0.1, side * 0.5, side * 0.3);
      g.visible = false;
      this.camera.add(g);
      this.hands.push(g);
    });
  }

  // ---------- flujo ----------

  private say(text: string, hold = 0): Promise<void> {
    this.dlg.style.opacity = '1';
    return this.tw.say(text, true).then(() => (hold ? this.tweens.wait(hold) : undefined));
  }

  update(dt: number, t: number): void {
    // luces: parpadeo y atenuación global para el apagón
    this.lights.forEach(({ l, base, flicker }) => {
      const f = flicker > 0 ? 1 - 0.55 * Math.max(0, Math.sin(t * (7 + flicker * 5)) * Math.sin(t * 3.1 + flicker) - 0.55) * 2.2 : 1;
      l.intensity = base * this.glowK * f;
    });
    (this.neon.material as THREE.MeshBasicMaterial).opacity = this.glowK * (Math.sin(t * 23) * Math.sin(t * 5.3) > 0.78 ? 0.35 : 1);
    this.cob.setGaze(0, 0);
    this.cob.update(dt);
    this.cig.update(dt, t);
    if (this.cut) return;
    this.fps.update(dt);
    const z = this.fps.pos.z;
    if (z < FRONT_Z + 1.5 && this.goal.textContent === T.intro.goal) this.goal.textContent = T.intro.inside;
    if (z < -10 && !this.whispered) {
      this.whispered = true;
      sfx.whisper();
      this.run(async () => { await this.say(T.intro.hello, 1500); this.dlg.style.opacity = '0'; });
    }
    if (z < TRIGGER_Z) this.run(() => this.abduction());
  }

  /** Se apagan las luces, el Cobrador avanza a destellos y unas manos te agarran. */
  private async abduction(): Promise<void> {
    if (this.cut) return;
    this.cut = true;
    this.fps.setEnabled(false);
    this.cig.hide();
    this.goal.style.display = 'none';
    this.hint.style.display = 'none';
    const cam = this.camera;
    const p0 = cam.position.clone();
    const yaw = this.fps.yaw;
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    // apagón
    sfx.glitch();
    engine.shake(14, 400);
    await this.tweens.tween(350, (k) => { this.glowK = 1 - k * 0.97; });
    await this.tweens.wait(900);
    sfx.whisper();
    // el Cobrador aparece cada vez más cerca, a destellos
    this.cob.visible = true;
    this.cob.setMood('cobra', true);
    const red = new THREE.PointLight(0xc03a2a, 0, 12, 1.4);
    this.scene.add(red);
    for (const dist of [8, 5.5, 3.6, 2.2]) {
      const pos = p0.clone().addScaledVector(fwd, dist);
      this.cob.anchor(pos.x, 1.9, pos.z);
      red.position.set(pos.x, 3, pos.z + 1);
      this.cob.glitch();
      red.intensity = 22;
      sfx.glitch();
      await this.tweens.wait(160);
      red.intensity = 0;
      this.cob.visible = false;
      await this.tweens.wait(dist > 3 ? 420 : 300);
      this.cob.visible = true;
    }
    this.cob.visible = true;
    red.intensity = 16;
    await this.say(T.intro.late, 650);
    // las manos
    this.hands.forEach((h) => { h.visible = true; });
    sfx.thud();
    engine.shake(36, 900);
    await this.tweens.tween(380, (k) => {
      this.hands.forEach((h, i) => { const s = i === 0 ? -1 : 1; h.position.set(s * (1.1 - k * 0.95), -0.5 + k * 0.45, -0.9 + k * 0.25); h.rotation.set(0.1, s * (0.5 - k * 0.45), s * (0.3 - k * 0.3)); });
    }, ease.outQuad);
    sfx.scream();
    engine.flash('#7a1e1e', 0.6);
    // te arrastran hacia atrás
    await this.tweens.tween(750, (k) => {
      cam.position.set(p0.x - fwd.x * k * 2.4, EYE - k * 0.8, p0.z - fwd.z * k * 2.4);
      cam.rotation.set(this.fps.pitch + k * 0.7, yaw, k * 0.5);
    }, ease.inQuad);
    // negro
    const black = el('div', 'abs', '', this.ui);
    Object.assign(black.style, { inset: '0', background: '#000' });
    this.dlg.style.opacity = '0';
    sfx.ambience('none');
    const txt = el('div', 'center abs txt', '', this.ui);
    Object.assign(txt.style, { left: '0', right: '0', top: '340px', fontSize: '46px', color: '#ece0c0' });
    const tw = new Typewriter(txt, 22);
    await this.tweens.wait(900);
    for (const line of T.intro.abducted) { await tw.say(line, true); await this.tweens.wait(1500); }
    this.finish(false);
  }

  private finish(skipped: boolean): void {
    if (skipped) this.cut = true;
    session.dispatch({ type: 'flag', key: 'casino' });
    goPhase();
  }

  dispose(): void {
    this.detachKeys();
    this.cig?.dispose();
    this.fps?.unbind();
    this.tw?.stop();
    super.dispose();
  }
}

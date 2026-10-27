import * as THREE from 'three';
import * as cb from '../art/cobrador';
import type { Mood } from '../art/cobrador';
import { sfx } from '../audio/sfx';
import { session } from '../core/session';
import { tex, spriteMat } from './tex';

const N = 96;
const RE = { x: 62, y: 45 }; // ojo del monóculo (px de arte)
const mood3 = cb.MOODS;

/** Fábrica de texturas del Cobrador (una sola vez). */
function T(key: string, make: () => import('../art/painter').Painter): THREE.CanvasTexture {
  return tex(`cb:${key}`, make);
}

/**
 * El Cobrador en 3D: capas de pixel art en planos con distinta profundidad (paralaje), animadas
 * con el mismo tick de 150 ms que la versión 2D. La mirada sigue al puntero.
 */
export class Cobrador3D extends THREE.Group {
  mood: Mood = 'acecho';
  private s: number;
  private acc = 0;
  private tick = Math.floor(Math.random() * 40);
  private L: Record<string, THREE.Mesh> = {};
  private head = new THREE.Group();
  private pupil!: THREE.Mesh;
  private moths: THREE.Mesh[] = [];
  private glitchMesh!: THREE.Mesh;
  private glitchLeft = 0;
  private blinkAt = 0;
  private blinkStep = -1;
  private thirdUntil = 0;
  private jawStep = 0;
  private gaze = { x: 0, y: 0, tx: 0, ty: 0 };
  private shakeT = 0;
  private kick = new THREE.Vector3();
  private pulse = 0;
  private base = new THREE.Vector3();
  /** Sin cuerpo de arte: solo cabeza, sombrero y polillas (el cuerpo lo pone un modelo 3D). */
  bodyless = false;

  /** `unit`: tamaño en unidades 3D de un píxel de arte. */
  constructor(unit = 0.03) {
    super();
    this.s = unit;
    const geo = new THREE.PlaneGeometry(N * unit, N * unit);
    const add = (parent: THREE.Object3D, k: string, t: THREE.Texture, z: number, g: THREE.BufferGeometry = geo) => {
      const m = new THREE.Mesh(g, spriteMat(t));
      m.position.z = z;
      parent.add(m);
      this.L[k] = m;
      return m;
    };
    add(this, 'tend', T('tend0', () => cb.drawTendrils(0)), -0.16);
    add(this, 'body', T('body', cb.drawBody), 0);
    add(this, 'lhand', T('lhand0', () => cb.drawLeftHand(0)), 0.08);
    this.add(this.head);
    add(this.head, 'head', T('head', cb.drawHead), 0.14);
    add(this.head, 'sock', T('sock0', () => cb.drawSocketLight(0, false)), 0.15);
    add(this.head, 'eyew', T('eyew-acecho', () => cb.drawEyeWhite('acecho')), 0.16);
    const pg = new THREE.PlaneGeometry(12 * unit, 14 * unit);
    this.pupil = add(this.head, 'pupil', T('pupil-acecho', () => cb.drawPupil('acecho')), 0.17, pg);
    add(this.head, 'lid', T('lid0', () => cb.drawLid(0)), 0.18);
    add(this.head, 'brow', T('brow-acecho', () => cb.drawBrow('acecho')), 0.18);
    add(this.head, 'third', T('third0', () => cb.drawThird(0)), 0.18);
    add(this.head, 'mouth', T('mouth-acecho-0', () => cb.drawMouth('acecho', 0)), 0.19);
    add(this.head, 'glow', T('glow0', () => cb.drawGlow(0, false)), 0.2);
    add(this.head, 'ooze', T('ooze0', () => cb.drawOoze(0)), 0.21);
    add(this.head, 'halo', T('halo0', () => cb.drawHalo(0, false)), 0.2);
    add(this.head, 'glint', T('glint', cb.drawGlint), 0.22).visible = false;
    add(this, 'hat', T('hat0', () => cb.drawHat(0)), 0.3);
    add(this, 'rhand', T('rhand0', () => cb.drawRightHand(0)), 0.4);
    add(this, 'pend', T('pend0', () => cb.drawPendulum(0)), 0.44);
    add(this, 'chain', T('chain0', () => cb.drawChain(0)), 0.36);
    const mg = new THREE.PlaneGeometry(11 * unit * 1.2, 8 * unit * 1.2);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(mg, spriteMat(T('moth0', () => cb.drawMoth(0))));
      this.add(m);
      this.moths.push(m);
    }
    this.glitchMesh = new THREE.Mesh(geo, spriteMat(T('glitch-acecho', () => cb.drawGlitch('acecho', false))));
    this.glitchMesh.position.z = 0.6;
    this.glitchMesh.visible = false;
    this.add(this.glitchMesh);
    this.blinkAt = this.tick + 25 + Math.floor(Math.random() * 45);
    this.step();
  }

  /** Posición base a la que vuelve tras los golpes. */
  anchor(x: number, y: number, z: number): this {
    this.base.set(x, y, z);
    this.position.copy(this.base);
    return this;
  }

  setMood(m: Mood, silent = false): this {
    if (m === this.mood) return this;
    this.mood = m;
    this.set('eyew', `eyew-${m}`, () => cb.drawEyeWhite(m));
    this.set('pupil', `pupil-${m}`, () => cb.drawPupil(m));
    this.set('brow', `brow-${m}`, () => cb.drawBrow(m));
    this.jawStep = 0;
    if (m === 'cobra') { this.thirdUntil = this.tick + 9999; if (!silent) this.lunge(); } else if (this.thirdUntil > this.tick + 100) this.thirdUntil = 0;
    return this;
  }

  private set(layer: string, key: string, make: () => import('../art/painter').Painter): void {
    const m = this.L[layer];
    if (m) { (m.material as THREE.MeshBasicMaterial).map = T(key, make); (m.material as THREE.MeshBasicMaterial).needsUpdate = true; }
  }

  /** Tiñe todas las capas (El Deudor es el Cobrador apagado, azulado). */
  tint(color: number): this {
    this.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined; if (m && 'color' in m) m.color.set(color); });
    return this;
  }

  /** Se abalanza hacia la cámara un instante. */
  lunge(): void {
    if (session.options.reduceFlash) return;
    this.pulse = 1;
  }

  laugh(): void {
    if (session.options.reduceFlash) return;
    this.shakeT = 1.1;
  }

  flinch(dir = 1): void {
    this.glitch();
    this.kick.set(0.5 * dir, 0.15, 0);
  }

  glitch(): void {
    this.glitchLeft = 1;
    this.showGlitch(true);
  }

  /** Mirada: -1..1 en cada eje. */
  setGaze(x: number, y: number): void {
    this.gaze.tx = Math.max(-1, Math.min(1, x));
    this.gaze.ty = Math.max(-1, Math.min(1, y));
  }

  private showGlitch(on: boolean): void {
    const soft = session.options.reduceFlash;
    const m = this.glitchMesh.material as THREE.MeshBasicMaterial;
    m.map = T(`glitch${soft ? 'soft' : ''}-${this.mood}`, () => cb.drawGlitch(this.mood, soft));
    this.glitchMesh.visible = on;
    this.children.forEach((c) => { if (c !== this.glitchMesh && c !== this.head) c.visible = !on; });
    this.head.visible = !on;
    if (on && !soft) sfx.glitch();
  }

  update(dt: number): void {
    this.acc += dt;
    while (this.acc >= 0.15) { this.acc -= 0.15; this.step(); }
    const k = 1 - Math.pow(0.0005, dt);
    this.gaze.x += (this.gaze.tx - this.gaze.x) * k;
    this.gaze.y += (this.gaze.ty - this.gaze.y) * k;
    const px = Math.round(this.gaze.x * 3), py = Math.round(this.gaze.y * 3);
    this.pupil.position.x = (RE.x - 48 + px) * this.s;
    this.pupil.position.y = (48 - RE.y - py) * this.s;
    // golpes y saltos que se amortiguan
    this.kick.multiplyScalar(Math.pow(0.002, dt));
    this.pulse = Math.max(0, this.pulse - dt * 3.5);
    const sc = 1 + this.pulse * 0.1;
    this.scale.setScalar(sc);
    this.position.set(this.base.x + this.kick.x, this.base.y + this.kick.y, this.base.z + this.pulse * 0.8);
    if (this.bodyless && this.glitchLeft === 0) for (const k of ['body', 'tend', 'lhand', 'rhand', 'pend', 'chain']) { const m = this.L[k]; if (m) m.visible = false; }
  }

  private step(): void {
    this.tick++;
    const t = this.tick, red = this.mood === 'cobra', s = this.s;
    const f = (layer: string, key: string, make: () => import('../art/painter').Painter) => this.set(layer, key, make);
    const fr = (n: number, d: number) => Math.floor(t / d) % n;
    f('tend', `tend${fr(4, 2)}`, () => cb.drawTendrils(fr(4, 2)));
    f('hat', `hat${fr(2, 7)}`, () => cb.drawHat(fr(2, 7) as 0 | 1));
    f('rhand', `rhand${fr(4, 5)}`, () => cb.drawRightHand(fr(4, 5)));
    f('lhand', `lhand${fr(2, 9)}`, () => cb.drawLeftHand(fr(2, 9)));
    f('pend', `pend${fr(4, 3)}`, () => cb.drawPendulum(fr(4, 3)));
    f('chain', `chain${fr(3, 4)}`, () => cb.drawChain(fr(3, 4)));
    f('glow', `glow${red ? 'r' : ''}${fr(2, 3)}`, () => cb.drawGlow(fr(2, 3) as 0 | 1, red));
    f('halo', `halo${red ? 'r' : ''}${fr(2, 3)}`, () => cb.drawHalo(fr(2, 3) as 0 | 1, red));
    f('ooze', `ooze${fr(4, 3)}`, () => cb.drawOoze(fr(4, 3)));
    const sk = [0, 0, 1, 0, 2, 2][t % 6] as number;
    f('sock', `sock${red ? 'r' : ''}${sk}`, () => cb.drawSocketLight(sk, red));
    this.moths.forEach((m, i) => {
      const a = t * 0.19 + i * 2.1;
      m.position.set((Math.cos(a) * 40 + Math.sin(a * 2.3) * 6) * s, (6 - Math.sin(a * 1.3) * 26) * s, Math.cos(a) * 0.5 + 0.2);
      const mm = (t + i) % 2 as 0 | 1;
      (m.material as THREE.MeshBasicMaterial).map = T(`moth${mm}`, () => cb.drawMoth(mm));
    });
    const breath = Math.floor(t / 10) % 2, sway = Math.round(Math.sin(t * 0.13) * 1.2);
    const jit = this.shakeT > 0 ? Math.round(Math.random() * 2 - 1) : 0;
    this.shakeT = Math.max(0, this.shakeT - 0.15);
    this.head.position.set((sway + jit) * s, (breath + (this.shakeT > 0 ? Math.round(Math.random()) : 0)) * s, 0);
    this.L.hat!.position.x = (sway * 2 + jit) * s;
    this.L.hat!.position.y = breath * s;
    if (this.blinkStep >= 0) {
      const seq = [1, 2, 2, 1, 0];
      const v = seq[this.blinkStep] as number;
      f('lid', `lid${v}`, () => cb.drawLid(v));
      if (++this.blinkStep >= seq.length) { this.blinkStep = -1; this.blinkAt = t + 30 + Math.floor(Math.random() * 50); }
    } else if (t >= this.blinkAt && !red) this.blinkStep = 0;
    else if (red) f('lid', 'lid0', () => cb.drawLid(0));
    if (!red && t % 97 === 0) this.thirdUntil = t + 7;
    const open = red ? 2 : t < this.thirdUntil ? (this.thirdUntil - t > 2 ? 1 : 0) : 0;
    f('third', `third${open}`, () => cb.drawThird(open));
    if (red) {
      this.jawStep = Math.min(3, this.jawStep + 1);
      const j = this.jawStep === 3 && t % 2 ? 2 : this.jawStep;
      f('mouth', `mouth-cobra-${j}`, () => cb.drawMouth('cobra', j));
    } else {
      const j = fr(2, 6);
      f('mouth', `mouth-${this.mood}-${j}`, () => cb.drawMouth(this.mood, j));
    }
    this.L.glint!.visible = !red && t % 50 < 2 && this.glitchLeft === 0;
    if (this.glitchLeft > 0) {
      this.glitchLeft--;
      if (this.glitchLeft === 0) this.showGlitch(false);
    } else if (t % 43 === 0 || t % 61 === 0) {
      this.glitchLeft = 1;
      this.showGlitch(true);
    }
    void mood3;
  }
}

import * as THREE from 'three';
import { sfx } from '../audio/sfx';
import { Painter } from '../art/painter';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import fbxUrl from '../assets/Cigarette.fbx?inline';
import { box, glow, lam } from './models';
import { canvasTex } from './tex';
import { ease } from './tween';

type Phase = 'off' | 'raise' | 'light' | 'drag' | 'hold' | 'lower' | 'rest' | 'drop';
interface Pose { p: THREE.Vector3; r: THREE.Euler }
const pose = (x: number, y: number, z: number, rx: number, ry: number, rz: number): Pose => ({ p: new THREE.Vector3(x, y, z), r: new THREE.Euler(rx, ry, rz) });

const OFF = pose(0.3, -0.7, -0.5, -0.3, 0.2, 0.3);
const REST = pose(0.2, -0.1, -0.5, -0.15, 0.25, 0.2);
const MOUTH = pose(0.03, -0.15, -0.38, -0.7, 0.1, 0.05);
const LEN0 = 0.19;
const FILTER = 0;
const BURN = 0.027;
const MIN_LEN = 0.065;
const DUR: Record<Phase, number> = { off: 0, raise: 0.6, light: 0.9, drag: 1.2, hold: 0.4, lower: 0.65, rest: 0, drop: 0.7 };

interface Puff { s: THREE.Sprite; life: number; max: number; vel: THREE.Vector3; s0: number; s1: number; o0: number }

const extent = (pts: THREE.Vector3[]): number => {
  const b = new THREE.Box3().setFromPoints(pts);
  return b.getSize(new THREE.Vector3()).length();
};

/** Mano en primera persona con un cigarro que se consume, brasa que brilla al dar una calada y humo en el mundo. */
export class Cigarette extends THREE.Group {
  private phase: Phase = 'off';
  private pt = 0;
  private from = OFF;
  private to = OFF;
  private len = LEN0;
  private fresh = true;
  private hand = new THREE.Group();
  private cig = new THREE.Group();
  private body: THREE.Mesh | null = null;
  private cap: THREE.Mesh | null = null;
  private ember: THREE.Mesh;
  private flame: THREE.Mesh;
  private tipObj = new THREE.Object3D();
  private ember_light = new THREE.PointLight(0xff8a30, 0, 3, 1.6);
  private puffs: Puff[] = [];
  private tex: THREE.Texture;
  private exhaleT = 0;
  private wisp = 0;
  private finished = 0;
  /** Se llama al terminar cada cigarro entero (para que El Cobrador comente). */
  onFinished: (n: number) => void = () => undefined;

  constructor(private scene: THREE.Scene, private camera: THREE.Camera) {
    super();
    const skin = lam(0xc89a78, null, { emissive: 0x3a2014 });
    const dark = lam(0x1a1218, null, { emissive: 0x0a0608 });
    // mano: ejes locales, y a lo largo del cigarro
    box(0.075, 0.11, 0.05, skin, 0, -0.1, 0.03, this.hand); // palma
    const skin2 = lam(0xa87858, null, { emissive: 0x2a180e });
    box(0.02, 0.085, 0.022, skin, 0.016, 0.0, -0.012, this.hand); // índice
    box(0.02, 0.085, 0.022, skin, -0.004, 0.0, -0.012, this.hand); // corazón
    box(0.019, 0.05, 0.02, skin2, -0.024, -0.05, 0.0, this.hand).rotation.x = -0.5; // anular curvado
    box(0.017, 0.045, 0.018, skin2, -0.042, -0.05, 0.012, this.hand).rotation.x = -0.6; // meñique
    box(0.07, 0.012, 0.012, skin2, -0.004, -0.04, -0.02, this.hand); // nudillos
    box(0.022, 0.06, 0.022, skin, 0.0, -0.01, 0.03, this.hand).rotation.x = 0.4; // pulgar
    box(0.024, 0.02, 0.026, lam(0xc4a050), 0.016, -0.02, -0.012, this.hand); // anillo
    box(0.09, 0.09, 0.07, dark, 0, -0.21, 0.06, this.hand); // manga
    box(0.094, 0.018, 0.074, lam(0xc4b494), 0, -0.16, 0.06, this.hand); // puño
    // cigarro: el modelo se carga aparte (Cigarette.fbx); mientras tanto solo hay brasa
    this.ember = box(0.0145, 0.008, 0.0145, glow(0xff8a30), 0, 0, 0, this.cig);
    this.flame = box(0.012, 0.03, 0.012, glow(0xffd860), 0, 0, 0, this.cig);
    this.flame.visible = false;
    this.cig.add(this.tipObj, this.ember_light);
    this.cig.position.set(0.005, -0.015, -0.016);
    this.hand.add(this.cig);
    this.add(this.hand);
    this.setLen(LEN0);
    void this.loadModel();
    const p = new Painter(16, 16);
    [[7, 0.18], [5, 0.22], [3, 0.3]].forEach(([r, a]) => { p.ctx.fillStyle = `rgba(255,255,255,${a})`; p.ctx.beginPath(); p.ctx.arc(8, 8, r as number, 0, Math.PI * 2); p.ctx.fill(); });
    this.tex = canvasTex(p.canvas);
    this.apply(OFF);
    this.visible = false;
    camera.add(this);
  }

  /** Carga el FBX, lo orienta con la punta hacia +y y el extremo del filtro en el origen, y lo escala a LEN0. */
  private async loadModel(): Promise<void> {
    try {
      const bin = atob(fbxUrl.slice(fbxUrl.indexOf(',') + 1));
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const root = new FBXLoader().parse(buf.buffer, '');
      root.updateMatrixWorld(true);
      const meshes: THREE.Mesh[] = [];
      root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
      if (meshes.length === 0) return;
      const world = (m: THREE.Mesh): THREE.Vector3[] => {
        const a = m.geometry.attributes.position as THREE.BufferAttribute;
        return Array.from({ length: a.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld));
      };
      const sorted = meshes.map((m) => ({ m, pts: world(m) })).sort((x, y) => extent(y.pts) - extent(x.pts));
      const main = sorted[0], capSrc = sorted[1];
      if (!main) return;
      const cen = (pts: THREE.Vector3[]): THREE.Vector3 => pts.reduce((c, q) => c.add(q), new THREE.Vector3()).divideScalar(pts.length);
      const c1 = cen(main.pts);
      // eje principal por iteración de potencias sobre la covarianza
      const cov = new THREE.Matrix3();
      const e = cov.elements.map(() => 0);
      main.pts.forEach((q) => { const d = q.clone().sub(c1).toArray(); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e[c * 3 + r] = (e[c * 3 + r] ?? 0) + (d[r] ?? 0) * (d[c] ?? 0); });
      cov.fromArray(e);
      let axis = new THREE.Vector3(1, 0.3, 0.2).normalize();
      for (let k = 0; k < 60; k++) axis = axis.applyMatrix3(cov).normalize();
      if (capSrc && cen(capSrc.pts).sub(c1).dot(axis) < 0) axis.negate();
      let lo = Infinity, hi = -Infinity;
      main.pts.forEach((q) => { const t = q.clone().sub(c1).dot(axis); lo = Math.min(lo, t); hi = Math.max(hi, t); });
      const origin = c1.clone().addScaledVector(axis, lo);
      const sc = LEN0 / (hi - lo);
      const M = new THREE.Matrix4()
        .makeScale(sc, sc, sc)
        .multiply(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0))))
        .multiply(new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z));
      const build = (src: THREE.Mesh): THREE.Mesh => {
        const g = src.geometry.clone();
        g.applyMatrix4(src.matrixWorld);
        g.applyMatrix4(M);
        const old = (Array.isArray(src.material) ? src.material[0] : src.material) as THREE.MeshPhongMaterial;
        const mat = new THREE.MeshLambertMaterial({ map: old.map, color: old.color, emissive: 0x7a6a58, emissiveMap: old.map, transparent: old.transparent, opacity: old.opacity, side: THREE.DoubleSide });
        return new THREE.Mesh(g, mat);
      };
      this.body = build(main.m);
      this.cig.add(this.body);
      if (capSrc) { this.cap = build(capSrc.m); this.cig.add(this.cap); }
      this.setLen(this.len);
    } catch (err) {
      console.warn('Cigarette.fbx no se pudo cargar', err);
    }
  }

  get busy(): boolean { return this.phase !== 'off' && this.phase !== 'rest'; }

  private setLen(l: number): void {
    this.len = l;
    if (this.body) this.body.scale.y = l / LEN0;
    if (this.cap) this.cap.position.y = l - LEN0;
    this.ember.position.y = FILTER + l + 0.002;
    this.flame.position.y = FILTER + l + 0.02;
    this.tipObj.position.y = FILTER + l + 0.008;
    this.ember_light.position.y = FILTER + l + 0.02;
  }

  private apply(a: Pose, b?: Pose, k = 0): void {
    if (!b) { this.position.copy(a.p); this.rotation.copy(a.r); return; }
    this.position.lerpVectors(a.p, b.p, k);
    this.rotation.set(THREE.MathUtils.lerp(a.r.x, b.r.x, k), THREE.MathUtils.lerp(a.r.y, b.r.y, k), THREE.MathUtils.lerp(a.r.z, b.r.z, k));
  }

  private go(ph: Phase, to?: Pose): void {
    this.phase = ph;
    this.pt = 0;
    this.from = { p: this.position.clone(), r: this.rotation.clone() };
    if (to) this.to = to;
  }

  /** Pulsa E: saca y enciende un cigarro, o da otra calada. */
  press(): boolean {
    if (this.phase === 'off') {
      this.fresh = true;
      this.setLen(LEN0);
      this.visible = true;
      this.cig.visible = true;
      this.cig.position.set(0.005, -0.015, -0.016);
      this.go('raise', MOUTH);
      return true;
    }
    if (this.phase === 'rest') { this.fresh = false; this.go('raise', MOUTH); return true; }
    return false;
  }

  hide(): void { this.visible = false; this.phase = 'off'; }

  private emit(pos: THREE.Vector3, vel: THREE.Vector3, size0: number, size1: number, life: number, o0: number): void {
    let pf = this.puffs.find((q) => q.life <= 0);
    if (!pf) {
      if (this.puffs.length >= 70) return;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, color: 0xb4a898 }));
      s.visible = false;
      this.scene.add(s);
      pf = { s, life: 0, max: 1, vel: new THREE.Vector3(), s0: 0, s1: 0, o0: 0 };
      this.puffs.push(pf);
    }
    pf.s.position.copy(pos);
    pf.vel.copy(vel);
    pf.life = pf.max = life;
    pf.s0 = size0; pf.s1 = size1; pf.o0 = o0;
    pf.s.visible = true;
  }

  update(dt: number, t: number): void {
    // humo vivo
    for (const q of this.puffs) {
      if (q.life <= 0) continue;
      q.life -= dt;
      if (q.life <= 0) { q.s.visible = false; continue; }
      const k = 1 - q.life / q.max;
      q.vel.multiplyScalar(1 - dt * 0.9);
      q.s.position.addScaledVector(q.vel, dt);
      q.s.position.x += Math.sin(t * 1.7 + q.max * 9) * 0.05 * dt;
      q.s.position.y += 0.12 * dt;
      const sz = q.s0 + (q.s1 - q.s0) * k;
      q.s.scale.set(sz, sz, 1);
      (q.s.material as THREE.SpriteMaterial).opacity = q.o0 * (1 - k) * Math.min(1, k * 8);
    }
    if (!this.visible) return;
    this.pt += dt;
    const d = DUR[this.phase];
    const k = d > 0 ? Math.min(1, this.pt / d) : 1;
    let brightness = 0.15;
    switch (this.phase) {
      case 'raise':
        this.apply(this.from, this.to, ease.inOutCubic(k));
        if (k >= 1) { if (this.fresh) { this.go('light'); sfx.lighter(); } else { this.go('drag'); sfx.drag(); } }
        break;
      case 'light':
        this.apply(MOUTH);
        this.flame.visible = true;
        this.flame.scale.set(1, 0.8 + Math.sin(t * 40) * 0.25, 1);
        brightness = 0.7 * k;
        this.ember_light.intensity = 1.5 + Math.sin(t * 50) * 0.6;
        if (k >= 1) { this.flame.visible = false; this.go('drag'); sfx.drag(); }
        break;
      case 'drag': {
        this.apply(MOUTH);
        const w = Math.sin(Math.min(1, k) * Math.PI);
        brightness = 0.3 + w * 0.7;
        this.ember_light.intensity = 0.4 + w * 3.2;
        if (k >= 1) { this.setLen(Math.max(0.03, this.len - BURN)); this.go('hold'); }
        break;
      }
      case 'hold':
        this.apply(MOUTH);
        brightness = 0.4 * (1 - k) + 0.15;
        this.ember_light.intensity = 0.6 * (1 - k);
        if (k >= 1) { this.go('lower', REST); this.exhaleT = 1.9; sfx.exhale(); }
        break;
      case 'lower':
        this.apply(this.from, this.to, ease.inOutCubic(k));
        if (k >= 1) {
          if (this.len <= MIN_LEN) { this.finished++; this.go('drop'); this.onFinished(this.finished); } else this.go('rest');
        }
        break;
      case 'drop':
        this.apply(REST);
        this.cig.position.y -= dt * 0.5;
        this.cig.position.z += dt * 0.15;
        this.cig.rotation.x += dt * 4;
        if (k >= 1) { this.cig.visible = false; this.go('off', OFF); this.visible = false; this.cig.rotation.set(0, 0, 0); }
        break;
      case 'rest': {
        const sway = Math.sin(t * 1.1) * 0.006;
        this.position.set(REST.p.x + sway, REST.p.y + Math.sin(t * 0.9) * 0.004, REST.p.z);
        this.rotation.copy(REST.r);
        brightness = 0.18 + Math.sin(t * 2.3) * 0.05;
        this.ember_light.intensity = 0.25;
        break;
      }
      default: break;
    }
    (this.ember.material as THREE.MeshBasicMaterial).color.setRGB(0.75 + brightness * 0.25, 0.22 + brightness * 0.45, 0.06 + brightness * 0.1);
    if (this.phase !== 'drag' && this.phase !== 'light' && this.phase !== 'hold') this.ember_light.intensity = Math.min(this.ember_light.intensity, 0.3);

    // humo del cigarro: hilo continuo desde la brasa
    this.camera.updateMatrixWorld(true);
    this.updateMatrixWorld(true);
    const tip = new THREE.Vector3();
    this.tipObj.getWorldPosition(tip);
    this.wisp -= dt;
    if (this.wisp <= 0 && this.cig.visible && this.phase !== 'drop') {
      this.wisp = this.phase === 'rest' ? 0.16 : 0.1;
      this.emit(tip, new THREE.Vector3((Math.random() - 0.5) * 0.04, 0.16, (Math.random() - 0.5) * 0.04), 0.03, 0.16, 2.6, 0.22);
    }
    // exhalación: nube delante de la cara
    if (this.exhaleT > 0) {
      this.exhaleT -= dt;
      const fw = new THREE.Vector3(), up = new THREE.Vector3();
      this.camera.getWorldDirection(fw);
      up.set(0, 1, 0);
      for (let i = 0; i < 1; i++) {
        const o = this.camera.position.clone().addScaledVector(fw, 0.55).addScaledVector(up, -0.12);
        o.x += (Math.random() - 0.5) * 0.06; o.y += (Math.random() - 0.5) * 0.04;
        this.emit(o, fw.clone().multiplyScalar(0.55 + Math.random() * 0.3).add(new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.12, (Math.random() - 0.5) * 0.25)), 0.05, 0.32, 2.2, 0.16);
      }
    }
  }

  dispose(): void {
    this.puffs.forEach((q) => { this.scene.remove(q.s); (q.s.material as THREE.Material).dispose(); });
    this.puffs = [];
    this.camera.remove(this);
  }
}

import * as THREE from 'three';
import type { Mood } from '../art/cobrador';
import { Cobrador3D } from './cobrador3d';
import type { Solid } from './fps';
import { box, cyl, glow, lam } from './models';

const RADIUS = 0.4;
const HEAD_Y = 2.2;

interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }

/**
 * El Cobrador con cuerpo 3D y piernas: levita, pantalones, zapatos y manos de hueso que se balancean al andar,
 * con la cabeza-moneda de pixel art (siempre de cara a ti) sobre los hombros. Camina cuando tú caminas.
 */
export class CobradorWalker extends THREE.Group {
  private head: Cobrador3D;
  private rig = new THREE.Group();
  private legs: THREE.Group[] = [];
  private arms: THREE.Group[] = [];
  private phase = 0;
  private amp = 0;
  private facing = 0;
  private side = 1;

  constructor(private solids: Solid[], private bounds: Bounds) {
    super();
    const coat = lam(0x34243e, null, { emissive: 0x241830 });
    const trousers = lam(0x2c2434, null, { emissive: 0x1e1828 });
    const bone = lam(0xcfc6a8, null, { emissive: 0x3a3626 });
    const rig = this.rig;
    this.add(rig);
    // pelvis y piernas con pivote en la cadera
    box(0.5, 0.24, 0.3, trousers, 0, 1.05, 0, rig);
    ([-1, 1] as const).forEach((s) => {
      const leg = new THREE.Group();
      leg.position.set(s * 0.14, 1.05, 0);
      cyl(0.095, 0.075, 1.0, trousers, 0, -0.5, 0, leg, 8);
      box(0.2, 0.12, 0.4, lam(0x6a5240, null, { emissive: 0x2a2018 }), 0, -1.02, 0.07, leg); // zapato
      rig.add(leg);
      this.legs.push(leg);
    });
    // torso, faldones, corbatín, reloj de bolsillo
    box(0.64, 0.86, 0.34, coat, 0, 1.56, 0, rig);
    box(0.5, 0.55, 0.12, coat, 0, 1.0, -0.2, rig).rotation.x = 0.12;
    box(0.16, 0.1, 0.04, lam(0xc24a3a, null, { emissive: 0x3a1410 }), 0, 1.92, 0.19, rig);
    box(0.05, 0.05, 0.02, glow(0xc4a050), 0.16, 1.45, 0.18, rig);
    // brazos con manos largas de hueso
    ([-1, 1] as const).forEach((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.4, 1.88, 0);
      cyl(0.065, 0.055, 0.85, coat, 0, -0.43, 0, arm, 6);
      box(0.11, 0.34, 0.06, bone, 0, -1.0, 0, arm);
      for (let i = -1; i <= 1; i++) box(0.022, 0.2, 0.03, bone, i * 0.036, -1.26, 0, arm);
      rig.add(arm);
      this.arms.push(arm);
    });
    // cabeza de pixel art, sin el cuerpo dibujado
    this.head = new Cobrador3D(0.02);
    this.head.bodyless = true;
    this.head.anchor(0, HEAD_Y, 0.1);
    this.add(this.head);
  }

  setMood(m: Mood, silent = false): this { this.head.setMood(m, silent); return this; }
  setGaze(x: number, y: number): void { this.head.setGaze(x, y); }
  get mood(): Mood { return this.head.mood; }

  private blocked(x: number, z: number): boolean {
    const b = this.bounds;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return true;
    return this.solids.some((s) => Math.abs(x - s.x) < s.hx + RADIUS && Math.abs(z - s.z) < s.hz + RADIUS);
  }

  /** Avanza hacia (mx, mz); si hay un obstáculo prueba a rodearlo girando a un lado y otro. Devuelve el ángulo que siguió. */
  private steer(mx: number, mz: number, len: number): number {
    const base = Math.atan2(mx, mz);
    const inside = this.blocked(this.position.x, this.position.z); // arranca tras el mostrador: se le deja salir
    for (const k of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) {
      const a = base + k * this.side;
      const x = this.position.x + Math.sin(a) * len, z = this.position.z + Math.cos(a) * len;
      if (inside || !this.blocked(x, z)) {
        this.position.x = x; this.position.z = z;
        if (k < 0) this.side = -this.side; // sigue rodeando por el lado que funcionó
        return a;
      }
    }
    return base;
  }

  /**
   * Un paso: solo anda cuando el jugador anda. En el pasillo se acerca sin pasar de ~3 m y retrocede si le
   * pisas; si estás en una sala lateral, espera en su puerta.
   */
  step(dt: number, player: THREE.Vector3, playerSpeed: number, doorTarget: { x: number; z: number } | null): void {
    const p = this.position;
    const dxp = player.x - p.x, dzp = player.z - p.z, dp = Math.hypot(dxp, dzp);
    let mx = 0, mz = 0, speed = 0;
    if (playerSpeed > 0.4) {
      let tx = player.x, tz = player.z, stop = 3.2;
      if (doorTarget) { tx = doorTarget.x; tz = doorTarget.z; stop = 0.35; }
      else if (p.z < -6.5 && Math.abs(p.x) < 2.9) { tx = (player.x < 0 ? -1 : 1) * 3.4; tz = -7.5; stop = 0.3; } // sale de detrás del mostrador
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (!doorTarget && dp < 2.0) { mx = -dxp / (dp || 1); mz = -dzp / (dp || 1); speed = 1.6; }
      else if (d > stop) { mx = dx / d; mz = dz / d; speed = 1.5; }
    }
    if (speed > 0) {
      const a = this.steer(mx, mz, speed * dt);
      this.facing = turn(this.facing, a, dt * 6);
    } else {
      this.facing = turn(this.facing, Math.atan2(dxp, dzp), dt * 1.5);
    }
    // balanceo de piernas y brazos proporcional a lo que anda
    this.amp += ((speed > 0 ? 1 : 0) - this.amp) * Math.min(1, dt * 6);
    this.phase += dt * 6.5 * this.amp;
    const sw = Math.sin(this.phase) * 0.65 * this.amp;
    this.legs[0]!.rotation.x = sw; this.legs[1]!.rotation.x = -sw;
    this.arms[0]!.rotation.x = -sw * 0.8; this.arms[1]!.rotation.x = sw * 0.8;
    this.rig.position.y = Math.abs(Math.sin(this.phase)) * 0.05 * this.amp;
    this.rig.rotation.y = this.facing;
    // la cabeza siempre mira a la cámara (los planos de arte no pueden verse de canto)
    this.head.rotation.y = Math.atan2(dxp, dzp);
    this.head.update(dt);
  }
}

/** Gira `a` hacia `b` por el camino corto. */
function turn(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, k);
}

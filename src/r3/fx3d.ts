import * as THREE from 'three';

interface P { m: THREE.Mesh; v: THREE.Vector3; life: number; max: number; g: number; spin: number; bounce: number; floor: number; grow: number }

/** Partículas 3D de bajo coste: monedas, chispas, humo y confeti. */
export class Fx3D {
  private ps: P[] = [];
  private geoCoin = new THREE.CylinderGeometry(0.09, 0.09, 0.025, 10);
  private geoBox = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  private geoConf = new THREE.BoxGeometry(0.08, 0.02, 0.05);

  constructor(private scene: THREE.Scene) {}

  private add(m: THREE.Mesh, at: THREE.Vector3, v: THREE.Vector3, life: number, o: Partial<P> = {}): void {
    m.position.copy(at);
    this.scene.add(m);
    this.ps.push({ m, v, life, max: life, g: 0, spin: 0, bounce: 0, floor: -99, grow: 0, ...o });
  }

  coins(at: THREE.Vector3, n = 24, floor = 0.05): void {
    const mat = new THREE.MeshBasicMaterial({ color: 0xc4b494 });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geoCoin, mat);
      m.rotation.set(Math.random() * 3, 0, Math.random() * 3);
      this.add(m, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.4)), new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.2) * 3), 2 + Math.random() * 1.5, { g: -9, spin: 8 + Math.random() * 8, bounce: 0.45, floor });
    }
  }

  sparks(at: THREE.Vector3, n = 12, color = 0xece0c0, speed = 3): void {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      this.add(new THREE.Mesh(this.geoBox, mat), at.clone(), v, 0.4 + Math.random() * 0.5, { g: -6 });
    }
  }

  smoke(at: THREE.Vector3, n = 6, up = 0.8): void {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geoBox, new THREE.MeshBasicMaterial({ color: 0x5a5268, transparent: true, opacity: 0.7 }));
      this.add(m, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15)), new THREE.Vector3((Math.random() - 0.5) * 0.3, up * (0.5 + Math.random() * 0.5), (Math.random() - 0.5) * 0.3), 1.2 + Math.random(), { grow: 0.8 });
    }
  }

  confetti(at: THREE.Vector3, n = 40): void {
    const cols = [0x9c3c28, 0xece0c0, 0x76895a, 0xc4b494, 0x7a2a20];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geoConf, new THREE.MeshBasicMaterial({ color: cols[i % cols.length] as number }));
      this.add(m, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)), new THREE.Vector3((Math.random() - 0.5) * 3, 3 + Math.random() * 3, (Math.random() - 0.5) * 3), 1.6 + Math.random() * 1.4, { g: -7, spin: 6 });
    }
  }

  update(dt: number): void {
    this.ps = this.ps.filter((p) => {
      p.life -= dt;
      p.v.y += p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.floor > -90 && p.m.position.y < p.floor && p.v.y < 0) { p.m.position.y = p.floor; p.v.y *= -p.bounce; p.v.x *= 0.7; p.v.z *= 0.7; if (p.bounce === 0) p.v.set(0, 0, 0); }
      if (p.spin) { p.m.rotation.x += p.spin * dt; p.m.rotation.z += p.spin * 0.6 * dt; }
      if (p.grow) p.m.scale.multiplyScalar(1 + p.grow * dt);
      const mat = p.m.material as THREE.MeshBasicMaterial;
      if (mat.transparent) mat.opacity = Math.max(0, (p.life / p.max)) * 0.7;
      if (p.life <= 0) { p.m.removeFromParent(); if (mat.transparent) mat.dispose(); return false; }
      return true;
    });
  }
}

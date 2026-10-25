import * as THREE from 'three';

export interface Solid { x: number; z: number; hx: number; hz: number }
export interface FpsBounds { minX: number; maxX: number; minZ: number; maxZ: number }

const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

/** Primera persona: WASD/flechas (las flechas izq./der. giran), ratón capturado con un clic o arrastrando, colisiones con cajas. */
export class FpsControls {
  readonly pos: THREE.Vector3;
  yaw = 0;
  pitch = 0;
  walked = 0;
  /** Con la interfaz modal abierta se apaga el movimiento. */
  enabled = true;
  readonly solids: Solid[] = [];
  private keys = new Set<string>();
  private cleanup: Array<() => void> = [];

  constructor(
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLCanvasElement,
    public bounds: FpsBounds,
    private o: { eye: number; radius: number; speed: number } = { eye: 1.65, radius: 0.35, speed: 3.3 }
  ) {
    this.pos = new THREE.Vector3(0, o.eye, 0);
    camera.rotation.order = 'YXZ';
  }

  private on<K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, target: EventTarget = window): void {
    target.addEventListener(type, fn as EventListener);
    this.cleanup.push(() => target.removeEventListener(type, fn as EventListener));
  }

  bind(): void {
    const look = (dx: number, dy: number): void => {
      this.yaw -= dx * 0.0035;
      this.pitch = Math.max(-0.7, Math.min(0.7, this.pitch - dy * 0.0035));
    };
    this.on('pointermove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === this.canvas) look(e.movementX, e.movementY);
      else if ((e.buttons & 1) && e.target === this.canvas) look(e.movementX, e.movementY);
    });
    // un clic en la escena captura el ratón (Esc lo suelta); si el navegador no lo permite, se mira arrastrando
    this.on('pointerdown', () => {
      if (!this.enabled || document.pointerLockElement === this.canvas) return;
      try { void (this.canvas.requestPointerLock() as Promise<void> | undefined)?.catch(() => undefined); } catch { /* sin bloqueo de puntero */ }
    }, this.canvas);
    this.on('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (this.enabled && MOVE_KEYS.includes(k)) { this.keys.add(k); e.preventDefault(); }
    });
    this.on('keyup', (e) => { this.keys.delete(e.key.toLowerCase()); });
    this.on('blur', () => this.keys.clear());
  }

  unbind(): void {
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) { this.keys.clear(); if (document.pointerLockElement) document.exitPointerLock(); }
  }

  /** Coloca la cámara donde estamos (sin andar). */
  apply(): void {
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /** Anda según las teclas, resuelve colisiones y deja la cámara con un ligero balanceo al caminar. */
  update(dt: number): void {
    if (this.enabled) this.walk(dt);
    this.pos.y = this.o.eye + Math.sin(this.walked * 5) * 0.035;
    this.apply();
  }

  private walk(dt: number): void {
    const k = this.keys;
    this.yaw += ((k.has('arrowleft') ? 1 : 0) - (k.has('arrowright') ? 1 : 0)) * 1.9 * dt;
    const fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const str = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
    if (!fwd && !str) return;
    const sp = (this.o.speed * dt) / Math.hypot(fwd, str);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = (-sin * fwd + cos * str) * sp;
    const dz = (-cos * fwd - sin * str) * sp;
    this.tryMove(dx, 0);
    this.tryMove(0, dz);
    this.walked += Math.hypot(dx, dz);
  }

  private tryMove(dx: number, dz: number): void {
    const r = this.o.radius, b = this.bounds;
    const x = Math.max(b.minX + r, Math.min(b.maxX - r, this.pos.x + dx));
    const z = Math.max(b.minZ + r, Math.min(b.maxZ - r, this.pos.z + dz));
    const hit = this.solids.some((s) => Math.abs(x - s.x) < s.hx + r && Math.abs(z - s.z) < s.hz + r);
    if (!hit) { this.pos.x = x; this.pos.z = z; }
  }
}

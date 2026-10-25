import * as THREE from 'three';
import { session } from '../core/session';
import { POST_FRAG, POST_VERT, PALETTE_F } from './palette';
import { type Stage } from './stage';

// Los colores del arte se usan tal cual (sin conversión de espacio de color): la paleta final manda.
THREE.ColorManagement.enabled = false;

export const W = 1280;
export const H = 800;
const RW = 640, RH = 400; // resolución interna: cada píxel de baja resolución son 2×2 de pantalla

export interface Clickable { obj: THREE.Object3D; onClick: () => void; enabled?: () => boolean; hover?: (on: boolean) => void }

/** Motor 3D: renderiza en baja resolución, cuantiza a la paleta con tramado y gestiona pantallas, luz y transiciones. */
class Engine {
  renderer!: THREE.WebGLRenderer;
  private rt!: THREE.WebGLRenderTarget;
  private postScene = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat!: THREE.ShaderMaterial;
  stage: Stage | null = null;
  pointer = { x: W / 2, y: H / 2, moved: false };
  private last = 0;
  private time = 0;
  private busy = false;
  private wipeV = 1.25;
  private light = { x: W / 2, y: H * 0.45, r: 1150, d: 0.62, tx: W / 2, ty: H * 0.45, tr: 1150, td: 0.62 };
  private shakeAmp = 0;
  private shakeT = 0;
  private flashV = 0;
  private flashCol = new THREE.Color(1, 1, 1);
  private ray = new THREE.Raycaster();
  private hovered: Clickable | null = null;
  canvas!: HTMLCanvasElement;
  ready = false;

  mount(parent: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.canvas.className = 'gl';
    parent.prepend(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.rt = new THREE.WebGLRenderTarget(RW, RH, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, colorSpace: THREE.LinearSRGBColorSpace });
    this.mat = new THREE.ShaderMaterial({
      vertexShader: POST_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tDiffuse: { value: this.rt.texture }, uRes: { value: new THREE.Vector2(W, H) }, uRT: { value: new THREE.Vector2(RW, RH) },
        uTime: { value: 0 }, uLight: { value: new THREE.Vector2(W / 2, H / 2) }, uRadius: { value: 1150 }, uDark: { value: 0.62 },
        uDither: { value: 0.13 }, uWipe: { value: 1.25 }, uFlash: { value: 0 }, uFlashCol: { value: this.flashCol }, uSoft: { value: 0 },
        uPal: { value: Array.from({ length: 16 }, (_, i) => new THREE.Vector3(PALETTE_F[i * 3], PALETTE_F[i * 3 + 1], PALETTE_F[i * 3 + 2])) }
      }
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
    const toGame = (e: PointerEvent | MouseEvent) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * W;
      this.pointer.y = ((e.clientY - r.top) / r.height) * H;
      this.pointer.moved = true;
    };
    this.canvas.addEventListener('pointermove', toGame);
    window.addEventListener('pointermove', toGame);
    this.canvas.addEventListener('pointerdown', (e) => { toGame(e); this.click(); });
    this.ready = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Mueve el foco de luz (con suavizado) y fija la oscuridad fuera de él. */
  setLight(x: number, y: number, radius = 1150, dark = 0.62): void {
    this.light.tx = x; this.light.ty = y; this.light.tr = radius; this.light.td = dark;
  }

  shake(amp: number, ms: number): void {
    if (session.options.reduceFlash) return;
    this.shakeAmp = amp; this.shakeT = ms / 1000;
  }

  flash(color: string, strength = 0.7): void {
    this.flashCol.set(color);
    this.flashV = session.options.reduceFlash ? Math.min(0.25, strength * 0.3) : strength;
  }

  private wipeTo(target: number, ms = 560): Promise<void> {
    const from = this.wipeV;
    return new Promise((res) => {
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        this.wipeV = from + (target - from) * k;
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  }

  /** Cambia de pantalla con la transición por bloques. */
  async go(make: () => Stage): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    if (this.stage) await this.wipeTo(1.25);
    this.hovered = null;
    this.stage?.dispose();
    const s = make();
    this.stage = s;
    document.getElementById('ui')?.appendChild(s.ui);
    await s.init();
    await this.wipeTo(0);
    this.busy = false;
  }

  private cast(): Clickable | null {
    const s = this.stage;
    if (!s || !s.clickables.length) return null;
    this.ray.setFromCamera(new THREE.Vector2((this.pointer.x / W) * 2 - 1, -(this.pointer.y / H) * 2 + 1), s.camera);
    const objs = s.clickables.filter((c) => !c.enabled || c.enabled()).map((c) => c.obj);
    const hits = this.ray.intersectObjects(objs, true);
    if (!hits.length) return null;
    const first = hits[0]!.object;
    return s.clickables.find((c) => { let o: THREE.Object3D | null = first; while (o) { if (o === c.obj) return true; o = o.parent; } return false; }) ?? null;
  }

  private click(): void {
    if (this.busy) return;
    this.cast()?.onClick();
  }

  private frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const s = this.stage;
    if (s) {
      s.tweens.update(dt);
      s.update(dt, this.time);
      if (this.pointer.moved && !this.busy) {
        this.pointer.moved = false;
        const h = this.cast();
        if (h !== this.hovered) { this.hovered?.hover?.(false); h?.hover?.(true); this.hovered = h; this.canvas.style.cursor = h ? 'pointer' : 'default'; }
      }
      const L = this.light, k = 1 - Math.pow(0.002, dt);
      L.x += (L.tx - L.x) * k; L.y += (L.ty - L.y) * k; L.r += (L.tr - L.r) * k; L.d += (L.td - L.d) * k;
      let sx = 0, sy = 0;
      if (this.shakeT > 0) { this.shakeT -= dt; const a = this.shakeAmp * Math.min(1, this.shakeT * 4); sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; }
      s.camera.position.x += sx; s.camera.position.y += sy;
      this.renderer.setRenderTarget(this.rt);
      this.renderer.render(s.scene, s.camera);
      s.camera.position.x -= sx; s.camera.position.y -= sy;
    }
    this.flashV = Math.max(0, this.flashV - dt * 2.6);
    const u = this.mat.uniforms as Record<string, THREE.IUniform>;
    u.uTime!.value = this.time;
    (u.uLight!.value as THREE.Vector2).set(this.light.x, this.light.y);
    u.uRadius!.value = this.light.r; u.uDark!.value = this.light.d;
    u.uDither!.value = session.options.reduceFlash ? 0.08 : 0.13;
    u.uWipe!.value = this.wipeV; u.uFlash!.value = this.flashV; u.uSoft!.value = session.options.reduceFlash ? 1 : 0;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCam);
    requestAnimationFrame((t) => this.frame(t));
  }
}

export const engine = new Engine();

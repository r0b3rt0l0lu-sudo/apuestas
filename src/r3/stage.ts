import * as THREE from 'three';
import { engine, type Clickable } from './engine';
import { Tweens, run } from './tween';

/** Una pantalla del juego: escena 3D + capa de interfaz en HTML. */
export abstract class Stage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1280 / 800, 0.1, 120);
  readonly ui = document.createElement('div');
  readonly tweens = new Tweens();
  readonly clickables: Clickable[] = [];
  disposed = false;
  /** Nombre estable de la pantalla (útil para depurar; los nombres de clase se minifican). */
  abstract readonly kind: string;

  constructor() {
    this.ui.className = 'stage-ui';
  }

  /** Construye la escena y la interfaz. */
  abstract init(): void | Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_dt: number, _t: number): void { /* por defecto nada */ }

  /** Lanza un flujo asíncrono que se cancela solo al salir de la pantalla. */
  protected run(fn: () => Promise<void>): void {
    run(fn);
  }

  protected click(obj: THREE.Object3D, onClick: () => void, extra: Partial<Clickable> = {}): void {
    this.clickables.push({ obj, onClick, ...extra });
  }

  /** Fija la luz de esta pantalla: centro del foco, radio y oscuridad exterior. */
  protected light(x: number, y: number, radius = 1150, dark = 0.62): void {
    engine.setLight(x, y, radius, dark);
  }

  dispose(): void {
    this.disposed = true;
    this.tweens.dispose();
    this.ui.remove();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}

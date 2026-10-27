import * as THREE from 'three';
import { drawDawnSky } from '../../art/scenery';
import { sfx } from '../../audio/sfx';
import { LAST_NIGHT, quotaFor } from '../../core/nights';
import { session } from '../../core/session';
import { quotaOf } from '../../core/state';
import { T, fmt } from '../../i18n/es';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { Fx3D } from '../fx3d';
import { ferris, ground, mesh } from '../models';
import { goPhase } from '../router';
import { Stage } from '../stage';
import { canvasTex } from '../tex';
import { ease } from '../tween';

/** Escenario del amanecer: cielo con sol que sube, noria en sombra y colinas negras. */
export function dawnWorld(stage: Stage, rise = true): { fer: ReturnType<typeof ferris>; sun: THREE.Mesh } {
  const sc = stage.scene;
  sc.background = new THREE.Color(0);
  const d = drawDawnSky();
  const sky = mesh(new THREE.PlaneGeometry(64, 40), new THREE.MeshBasicMaterial({ map: canvasTex(d.bg.canvas), fog: false }), 0, 12, -30, sc);
  sky.castShadow = false;
  const sun = mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: canvasTex(d.sun.canvas), transparent: true, fog: false }), 0, rise ? -2 : 4, -29, sc);
  sun.castShadow = false;
  const g = ground(80, 60, 20, 16);
  g.position.z = -4;
  (g.material as THREE.MeshLambertMaterial).color.set(0x2a1a2a);
  sc.add(g);
  const fer = ferris(6);
  fer.group.position.set(9, 0, -16);
  fer.group.traverse((o) => { const m = o as THREE.Mesh; if (m.material) (m.material as THREE.MeshLambertMaterial).color?.set(0x0c0610); });
  sc.add(fer.group);
  sc.add(new THREE.AmbientLight(0xc08060, 1.6));
  const sl = new THREE.DirectionalLight(0xffc080, 1.4);
  sl.position.set(0, 4, -10);
  sc.add(sl);
  if (rise) stage.tweens.tween(6000, (k) => { sun.position.y = -2 + k * 6.5; }, ease.outQuad).catch(() => undefined);
  return { fer, sun };
}

export class Dawn3D extends Stage {
  readonly kind = 'dawn';
  private cob!: Cobrador3D;
  private fer!: ReturnType<typeof ferris>;
  private fx!: Fx3D;
  private detach: () => void = () => undefined;

  init(): void {
    const r = session.run;
    if (r.phase !== 'dawn') { goPhase(); return; }
    this.light(640, 420, 1700, 0.92);
    sfx.ambience('hub');
    this.fer = dawnWorld(this, true).fer;
    this.fx = new Fx3D(this.scene);
    this.cob = new Cobrador3D(0.034).anchor(-3.6, 1.7, -1).setMood('sonrisa');
    this.scene.add(this.cob);
    this.camera.position.set(0, 1.8, 7.5);
    this.camera.lookAt(0, 2.2, -10);
    this.tweens.wait(900).then(() => this.fx.confetti(new THREE.Vector3(0, 4, 0), 30)).catch(() => undefined);

    const q = quotaOf(r);
    const title = el('div', 'title center abs', T.dawn.title, this.ui);
    Object.assign(title.style, { left: '0', right: '0', top: '52px', fontSize: '68px', color: '#ece0c0' });
    const pan = el('div', 'abs frame panel center', '', this.ui);
    Object.assign(pan.style, { left: '340px', top: '170px', width: '600px', fontSize: '38px', color: '#ece0c0', padding: '4px 12px 10px', lineHeight: '1.1' });
    el('div', '', r.forgiven ? T.dawn.forgiven : T.dawn.paid(q), pan);
    el('div', '', T.dawn.left(r.forgiven ? r.balance : r.balance - q), pan);
    const next = r.night >= LAST_NIGHT ? T.dawn.lastNext : T.dawn.next(fmt(quotaFor(r.night + 1, r.difficulty)));
    const bub = el('div', 'abs frame dialog center', next, this.ui);
    Object.assign(bub.style, { left: '560px', top: '372px', width: '640px', fontSize: '38px', color: '#fff6dc', padding: '4px 12px 10px' });
    const row = el('div', 'abs hit', '', this.ui);
    Object.assign(row.style, { left: '560px', top: '600px', width: '640px' });
    btn(row, T.dawn.go, () => this.go(), { cls: 'big', style: { width: '100%' } });
    this.detach = attachNav(this.ui);
  }

  private go(): void {
    session.dispatch({ type: 'nextNight' });
    goPhase();
  }

  update(dt: number, t: number): void {
    this.fer.update(dt);
    this.fx.update(dt);
    this.cob.setGaze((engine.pointer.x - 300) / 400, (engine.pointer.y - 400) / 300);
    this.cob.update(dt);
    this.camera.position.set(Math.sin(t * 0.2) * 0.2, 1.8 + Math.sin(t * 0.5) * 0.03, 7.5);
    this.camera.lookAt(0, 2.2, -10);
  }

  dispose(): void { this.detach(); super.dispose(); }
}

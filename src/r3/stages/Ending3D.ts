import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { session } from '../../core/session';
import { T } from '../../i18n/es';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { Fx3D } from '../fx3d';
import { goHub, goPhase } from '../router';
import { Stage } from '../stage';
import { dawnWorld } from './Dawn3D';

/** Final: amanece de verdad y la feria queda atrás. */
export class Ending3D extends Stage {
  readonly kind = 'ending';
  private cob!: Cobrador3D;
  private fer!: ReturnType<typeof dawnWorld>['fer'];
  private fx!: Fx3D;
  private detach: () => void = () => undefined;
  private acc = 0;

  init(): void {
    if (session.run.phase !== 'ending') { goPhase(); return; }
    this.light(640, 420, 1700, 0.95);
    sfx.ambience('none');
    this.fer = dawnWorld(this, true).fer;
    this.fx = new Fx3D(this.scene);
    this.cob = new Cobrador3D(0.03).anchor(0, 1.6, -2).setMood('acecho');
    this.scene.add(this.cob);
    this.camera.position.set(0, 1.8, 7.5);
    this.camera.lookAt(0, 2.2, -10);
    const t = el('div', 'title center abs', T.ending.title, this.ui);
    Object.assign(t.style, { left: '0', right: '0', top: '40px', fontSize: '84px', color: '#ece0c0' });
    const pan = el('div', 'abs frame panel center', '', this.ui);
    Object.assign(pan.style, { left: '260px', top: '170px', width: '760px', fontSize: '36px', color: '#ece0c0', padding: '6px 14px 12px', lineHeight: '1.15' });
    T.ending.lines.forEach((l) => { const p = el('p', '', l, pan); p.style.margin = '8px 0'; });
    const row = el('div', 'abs hit', '', this.ui);
    Object.assign(row.style, { left: '380px', top: '690px', width: '520px' });
    btn(row, T.ending.again, () => { session.startNew(); goHub(); }, { cls: 'big', style: { width: '100%' } });
    this.detach = attachNav(this.ui);
  }

  update(dt: number, t: number): void {
    this.fer.update(dt);
    this.fx.update(dt);
    this.acc += dt;
    if (this.acc > 1.4) { this.acc = 0; this.fx.confetti(new THREE.Vector3((Math.random() - 0.5) * 8, 3, 0), 16); }
    this.cob.setGaze((engine.pointer.x - 640) / 400, (engine.pointer.y - 400) / 300);
    this.cob.update(dt);
    this.camera.position.set(Math.sin(t * 0.2) * 0.2, 1.8, 7.5);
    this.camera.lookAt(0, 2.2, -10);
  }

  dispose(): void { this.detach(); super.dispose(); }
}

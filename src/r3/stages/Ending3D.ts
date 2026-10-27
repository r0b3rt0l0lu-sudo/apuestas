import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { session } from '../../core/session';
import { T } from '../../i18n/es';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { Fx3D } from '../fx3d';
import { goPhase, goTitle } from '../router';
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
    const endless = session.run.mode === 'endless';
    const escaped = !!session.run.flags.escaped;
    const t = el('div', 'title center abs', escaped ? T.secret.endTitle : endless ? T.endless.winTitle : T.ending.title, this.ui);
    Object.assign(t.style, { left: '0', right: '0', top: '40px', fontSize: '84px', color: '#ece0c0' });
    const pan = el('div', 'abs frame panel center', '', this.ui);
    Object.assign(pan.style, { left: '260px', top: '170px', width: '760px', fontSize: '36px', color: '#ece0c0', padding: '6px 14px 12px', lineHeight: '1.15' });
    const stt = session.run.stats;
    const extra = stt.plays > 0 ? [T.stats.summary(stt.plays, stt.wins, stt.biggestWin, stt.returned - stt.wagered)] : [];
    [...(escaped ? T.secret.endLines : endless ? [...T.endless.winLines, T.endless.score(session.run.peak, T.endless.ranks.banca ?? '')] : T.ending.lines), ...extra].forEach((l) => { const p = el('p', '', l, pan); p.style.margin = '8px 0'; });
    const row = el('div', 'abs hit', '', this.ui);
    Object.assign(row.style, { left: '380px', top: '690px', width: '520px' });
    btn(row, escaped ? T.secret.endAgain : endless ? T.endless.again : T.ending.again, () => { if (escaped) { goTitle(); return; } session.startNew(undefined, endless ? 'endless' : 'campaign'); goPhase(); }, { cls: 'big', style: { width: '100%' } });
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

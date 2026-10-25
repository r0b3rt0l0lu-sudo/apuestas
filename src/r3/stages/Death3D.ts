import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { session } from '../../core/session';
import { T } from '../../i18n/es';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { Cobrador3D } from '../cobrador3d';
import { candle } from '../duelprops';
import { engine } from '../engine';
import { Fx3D } from '../fx3d';
import { goHub, goPhase } from '../router';
import { Stage } from '../stage';
import { ease } from '../tween';

/** Has muerto: El Cobrador se acerca a la cámara, la vela se apaga y todo se corta a negro. */
export class Death3D extends Stage {
  readonly kind = 'death';
  private cob!: Cobrador3D;
  private fx!: Fx3D;
  private can!: ReturnType<typeof candle>;
  private detach: () => void = () => undefined;

  init(): void {
    const r = session.run;
    if (r.phase !== 'dead') { goPhase(); return; }
    this.light(640, 400, 700, 0.1);
    sfx.ambience('none');
    const sc = this.scene;
    sc.background = new THREE.Color(0);
    sc.fog = new THREE.Fog(0x040004, 4, 14);
    sc.add(new THREE.AmbientLight(0x301828, 1.0));
    this.fx = new Fx3D(sc);
    this.cob = new Cobrador3D(0.06).anchor(0, 2.6, -9).setMood('cobra', true);
    sc.add(this.cob);
    this.can = candle();
    this.can.group.position.set(-2.6, 0.3, 0);
    this.can.group.scale.setScalar(2.2);
    sc.add(this.can.group);
    const cl = new THREE.PointLight(0xf0a030, 10, 8, 1.6);
    cl.position.set(-2.6, 1.1, 0.4);
    sc.add(cl);
    this.camera.position.set(0, 2.2, 3);
    this.camera.lookAt(0, 2.4, -9);

    const black = el('div', 'abs', '', this.ui);
    Object.assign(black.style, { inset: '0', background: '#000', opacity: '0' });
    const title = el('div', 'title center abs', T.death.title, this.ui);
    Object.assign(title.style, { left: '0', right: '0', top: '240px', fontSize: '110px', color: '#9c3c28', opacity: '0' });
    const sub = el('div', 'center abs txt', [...T.death.sub, T.death.nights(r.night)].join('\n'), this.ui);
    Object.assign(sub.style, { left: '0', right: '0', top: '400px', fontSize: '40px', whiteSpace: 'pre-line', opacity: '0' });
    const row = el('div', 'abs hit', '', this.ui);
    Object.assign(row.style, { left: '380px', top: '580px', width: '520px', opacity: '0' });
    const b = btn(row, T.death.again, () => { session.startNew(); goHub(); }, { cls: 'big', style: { width: '100%' } });
    b.disabled = true;
    this.detach = attachNav(this.ui);

    // secuencia: 0,6 s se acerca (3,2 s) · 1,2 s la vela se apaga (2,2 s) · 3,6 s negro · 4,2 s título · 5 s subtítulos · 6,2 s botón
    this.run(async () => {
      await this.tweens.wait(600);
      sfx.whisper();
      this.tweens.tween(3200, (k) => { this.cob.anchor(0, 2.6 - k * 0.5, -9 + k * 8.2); this.cob.lunge(); }, ease.inQuad).catch(() => undefined);
      await this.tweens.wait(600);
      this.tweens.tween(2200, (k) => { cl.intensity = 10 * (1 - k); }).then(() => { this.can.setLit(false); this.fx.smoke(new THREE.Vector3(-2.6, 1.0, 0), 10, 0.9); }).catch(() => undefined);
      await this.tweens.wait(1800);
      black.style.opacity = '1';
      this.cob.visible = false; this.can.group.visible = false;
      await this.tweens.wait(600);
      title.style.opacity = '1';
      await this.tweens.wait(800);
      sub.style.opacity = '1';
      await this.tweens.wait(1200);
      row.style.opacity = '1';
      b.disabled = false;
      b.focus();
    });
  }

  update(dt: number): void {
    this.fx.update(dt);
    this.cob.setGaze(0, 0);
    this.cob.update(dt);
    void engine;
  }

  dispose(): void { this.detach(); super.dispose(); }
}

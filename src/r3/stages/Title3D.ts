import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { session } from '../../core/session';
import { T } from '../../i18n/es';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { ground, lam, lampPost, sky, tent } from '../models';
import { Stage } from '../stage';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { openOptions } from '../../ui/dom/options';
import { showOverlay } from '../../ui/dom/overlay';
import { goPhase } from '../router';

let warned = false;

/** Título: El Cobrador de frente, en la oscuridad, con brasas que suben. */
export class Title3D extends Stage {
  readonly kind = 'title';
  private cobrador!: Cobrador3D;
  private embers!: THREE.Points;
  private ev: Float32Array = new Float32Array(0);
  private detach: () => void = () => undefined;
  private menu!: HTMLElement;

  init(): void {
    this.light(640, 400, 1000, 0.28);
    sfx.ambience('hub');
    const sc = this.scene;
    sc.background = new THREE.Color(0);
    sc.fog = new THREE.Fog(0x0a0210, 6, 38);
    sc.add(new THREE.AmbientLight(0x3a2040, 1.3));
    sc.add(sky());
    const g = ground(60, 60);
    g.position.z = -10;
    sc.add(g);
    ([[-9, -14], [10, -16]] as const).forEach(([x, z], i) => { const t = tent(i ? 0x0e4a46 : 0x7a1428, 0xb08a46, 3.6, 1.6, 2.8, i); t.position.set(x, 0, z); sc.add(t); });
    const lp = lampPost(0xe8b868, 16, 18);
    lp.group.position.set(-5.5, 0, -3);
    sc.add(lp.group);
    this.cobrador = new Cobrador3D(0.04).anchor(0, 2.15, 0);
    sc.add(this.cobrador);
    const key = new THREE.PointLight(0xe8b868, 18, 14, 1.4);
    key.position.set(2.5, 4, 3);
    sc.add(key);
    const rim = new THREE.PointLight(0x9c3c28, 16, 12, 1.4);
    rim.position.set(-3, 3, -2);
    sc.add(rim);
    this.camera.position.set(0, 2.2, 6.5);
    this.camera.lookAt(0, 2.5, 0);

    // brasas
    const n = 70, pos = new Float32Array(n * 3);
    this.ev = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = (Math.random() - 0.5) * 8; this.ev[i] = 0.3 + Math.random() * 0.7; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe0701e, size: 3, sizeAttenuation: false, fog: false }));
    sc.add(this.embers);

    // interfaz
    const title = el('div', 'title center abs', T.title, this.ui);
    Object.assign(title.style, { left: '0', right: '0', top: '22px', fontSize: '84px', color: '#ece0c0', textShadow: '0 6px 0 #561a1a, 3px 3px 0 #000' });
    const sub = el('div', 'center abs txt', T.subtitle, this.ui);
    Object.assign(sub.style, { left: '0', right: '0', top: '126px', fontSize: '34px', color: '#948068' });
    this.menu = el('div', 'row hit', '', this.ui);
    Object.assign(this.menu.style, { position: 'absolute', left: '0', right: '0', bottom: '70px', gap: '28px' });
    if (session.hasSave()) btn(this.menu, T.continue, () => this.go(true), { cls: 'big', style: { width: '320px' } });
    btn(this.menu, T.newGame, () => (session.hasSave() ? this.confirmNew() : this.go(false)), { cls: 'big', style: { width: '320px' } });
    btn(this.menu, T.options, () => openOptions(this.ui), { cls: 'big', style: { width: '320px' } });
    const hint = el('div', 'center abs txt', T.keysHint, this.ui);
    Object.assign(hint.style, { left: '0', right: '0', bottom: '22px', fontSize: '24px', color: '#948068' });
    this.detach = attachNav(this.menu);
    if (!warned) this.warning();
    void lam;
  }

  private warning(): void {
    const ov = showOverlay(this.ui, T.warnTitle, T.warnBody, [{ text: T.warnOk, onClick: () => { warned = true; ov.close(); this.menu.querySelector('button')?.focus(); } }], { w: 1000 });
  }

  private confirmNew(): void {
    const ov = showOverlay(this.ui, T.newGame, [T.confirmNew], [
      { text: T.yes, onClick: () => { ov.close(); this.go(false); } },
      { text: T.no, onClick: () => ov.close() }
    ], { w: 800, onBack: () => ov.close() });
  }

  private go(resume: boolean): void {
    if (resume) session.continueRun(); else session.startNew();
    goPhase();
  }

  update(dt: number, t: number): void {
    const p = engine.pointer;
    this.cobrador.setGaze((p.x - 640) / 380, (p.y - 330) / 260);
    this.cobrador.update(dt);
    this.cobrador.anchor(0, 2.15 + Math.sin(t * 0.8) * 0.05, 0);
    const a = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + dt * this.ev[i]!;
      if (y > 7) y = 0;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t + i) * dt * 0.2);
    }
    a.needsUpdate = true;
    this.camera.position.set(Math.sin(t * 0.2) * 0.25, 2.2 + Math.sin(t * 0.5) * 0.04, 6.5 - Math.sin(t * 0.1) * 0.3);
    this.camera.lookAt(0, 2.5, 0);
  }

  dispose(): void {
    this.detach();
    super.dispose();
  }
}

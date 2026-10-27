import * as THREE from 'three';
import { sfx } from '../../audio/sfx';
import { session } from '../../core/session';
import { T } from '../../i18n/es';
import { Cobrador3D } from '../cobrador3d';
import { engine } from '../engine';
import { ferris, ground, lam, lampPost, sky, tent } from '../models';
import { Stage } from '../stage';
import { attachNav, btn, el } from '../../ui/dom/kit';
import { openManual } from '../../ui/dom/manual';
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
  private fer!: ReturnType<typeof ferris>;
  private lamp!: ReturnType<typeof lampPost>;
  private moths!: THREE.Points;
  private titleEl!: HTMLElement;
  private nextGlitch = 3;

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
    this.fer = ferris(9);
    this.fer.group.position.set(-9, 0, -26);
    sc.add(this.fer.group);
    this.lamp = lp;
    const mp = new Float32Array(30);
    this.moths = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(mp, 3)), new THREE.PointsMaterial({ color: 0xece0c0, size: 3, sizeAttenuation: false, fog: false }));
    sc.add(this.moths);
    this.cobrador = new Cobrador3D(0.045).anchor(2.4, 2.4, 0);
    sc.add(this.cobrador);
    const key = new THREE.PointLight(0xe8b868, 18, 14, 1.4);
    key.position.set(2.5, 4, 3);
    sc.add(key);
    const rim = new THREE.PointLight(0x9c3c28, 16, 12, 1.4);
    rim.position.set(-3, 3, -2);
    sc.add(rim);
    this.camera.position.set(0, 2.2, 6.5);
    this.camera.lookAt(1.2, 2.5, 0);

    // brasas
    const n = 70, pos = new Float32Array(n * 3);
    this.ev = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = (Math.random() - 0.5) * 8; this.ev[i] = 0.3 + Math.random() * 0.7; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe0701e, size: 3, sizeAttenuation: false, fog: false }));
    sc.add(this.embers);

    // interfaz: título a la izquierda con letras que parpadean, menú en columna
    const words = T.title.split(' ');
    const last = words.pop() ?? '';
    const lines: Array<[string, number, string]> = [[words.join(' '), 74, '#ece0c0'], [last, 150, '#c24a3a']];
    this.titleEl = el('div', 'title abs', '', this.ui);
    Object.assign(this.titleEl.style, { left: '72px', top: '46px', lineHeight: '0.95', textShadow: '3px 3px 0 #000, 0 7px 0 #3c0f14', transition: 'none' });
    lines.forEach(([txt, size, col]) => {
      const row = el('div', '', '', this.titleEl);
      Object.assign(row.style, { fontSize: `${size}px`, color: col, whiteSpace: 'nowrap' });
      for (const ch of txt) {
        const sp = el('span', 'tl', ch === ' ' ? '\u00a0' : ch, row);
        sp.style.animationDelay = `-${(Math.random() * 7).toFixed(2)}s`;
      }
    });
    const sub = el('div', 'abs txt', T.subtitle, this.ui);
    Object.assign(sub.style, { left: '78px', top: '372px', fontSize: '34px', color: '#948068', textShadow: '2px 2px 0 #000' });
    const quote = T.titleQuotes[Math.floor(Math.random() * T.titleQuotes.length)] ?? '';
    const q = el('div', 'abs txt', quote, this.ui);
    Object.assign(q.style, { right: '60px', top: '60px', fontSize: '34px', color: '#c4b494', textShadow: '2px 2px 0 #000', fontFamily: "'Special Elite', serif" });
    this.menu = el('div', 'hit tmenu', '', this.ui);
    Object.assign(this.menu.style, { position: 'absolute', left: '72px', top: '400px', display: 'flex', flexDirection: 'column', gap: '14px' });
    if (session.hasSave()) btn(this.menu, T.continue, () => this.go(true), { cls: 'big', style: { width: '420px', minHeight: '66px' } });
    btn(this.menu, T.newGame, () => (session.hasSave() ? this.confirmNew() : this.go(false)), { cls: 'big', style: { width: '420px', minHeight: '66px' } });
    const eb = btn(this.menu, T.endless.button, () => (session.hasSave() ? this.confirmEndless() : this.goEndless()), { cls: 'big', style: { width: '420px', minHeight: '66px' }, sub: session.best() > 0 ? T.endless.best(session.best()) : undefined });
    void eb;
    btn(this.menu, T.manual.button, () => openManual(this.ui), { cls: 'big', style: { width: '420px', minHeight: '62px' } });
    btn(this.menu, T.options, () => openOptions(this.ui), { cls: 'big', style: { width: '420px', minHeight: '62px' } });
    const hint = el('div', 'abs txt', T.keysHint, this.ui);
    Object.assign(hint.style, { left: '72px', bottom: '22px', fontSize: '24px', color: '#948068' });
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

  private confirmEndless(): void {
    const ov = showOverlay(this.ui, T.endless.button, [T.endless.confirm], [
      { text: T.yes, onClick: () => { ov.close(); this.goEndless(); } },
      { text: T.no, onClick: () => ov.close() }
    ], { w: 800, onBack: () => ov.close() });
  }

  private goEndless(): void {
    session.startNew(undefined, 'endless');
    goPhase();
  }

  private go(resume: boolean): void {
    if (resume) session.continueRun(); else session.startNew();
    goPhase();
  }

  update(dt: number, t: number): void {
    const p = engine.pointer;
    this.cobrador.setGaze((p.x - 640) / 380, (p.y - 330) / 260);
    this.cobrador.update(dt);
    this.cobrador.anchor(2.4, 2.4 + Math.sin(t * 0.8) * 0.05, 0);
    this.fer.update(dt);
    this.lamp.light.intensity = 16 * (1 - 0.35 * Math.max(0, Math.sin(t * 11) * Math.sin(t * 3.7) - 0.6) * 2.5);
    const ma = this.moths.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < ma.count; i++) ma.setXYZ(i, -5.5 + Math.cos(t * (1.3 + i * 0.17) + i) * (0.5 + i * 0.07), 4.9 + Math.sin(t * (2.1 + i * 0.11) + i * 2) * 0.5, -3 + Math.sin(t * (1.1 + i * 0.13) + i) * 0.6);
    ma.needsUpdate = true;
    const a = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) + dt * this.ev[i]!;
      if (y > 7) y = 0;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t + i) * dt * 0.2);
    }
    a.needsUpdate = true;
    // glitch irregular del título: un fotograma cada pocos segundos
    this.nextGlitch -= dt;
    if (this.nextGlitch <= 0) {
      this.nextGlitch = 3.5 + Math.random() * 5;
      const cls = session.options.reduceFlash ? 'tsoft' : 'tglitch';
      this.titleEl.classList.add(cls);
      window.setTimeout(() => this.titleEl.classList.remove(cls), 150);
    }
    const px = (p.x - 640) / 640, py = (p.y - 400) / 400;
    this.camera.position.set(Math.sin(t * 0.2) * 0.25 + px * 0.5, 2.2 + Math.sin(t * 0.5) * 0.04 - py * 0.2, 6.5 - Math.sin(t * 0.1) * 0.3);
    this.camera.lookAt(1.2 + px * 0.4, 2.5, 0);
  }

  dispose(): void {
    this.detach();
    super.dispose();
  }
}

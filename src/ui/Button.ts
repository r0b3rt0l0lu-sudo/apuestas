import Phaser from 'phaser';
import { C, FONT_UI } from '../config';
import { sfx } from '../audio/sfx';

export interface ButtonOpts {
  size?: number;
  sub?: string;
  /** Tecla rápida (p. ej. '1'). */
  key?: string;
  toggled?: boolean;
  /** Textura de un icono a la izquierda del texto. */
  icon?: string;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private hit: Phaser.GameObjects.Rectangle;
  private txt: Phaser.GameObjects.Text;
  private subTxt: Phaser.GameObjects.Text | null = null;
  private glint: Phaser.GameObjects.Image;
  private inner: Phaser.GameObjects.Container;
  enabled = true;
  focused = false;
  toggled = false;
  readonly w: number;
  readonly h: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, public onClick: () => void, opts: ButtonOpts = {}) {
    super(scene, x, y);
    this.w = w;
    this.h = h;
    this.inner = scene.add.container(0, 0);
    this.bg = scene.add.nineslice(0, 0, 'ui-btn', undefined, Math.round(w / 2), Math.round(h / 2), 8, 8, 8, 8).setScale(2);
    this.hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0);
    const shift = opts.icon ? 26 : 0;
    this.txt = scene.add.text(shift, opts.sub ? -h * 0.18 : 0, text, {
      fontFamily: FONT_UI, fontSize: `${opts.size ?? 32}px`, color: C.text, align: 'center', wordWrap: { width: w - 40 - shift * 2 }
    }).setOrigin(0.5).setResolution(1).setShadow(2, 2, '#000000', 0, false, true);
    this.glint = scene.add.image(-w / 2 + 14, -h / 2 + 14, 'spark').setScale(2).setVisible(false);
    this.inner.add([this.bg, this.txt, this.glint]);
    if (opts.sub) {
      this.subTxt = scene.add.text(0, h * 0.24, opts.sub, { fontFamily: FONT_UI, fontSize: '24px', color: C.textDim, align: 'center', wordWrap: { width: w - 40 } })
        .setOrigin(0.5).setResolution(1).setShadow(2, 2, '#000000', 0, false, true);
      this.inner.add(this.subTxt);
    }
    if (opts.icon) this.inner.add(scene.add.image(-w / 2 + 40, 0, opts.icon).setScale(3));
    this.add([this.inner, this.hit]);
    this.setSize(w, h);
    this.hit.setInteractive({ useHandCursor: true });
    this.hit.on('pointerover', () => { if (this.enabled) this.emit('hover'); });
    this.hit.on('pointerdown', () => { if (this.enabled) this.inner.setY(4); });
    this.hit.on('pointerup', () => { this.inner.setY(0); this.activate(); });
    this.hit.on('pointerout', () => this.inner.setY(0));
    this.toggled = !!opts.toggled;
    scene.add.existing(this);
    scene.tweens.add({ targets: this.glint, alpha: { from: 1, to: 0.25 }, duration: 380, yoyo: true, repeat: -1 });
    this.refresh();
  }

  activate(): void {
    if (!this.enabled) return;
    sfx.click();
    this.inner.setY(4);
    this.scene.time.delayedCall(70, () => this.inner.setY(0));
    this.onClick();
  }

  setLabel(s: string): this { this.txt.setText(s); return this; }
  setSub(s: string): this { this.subTxt?.setText(s); return this; }

  setEnabled(v: boolean): this {
    this.enabled = v;
    if (this.hit.input) this.hit.input.enabled = v;
    this.refresh();
    return this;
  }

  setToggled(v: boolean): this { this.toggled = v; this.refresh(); return this; }
  setFocused(v: boolean): this {
    const was = this.focused;
    this.focused = v;
    this.refresh();
    if (v && !was && this.enabled) {
      this.inner.setY(-2);
      this.scene.tweens.add({ targets: this.inner, y: 0, duration: 120, ease: 'Quad.easeOut' });
    }
    return this;
  }

  private refresh(): void {
    const on = this.enabled;
    this.bg.setTexture(!on ? 'ui-btn-d' : this.focused ? 'ui-btn-f' : this.toggled ? 'ui-btn-t' : 'ui-btn');
    this.glint.setVisible(this.focused && on);
    this.txt.setColor(on ? (this.toggled || this.focused ? C.textBright : C.text) : C.textDim);
    this.subTxt?.setColor(C.textDim);
    this.setAlpha(on ? 1 : 0.7);
  }
}

/** Navegación por teclado entre botones (flechas, Tab, Intro/Espacio, Esc). */
export class FocusGroup {
  private static stack: FocusGroup[] = [];
  buttons: Button[] = [];
  private idx = 0;
  onBack: (() => void) | null = null;
  private hotkeys = new Map<string, Button>();

  constructor(private scene: Phaser.Scene) {
    FocusGroup.stack.push(this);
    const kb = scene.input.keyboard;
    const handler = (e: KeyboardEvent) => this.onKey(e);
    kb?.on('keydown', handler);
    scene.events.once('shutdown', () => { kb?.off('keydown', handler); this.destroy(); });
  }

  destroy(): void {
    FocusGroup.stack = FocusGroup.stack.filter((g) => g !== this);
  }

  add(b: Button, hotkey?: string): Button {
    this.buttons.push(b);
    b.on('hover', () => this.focus(b));
    if (hotkey) this.hotkeys.set(hotkey.toLowerCase(), b);
    if (this.buttons.length === 1) this.focus(b);
    return b;
  }

  clear(): void {
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
    this.hotkeys.clear();
    this.idx = 0;
  }

  focus(b: Button): void {
    this.buttons.forEach((x) => x.setFocused(false));
    this.idx = Math.max(0, this.buttons.indexOf(b));
    b.setFocused(true);
  }

  private get top(): boolean {
    return FocusGroup.stack[FocusGroup.stack.length - 1] === this;
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.top || !this.scene.scene.isActive()) return;
    const key = e.key.toLowerCase();
    const hk = this.hotkeys.get(key);
    if (hk) { hk.activate(); return; }
    const cur = this.buttons[this.idx];
    if (key === 'enter' || key === ' ') { e.preventDefault(); cur?.activate(); return; }
    if (key === 'escape') { this.onBack?.(); return; }
    if (key === 'tab') { e.preventDefault(); this.step(e.shiftKey ? -1 : 1); return; }
    const dir = ({ arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] } as Record<string, [number, number]>)[key];
    if (dir) { e.preventDefault(); this.move(dir[0], dir[1]); }
  }

  private step(d: number): void {
    const n = this.buttons.length;
    for (let i = 1; i <= n; i++) {
      const b = this.buttons[(this.idx + d * i + n * 4) % n];
      if (b?.enabled) { this.focus(b); return; }
    }
  }

  private move(dx: number, dy: number): void {
    const cur = this.buttons[this.idx];
    if (!cur) return;
    let best: Button | null = null, bestScore = Infinity;
    for (const b of this.buttons) {
      if (b === cur || !b.enabled) continue;
      const vx = b.x - cur.x, vy = b.y - cur.y;
      const main = vx * dx + vy * dy;
      if (main <= 1) continue;
      const side = Math.abs(vx * dy) + Math.abs(vy * dx);
      const score = main + side * 2;
      if (score < bestScore) { bestScore = score; best = b; }
    }
    if (best) this.focus(best);
    else if (dx !== 0 || dy !== 0) this.step(dx + dy > 0 ? 1 : -1);
  }

  /** Enfoca el primer botón activo. */
  focusFirst(): void {
    const b = this.buttons.find((x) => x.enabled);
    if (b) this.focus(b);
  }
}

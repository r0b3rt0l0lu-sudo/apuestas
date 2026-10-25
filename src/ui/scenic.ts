import Phaser from 'phaser';
import { C, hex } from '../config';
import { WHEEL_FRAMES } from '../art/textures';
import { lampFlicker } from '../fx/flicker';
import { session } from '../core/session';

const S = 4; // los fondos son de 320×200 y se muestran a ×4
const CX = 640, CY = 400;

function layer(scene: Phaser.Scene, key: string, depth: number): Phaser.GameObjects.Image {
  return scene.add.image(CX, CY, key).setScale(S).setDepth(depth);
}

/** Cambia de textura cada `ms` (con desfase opcional). */
function cycle(scene: Phaser.Scene, img: Phaser.GameObjects.Image, keys: string[], ms: number, randomStep = false): void {
  let i = 0;
  scene.time.addEvent({ delay: ms, loop: true, callback: () => { i = randomStep ? Phaser.Math.Between(0, keys.length - 1) : (i + 1) % keys.length; img.setTexture(keys[i] as string); } });
}

/** Dos capas de niebla que se desplazan a distinta velocidad, en saltos de píxel de arte. */
function fogLayers(scene: Phaser.Scene, y: number, depth: number): void {
  const a = scene.add.tileSprite(CX, y, 1280, 192, 'fog').setTileScale(S, S).setDepth(depth).setAlpha(0.35).setTint(0x7a1a4a);
  const b = scene.add.tileSprite(CX, y + 40, 1280, 192, 'fog').setTileScale(S, S).setDepth(depth + 1).setAlpha(0.25).setTint(0x4a0e5a).setFlipX(true);
  let ta = 0, tb = 0;
  const upd = (_t: number, dt: number) => {
    ta += dt * 0.006; tb += dt * 0.0035;
    a.tilePositionX = Math.floor(ta / 4) * 4 / S * S / S; b.tilePositionX = Math.floor(tb / 4) * 4 / S * S / S;
  };
  scene.events.on('update', upd);
  scene.events.once('shutdown', () => scene.events.off('update', upd));
}

function bats(scene: Phaser.Scene, ymin: number, ymax: number): void {
  const go = () => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y0 = Phaser.Math.Between(ymin, ymax);
    const b = scene.add.image(dir === 1 ? -40 : 1320, y0, 'bat-0').setScale(S).setDepth(-3).setFlipX(dir === -1);
    const t0 = scene.time.now;
    const ev = scene.time.addEvent({ delay: 110, loop: true, callback: () => b.setTexture(b.texture.key === 'bat-0' ? 'bat-1' : 'bat-0') });
    scene.tweens.addCounter({
      from: 0, to: 1, duration: Phaser.Math.Between(7000, 11000),
      onUpdate: (tw) => { const t = tw.getValue() ?? 0; b.setPosition(Math.round((dir === 1 ? -40 + t * 1360 : 1320 - t * 1360) / S) * S, Math.round((y0 + Math.sin((scene.time.now - t0) / 380) * 36) / S) * S); },
      onComplete: () => { ev.remove(); b.destroy(); }
    });
    scene.time.delayedCall(Phaser.Math.Between(9000, 20000), go);
  };
  scene.time.delayedCall(Phaser.Math.Between(2500, 7000), go);
}

/** Feria de noche: estrellas que titilan, guirnalda, noria que gira, niebla, murciélagos y farolas. */
export function fairBackdrop(scene: Phaser.Scene): void {
  layer(scene, 'bg-fair', -10);
  const stars = layer(scene, 'fair-stars-0', -9);
  cycle(scene, stars, ['fair-stars-0', 'fair-stars-1', 'fair-stars-2'], 520);
  const wheel = scene.add.image(232 * S, 92 * S, 'wheel-0').setScale(S).setDepth(-8);
  let k = 0;
  scene.time.addEvent({ delay: 170, loop: true, callback: () => { k = (k + 1) % WHEEL_FRAMES; wheel.setTexture(`wheel-${k}`); } });
  const bulbs = layer(scene, 'fair-bulbs-0', -7);
  cycle(scene, bulbs, ['fair-bulbs-0', 'fair-bulbs-1'], 480);
  fogLayers(scene, 560, -5);
  bats(scene, 120, 330);
  // resplandor extra de los faroles que parpadea
  const lamps = [48, 272].map((x) => scene.add.ellipse(x * S, 95 * S, 220, 200, hex(C.lamp), 0.035).setDepth(-6));
  lamps.forEach((l) => lampFlicker(scene, [l], 0.035));
}

export function boothBackdrop(scene: Phaser.Scene): { bulbs: Phaser.GameObjects.Image; lever: Phaser.GameObjects.Image } {
  layer(scene, 'bg-booth', -10);
  const glow = layer(scene, 'booth-glow', -9);
  lampFlicker(scene, [glow], 1);
  layer(scene, 'cab-body', -8);
  const bulbs = layer(scene, 'cab-bulbs-0', -7);
  let f = 0;
  scene.time.addEvent({ delay: 260, loop: true, callback: () => { f = (f + 1) % 3; bulbs.setTexture(`cab-bulbs-${f}`); } });
  const lever = scene.add.image(1010, 280, 'cab-lever-0').setScale(S).setDepth(-7);
  return { bulbs, lever };
}

export function feltBackdrop(scene: Phaser.Scene): void {
  layer(scene, 'bg-felt', -10);
  const fl = layer(scene, 'felt-flames-0', -9);
  cycle(scene, fl, ['felt-flames-0', 'felt-flames-1'], 190, true);
  lampFlicker(scene, [fl], 1);
}

export function arenaBackdrop(scene: Phaser.Scene): { crowd: Phaser.GameObjects.Image; cheer: (on: boolean) => void } {
  layer(scene, 'bg-arena', -10);
  cycle(scene, layer(scene, 'arena-bulbs-0', -9), ['arena-bulbs-0', 'arena-bulbs-1'], 360);
  const crowd = layer(scene, 'arena-crowd-0', -9);
  let ev = scene.time.addEvent({ delay: 700, loop: true, callback: () => crowd.setTexture(crowd.texture.key.endsWith('0') ? 'arena-crowd-1' : 'arena-crowd-0') });
  const cheer = (on: boolean) => { ev.remove(); ev = scene.time.addEvent({ delay: on ? 160 : 700, loop: true, callback: () => crowd.setTexture(crowd.texture.key.endsWith('0') ? 'arena-crowd-1' : 'arena-crowd-0') }); };
  return { crowd, cheer };
}

export function duelBackdrop(scene: Phaser.Scene): void {
  layer(scene, 'bg-duel', -10);
  const beam = layer(scene, 'duel-beam', -9);
  lampFlicker(scene, [beam], 1);
  // motas de polvo que cruzan el foco
  scene.time.addEvent({
    delay: 380, loop: true, callback: () => {
      const m = scene.add.image(Phaser.Math.Between(520, 760), 60, 'px').setScale(2).setDepth(-8).setAlpha(0.6);
      scene.tweens.add({ targets: m, y: 640, x: m.x + Phaser.Math.Between(-60, 60), alpha: 0, duration: Phaser.Math.Between(4000, 7000), onComplete: () => m.destroy() });
    }
  });
}

export function dawnBackdrop(scene: Phaser.Scene, rise = true): void {
  layer(scene, 'bg-dawn', -10);
  const sun = scene.add.image(CX, 560 + (rise ? 140 : 0), 'dawn-sun').setScale(S).setDepth(-9);
  if (rise) scene.tweens.add({ targets: sun, y: 500, duration: 6000, ease: 'Sine.easeOut' });
  const wheel = scene.add.image(980, 400, 'wheel-0').setScale(S).setDepth(-8).setTint(0x2a1a34);
  let k = 0;
  scene.time.addEvent({ delay: 220, loop: true, callback: () => { k = (k + 1) % WHEEL_FRAMES; wheel.setTexture(`wheel-${k}`); } });
  // pájaros
  const go = () => {
    const y0 = Phaser.Math.Between(120, 300), b = scene.add.image(-40, y0, 'bat-0').setScale(S).setDepth(-7);
    const ev = scene.time.addEvent({ delay: 180, loop: true, callback: () => b.setTexture(b.texture.key === 'bat-0' ? 'bat-1' : 'bat-0') });
    scene.tweens.add({ targets: b, x: 1320, y: y0 + Phaser.Math.Between(-60, 60), duration: Phaser.Math.Between(9000, 14000), onUpdate: () => b.setPosition(Math.round(b.x / S) * S, Math.round(b.y / S) * S), onComplete: () => { ev.remove(); b.destroy(); } });
    scene.time.delayedCall(Phaser.Math.Between(4000, 9000), go);
  };
  scene.time.delayedCall(1500, go);
  void session;
}

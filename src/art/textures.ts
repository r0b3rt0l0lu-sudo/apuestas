import type Phaser from 'phaser';
import { HORSES, type Skin } from '../games/race';
import * as cb from './cobrador';
import { SKIN_LOOKS, drawHorse, drawPole } from './horse';
import { Painter as P, type Painter } from './painter';
import * as props from './props';
import * as sc from './scenery';
import * as ui from './ui';

function add(scene: Phaser.Scene, key: string, p: Painter, graded = true): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  if (graded) p.grade();
  const tex = scene.textures.addCanvas(key, p.canvas);
  tex?.setFilter(0); // NEAREST
}

export const WHEEL_FRAMES = 48;

/** Genera todas las texturas del juego (todo pixel art dibujado por código). */
export function buildTextures(scene: Phaser.Scene): void {
  // El Cobrador por capas (96×96)
  for (let f = 0; f < 4; f++) add(scene, `cb-tend-${f}`, cb.drawTendrils(f));
  add(scene, 'cb-body', cb.drawBody());
  add(scene, 'cb-head', cb.drawHead());
  for (const f of [0, 1] as const) add(scene, `cb-hat-${f}`, cb.drawHat(f));
  for (const m of cb.MOODS) {
    add(scene, `cb-eyew-${m}`, cb.drawEyeWhite(m));
    add(scene, `cb-pupil-${m}`, cb.drawPupil(m));
    add(scene, `cb-brow-${m}`, cb.drawBrow(m));
    for (let f = 0; f < (m === 'cobra' ? 4 : 2); f++) add(scene, `cb-mouth-${m}-${f}`, cb.drawMouth(m, f));
    add(scene, `cb-glitch-${m}`, cb.drawGlitch(m, false));
    add(scene, `cb-glitchsoft-${m}`, cb.drawGlitch(m, true));
  }
  for (let f = 0; f < 3; f++) { add(scene, `cb-lid-${f}`, cb.drawLid(f)); add(scene, `cb-third-${f}`, cb.drawThird(f)); add(scene, `cb-sock-${f}`, cb.drawSocketLight(f, false)); add(scene, `cb-sockr-${f}`, cb.drawSocketLight(f, true)); add(scene, `cb-chain-${f}`, cb.drawChain(f)); }
  for (let f = 0; f < 4; f++) { add(scene, `cb-ooze-${f}`, cb.drawOoze(f)); add(scene, `cb-rhand-${f}`, cb.drawRightHand(f)); add(scene, `cb-pend-${f}`, cb.drawPendulum(f)); }
  for (const f of [0, 1] as const) {
    add(scene, `cb-glow-${f}`, cb.drawGlow(f, false));
    add(scene, `cb-glowr-${f}`, cb.drawGlow(f, true));
    add(scene, `cb-halo-${f}`, cb.drawHalo(f, false));
    add(scene, `cb-halor-${f}`, cb.drawHalo(f, true));
    add(scene, `cb-moth-${f}`, cb.drawMoth(f));
    add(scene, `cb-lhand-${f}`, cb.drawLeftHand(f));
  }
  add(scene, 'cb-glint', cb.drawGlint());

  // Caballitos: uno por caballo de la carrera, y las 7 skins como referencia
  add(scene, 'pole', drawPole());
  HORSES.forEach((h, i) => {
    const look = { skin: h.skin, body: h.body, mane: h.mane, num: h.num };
    add(scene, `horse-${i}-0`, drawHorse(look, 0));
    add(scene, `horse-${i}-1`, drawHorse(look, 1));
    add(scene, `horse-${i}-g`, drawHorse(look, 0, true));
  });
  (Object.keys(SKIN_LOOKS) as Skin[]).forEach((skin) => {
    const l = SKIN_LOOKS[skin];
    for (const f of [0, 1] as const) add(scene, `skin-${skin}-${f}`, drawHorse({ skin, body: l.body, mane: l.mane, num: 1 }, f));
  });

  // Símbolos (24×24)
  for (const look of ['abierto', 'izq', 'der', 'cerrado'] as const) add(scene, `sym-ojo-${look}`, props.drawEyeSymbol(look));
  add(scene, 'sym-diente', props.drawTooth());
  add(scene, 'sym-polilla', props.drawMoth());
  add(scene, 'sym-llave', props.drawKey());
  add(scene, 'sym-calavera', props.drawSkull());
  add(scene, 'sym-siete-0', props.drawSeven(0));
  add(scene, 'sym-siete-1', props.drawSeven(1));

  // Duelo
  for (const f of [0, 1] as const) { add(scene, `candle-lit-${f}`, props.drawCandle(true, f)); add(scene, `candle-out-${f}`, props.drawCandle(false, f)); }
  for (const it of ['monoculo', 'moneda', 'vela', 'reloj', 'polvora'] as const) add(scene, `item-${it}`, props.drawItem(it));
  const gun = props.drawBlunderbuss();
  add(scene, 'trabuco', gun);
  add(scene, 'trabuco-up', rotate(gun, 1));
  add(scene, 'trabuco-down', rotate(gun, -1));

  // Interfaz y efectos
  (['btn', 'btn-f', 'btn-t', 'btn-d', 'panel', 'dialog'] as const).forEach((k) => add(scene, `ui-${k}`, ui.drawFrame(k)));
  add(scene, 'ui-gauge', ui.drawGauge());
  add(scene, 'ui-chip', ui.drawChip());
  add(scene, 'ui-tick-on', ui.drawTick(true));
  add(scene, 'ui-tick-off', ui.drawTick(false));
  add(scene, 'px', ui.px2());
  add(scene, 'spark', ui.drawSpark());
  for (let f = 0; f < 4; f++) add(scene, `coinfx-${f}`, ui.drawCoinSpin(f));
  for (const s of [0, 1, 2] as const) add(scene, `smoke-${s}`, ui.drawSmoke(s));
  for (let f = 0; f < 3; f++) add(scene, `muzzle-${f}`, ui.drawMuzzle(f));
  add(scene, 'bat-0', ui.drawBat(0));
  add(scene, 'bat-1', ui.drawBat(1));
  add(scene, 'ball', new P(5, 5).shadedEllipse(2, 2, 2, 2, { d2: '#6a6070', d1: '#9c9278', b: '#d9cfb0', l1: '#f4ecd0', l2: '#fff' }).outlineSel('#0d0a0e', 0.8));
}

/** Fondos y fotogramas de escena (más pesados: se generan al arrancar el juego). */
export function buildScenery(scene: Phaser.Scene): void {
  const fair = sc.drawFairNight();
  add(scene, 'bg-fair', fair.bg);
  fair.stars.forEach((s, i) => add(scene, `fair-stars-${i}`, s));
  fair.bulbs.forEach((s, i) => add(scene, `fair-bulbs-${i}`, s));
  add(scene, 'fog', fair.fog);
  for (let k = 0; k < WHEEL_FRAMES; k++) add(scene, `wheel-${k}`, sc.drawWheelFrame(k, WHEEL_FRAMES));
  const booth = sc.drawBooth();
  add(scene, 'bg-booth', booth.bg);
  add(scene, 'booth-glow', booth.glow);
  const cab = sc.drawCabinet();
  add(scene, 'cab-body', cab.body);
  cab.bulbs.forEach((b, i) => add(scene, `cab-bulbs-${i}`, b));
  cab.lever.forEach((l, i) => add(scene, `cab-lever-${i}`, l));
  const felt = sc.drawFeltRoom();
  add(scene, 'bg-felt', felt.bg);
  felt.flames.forEach((f, i) => add(scene, `felt-flames-${i}`, f));
  const arena = sc.drawArena();
  add(scene, 'bg-arena', arena.bg);
  arena.bulbs.forEach((b, i) => add(scene, `arena-bulbs-${i}`, b));
  arena.crowd.forEach((b, i) => add(scene, `arena-crowd-${i}`, b));
  const duel = sc.drawDuelRoom();
  add(scene, 'bg-duel', duel.bg);
  add(scene, 'duel-beam', duel.beam);
  const dawn = sc.drawDawnSky();
  add(scene, 'bg-dawn', dawn.bg);
  add(scene, 'dawn-sun', dawn.sun);
}

/** Giro exacto de 90° (sin suavizado) para apuntar el trabuco arriba o abajo. */
function rotate(src: Painter, dir: 1 | -1): Painter {
  const p = new P(src.h, src.w);
  p.ctx.imageSmoothingEnabled = false;
  if (dir === 1) { p.ctx.translate(src.h, 0); p.ctx.rotate(Math.PI / 2); } else { p.ctx.translate(0, src.w); p.ctx.rotate(-Math.PI / 2); }
  p.ctx.drawImage(src.canvas, 0, 0);
  return p;
}

export const symbolKey = (s: 'ojo' | 'diente' | 'polilla' | 'llave' | 'calavera' | 'siete', frame = 0): string =>
  s === 'ojo' ? 'sym-ojo-abierto' : s === 'siete' ? `sym-siete-${frame % 2}` : `sym-${s}`;

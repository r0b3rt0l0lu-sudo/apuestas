import type Phaser from 'phaser';
import { C } from '../config';
import { HORSES, type Skin } from '../games/race';
import { SYMBOLS } from '../games/slots';
import * as cb from './cobrador';
import { HH, HW, SKIN_LOOKS, drawHorse, drawPole } from './horse';
import type { Painter } from './painter';
import { Painter as P } from './painter';
import * as props from './props';

function add(scene: Phaser.Scene, key: string, p: Painter): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, p.canvas);
  tex?.setFilter(0); // NEAREST
}

/** Genera todas las texturas del juego (todo pixel art dibujado por código). */
export function buildTextures(scene: Phaser.Scene): void {
  // El Cobrador por capas
  add(scene, 'cb-base', cb.outlined(cb.drawBase()));
  for (const m of cb.MOODS) {
    add(scene, `cb-eye-${m}`, cb.drawEye(m));
    add(scene, `cb-brow-${m}`, cb.drawBrow(m));
    add(scene, `cb-mouth-${m}`, cb.drawMouth(m));
    add(scene, `cb-glitch-${m}`, cb.outlined(cb.drawGlitch(m, false)));
    add(scene, `cb-glitchsoft-${m}`, cb.outlined(cb.drawGlitch(m, true)));
  }
  for (const f of [0, 1] as const) {
    add(scene, `cb-glow-${f}`, cb.drawGlow(f, false));
    add(scene, `cb-glowr-${f}`, cb.drawGlow(f, true));
    add(scene, `cb-halo-${f}`, cb.drawHalo(f, false));
    add(scene, `cb-halor-${f}`, cb.drawHalo(f, true));
    add(scene, `cb-moth-${f}`, cb.drawMoth(f));
    add(scene, `cb-fingers-${f}`, cb.outlined(cb.drawFingers(f)));
  }
  add(scene, 'cb-socket', cb.drawSocketDot());
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

  // Símbolos de la tragaperras
  for (const look of ['abierto', 'izq', 'der', 'cerrado'] as const) add(scene, `sym-ojo-${look}`, props.drawEyeSymbol(look));
  add(scene, 'sym-diente', props.drawTooth());
  add(scene, 'sym-polilla', props.drawMoth());
  add(scene, 'sym-llave', props.drawKey());
  add(scene, 'sym-calavera', props.drawSkull());
  add(scene, 'sym-siete-0', props.drawSeven(0));
  add(scene, 'sym-siete-1', props.drawSeven(1));

  // Duelo
  add(scene, 'candle-lit-0', props.drawCandle(true, 0));
  add(scene, 'candle-lit-1', props.drawCandle(true, 1));
  add(scene, 'candle-out-0', props.drawCandle(false, 0));
  add(scene, 'candle-out-1', props.drawCandle(false, 1));
  for (const it of ['monoculo', 'moneda', 'vela', 'reloj', 'polvora'] as const) add(scene, `item-${it}`, props.drawItem(it));
  const gun = props.drawBlunderbuss();
  add(scene, 'trabuco', gun);
  add(scene, 'trabuco-up', rotate(gun, 1));
  add(scene, 'trabuco-down', rotate(gun, -1));

  // Fichas y bola
  add(scene, 'chip', new P(8, 8).ellipse(3, 3, 3, 3, C.gold).ellipse(3, 3, 1, 1, C.brass).outline(C.bg));
  add(scene, 'ball', new P(4, 4).ellipse(1, 1, 1, 1, C.textBright).outline(C.bg));
  void HW; void HH; void SYMBOLS;
}

export const symbolKey = (s: (typeof SYMBOLS)[number], frame = 0): string =>
  s === 'ojo' ? 'sym-ojo-abierto' : s === 'siete' ? `sym-siete-${frame % 2}` : `sym-${s}`;

/** Giro exacto de 90° (sin suavizado) para apuntar el trabuco arriba o abajo. */
function rotate(src: Painter, dir: 1 | -1): Painter {
  const p = new P(src.h, src.w);
  p.ctx.imageSmoothingEnabled = false;
  if (dir === 1) { p.ctx.translate(src.h, 0); p.ctx.rotate(Math.PI / 2); } else { p.ctx.translate(0, src.w); p.ctx.rotate(-Math.PI / 2); }
  p.ctx.drawImage(src.canvas, 0, 0);
  return p;
}

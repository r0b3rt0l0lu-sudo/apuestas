import type Phaser from 'phaser';
import { session, sceneForPhase } from '../core/session';
import { phraseCycle } from '../core/phrases';
import { Rng } from '../core/rng';
import { C, W } from '../config';
import { wipe } from '../fx/wipe';
import { Typewriter } from '../ui/Typewriter';
import { label } from '../ui/text';

let cosmetic: ((l: readonly string[]) => string) | null = null;
let cosmeticSeed = -1;

/** Frase del Cobrador elegida con el RNG de la partida, sin repetir la última. */
export function phrase(list: readonly string[]): string {
  if (!cosmetic || cosmeticSeed !== session.run.seed) {
    cosmeticSeed = session.run.seed;
    cosmetic = phraseCycle(new Rng(session.run.seed ^ 0xc0b4)) as (l: readonly string[]) => string;
  }
  return cosmetic(list);
}

/** Cambio de escena con fundido de 0,5 s. */
export function fadeTo(scene: Phaser.Scene, key: string, ms = 560): void {
  void wipe(scene, 'out', ms).then(() => scene.scene.start(key));
}

/** Descubre la escena con la transición por bloques. */
export function fadeIn(scene: Phaser.Scene, ms = 560): void {
  void wipe(scene, 'in', ms);
}

export function goPhase(scene: Phaser.Scene): void {
  fadeTo(scene, sceneForPhase(session.run.phase));
}

/** Tras una jugada: si la noche se ha cerrado (duelo o amanecer), cambia de escena. */
export function afterResolve(scene: Phaser.Scene, say: (s: string) => void, delay = 2600): boolean {
  const ph = session.run.phase;
  if (ph !== 'duel' && ph !== 'dawn') return false;
  say(ph === 'duel' ? '«Se acabó el tiempo. Hora de pagar.»' : '«Amanece. Veamos qué has reunido.»');
  scene.time.delayedCall(delay, () => goPhase(scene));
  return true;
}

export function leaveTable(scene: Phaser.Scene): void {
  session.dispatch({ type: 'leaveTable' });
  fadeTo(scene, 'Hub');
}

/** Cuadro de diálogo del Cobrador con máquina de escribir. */
export function dialogue(scene: Phaser.Scene, x: number, y: number, w: number, h: number): { text: Phaser.GameObjects.Text; tw: Typewriter } {
  scene.add.nineslice(x + w / 2, y + h / 2, 'ui-dialog', undefined, Math.round(w / 2), Math.round(h / 2), 8, 8, 8, 8).setScale(2).setDepth(50);
  const text = label(scene, x + 24, y + 14, '', { size: 32, color: C.textBright, wrap: w - 48, depth: 51 });
  return { text, tw: new Typewriter(scene, text) };
}

export function titleText(scene: Phaser.Scene, s: string): Phaser.GameObjects.Text {
  return label(scene, W / 2, 96, s, { title: true, size: 40, align: 'center', color: C.textBright, depth: 5 });
}

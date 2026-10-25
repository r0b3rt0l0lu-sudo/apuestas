import Phaser from 'phaser';
import { session } from '../core/session';

/**
 * Aspecto final del juego: todo se cuantiza a una paleta mínima de negros, granates, verde oliva y hueso,
 * con tramado ordenado grueso y un foco de luz que deja el resto de la pantalla en penumbra.
 */
export const PALETTE: ReadonlyArray<string> = [
  '#020001', '#0b0305', '#170709', '#26090e', '#3c0f14', '#561a1a', '#7a2a20', '#9c3c28',
  '#22261a', '#3a4226', '#566a38', '#76895a', '#6a5240', '#948068', '#c4b494', '#ece0c0'
];

/** Estado del foco: las escenas lo mueven para dirigir la mirada. */
export const lookState = { x: 640, y: 380, radius: 1150, dark: 0.62, tx: 640, ty: 380, tr: 1150, td: 0.62 };

/** Mueve el foco (con suavizado) y fija cuánta oscuridad hay fuera de él. */
export function setLight(x: number, y: number, radius = 1150, dark = 0.62): void {
  lookState.tx = x; lookState.ty = y; lookState.tr = radius; lookState.td = dark;
}

const FRAG = `
#define SHADER_NAME LOOK_FS
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLight;
uniform float uRadius;
uniform float uDark;
uniform float uDither;
uniform vec3 uPal[16];

float bayer4(vec2 p) {
  p = mod(floor(p), 4.0);
  float a = mod(p.x, 2.0), b = mod(p.y, 2.0);
  float c = floor(p.x / 2.0), d = floor(p.y / 2.0);
  float i = (a != b ? 1.0 : 0.0) * 8.0 + b * 4.0 + (c != d ? 1.0 : 0.0) * 2.0 + d;
  return (i + 0.5) / 16.0;
}

void main() {
  vec2 gp = outTexCoord * uRes;
  vec3 col = texture2D(uMainSampler, outTexCoord).rgb;
  // foco con caída cuadrática y un parpadeo escalonado de la bombilla
  vec2 d = (gp - uLight) / uRadius;
  float L = clamp(1.0 - dot(d, d), 0.0, 1.0);
  float flick = 1.0 - 0.10 * step(0.72, fract(sin(floor(uTime * 7.0) * 12.9898) * 43758.5453));
  float light = mix(uDark, 1.0, L * L * (3.0 - 2.0 * L)) * flick;
  col *= light;
  col = pow(col, vec3(1.1));
  // tramado ordenado en celdas de 2 píxeles de juego
  col += (bayer4(floor(gp / 2.0)) - 0.5) * uDither;
  float best = 1e9;
  vec3 outc = uPal[0];
  for (int i = 0; i < 16; i++) {
    vec3 df = col - uPal[i];
    float dist = dot(df * df, vec3(0.95, 1.5, 0.75));
    if (dist < best) { best = dist; outc = uPal[i]; }
  }
  gl_FragColor = vec4(outc, 1.0);
}
`;

const hex3 = (h: string): number[] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, (n >> 0) & 255].map((v) => v / 255); };
const PAL_F = new Float32Array(PALETTE.flatMap(hex3));

export class LookPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'Look', fragShader: FRAG });
  }

  onPreRender(): void {
    const s = lookState, k = 0.06;
    s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k; s.radius += (s.tr - s.radius) * k; s.dark += (s.td - s.dark) * k;
    this.set2f('uRes', 1280, 800);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set2f('uLight', s.x, s.y);
    this.set1f('uRadius', s.radius);
    this.set1f('uDark', s.dark);
    this.set1f('uDither', session.options.reduceFlash ? 0.08 : 0.13);
    this.set3fv('uPal', PAL_F);
  }
}

/** Aplica el aspecto a la cámara principal de una escena (cada vez que se crea). */
export function applyLook(scene: Phaser.Scene): void {
  if (scene.sys.game.renderer.type !== Phaser.WEBGL) return;
  scene.cameras.main.resetPostPipeline();
  scene.cameras.main.setPostPipeline('Look');
}

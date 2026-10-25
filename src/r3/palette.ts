/** Paleta de 16 colores del juego (negros, granates, verde oliva, tostados y hueso). */
export const PALETTE: readonly string[] = [
  '#020001', '#0b0305', '#170709', '#26090e', '#3c0f14', '#561a1a', '#7a2a20', '#9c3c28',
  '#22261a', '#3a4226', '#566a38', '#76895a', '#6a5240', '#948068', '#c4b494', '#ece0c0'
];

export const hex3 = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const PALETTE_F = new Float32Array(PALETTE.flatMap((h) => hex3(h)));

export const POST_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/**
 * Paso final: lee la imagen de baja resolución (vecino más cercano), le aplica un foco de luz con
 * viñeta, tramado ordenado por píxel de baja resolución y la cuantiza a la paleta. Añade líneas de
 * barrido, destello y una transición por bloques.
 */
export const POST_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2 uRes;
uniform vec2 uRT;
uniform float uTime;
uniform vec2 uLight;
uniform float uRadius;
uniform float uDark;
uniform float uDither;
uniform float uWipe;
uniform float uFlash;
uniform vec3 uFlashCol;
uniform float uSoft;
uniform vec3 uPal[16];

float bayer4(vec2 p) {
  p = mod(floor(p), 4.0);
  float a = mod(p.x, 2.0), b = mod(p.y, 2.0);
  float c = floor(p.x / 2.0), d = floor(p.y / 2.0);
  float i = (a != b ? 1.0 : 0.0) * 8.0 + b * 4.0 + (c != d ? 1.0 : 0.0) * 2.0 + d;
  return (i + 0.5) / 16.0;
}

void main() {
  vec2 rp = floor(vUv * uRT);
  vec3 col = texture2D(tDiffuse, (rp + 0.5) / uRT).rgb;
  vec2 sp = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec2 d = (sp - uLight) / uRadius;
  float L = clamp(1.0 - dot(d, d), 0.0, 1.0);
  float flick = 1.0 - 0.10 * (1.0 - uSoft) * step(0.72, fract(sin(floor(uTime * 7.0) * 12.9898) * 43758.5453));
  col *= mix(uDark, 1.0, L * L * (3.0 - 2.0 * L)) * flick;
  col = mix(col, uFlashCol, uFlash);
  col += (bayer4(rp) - 0.5) * uDither;
  float best = 1e9;
  vec3 outc = uPal[0];
  for (int i = 0; i < 16; i++) {
    vec3 df = col - uPal[i];
    float dist = dot(df * df, vec3(0.95, 1.5, 0.75));
    if (dist < best) { best = dist; outc = uPal[i]; }
  }
  // líneas de barrido cada 4 px de pantalla
  outc *= mod(floor(sp.y), 4.0) < 1.0 ? 0.8 : 1.0;
  // transición por bloques de 32 px (o fundido si se reducen destellos)
  vec2 cell = floor(sp / 32.0);
  float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  float thr = cell.x / 40.0 * 0.35 + cell.y / 25.0 * 0.25 + h * 0.4;
  float k = clamp((uWipe - thr) * 3.2, 0.0, 1.0);
  vec2 local = abs(fract(sp / 32.0) - 0.5);
  float inside = step(max(local.x, local.y), ceil(k * 8.0) / 16.0) * step(0.001, k);
  outc = mix(outc, vec3(0.0), uSoft > 0.5 ? clamp(uWipe / 1.25, 0.0, 1.0) : inside);
  gl_FragColor = vec4(outc, 1.0);
}
`;

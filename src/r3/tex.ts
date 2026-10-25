import * as THREE from 'three';
import type { Painter } from '../art/painter';

const cache = new Map<string, THREE.CanvasTexture>();

/** Textura de píxeles nítidos a partir de un lienzo (sin mipmaps ni suavizado). */
export function canvasTex(c: HTMLCanvasElement, repeat?: [number, number]): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/** Textura cacheada por clave a partir de un `Painter`. */
export function tex(key: string, make: () => Painter, repeat?: [number, number]): THREE.CanvasTexture {
  let t = cache.get(key);
  if (!t) { t = canvasTex(make().canvas, repeat); cache.set(key, t); }
  return t;
}

/** Material sin iluminación para sprites de píxeles. */
export function spriteMat(map: THREE.Texture, tint = 0xffffff): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: tint, fog: false });
}

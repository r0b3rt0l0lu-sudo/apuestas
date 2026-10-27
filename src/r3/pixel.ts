import * as THREE from 'three';
import { canvasTex } from './tex';

/** Textura de píxeles nítidos dibujada con `draw` sobre un lienzo de w×h. */
export const cv = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (g) draw(g);
  return canvasTex(c);
};

/** Rectángulo sólido de píxeles. */
export const px = (g: CanvasRenderingContext2D, col: string, x: number, y: number, w = 1, h = 1): void => { g.fillStyle = col; g.fillRect(x, y, w, h); };

/** Material con la textura también como emisión, para que se lea en la penumbra. */
export const lit = (map: THREE.Texture, glowK = 0.45): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glowK });

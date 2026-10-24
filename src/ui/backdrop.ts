import Phaser from 'phaser';
import { C, H, W, hex } from '../config';
import { lampFlicker } from '../fx/flicker';

/** Fondo de feria abandonada: carpas, noria y guirnalda de bombillas. */
export function fairBackdrop(scene: Phaser.Scene, tint: number = hex(C.wood)): void {
  scene.add.rectangle(W / 2, H / 2, W, H, hex(C.bg)).setDepth(-10);
  const g = scene.add.graphics().setDepth(-9);
  g.fillStyle(hex(C.panel2));
  g.fillRect(0, 560, W, 240); // suelo
  g.fillStyle(tint, 0.6);
  for (let i = 0; i < 6; i++) g.fillTriangle(60 + i * 230, 470, 160 + i * 230, 330 + (i % 2) * 40, 260 + i * 230, 470);
  g.fillStyle(hex(C.panel));
  for (let i = 0; i < 6; i++) g.fillRect(70 + i * 230, 470, 180, 90);
  // noria
  g.lineStyle(6, hex(C.wood), 1);
  g.strokeCircle(1040, 300, 190);
  g.strokeCircle(1040, 300, 120);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.lineBetween(1040, 300, 1040 + Math.cos(a) * 190, 300 + Math.sin(a) * 190);
  }
  g.fillStyle(hex(C.wood));
  g.fillRect(1030, 300, 20, 260);
  // guirnalda
  const bulbs: Phaser.GameObjects.Rectangle[] = [];
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 50, y = 110 + Math.sin(i * 0.5) * 18 + 30;
    bulbs.push(scene.add.rectangle(x, y, 10, 10, hex(i % 5 === 0 ? C.danger : C.lamp)).setDepth(-8).setAlpha(i % 3 === 0 ? 0.25 : 0.9));
  }
  scene.time.addEvent({ delay: 700, loop: true, callback: () => bulbs.forEach((b) => b.setAlpha(Phaser.Math.Between(0, 4) === 0 ? 0.2 : 0.9)) });
  const lamp = scene.add.ellipse(640, 420, 900, 560, hex(C.lamp), 0.05).setDepth(-7);
  lampFlicker(scene, [lamp], 0.05);
  void H;
}

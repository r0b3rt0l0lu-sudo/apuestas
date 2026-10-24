import type Phaser from 'phaser';
import { session } from '../core/session';
import { T } from '../i18n/es';
import { Button } from './Button';
import { Overlay } from './Overlay';

/** Opciones: volumen general, música, efectos y reducir destellos (se guardan con la partida). */
export function openOptions(scene: Phaser.Scene, onClose?: () => void): void {
  const mk = (key: 'volume' | 'music' | 'sfx', title: string, y: number, add: (o: Phaser.GameObjects.GameObject) => void, group: { add: (b: Button) => Button }) => {
    const pct = () => `${title}: ${Math.round(session.options[key] * 100)} %`;
    const b = new Button(scene, 640, y, 640, 56, pct(), () => {
      const v = Math.round(((session.options[key] * 10 + 1) % 11)) / 10;
      session.setOptions({ [key]: v });
      b.setLabel(pct());
    }, { size: 32 });
    b.setDepth(502);
    add(b);
    group.add(b);
  };
  const ov: Overlay = new Overlay(scene, T.options, [], [
    { text: T.close, onClick: () => { ov.close(); onClose?.(); } }
  ], {
    w: 800,
    extraHeight: 300,
    extra: (add, group, y) => {
      mk('volume', T.opt.volume, y + 20, add, group);
      mk('music', T.opt.music, y + 90, add, group);
      mk('sfx', T.opt.sfx, y + 160, add, group);
      const flash = () => `${T.opt.reduceFlash}: ${session.options.reduceFlash ? T.opt.on : T.opt.off}`;
      const b = new Button(scene, 640, y + 230, 640, 56, flash(), () => {
        session.setOptions({ reduceFlash: !session.options.reduceFlash });
        b.setLabel(flash());
      }, { size: 32 });
      b.setDepth(502);
      add(b);
      group.add(b);
    }
  });
  ov.focusGroup.onBack = () => { ov.close(); onClose?.(); };
}

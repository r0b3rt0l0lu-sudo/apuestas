import Phaser from 'phaser';
import { C, H, W } from './config';
import { session } from './core/session';
import { CrtScene } from './fx/crt';
import { BootScene } from './scenes/BootScene';
import { DawnScene } from './scenes/DawnScene';
import { DeathScene } from './scenes/DeathScene';
import { DuelScene } from './scenes/DuelScene';
import { EndingScene } from './scenes/EndingScene';
import { HubScene } from './scenes/HubScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RaceScene } from './scenes/RaceScene';
import { RouletteScene } from './scenes/RouletteScene';
import { SlotsScene } from './scenes/SlotsScene';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: C.bg,
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, TitleScene, HubScene, SlotsScene, RouletteScene, RaceScene, DuelScene, DawnScene, DeathScene, EndingScene, CrtScene]
});

// Con ?debug se expone el juego y la sesión para pruebas de humo desde el navegador.
if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, { __game: game, __session: session });
}

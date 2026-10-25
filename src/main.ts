import Phaser from 'phaser';
import { H, W } from './config';
import { session } from './core/session';
import { CrtScene } from './fx/crt';
import { LookPipeline, applyLook } from './fx/look';
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
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  pipeline: { Look: LookPipeline } as unknown as Phaser.Types.Core.PipelineConfig,
  scene: [BootScene, PreloadScene, TitleScene, HubScene, SlotsScene, RouletteScene, RaceScene, DuelScene, DawnScene, DeathScene, EndingScene, CrtScene]
});

// El aspecto se aplica a todas las escenas de juego en cuanto se crean (no a la capa CRT).
game.events.once('ready', () => {
  game.scene.scenes.forEach((sc) => {
    if (sc.scene.key !== 'Crt') sc.events.on(Phaser.Scenes.Events.CREATE, () => applyLook(sc));
  });
});

// Con ?debug se expone el juego y la sesión para pruebas de humo desde el navegador.
if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, { __game: game, __session: session });
}

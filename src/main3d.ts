import { engine } from './r3/engine';
import * as router from './r3/router';
import { session } from './core/session';
import { initKit } from './ui/dom/kit';

/** Arranque del juego en 3D. */
async function boot(): Promise<void> {
  await Promise.all([document.fonts.load('32px "VT323"'), document.fonts.load('32px "Special Elite"')]).catch(() => undefined);
  initKit();
  const app = document.getElementById('app') as HTMLElement;
  const fit = () => { app.style.transform = `scale(${Math.min(window.innerWidth / 1280, window.innerHeight / 800)})`; };
  fit();
  window.addEventListener('resize', fit);
  engine.mount(app);
  router.goTitle();
  // Con ?debug se expone el motor y la sesión para pruebas de humo.
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { __engine: engine, __session: session, __router: router });
}

void boot();

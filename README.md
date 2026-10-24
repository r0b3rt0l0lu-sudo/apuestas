# La Última Feria

Roguelite de apuestas de terror para navegador (fichas ficticias, sin dinero real). Ver [CLAUDE.md](CLAUDE.md) para el diseño completo.

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # build estático en dist/
npm run test       # Vitest
npm run typecheck && npm run lint
```

TypeScript estricto + Vite + Phaser 3. La lógica (`src/core`, `src/games`) es TypeScript puro y está testeada; las escenas (`src/scenes`) solo la animan.

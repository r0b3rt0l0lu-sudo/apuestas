# CLAUDE.md — La Última Feria

Guía para Claude Code. Léela entera antes de tocar código. Si algo de este documento choca con una petición explícita del usuario, manda el usuario.

---

## 1. Qué estamos construyendo

**La Última Feria** es un juego de terror para navegador de escritorio, estructurado como un *roguelite* de apuestas.

- Te despiertas en una feria abandonada.
- Cada noche, **El Cobrador** (una moneda vieja y agrietada con chistera y monóculo) fija una **cuota** de fichas que debes reunir antes del amanecer.
- Para conseguirla tienes un número limitado de **acciones** que gastas en tres mesas: **tragaperras**, **ruleta** y **carreras de caballitos** de un tiovivo.
- Si pagas la cuota, sobrevives y pasas a la noche siguiente, con una cuota más alta.
- Si no la pagas, se abre la puerta de **Deudores**: un **duelo a muerte** contra El Cobrador con un trabuco.
  - Si lo ganas, la deuda se perdona y sigues.
  - Si lo pierdes, **mueres** y la partida vuelve a empezar desde la noche 1 (muerte permanente).
- La noche 7 es la última. Superarla es el final del juego.

Las fichas son **ficticias**. No hay dinero real, ni compras, ni nada que se pueda canjear. Esto no es negociable (ver §11).

### Referencia de diseño

El diseño visual está en un lienzo de Claude Design (privado; pide al usuario que lo comparta o que te exporte las pantallas):
`https://claude.ai/artifact/MGYWSKWgJyxtKVRSCCa5rk`

| Pantalla del lienzo | Escena del juego |
|---|---|
| Pasillo · elige mesa | `HubScene` |
| Tragaperras | `SlotsScene` |
| Ruleta | `RouletteScene` |
| Carreras de caballitos (6 carriles) | `RaceScene` |
| Skins de caballitos | referencia de arte de las 7 skins |
| Última oportunidad · El Cobrador | `DuelScene` |
| Noche superada | `DawnScene` |
| Has muerto | `DeathScene` |
| Personajes | referencia de arte, no es escena |
| Componente · El Cobrador / Caballito / Símbolo | sprites reutilizables |

Los prototipos del lienzo ya funcionan, pero **cada pantalla lleva su propio saldo**. En el juego real hay **un único estado de partida compartido** (ver §4). Ese es el cambio principal respecto al prototipo.

---

## 2. Stack

- **TypeScript** (modo `strict`) + **Vite**.
- **Phaser 3** para escenas, tweens, audio y entrada.
- **Vitest** para tests de la lógica.
- Sin backend. El guardado va en `localStorage`.
- Gestor de paquetes: `npm`.

No añadas frameworks de UI (React, Vue…) dentro del juego. Usa la UI con objetos de Phaser y, si hace falta, DOM superpuesto para los textos largos.

### Comandos

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # build de producción en dist/
npm run test       # Vitest, una pasada
npm run typecheck  # tsc --noEmit
npm run lint
```

Antes de dar una tarea por terminada: `npm run typecheck && npm run test && npm run build` deben pasar.

---

## 3. Estructura de carpetas

```
src/
  main.ts                  # arranque de Phaser y registro de escenas
  config.ts                # resolución, escalado, tokens de color y fuentes
  core/
    rng.ts                 # RNG con semilla (mulberry32); NUNCA Math.random en la lógica
    state.ts               # RunState + acciones puras (reducer)
    save.ts                # cargar/guardar en localStorage con versión
    nights.ts              # tabla de noches y maldiciones (§5)
    economy.ts             # pagos de cada juego (§6)
  games/
    slots.ts               # lógica pura de la tragaperras
    roulette.ts            # lógica pura de la ruleta
    race.ts                # lógica pura de las carreras
    duel.ts                # lógica pura del duelo + IA del Cobrador
  scenes/
    BootScene.ts PreloadScene.ts TitleScene.ts
    HubScene.ts SlotsScene.ts RouletteScene.ts RaceScene.ts
    DuelScene.ts DawnScene.ts DeathScene.ts
  ui/
    Hud.ts                 # barra de cuota, saldo y acciones (en todas las mesas)
    Button.ts Candle.ts Overlay.ts Typewriter.ts
  fx/
    crt.ts                 # scanlines + viñeta (pipeline post-FX o overlay)
    flicker.ts shake.ts flash.ts
  art/                     # SVG fuente de los personajes y símbolos
  audio/
tests/
  *.test.ts
```

**Regla de oro:** `core/` y `games/` son **TypeScript puro**, sin Phaser. Las escenas solo leen el estado, llaman a funciones puras y animan el resultado. Así toda la lógica se testea sin navegador.

---

## 4. Estado de la partida

```ts
type Game = 'slots' | 'roulette' | 'race';

interface RunState {
  version: 1;
  seed: number;
  night: number;            // 1..7
  balance: number;          // fichas actuales
  actionsLeft: number;      // acciones restantes esta noche
  history: NightResult[];   // noches pasadas
  phase: 'hub' | 'playing' | 'duel' | 'dawn' | 'dead' | 'ending';
  flags: Record<string, boolean>;   // eventos de historia ya vistos
}
```

- El saldo **pasa de una mesa a otra** y de una noche a la siguiente.
- Al amanecer se **descuenta la cuota** del saldo. Lo que sobra pasa a la noche siguiente.
- Cada acción de juego descuenta `actionsLeft` según su coste (§6).
- **Fin de la noche:**
  - El saldo llega a la cuota → fase `dawn` (puedes seguir jugando o ir a amanecer).
  - Quedan 0 acciones, o no hay saldo suficiente para la apuesta mínima de ninguna mesa, y no se llega → fase `duel`.
- Si se gana el duelo, la cuota se perdona, el saldo queda como estaba y se pasa a `dawn`.
- Si se pierde el duelo → `dead`. Se borra la partida guardada y se vuelve a la noche 1.
- Guarda tras **cada** acción resuelta. Si al cargar la versión no coincide, descarta el guardado sin romper el juego.

Todas las transiciones son funciones puras en `core/state.ts`, del tipo `apply(state, action) => state`. Necesitan tests.

---

## 5. Noches y maldiciones

| Noche | Cuota | Saldo inicial* | Acciones | Maldición |
|---|---|---|---|---|
| 1 | 1.000 | 500 | 20 | — (tutorial: El Cobrador explica las reglas) |
| 2 | 2.500 | arrastre | 20 | — |
| 3 | 5.000 | arrastre | 18 | Una bombilla de la tragaperras se funde: el rodillo 3 gira más tiempo |
| 4 | 9.000 | arrastre | 18 | El Ojo de la ruleta ve antes: hay dos ceros (0 y 00) |
| 5 | 15.000 | arrastre | 16 | Viuda corre mejor: su probabilidad sube a 0,10 y la de Ceniza baja a 0,26 |
| 6 | 25.000 | arrastre | 16 | El Cobrador hace trampas en el duelo: empieza con +1 vela |
| 7 | 50.000 | arrastre | 14 | Todas las anteriores a la vez |

\* Solo la noche 1 fija saldo. Si al empezar una noche el arrastre es menor que 300, se completa hasta 300 para que la partida no quede bloqueada.

Las maldiciones son datos en `nights.ts`, no `if` repartidos por las escenas. Cada mesa recibe `curses: Curse[]` y ajusta sus parámetros.

---

## 6. Reglas de cada mesa

Los costes en acciones obligan a elegir: la tragaperras es barata y de poco riesgo, las carreras son caras y de mucho riesgo.

### Tragaperras (`games/slots.ts`)

- Coste: **1 acción**. Apuestas posibles: 50 / 100 / 250.
- 3 rodillos con 1 línea de pago (la central).
- Bolsa ponderada de símbolos:

  | Símbolo | Peso | Tres iguales pagan |
  |---|---|---|
  | ojo | 5 | ×3 |
  | diente | 4 | ×5 |
  | polilla | 3 | ×10 |
  | llave | 3 | ×15 |
  | calavera | 2 | ×25 |
  | siete oxidado | 1 | ×50 |

- Dos ojos en cualquier posición de la línea: ×1 (te devuelve la apuesta).
- Animación: los rodillos paran escalonados a los 900, 1400 y 2100 ms.
- Expresión del Cobrador: `sonrisa` cuando pierdes, `cobra` si te quedan 3 acciones o menos y no llegas a la cuota, `acecho` en el resto de casos.

### Ruleta (`games/roulette.ts`)

- Coste: **2 acciones**. Fichas: 50 / 100 / 250 / 500.
- Ruleta europea con el orden real de la rueda (está en el prototipo).
- Apuestas:
  - Pleno: paga ×36 (incluye lo apostado).
  - Rojo, negro, par, impar, 1–18 y 19–36: pagan ×2.
  - El 0 pierde todas las apuestas exteriores.
- Noche 4 en adelante: añadir 00.
- La rueda gira 4 s con curva `cubic-bezier(.12,.62,.16,1)`. Calcula el ángulo final para que el número ganador quede bajo el puntero (fórmula en el prototipo).

### Carreras de caballitos (`games/race.ts`)

- Coste: **3 acciones**. Apuestas: 100 / 250 / 500.
- **6 carriles y 6 caballitos**, cada uno con su skin (ver §7, «Skins de caballito»):

  | Nº | Nombre | Skin | Paga | Probabilidad de ganar |
  |---|---|---|---|---|
  | 1 | Ceniza | `clasico` (`#BFB8A8`, crin `#5E5640`) | ×3 | 0,29 |
  | 2 | Óxido | `clasico` (`#A0603A`, crin `#4A2A16`) | ×4 | 0,22 |
  | 3 | Hueso | `esqueleto` | ×5 | 0,17 |
  | 4 | Brasa | `quemado` | ×6 | 0,14 |
  | 5 | Ahogada | `ahogado` | ×8 | 0,11 |
  | 6 | Viuda | `luto` | ×12 | 0,07 |

- **No uses tiempos uniformes:** con ellos todos ganarían igual y las cuotas no tendrían sentido. La probabilidad de cada uno es proporcional a la inversa de su pago.
  - Con estos pagos, cada apuesta devuelve de media un 85 %, sea cual sea el caballo. La casa se queda con un margen del 15 %.
  - Primero se sortea el ganador con esos pesos; después se generan tiempos coherentes con ese orden.
  - Escribe un test que simule 100.000 carreras y compruebe esas frecuencias (±1 %).
- Cada caballo tiene una curva de velocidad distinta para que haya adelantamientos visibles.

### Duelo (`games/duel.ts`)

Sigue las reglas del prototipo «Última oportunidad»:

- Cada uno tiene 4 velas.
- **Ronda:**
  - Se cargan entre 3 y 8 cartuchos, mezclando reales y de fogueo (al menos 1 de cada).
  - Se muestran los recuentos durante 3 s y luego se ocultan.
  - Cada jugador recibe 2 objetos, con un máximo de 6.
- **Turno:**
  - Disparas al rival o a ti mismo.
  - Si te disparas y era de fogueo, repites turno.
  - Un cartucho real quita 1 vela (2 con pólvora).
- **Objetos:**
  - Monóculo: ves el cartucho cargado.
  - Moneda trucada: invierte el cartucho cargado.
  - Vela: +1 vida, hasta el máximo.
  - Reloj de arena: el rival pierde su próximo turno.
  - Pólvora: el siguiente disparo hace doble daño.
- **IA del Cobrador** (función pura `decide(state, rng)`):
  1. Usa el reloj si puede.
  2. Si le falta una vela, usa una vela.
  3. Usa el monóculo si lo tiene.
  4. Si sabe que el cartucho es de fogueo y tiene la moneda, lo convierte en real.
  5. Si sabe qué hay cargado, actúa en consecuencia. Si no, dispara al jugador cuando la proporción de reales es mayor de 0,5, a sí mismo cuando es menor, y a cara o cruz cuando es exactamente 0,5.
  6. Si va a disparar al jugador con alta probabilidad de real, usa la pólvora.

Todas las tiradas aleatorias pasan por `core/rng.ts`. Una misma semilla debe reproducir la misma partida exacta; los tests dependen de ello.

---

## 7. Dirección de arte

Todo el juego es **oscuro, lo-fi y de terror psicológico**. Nada de gore: la tensión sale de la luz, el sonido y lo que se insinúa.

### Tokens de diseño

```ts
export const C = {
  bg: '#0D0A0E', panel: '#141012', panel2: '#120E10', wood: '#2E2418',
  text: '#D9CFB0', textDim: '#9C9278', textBright: '#EDE4C6',
  lamp: '#E8D27A', danger: '#C24A3A', dangerText: '#E88C7A', eyeRed: '#E0503C',
  blood: '#7A1E1E', felt: '#1B2620', brass: '#8C7442', gold: '#B8973A',
  bone: '#CFC6A8', rust: '#6E4A2E', patina: '#4E5A40',
};
```

- **Fuentes** (Google Fonts, autoalojadas en `public/fonts`): **VT323** para la interfaz y los números, **Special Elite** para títulos y nombres.
- Resolución base de **1280×800**, escalada con `Phaser.Scale.FIT` y fondo negro en los márgenes.
- **Post-proceso, siempre activo:**
  - Scanlines: franjas negras al 28 % cada 4 px.
  - Viñeta radial que llega al 88 % de negro en los bordes.
  - Parpadeo de la lámpara: escalonado y aleatorio, con caídas de opacidad a 0,35–0,7.

### Pixel art (obligatorio)

Todos los personajes, símbolos y objetos son **pixel art**. Nada de vectores suaves ni degradados en los sprites.

- **Tamaños de sprite:**

  | Sprite | Tamaño | Escala en pantalla |
  |---|---|---|
  | El Cobrador | 48×48 | ×6 en el duelo, ×5 en el pasillo |
  | Caballito | 48×40 | — |
  | Barra del tiovivo | capa aparte de 48×40, estática | — |
  | Símbolos de la tragaperras | 16×16 | ×5 en los rodillos |
  | Velas, trabuco y objetos | 16×16 o 32×16 | — |

- Escala siempre por **múltiplos enteros**, con `pixelArt: true` y `roundPixels: true` en Phaser. Nunca subpíxeles.
- Contorno de 1 px en `#0D0A0E`. Sombreado por bloques, sin *dithering* salvo en la niebla.
- Usa **solo la paleta de tokens** y los tonos de cada caballito. Los brillos de ojos y grietas son colores sólidos, no transparencias sobre el sprite.
- Las fuentes de referencia son los prototipos del lienzo (`Cobrador`, `Horse` y `Symbol`). Dibujan cada sprite píxel a píxel por código, con las coordenadas de cada rasgo. Pásalos a hojas de sprites PNG en `src/art/` (Aseprite o un script que vuelque los mapas de píxeles) y conserva las mismas coordenadas.
- **Animación por fotogramas, no por tweens de rotación.** Los giros suaves rompen el píxel. El balanceo se hace con saltos de 1 px.

### Lo inquietante

El terror sale de los detalles que se notan de reojo:

- **Fotograma glitch.** Cada pocos segundos, de forma irregular, un personaje enseña durante 1 fotograma (150 ms) su cara de verdad:
  - El Cobrador: un ojo rojo en la cuenca vacía, ojos extra en el cardenillo, una sonrisa que se sale de la moneda y una franja del sprite desplazada.
  - El caballito: el ojo se abre y te mira, la boca se abre más y la lágrima de óxido se vuelve roja.
- **Que no sea predecible:** usa dos periodos primos combinados (p. ej., 43 y 61 ticks), no un intervalo fijo.
- **Respeta la accesibilidad:** con «reducir destellos» activado, el glitch dura lo mismo pero sin desplazar franjas.
- El ojo de la ruleta y los ojos de la tragaperras parpadean y miran hacia los lados.
- En la cuenca vacía del Cobrador brilla a veces un punto tenue: algo hay dentro.

### Personajes

La versión final del lienzo es la de referencia.

**El Cobrador**
- Rasgos fijos:
  - Moneda con canto estriado e inscripción «IN DEBITUM · NULLA DIES SINE NUMMO».
  - Cardenillo y una grieta por la que sale luz.
  - Cuenca izquierda vacía, con una polilla saliendo de ella.
  - Ojo derecho tras un monóculo dorado con cadena, y pupila de rendija.
  - Chistera rasgada con agujeros, cinta roja y un pagaré que dice «DEBE».
  - Levita con corbatín rojo y reloj de bolsillo.
  - Dedos huesudos con anillos; tiene una moneda entre los dedos.
- Tres expresiones: `acecho`, `sonrisa`, `cobra`.
  - En `cobra`: el ojo y la grieta se vuelven rojos, abre la mandíbula con dos filas de dientes, frunce el ceño y la pupila se estrecha.
- Animaciones en bucle, con un tick de 150 ms:
  - Respiración: sube y baja 1 px cada 1,5 s.
  - Halo del ojo y brillo de la grieta: alternan cada 3 ticks.
  - Aleteo de la polilla: cada tick.
  - Tamborileo de un dedo: cada 6 ticks.
  - Parpadeo del monóculo: cada 50 ticks, excepto en `cobra`.
  - Glitch: ver «Lo inquietante».
- Separa en capas la boca, las cejas y el ojo para combinar las expresiones sin una hoja por cada mezcla.

**Caballito de tiovivo**
- Rasgos fijos:
  - Barra dorada con espiral que se queda quieta mientras el caballo se mueve.
  - Silla granate con ribete dorado, joyas, placa con número y borlas.
  - Guirnalda de flores marchitas.
  - Brida con remaches.
  - Pintura desconchada que deja ver la madera.
  - Oreja mellada.
  - Cuenca vacía con un punto rojo que parpadea y una lágrima de óxido.
  - Sonrisa abierta con dientes.
  - Pose de galope fija, con las rodillas dobladas.
- Galope de 2 fotogramas, alternando cada 300 ms. En el fotograma B sube 1 px; la barra no se mueve.
- El color y la crin son parámetros. Las patas lejanas se pintan con el color de la capa oscurecido al 62 %.
- El número del dorsal se dibuja con una fuente de píxeles de 3×5.

**Skins de caballito** (datos en `src/art/horseSkins.ts`; cada skin = paleta + capa de detalles sobre la base común):

| Skin | Colores | Rasgos propios | Animación extra |
|---|---|---|---|
| `clasico` | color y crin como parámetro | pintura desconchada, grietas | — |
| `esqueleto` | hueso `#E8E0C8`, crin `#9C9278` | costillas y vértebras del cuello marcadas, cuenca más grande, más dientes | — |
| `quemado` | carbón `#3A302A`, crin `#241C18` | grietas incandescentes, crin de brasas | brasas que alternan naranja y amarillo, humo que sube |
| `ahogado` | verdoso `#5E7A72`, crin `#2E4A3A` | algas colgando, percebes | algas que se mecen, gotas que caen |
| `luto` | negro `#2E2834`, crin `#0D0A0E` | velo de encaje sobre la cabeza, silla negra con plata | el ojo blanco solo parpadea de vez en cuando |
| `porcelana` | blanco `#E6E4DE`, crin `#B8B6B0` | flores azules, grietas, un agujero en el costado con un ojo rojo dentro | — |
| `trapo` | arpillera `#A08A6A`, crin `#5E4A32` | costuras, parche morado, botón en lugar de ojo, boca cosida | — |

- Una octava skin se desbloquea al superar la noche 7. Es una silueta sin número; su diseño está pendiente.
- Todas las skins comparten el galope, el glitch y la barra.

**Símbolos de la tragaperras:** ojo (con parpadeo y mirada lateral), diente con raíz manchada, polilla con ojos en las alas, llave oxidada, calavera con un punto rojo en una cuenca y siete oxidado que gotea. Siempre sobre fondo de papel viejo `#D6CBAE`.

### Tiempos de animación clave

| Momento | Tiempo |
|---|---|
| Apuntar el trabuco | 0,55 s, `easeOutBack` |
| Del apuntado al disparo | 1,3 s |
| Muzzle flash + destello de pantalla | 0,6 s |
| Impacto en el jugador | temblor de 5 ciclos de 0,15 s + destello rojo `#7A1E1E` |
| Paneles de fin de noche | fundido de 0,5 s |
| Has muerto | ver secuencia abajo |

**Secuencia de Has muerto:**

| Instante | Qué pasa |
|---|---|
| 0,6 s | El Cobrador empieza a acercarse; dura 3,2 s y escala de ×0,45 a ×1,7 |
| 1,2 s | La vela se apaga en 2,2 s |
| 3,6 s | Corte a negro |
| 4,2 s | Aparece el título |
| 5 s | Subtítulos |
| 6,2 s | Botones |

---

## 8. Audio

Cada sonido es un archivo propio en `src/audio/`. Si no hay asset, deja un marcador de posición y **no te inventes rutas**.

- Ambiente en bucle por escena:
  - Pasillo: zumbido eléctrico y goteo.
  - Tragaperras: mecánica oxidada.
  - Ruleta: bola rodando y respiración lejana.
  - Carreras: organillo de tiovivo **desafinado** que se ralentiza al acabar.
- Efectos: palanca, parada de rodillo, premio (un acorde roto), clic de fogueo, disparo, susurros del Cobrador.
- El volumen del ambiente baja a la mitad durante los diálogos.
- Opciones de volumen general, música y efectos, guardadas con la partida.

---

## 9. Textos

- Todo el texto del juego está en **español**, en `src/i18n/es.ts`; nada de cadenas sueltas en las escenas.
- Las frases del Cobrador van entre comillas angulares: «…».
- Tono: frases cortas, frías y con amenaza velada. Ejemplos del prototipo: «Doce tiradas. Ni una más.», «Te tiemblan las manos.», «Mañana, nueve mil.»
- Cada mesa tiene una lista de frases para cuando ganas y otra para cuando pierdes. Se eligen con el RNG, sin repetir la última.

---

## 10. Orden de trabajo

Haz los hitos **en este orden**. Al cerrar cada uno, `typecheck`, `test` y `build` deben pasar. Haz un commit por hito.

1. **Esqueleto.** Vite + Phaser + TS, escenas vacías navegables, tokens de color, fuentes y overlay CRT.
2. **Núcleo.** `rng`, `RunState`, reducer, guardado y tabla de noches, con tests completos de las transiciones del §4.
3. **Tragaperras jugable** con el HUD compartido (cuota, saldo, acciones).
4. **Ruleta jugable.**
5. **Carreras jugables**, con el test estadístico del §6.
6. **Duelo jugable**, con la IA y sus tests.
7. **Flujo completo:** pasillo → mesas → amanecer o duelo → muerte → reinicio, más la noche 7 y la pantalla de final.
8. **Maldiciones** de las noches 3 a 7.
9. **Arte final en pixel art:** hojas de sprites del Cobrador (3 expresiones + parpadeo + glitch), del caballito (2 fotogramas de galope + glitch, en las 7 skins), de los 6 símbolos, y de las velas, el trabuco y los objetos del duelo en el mismo estilo.
10. **Audio y pulido:** temblores, destellos, typewriter y opciones.
11. **Accesibilidad y QA** (§11).

Si un hito resulta demasiado grande, divídelo, pero no cambies el orden.

---

## 11. Reglas que no se rompen

- **Sin dinero real:** nada de compras, monedas premium, anuncios con recompensa ni conversiones a dinero. Si alguien lo pide, avisa y no lo implementes.
- **Aviso +18 y de contenido de terror** en la pantalla de título, antes de jugar.
- **Sin gore:** ni sangre explícita ni violencia gráfica. El daño se representa con velas que se apagan, destellos y sonido.
- **Accesibilidad:**
  - Opción para **reducir destellos y temblores**, que sustituye los destellos de pantalla por un fundido suave.
  - Todo se puede jugar con teclado.
  - Contraste del texto mínimo de 4,5:1.
  - Subtítulos para los susurros.
- **Aleatoriedad:** todo pasa por el RNG con semilla. Nunca `Math.random()` en `core/` ni en `games/`.
- **Lógica y escenas separadas:** si para testear una regla necesitas Phaser, la regla está en el sitio equivocado.
- No cambies cuotas, pesos ni pagos sin actualizar este documento y los tests a la vez.

---

## 12. Definición de terminado

- Se puede jugar una partida completa de 7 noches, o morir en cualquiera de ellas, sin errores en consola.
- La partida guardada sobrevive a recargar la página a mitad de una noche.
- Los tests cubren: transiciones de estado, pagos de cada mesa, frecuencias de las carreras, IA del duelo y reproducibilidad por semilla.
- `npm run build` genera un `dist/` estático que funciona servido desde cualquier hosting de archivos.

---

## 13. Estado de la implementación (notas de desarrollo)

Desviaciones y decisiones tomadas al implementar; revisar si alguna no encaja:

- **Phaser 3.90** (no 4): el documento pide Phaser 3.
- **Pixel art por código, sin hojas PNG** (`src/art/*.ts`): cada sprite se dibuja píxel a píxel con un lienzo (`Painter`) y se registra como textura al arrancar. No hay Aseprite ni PNG en `src/art/`; si se quieren hojas reales, hay que volcar esos mapas.
- **Skins `porcelana` y `trapo`**: dibujadas (`skin-<nombre>-<0|1>`) pero no se usan en ninguna carrera; la octava skin (silueta tras superar la noche 7) no está diseñada.
- **Audio sintetizado** (`src/audio/sfx.ts`): efectos y ambientes se generan con WebAudio; no hay archivos de sonido ni rutas inventadas. El bajado de volumen del ambiente durante los diálogos (`setDuck`) existe pero no se llama todavía.
- **Fase `dawn` al llegar a la cuota**: con la cuota cubierta y acciones por gastar, la partida sigue en `hub`/`playing` y `quotaMet()` habilita «Esperar al amanecer» (acción `sleep`). La fase `dawn` empieza al dormir o cuando ya no se puede jugar. Cubierto en `tests/core.test.ts`.
- **`RunState` ampliado** con `rng` (estado del RNG, para reproducir la partida al recargar) y `forgiven` (duelo ganado: cuota perdonada esa noche).
- El duelo no se guarda a mitad: al recargar en fase `duel` empieza un duelo nuevo con la misma semilla.
- `?debug` en la URL expone `window.__game` y `window.__session` para pruebas de humo.
- **Repaso visual (pixel art de mayor calidad y más animación):** a petición del usuario se rehizo el arte, lo que prevalece sobre las medidas del §7:
  - El Cobrador pasa a **64×64** (antes 48×48); los símbolos de la tragaperras a **24×24** (×4 en los rodillos); el trabuco a **48×24**. El caballito sigue en 48×40.
  - Sombreado con rampas de 5 tonos derivadas de los tokens (sombras hacia violeta, luces hacia crema), bisel por polígono, tramado ordenado y contorno selectivo en vez de un negro plano. Los tokens base no cambian.
  - Fondos de **320×200 mostrados a ×4** por escena (`src/art/scenery.ts`): feria nocturna, caseta con la tragaperras, sala de fieltro, carpa del tiovivo, sala de Deudores y amanecer. Capas animadas: estrellas, bombillas, noria (48 fotogramas), niebla, murciélagos y pájaros, llamas, público, foco con polvo.
  - Marcos de interfaz de 9 trozos (`ui-btn*`, `ui-panel`, `ui-dialog`), HUD con saldo que cuenta, cuota segmentada y velas de acciones.
  - Partículas de píxeles (`src/fx/particles.ts`): monedas, chispas, humo, polvo y confeti. Transición entre escenas por bloques de píxeles (`src/fx/wipe.ts`); con «reducir destellos» se usa un fundido.
  - `preview.html` (vite dev) muestra sprites y fondos a escala entera para iterar el arte: `/preview.html?set=fair|booth|felt|arena|duel|dawn|cb|horse|props`.

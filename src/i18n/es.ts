/** Todo el texto del juego. Las frases del Cobrador van entre comillas angulares. */
import { type Difficulty, actionsFor, nightDef, quotaFor } from '../core/nights';

export const fmt = (n: number): string => n.toLocaleString('es-ES');
const pct = (x: number): string => `${(x * 100).toFixed(0)} %`;

export const T = {
  title: 'LA ÚLTIMA FERIA',
  subtitle: 'Una noche más. Una cuota más.',
  titleQuotes: ['«Te estaba esperando.»', '«Siempre vuelven.»', '«La casa nunca duerme.»', '«Entra. La puerta ya está cerrada.»'],
  warnTitle: 'AVISO',
  warnBody: [
    'Contenido solo para mayores de 18 años.',
    'Juego de terror psicológico: imágenes inquietantes, destellos, sonidos repentinos y temática de apuestas.',
    'Las fichas son ficticias. No hay dinero real, ni compras, ni nada que se pueda canjear.',
    'Puedes reducir destellos y temblores en Opciones.'
  ],
  warnOk: 'Soy mayor de edad. Entrar',
  newGame: 'Nueva partida',
  continue: 'Continuar',
  options: 'Opciones',
  back: 'Volver',
  close: 'Cerrar',
  confirmNew: 'Esto borrará la partida guardada. ¿Empezar de nuevo?',
  yes: 'Sí',
  no: 'No',
  keysHint: 'Flechas: moverse · Intro/Espacio: elegir · Esc: volver',

  opt: { volume: 'Volumen general', music: 'Música y ambiente', sfx: 'Efectos', reduceFlash: 'Reducir destellos y temblores', sensitivity: 'Sensibilidad del ratón', hints: 'Controles en pantalla', minimap: 'Minimapa', on: 'Sí', off: 'No' },

  difficulty: {
    label: 'Dificultad',
    easy: 'Fácil',
    normal: 'Normal',
    hard: 'Difícil',
    desc: {
      easy: 'Cuotas un 30 % menores, 4 acciones más por noche, más saldo inicial, hipoteca al 20 % y cobros más suaves.',
      normal: 'La experiencia pensada: cuotas, acciones, hipoteca al 30 % y cobros de la casa estándar.',
      hard: 'Cuotas un 40 % mayores, 3 acciones menos por noche, menos saldo inicial, hipoteca al 40 % y cobros más duros.'
    } as Record<string, string>,
    short: (d: string) => `Dificultad: ${d}`
  },

  hud: {
    night: 'NOCHE', quota: 'CUOTA', balance: 'SALDO', actions: 'ACCIONES',
    endless: 'INFINITO', peak: 'MÁX', plays: 'JUGADAS',
    toll: (n: number) => `COBRO EN ${n}`,
    tollNow: (x: number) => `LA CASA COBRA −${fmt(x)}`
  },

  endless: {
    button: 'Modo infinito',
    best: (n: number) => `Récord: ${fmt(n)}`,
    confirm: 'Esto borrará la partida guardada. ¿Empezar el modo infinito?',
    house: 'La Casa',
    intro: [
      '«Aquí no hay noches ni cuota. Solo hay casa.»',
      `«Mil fichas. Cada diez jugadas, la casa cobra un poco más. Cuando no puedas apostar, se acabó.»`,
      '«Llega a cien mil y rompes la banca. Nadie lo ha hecho.»'
    ],
    hubLine: '«Juega. La casa espera.»',
    desk: (peak: number, best: number, rank: string, plays: number, toll: number) =>
      `«Máximo: ${fmt(peak)}. Récord: ${fmt(best)}. Rango: ${rank}. Jugadas: ${plays}. Próximo cobro: ${fmt(toll)}.»`,
    ranks: { novato: 'Novato', jugador: 'Jugador', tiburon: 'Tiburón', leyenda: 'Leyenda', banca: 'Rompebancas' } as Record<string, string>,
    deathSub: ['«La casa se queda con lo que queda.»'],
    score: (peak: number, rank: string) => `Máximo alcanzado: ${fmt(peak)} · Rango: ${rank}`,
    newBest: '¡Nuevo récord!',
    again: 'Otra partida infinita',
    winTitle: 'LA BANCA HA SALTADO',
    winLines: ['Cien mil fichas.', 'La casa no sabe qué hacer con tanta derrota.', '«…Esto no se había visto nunca. No se repetirá.»']
  },

  hub: {
    title: 'El pasillo',
    slots: 'Tragaperras',
    roulette: 'Ruleta',
    race: 'Carreras de caballitos',
    blackjack: 'Blackjack',
    mortgage: 'Hipoteca',
    cost: (c: number, min: number) => `${c} ${c === 1 ? 'acción' : 'acciones'} · apuesta mínima ${fmt(min)}`,
    sleep: 'Esperar al amanecer',
    unavailable: 'Sin acciones o fichas para esta mesa',
    quotaMet: '«La cuota está cubierta. Aún puedes tentar a la suerte.»',
    controls: 'WASD o flechas: moverte · clic en la sala: mirar con el ratón (Esc lo suelta) · F: usar · E: fumar · 1-5: mesas · M: plano · H: manual',
    use: (name: string) => `[F] ${name}`,
    smoke: ['«Fuma. Te queda poco tiempo y mucho humo.»', '«Esa tos no es del tabaco.»', '«Todo se consume, igual que tu cuota.»']
  },

  intro: {
    sign: ['CASINO', 'ABIERTO · 24 H'],
    goal: 'Entra en el casino.',
    inside: 'Está demasiado silencioso…',
    controls: 'WASD o flechas: moverte · clic en la escena: mirar con el ratón (Esc lo suelta) · E: fumar',
    skip: 'Saltar',
    hello: '¿Hola?',
    late: '«Llegas tarde.»',
    abducted: ['…', '«Bienvenido a la última feria.»', '«Llegas justo a tiempo para pagar.»']
  },

  secret: {
    nightHint: '«Esta noche, alguien golpea la puerta de Deudores desde dentro. Yo que tú no la abriría.»',
    doorLocked: 'DEUDORES. Cerrada. Se abrirá cuando no puedas pagar.',
    doorNight4: (n: number) => `DEUDORES. Algo respira al otro lado. La cerradura pide una llave, un nombre y una firma. Tienes ${n} de 3.`,
    vanity: 'Un tocador roto. Nada en los cajones.',
    vanityKey: 'Bajo el espejo del tocador, una llave de hierro con el nombre de alguien grabado: «DEUDOR». La guardas.',
    vanityDone: 'Solo queda el hueco donde estaba la llave.',
    ouijaWord: ['La plancheta se mueve sola: D… E… U… D… O… R.', 'Una palabra. Un nombre. Anotas «DEUDOR» en tu memoria.'],
    note: 'Tras el marco vacío hay un pagaré doblado. «Debo mi vida a la casa. — El Deudor». Está firmado con tu letra.',
    noteDone: 'El pagaré sigue en tu bolsillo.',
    title: 'LA PUERTA DE DEUDORES',
    body: [
      'Tienes la llave, el nombre y la firma. La cerradura gira sola.',
      'Detrás espera El Deudor: lo que queda de quien no pudo pagar. Es un duelo a muerte, con una vela más para él.',
      'Si lo vences, la feria se queda sin nadie que cobre. Si no, ya sabes cómo acaba.'
    ],
    open: 'Abrir la puerta',
    cancel: 'Todavía no',
    boss: 'EL DEUDOR',
    duelTitle: 'EL DEUDOR',
    duelIntro: ['«…»', 'Alguien se levanta de la silla del fondo. No lleva chistera. Lleva tu cara.', '«Pagué. Pagué. Pagué. Ahora te toca a ti.»'],
    win: 'Cae sobre la mesa. Detrás, la pared se abre: luz de verdad.',
    lose: '«Otro deudor.» La puerta se cierra.',
    endTitle: 'ESCAPASTE',
    endLines: [
      'El Deudor se deshace sobre el tapete: una levita vacía y una moneda.',
      'La puerta de la feria, la que no tenía picaporte, se abre sola.',
      'Afuera amanece de verdad. Detrás de ti, una moneda rueda por el suelo y se detiene.',
      '«…Siempre vuelvo.»'
    ],
    endAgain: 'Volver al título'
  },

  stats: {
    plays: 'Jugadas',
    wins: 'Victorias',
    biggest: 'Mayor ganancia',
    net: 'Balance',
    wagered: 'Apostado',
    returned: 'Cobrado',
    summary: (plays: number, wins: number, biggest: number, net: number) =>
      `Jugadas: ${plays} · Victorias: ${wins} · Mayor ganancia: ${fmt(biggest)} · Balance: ${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}`
  },

  manual: {
    button: 'Manual',
    title: 'MANUAL DE LA ÚLTIMA FERIA',
    prev: '‹ Anterior',
    next: 'Siguiente ›',
    page: (a: number, b: number) => `Página ${a} de ${b}`,
    hint: '← → cambian de página · RePág / AvPág o la rueda desplazan',
    pages: {
      welcome: {
        title: 'Bienvenido',
        lines: [
          'Despiertas en una feria abandonada. Las luces parpadean, el tiovivo gira solo y alguien te espera tras un mostrador: El Cobrador, una moneda vieja y agrietada con chistera.',
          'Todo lo que apuestas son fichas ficticias. No hay dinero real, ni compras, ni nada que se pueda canjear.',
          'Hay dos formas de jugar: la campaña de siete noches y el modo infinito. Las dos se eligen en la pantalla de título.'
        ]
      },
      rules: {
        title: 'Cómo se gana',
        lines: [
          'CAMPAÑA. Cada noche El Cobrador fija una cuota de fichas y te da un número limitado de acciones. Reúne la cuota con las tres mesas y espera al amanecer: la cuota se descuenta del saldo y lo que sobra pasa a la noche siguiente.',
          'Si te quedas sin acciones o sin fichas para apostar y no llegas, se abre la puerta de Deudores: un duelo a muerte. Si lo ganas, la deuda se perdona. Si lo pierdes, mueres y empiezas de cero.',
          'Ganas la campaña superando la noche 7 (cuota de 50.000).',
          'MODO INFINITO. Empiezas con 1.000 fichas, sin noches ni cuota. Juega todo lo que quieras, pero la casa cobra cada 10 jugadas. Pierdes cuando no te llega para la apuesta mínima. Ganas rompiendo la banca: 100.000 fichas.'
        ]
      },
      controls: {
        title: 'Controles',
        rows: [
          ['W A S D / flechas ↑ ↓', 'Andar por el pasillo'],
          ['Flechas ← →', 'Girar'],
          ['Clic en la escena', 'Capturar el ratón para mirar (Esc lo suelta)'],
          ['F · Intro · Espacio', 'Usar / entrar en una mesa / examinar'],
          ['1 · 2 · 3 · 4 · 5', 'Ir directo a tragaperras, ruleta, carreras, blackjack y hipoteca'],
          ['E', 'Fumar un cigarro'],
          ['Z', 'Esperar al amanecer (con la cuota cubierta)'],
          ['M · H · Esc', 'Minimapa · este manual · opciones'],
          ['En las mesas: Espacio', 'Jugar o repetir la última apuesta'],
          ['En las mesas: Esc', 'Volver al pasillo'],
          ['En el blackjack: P / S / D', 'Pedir carta / plantarse / doblar'],
          ['En el duelo: A / S', 'Disparar a El Cobrador / dispararte'],
          ['En el duelo: 1 – 5', 'Usar un objeto']
        ]
      },
      tables: { title: 'Las mesas' },
      duel: {
        title: 'El duelo',
        lines: [
          'Cada uno tiene 4 velas. Se cargan entre 3 y 8 cartuchos, reales y de fogueo, y al principio ves cuántos hay de cada. Después se ocultan.',
          'En tu turno disparas a El Cobrador o a ti mismo. Si te disparas y era de fogueo, repites turno. Un cartucho real quita una vela (dos con pólvora).',
          'OBJETOS. Monóculo: ves el cartucho cargado. Moneda trucada: lo invierte. Vela: recuperas una. Reloj de arena: el rival pierde su turno. Pólvora: el siguiente disparo hace doble daño.',
          'Cuenta los cartuchos y úsalos a tu favor: si quedan más reales que de fogueo, dispara a El Cobrador; si quedan más de fogueo, dispararte es gratis.'
        ]
      },
      money: {
        title: 'Hipoteca y la casa',
        lines: [
          'HIPOTECA (campaña). En el mostrador de El Cobrador puedes pedir fichas una vez por noche: el 20 %, 40 % o 60 % de la cuota. A cambio, esa cantidad más un 30 % se suma a la cuota de esa noche. Si ganas el duelo, la deuda se perdona.',
          'Sirve para jugar con más fichas, no para ganarlas gratis: tendrás que reunir más para llegar al amanecer.',
          'COBRO DE LA CASA (infinito). Cada 10 jugadas se lleva un porcentaje de tu saldo: 10 % el primero, 2 % más con cada cobro, hasta un 35 % (mínimo 50 fichas). La barra de arriba te dice cuántas jugadas faltan.',
          'RANGOS. Según tu saldo máximo: Novato, Jugador (2.500), Tiburón (10.000), Leyenda (40.000) y Rompebancas (100.000).'
        ]
      },
      hall: {
        title: 'El pasillo',
        lines: [
          'El pasillo no es solo el sitio donde se apuesta. Tiene salas que explorar: una al oeste, otra al este, una puerta al norte y una salida al sur.',
          'Pulsa M para ver el minimapa: las salas se dibujan cuando las visitas. Pulsa F ante cualquier cosa rara para examinarla.',
          'Algunas cosas dan fichas, otras solo miedo. Y El Cobrador te vigila: se mueve cuando tú te mueves.',
          'Con «Reducir destellos y temblores» (Opciones) los sustos y apagones se suavizan.'
        ]
      },
      tips: { title: 'Consejos' },
      run: { title: 'Tu partida' }
    },
    tables: {
      blackjack: 'BLACKJACK · 2 acciones · apuestas 50 / 100 / 250 / 500. Intenta acercarte a 21 sin pasarte y superar la mano de El Cobrador, que pide carta hasta llegar a 17. Blackjack (as + figura) paga 3 a 2; ganar paga el doble; empatar devuelve la apuesta. Doblar: duplicas la apuesta y recibes una sola carta. Las fichas se descuentan al repartir.',
      slots: 'TRAGAPERRAS · 1 acción · apuestas 50 / 100 / 250. Tres símbolos iguales en la línea central pagan según la tabla; dos iguales cualquiera devuelven la apuesta.',
      slotsCols: ['Símbolo', 'Peso', 'Tres iguales'],
      roulette: 'RULETA · 2 acciones · fichas 50 / 100 / 250 / 500. Pleno ×36; rojo, negro, par, impar, 1-18 y 19-36 ×2. El 0 devuelve la mitad de las exteriores. Desde la noche 4 hay también un 00.',
      race: 'CARRERAS · 3 acciones · apuestas 100 / 250 / 500. Elige un caballito: cuanto más improbable, más paga.',
      raceCols: ['Caballito', 'Paga', 'Gana'],
      rtp: (slots: number, rouletteExt: number, raceLo: number, raceHi: number) =>
        `Retorno medio: tragaperras ${pct(slots)} · ruleta ${pct(rouletteExt)} (exteriores) · carreras ${pct(raceLo)}–${pct(raceHi)}.`
    },
    tips: [
      'La tragaperras es la mesa más barata: una acción por jugada. Úsala para ir sumando sin gastar acciones.',
      'Las carreras cuestan tres acciones, pero un caballito de pago alto puede arreglarte la noche de golpe.',
      'La ruleta es casi justa. Apostar a rojo o negro es lo más seguro; un pleno es una lotería.',
      'Antes de pedir una hipoteca, calcula si te llega con las acciones que quedan: es dinero para jugar, no regalado.',
      'En el duelo, cuenta los cartuchos reales y de fogueo que quedan. Casi todo se decide ahí.',
      'No te quedes siempre en el pasillo: hay fichas escondidas por las salas.',
      'Si ves que no llegas a la cuota, la hipoteca y el duelo son tus salidas. Piensa cuál te conviene.',
      'La cuarta noche es distinta. Escucha lo que dice El Cobrador… y mira las puertas.'
    ],
    run: {
      empty: 'Todavía no has jugado ninguna ronda.',
      mode: (m: string) => `Modo: ${m}`,
      campaign: 'campaña',
      endless: 'infinito',
      night: (n: number) => `Noche ${n} de 7`,
      peak: (n: number) => `Saldo máximo: ${fmt(n)}`,
      best: (n: number) => `Récord del modo infinito: ${fmt(n)}`
    }
  },

  eggs: {
    examine: (label: string) => `[F] ${label}`,
    rooms: { mirrors: 'SALA DE LOS ESPEJOS', storage: 'ALMACÉN', archive: 'ARCHIVO DE DEUDAS' } as Record<string, string>,
    names: {
      coin: 'Moneda', ouija: 'Tablero', jukebox: 'Gramola', tv: 'Televisor', slot777: 'Tragaperras rota', mannequin: 'Maniquí',
      doll: 'Muñeca', jars: 'Frascos', mirror: 'Espejo', ledger: 'Libro de deudas', portraits: 'Retratos', emptyFrame: 'Marco vacío',
      lockedDoor: 'Puerta', vanity: 'Tocador', exit: 'Salida', phone: 'Teléfono', poster: 'Cartel', tarot: 'Cartas', clock: 'Reloj'
    } as Record<string, string>,
    coin: '«Una moneda con la cara de alguien que conoces.» Te la guardas: +100 fichas.',
    coinDone: 'Solo queda el hueco donde estaba la moneda.',
    ouija: ['La plancheta se mueve sola: S… A… L… I… R.', 'Debajo, tachado con uñas: S… I… E… M… P… R… E.'],
    jukebox: 'Suena el organillo del tiovivo, desafinado a propósito. Nadie ha metido ninguna moneda.',
    tv: ['Entre la nieve, un pasillo. Una figura de espaldas, fumando.', 'Se vuelve. Eres tú. La pantalla se apaga.'],
    slot777: '7… 7… 7… La palanca cede sola y caen setenta y siete fichas.',
    slot777Done: 'Los tres sietes te miran. Ya no queda nada.',
    mannequin: ['No te quita ojo. No se lo quites tú.', 'Cada vez que miras, está en otro sitio.'],
    doll: ['Muñeca de porcelana. Su sonrisa estaba más cerrada antes.', 'Giró la cabeza. Seguro que fue una corriente.'],
    jars: ['Frascos con ojos. Uno guiña.', 'Una etiqueta: «Los que miraron de más».'],
    mirror: ['Tu reflejo llega un segundo tarde.', 'Detrás de ti, el cristal enseña una chistera.'],
    ledger: (nights: number, mode: 'campaign' | 'endless', tolls: number) =>
      mode === 'endless' ? `Una página con tu nombre. Cobros de la casa: ${tolls}. Ninguno devuelto.` : `Noches saldadas: ${nights}. Todas con tu letra. Ninguna con tu permiso.`,
    portraits: ['Todos jugaron. Todos pagaron.', 'Los ojos de los retratos te siguen. Los de uno ya no están.'],
    emptyFrame: 'Un marco vacío. La placa dice: «TÚ».',
    lockedDoor: 'DEUDORES. Cerrada. Se abrirá cuando no puedas pagar.',
    exit: '«No hay salida. Hay cuota.» La puerta ni siquiera tiene picaporte.',
    exitEndless: 'Aquí no se sale. Solo se acumula.',
    phone: ['…respiración. Luego: «No es para ti.»', '…alguien cuelga primero. No fuiste tú.', '«Tu turno llega pronto.» Click.'],
    poster: '«ÚLTIMA VUELTA.» El payaso del cartel no está. Solo queda el globo.',
    tarot: 'La Torre. La Rueda. El Colgado. Tres cartas, ninguna buena.',
    clock: 'El reloj marca las 12:00. Lleva así desde la primera noche.',
    whispers: ['«Siete noches…»', '«No mires atrás.»', '«Cobra. Cobra. Cobra.»', '«Sigues aquí.»', '«Te oigo respirar.»'],
    ring: 'Suena un teléfono lejano. Nadie lo coge.',
    knock: 'Tres golpes. Vienen de dentro de la pared.'
  },

  mortgage: {
    title: 'LA HIPOTECA',
    body: [
      '«¿Cortos de fichas? Firma aquí. Te adelanto lo que pidas.»',
      'Recibes las fichas ahora y devuelves lo prestado más un 30 %, sumado a la cuota de esta noche. Solo una vez por noche. Si ganas el duelo, la deuda se perdona.'
    ],
    option: (amount: number, owed: number) => `Pedir ${fmt(amount)} · devolver ${fmt(owed)}`,
    cancel: 'Mejor no',
    hint: 'pide fichas prestadas',
    done: 'Ya hipotecaste esta noche',
    refuse: '«Ya firmaste esta noche. Una deuda a la vez.»',
    signed: (amount: number, owed: number) => `«Firmado. ${fmt(amount)} fichas tuyas. ${fmt(owed)} mías.»`
  },

  tutorial: [
    '«Bienvenido a la feria. No hay salida. Hay cuota.»',
    '«Cada noche fijo una cantidad de fichas. Si al amanecer no la tienes, abro la puerta de Deudores.»',
    '«Tienes acciones limitadas. La tragaperras cuesta una, la ruleta y el blackjack dos, y los caballitos tres.»',
    '«Si no pagas, tú y yo jugamos a otra cosa. Un trabuco. Cartuchos reales y de fogueo. Gana quien quede con velas.»',
    '«Siete noches. Empecemos.»'
  ],

  night: {
    intro: (n: number, diff: Difficulty = 'normal') => `«Noche ${n}. Cuota: ${fmt(quotaFor(n, diff))}. ${actionsFor(n, diff)} acciones. Ni una más.»`,
    curse: {
      slotReel3: 'Una bombilla de la tragaperras se ha fundido: el tercer rodillo tarda más.',
      doubleZero: 'El Ojo de la ruleta ve antes: ahora hay dos ceros (0 y 00).',
      widowFast: 'Viuda corre mejor. Ceniza, peor.',
      duelCandle: 'El Cobrador hace trampas: empieza el duelo con una vela de más.'
    },
    curseLine: (n: number) => {
      const own = nightDef(n).curse;
      if (n >= 7) return 'Todas las maldiciones, a la vez.';
      return own ? T.night.curse[own] : '';
    },
    nextWords: ['mil', 'dos mil quinientas', 'cinco mil', 'nueve mil', 'quince mil', 'veinticinco mil', 'cincuenta mil']
  },

  blackjack: {
    title: 'BLACKJACK',
    deal: 'Repartir',
    hit: 'Pedir',
    stand: 'Plantarse',
    double: 'Doblar',
    you: 'TÚ',
    dealer: 'COBRADOR',
    help: 'Blackjack paga 3 a 2 · el Cobrador se planta con 17 · doblar: una sola carta',
    blackjack: '¡BLACKJACK!',
    win: 'GANAS',
    lose: 'PIERDES',
    push: 'EMPATE',
    bust: 'TE PASAS',
    dealerBust: 'SE PASA EL COBRADOR',
    hidden: '?',
    back: 'Volver al pasillo'
  },

  slots: {
    title: 'TRAGAPERRAS',
    pull: 'Tirar de la palanca',
    paytable: 'Tres iguales',
    twoEyes: 'Dos iguales: te devuelve la apuesta',
    names: { ojo: 'Ojo', diente: 'Diente', polilla: 'Polilla', llave: 'Llave', calavera: 'Calavera', siete: 'Siete' } as Record<string, string>,
    bet: 'Apuesta',
    back: 'Volver al pasillo'
  },

  roulette: {
    title: 'RULETA',
    spin: 'Girar la rueda',
    bet: 'Ficha',
    kinds: { rojo: 'Rojo', negro: 'Negro', par: 'Par', impar: 'Impar', bajo: '1–18', alto: '19–36' } as Record<string, string>,
    pleno: 'Pleno',
    plenoHelp: 'Pleno ×36 · exteriores ×2 · el 0 devuelve la mitad',
    partage: (x: number) => `«El cero se queda con la mitad.» Te devuelve ${fmt(x)}.`,
    result: (label: string, color: string) => `Sale el ${label} ${color}`
  },

  race: {
    title: 'CARRERAS DE CABALLITOS',
    go: '¡Que corran!',
    pick: 'Elige caballito (1–6)',
    winner: (n: string) => `Gana ${n}`,
    bet: 'Apuesta'
  },

  duel: {
    title: 'ÚLTIMA OPORTUNIDAD',
    intro: ['«No llegaste.»', '«Se abre la puerta de Deudores.»', '«Un trabuco. Cuatro velas cada uno.»'],
    counts: (r: number, f: number) => `${r} real${r === 1 ? '' : 'es'} · ${f} fogueo`,
    hidden: 'Cartuchos ocultos',
    shootBoss: 'Disparar al Cobrador',
    shootSelf: 'Dispararte',
    yourTurn: 'Tu turno',
    bossTurn: 'Turno del Cobrador',
    click: 'Clic… era de fogueo.',
    bang: 'Cartucho real.',
    items: { monoculo: 'Monóculo', moneda: 'Moneda trucada', vela: 'Vela', reloj: 'Reloj de arena', polvora: 'Pólvora' } as Record<string, string>,
    itemHelp: {
      monoculo: 'Ves el cartucho cargado',
      moneda: 'Invierte el cartucho cargado',
      vela: '+1 vida',
      reloj: 'El rival pierde su próximo turno',
      polvora: 'Siguiente disparo: doble daño'
    } as Record<string, string>,
    seen: (s: string) => `El cartucho es ${s === 'real' ? 'REAL' : 'de fogueo'}.`,
    bossUses: (i: string) => `El Cobrador usa: ${i}`,
    bossShootsYou: 'El Cobrador te apunta.',
    bossShootsSelf: 'El Cobrador se apunta a sí mismo.',
    youShootBoss: 'Apuntas al Cobrador.',
    youShootSelf: 'Te apuntas a ti mismo.',
    skipped: 'Pierde su turno.',
    newRound: 'Nueva ronda. Se recarga el trabuco.',
    win: '«…Está bien. La deuda queda perdonada. Por hoy.»',
    lose: '«Qué pena.»'
  },

  dawn: {
    title: 'NOCHE SUPERADA',
    paid: (q: number) => `Cuota pagada: ${fmt(q)}`,
    forgiven: 'Deuda perdonada: el Cobrador pierde el duelo.',
    left: (b: number) => `Te quedan ${fmt(b)} fichas`,
    next: (words: string) => `«Mañana, ${words}.»`,
    go: 'Dormir hasta la noche siguiente',
    lastNext: '«Se acabó la feria.»'
  },

  death: {
    title: 'HAS MUERTO',
    sub: ['«Las deudas se pagan.»', 'La feria vuelve a abrir.'],
    again: 'Empezar de nuevo',
    nights: (n: number) => `Llegaste a la noche ${n}.`
  },

  ending: {
    title: 'AMANECE',
    lines: ['Siete noches. Siete cuotas.', 'La puerta de la feria se abre por primera vez.', '«…Volveré a cobrar. Siempre vuelvo.»'],
    again: 'Volver a la feria'
  },

  lines: {
    slotsWin: ['«La suerte de un principiante.»', '«Qué bonito sonido. Disfrútalo.»', '«Cógelas. Aún no se han ido.»', '«Algo se ha roto ahí dentro.»'],
    slotsLose: ['«Te tiemblan las manos.»', '«La máquina nunca olvida.»', '«Otra vez. Otra vez.»', '«Las monedas se acuerdan de mí.»'],
    rouletteWin: ['«El Ojo parpadeó. Te vio.»', '«Hoy te mira con cariño.»', '«No te acostumbres.»'],
    rouletteLose: ['«La bola siempre sabe.»', '«El cero te espera.»', '«Qué silencio, ¿verdad?»'],
    blackjackWin: ['«Las cartas te quieren hoy.»', '«Veintiuno. Qué casualidad.»', '«Disfruta la racha. No dura.»'],
    blackjackLose: ['«La baraja recuerda a los que se pasan.»', '«Casi. Siempre casi.»', '«Otra mano. Otra deuda.»'],
    raceWin: ['«Un caballito agradecido.»', '«Galopan hacia donde les mando.»', '«Cobra. Mientras puedas.»'],
    raceLose: ['«Cerraron la apuesta. Y los ojos.»', '«El tiovivo no se detiene por ti.»', '«Mañana, otra vuelta.»'],
    low: ['«Quedan pocas acciones. Qué pena.»', '«El tiempo se acaba.»']
  }
};

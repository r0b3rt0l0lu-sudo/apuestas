import type { Rng } from '../core/rng';

/** Carta: `rank` 1 (as) a 13 (rey); `suit` 0 corazones, 1 diamantes, 2 tréboles, 3 picas. */
export interface Card { rank: number; suit: 0 | 1 | 2 | 3 }

export const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const rankLabel = (c: Card): string => RANK_LABELS[c.rank - 1] ?? '?';

/** Baraja de 52 cartas barajada con el RNG de la partida (la misma semilla da la misma mano). */
export function newDeck(rng: Rng): Card[] {
  const cards: Card[] = [];
  for (let suit = 0; suit < 4; suit++) for (let rank = 1; rank <= 13; rank++) cards.push({ rank, suit: suit as Card['suit'] });
  return rng.shuffle(cards);
}

/** Valor de una mano: los ases valen 11 mientras no te pases (mano «blanda»). */
export function handValue(cards: readonly Card[]): { total: number; soft: boolean } {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 1) { aces++; total += 11; } else total += Math.min(10, c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

export const isBust = (cards: readonly Card[]): boolean => handValue(cards).total > 21;
export const isBlackjack = (cards: readonly Card[]): boolean => cards.length === 2 && handValue(cards).total === 21;

/** El Cobrador pide carta hasta llegar a 17 (se planta con cualquier 17). */
export const dealerMustHit = (cards: readonly Card[]): boolean => handValue(cards).total < 17;

/** Juega la mano del crupier sacando cartas de `deck` desde `next`; devuelve la mano final y la siguiente posición. */
export function playDealer(dealer: readonly Card[], deck: readonly Card[], next: number): { hand: Card[]; next: number } {
  const hand = [...dealer];
  let i = next;
  while (dealerMustHit(hand)) {
    const c = deck[i++];
    if (!c) break;
    hand.push(c);
  }
  return { hand, next: i };
}

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';

export function outcomeOf(player: readonly Card[], dealer: readonly Card[]): Outcome {
  if (isBust(player)) return 'bust';
  const pb = isBlackjack(player), db = isBlackjack(dealer);
  if (pb && db) return 'push';
  if (pb) return 'blackjack';
  if (db) return 'lose';
  if (isBust(dealer)) return 'win';
  const p = handValue(player).total, d = handValue(dealer).total;
  return p > d ? 'win' : p === d ? 'push' : 'lose';
}

/** Total devuelto (incluye lo apostado) para una apuesta `stake`: blackjack ×2,5, victoria ×2, empate ×1. */
export function payoutFor(outcome: Outcome, stake: number): number {
  switch (outcome) {
    case 'blackjack': return stake * 2.5;
    case 'win': return stake * 2;
    case 'push': return stake;
    default: return 0;
  }
}

/** Retorno medio de una estrategia simple (pedir con menos de 17), simulado con barajas reales. */
export function simulateSimple(rng: Rng, hands: number): number {
  let paid = 0;
  for (let h = 0; h < hands; h++) {
    const deck = newDeck(rng);
    let i = 0;
    const player: Card[] = [deck[i++] as Card, deck[i++] as Card];
    const dealer: Card[] = [deck[i++] as Card, deck[i++] as Card];
    if (!isBlackjack(player) && !isBlackjack(dealer)) while (handValue(player).total < 17) player.push(deck[i++] as Card);
    const d = isBust(player) || isBlackjack(player) ? { hand: dealer } : playDealer(dealer, deck, i);
    paid += payoutFor(outcomeOf(player, d.hand), 1);
  }
  return paid / hands;
}

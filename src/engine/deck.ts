import type { Card, Rank, Suit } from '../types';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const HAND_SIZE = 13;

/** ♠ > ♥ > ♦ > ♣ */
export const SUIT_VALUE: Record<Suit, number> = {
  spades: 4,
  hearts: 3,
  diamonds: 2,
  clubs: 1,
};

function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 2;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle. Returns a new array; does not mutate the input. */
export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Deals HAND_SIZE (13) cards to each of playerCount players from the top of the deck. */
export function dealCards(deck: Card[], playerCount: number): Card[][] {
  const needed = playerCount * HAND_SIZE;
  if (deck.length < needed) {
    throw new Error(`Not enough cards to deal: need ${needed}, have ${deck.length}`);
  }

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < needed; i++) {
    hands[i % playerCount].push(deck[i]);
  }
  return hands;
}

/** Compares two cards by value, then suit as a tiebreaker. Positive if a > b, negative if b > a. */
export function compareCards(a: Card, b: Card): number {
  if (a.value !== b.value) return a.value - b.value;
  return SUIT_VALUE[a.suit] - SUIT_VALUE[b.suit];
}

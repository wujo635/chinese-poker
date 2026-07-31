import type { Card } from '../types';

/**
 * Category numbers match the spec's 1-10 hand ranking list. Royal Flush (10) is not a
 * distinct numeric category from Straight Flush (9) — a straight flush whose high card is
 * an Ace naturally ranks above all other straight flushes via the tiebreaker, so it shares
 * category 9 internally. `identifyHandType` still reports it as "Royal Flush" for display.
 */
export const HAND_TYPE_NAMES = [
  '', // no category 0
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush',
] as const;

/** [category, ...tiebreakers], comparable lexicographically. */
export type HandStrength = number[];

function isFlush(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

/** Returns the straight's high card value, or null if the cards don't form a straight.
 * Special-cases the A-2-3-4-5 wheel, whose high card is 5, not the Ace's 14. */
function straightHighCard(cards: Card[]): number | null {
  const uniqueValues = [...new Set(cards.map((c) => c.value))].sort((a, b) => a - b);
  if (uniqueValues.length !== cards.length) return null;

  const isWheel = uniqueValues.join(',') === [2, 3, 4, 5, 14].join(',');
  if (isWheel) return 5;

  const isSequential = uniqueValues.every(
    (v, i) => i === 0 || v === uniqueValues[i - 1] + 1,
  );
  return isSequential ? uniqueValues[uniqueValues.length - 1] : null;
}

/** [[value, count], ...] sorted by count desc, then value desc. */
function rankCounts(cards: Card[]): [value: number, count: number][] {
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
}

/**
 * Computes a comparable strength tuple for a 3-card (front) or 5-card (middle/back) hand.
 * Front hands only ever reach High Card / Pair / Three of a Kind — straights and flushes
 * are not meaningful with just 3 cards under standard Chinese Poker rules.
 */
export function getHandStrength(cards: Card[]): HandStrength {
  const counts = rankCounts(cards);
  const pattern = counts.map(([, count]) => count);
  const flush = cards.length === 5 && isFlush(cards);
  const straightHigh = cards.length === 5 ? straightHighCard(cards) : null;

  if (straightHigh !== null && flush) return [9, straightHigh];
  if (pattern[0] === 4) {
    const [quad] = counts[0];
    const [kicker] = counts[1];
    return [8, quad, kicker];
  }
  if (pattern[0] === 3 && pattern[1] === 2) {
    const [trip] = counts[0];
    const [pair] = counts[1];
    return [7, trip, pair];
  }
  if (flush) return [6, ...counts.map(([v]) => v)];
  if (straightHigh !== null) return [5, straightHigh];
  if (pattern[0] === 3) {
    const [trip] = counts[0];
    const kickers = counts.slice(1).map(([v]) => v);
    return [4, trip, ...kickers];
  }
  if (pattern[0] === 2 && pattern[1] === 2) {
    const [highPair] = counts[0];
    const [lowPair] = counts[1];
    const [kicker] = counts[2];
    return [3, highPair, lowPair, kicker];
  }
  if (pattern[0] === 2) {
    const [pair] = counts[0];
    const kickers = counts.slice(1).map(([v]) => v);
    return [2, pair, ...kickers];
  }
  return [1, ...counts.map(([v]) => v)];
}

export function getSuitValue(suit: Card['suit']): number {
  return { spades: 4, hearts: 3, diamonds: 2, clubs: 1 }[suit];
}

export function identifyHandType(cards: Card[]): string {
  const [category] = getHandStrength(cards);
  if (category === 9) {
    const high = straightHighCard(cards);
    if (high === 14) return 'Royal Flush';
  }
  return HAND_TYPE_NAMES[category];
}

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

interface StraightInfo {
  /** The card value used to rank this straight against others (see wheel note below). */
  rankHigh: number;
  /** The straight's actual high card, for display/labeling (e.g. Royal Flush detection). */
  displayHigh: number;
}

/**
 * Returns straight-ranking info, or null if the cards don't form a straight. Special-cases
 * the A-2-3-4-5 wheel: it displays as "5-high" (the Ace plays low), but per house rule it
 * ranks as the second-strongest straight — just below the Ace-high (broadway) straight and
 * above every other straight — not the weakest as its low display value would otherwise
 * imply. `rankHigh: 13.5` sits strictly between K-high (13) and broadway (14) for exactly
 * that purpose; it's never shown to the user, only compared.
 */
function straightInfo(cards: Card[]): StraightInfo | null {
  const uniqueValues = [...new Set(cards.map((c) => c.value))].sort((a, b) => a - b);
  if (uniqueValues.length !== cards.length) return null;

  const isWheel = uniqueValues.join(',') === [2, 3, 4, 5, 14].join(',');
  if (isWheel) return { rankHigh: 13.5, displayHigh: 5 };

  const isSequential = uniqueValues.every(
    (v, i) => i === 0 || v === uniqueValues[i - 1] + 1,
  );
  if (!isSequential) return null;
  const high = uniqueValues[uniqueValues.length - 1];
  return { rankHigh: high, displayHigh: high };
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
  const straight = cards.length === 5 ? straightInfo(cards) : null;

  if (straight !== null && flush) return [9, straight.rankHigh];
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
  if (straight !== null) return [5, straight.rankHigh];
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
  return { spades: 4, hearts: 3, clubs: 2, diamonds: 1 }[suit];
}

export function identifyHandType(cards: Card[]): string {
  const [category] = getHandStrength(cards);
  if (category === 9) {
    const straight = straightInfo(cards);
    if (straight?.displayHigh === 14) return 'Royal Flush';
  }
  return HAND_TYPE_NAMES[category];
}

import type { Card } from '../types';
import { getHandStrength } from './handRank';
import { getSuitValue } from './handRank';

function compareStrength(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** The highest-value card in a hand, used as a last-resort suit tiebreaker. */
function highestCard(cards: Card[]): Card {
  return [...cards].sort((a, b) => b.value - a.value || getSuitValue(b.suit) - getSuitValue(a.suit))[0];
}

/**
 * Compares two hands (both front-3 or both middle/back-5). Positive if hand1 wins,
 * negative if hand2 wins, 0 for a true tie. Falls back to a suit tiebreaker on each
 * hand's highest card if the rank-based strength is exactly equal.
 */
export function compareHands(hand1: Card[], hand2: Card[]): number {
  const strengthDiff = compareStrength(getHandStrength(hand1), getHandStrength(hand2));
  if (strengthDiff !== 0) return strengthDiff;

  const high1 = highestCard(hand1);
  const high2 = highestCard(hand2);
  return getSuitValue(high1.suit) - getSuitValue(high2.suit);
}

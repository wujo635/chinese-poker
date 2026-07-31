import type { Arrangement, Card, FiveCardHand, FrontHand } from '../types';
import { compareHands } from './compareHands';

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, k - 1).map((combo) => [first, ...combo]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

/** The strongest possible 5-card hand out of a pool of cards, by brute force. */
function bestFiveOf(cards: Card[]): Card[] {
  const combos = combinations(cards, 5);
  return combos.reduce((best, combo) => (compareHands(combo, best) > 0 ? combo : best));
}

/**
 * Greedy AI: pick the strongest possible back (5 of 13), then the strongest possible
 * middle from what's left (5 of 8), then whatever 3 cards remain become the front.
 * Because back gets first pick of the best cards, this arrangement satisfies
 * back > middle in the vast majority of hands, though a foul is still theoretically
 * possible on rare, weak hands — acceptable for an MVP per the spec's own suggestion.
 */
export function generateAIArrangement(hand: Card[]): Arrangement {
  const back = bestFiveOf(hand) as FiveCardHand;
  const afterBack = hand.filter((c) => !back.includes(c));

  const middle = bestFiveOf(afterBack) as FiveCardHand;
  const front = afterBack.filter((c) => !middle.includes(c)) as FrontHand;

  return { front, middle, back };
}

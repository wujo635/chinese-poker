import type { Arrangement, Card, FiveCardHand, FrontHand } from '../types';
import { compareHands } from './compareHands';
import { frontPoints, middlePoints, backPoints } from './game';
import { getHandStrength } from './handRank';
import { validateArrangement } from './validate';

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

/**
 * Optimal AI: brute-forces every valid (front, middle, back) partition of the 13-card
 * hand and picks the one maximizing total zone points from the game's real scoring table
 * (frontPoints/middlePoints/backPoints), rather than greedily maximizing the back hand
 * alone. This is a globally optimal maximizer, not a distinct "personality" — it still
 * always plays for the highest score, just correctly across all three zones together
 * instead of one at a time. E.g. a natural Four of a Kind is worth more in the middle (8)
 * than the back (4): whenever a legal (non-fouling) arrangement can place it there, this
 * exhaustive search finds it automatically, since it's simply the highest-scoring option
 * among every partition examined (verified: two-quad and straight-flush-plus-quad hands
 * both correctly move the weaker/movable strong hand to the middle). A lone unbeatable
 * hand (nothing else in the deal can beat it) is correctly forced to stay in back, since
 * back must always beat middle — that's the rules, not a missed opportunity. Prefers a
 * non-fouling arrangement; falls back to the highest-scoring arrangement overall only if
 * every partition fouls (same accepted-risk caveat as generateAIArrangement above).
 *
 * frontPoints/middlePoints/backPoints only reward a handful of top categories (Trips,
 * Full House, Four of a Kind, Straight Flush) — every other category from High Card
 * through Flush/Straight scores a flat 1 regardless of actual strength, so many valid
 * partitions tie on `total`. Ties are broken by raw hand strength (the sum of each zone's
 * category number): without this, the search would settle on whichever formally-tied
 * partition it happened to enumerate first, which could arbitrarily leave a Flush sitting
 * unused in the discard pile while the back plays a bare Pair — same formal score, but a
 * materially worse hand to actually put in front of an opponent.
 */
export function generateOptimalArrangement(hand: Card[]): Arrangement {
  let best: Arrangement | null = null;
  let bestScore = -Infinity;
  let bestRawStrength = -Infinity;
  let bestValid: Arrangement | null = null;
  let bestValidScore = -Infinity;
  let bestValidRawStrength = -Infinity;

  for (const frontCombo of combinations(hand, 3)) {
    const afterFront = hand.filter((c) => !frontCombo.includes(c));
    const frontCategory = getHandStrength(frontCombo)[0];
    const frontScore = frontPoints(frontCategory);

    for (const middleCombo of combinations(afterFront, 5)) {
      const backCombo = afterFront.filter((c) => !middleCombo.includes(c));
      const middleCategory = getHandStrength(middleCombo)[0];
      const backCategory = getHandStrength(backCombo)[0];
      const total = frontScore + middlePoints(middleCategory) + backPoints(backCategory);
      const rawStrength = frontCategory + middleCategory + backCategory;

      const front = frontCombo as FrontHand;
      const middle = middleCombo as FiveCardHand;
      const back = backCombo as FiveCardHand;
      const arrangement: Arrangement = { front, middle, back };

      if (total > bestScore || (total === bestScore && rawStrength > bestRawStrength)) {
        bestScore = total;
        bestRawStrength = rawStrength;
        best = arrangement;
      }
      const isValid = validateArrangement(front, middle, back).isValid;
      if (isValid && (total > bestValidScore || (total === bestValidScore && rawStrength > bestValidRawStrength))) {
        bestValidScore = total;
        bestValidRawStrength = rawStrength;
        bestValid = arrangement;
      }
    }
  }

  return bestValid ?? best!;
}

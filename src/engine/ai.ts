import type { Arrangement, Card, FiveCardHand, FrontHand } from '../types';
import { compareHands } from './compareHands';
import { frontPoints, middlePoints, backPoints } from './game';
import { getHandStrength, type HandStrength } from './handRank';
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

/** Lexicographic compare of two [category, ...tiebreakers] tuples; missing entries treated as 0. */
function compareTuples(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface PartitionMetrics {
  total: number;
  rawStrength: number;
  front: HandStrength;
  middle: HandStrength;
  back: HandStrength;
}

/**
 * Ranks two partitions that both maximize `total` (formal score): first by raw hand
 * strength (category sum, existing tie-break), then by front/middle/back tuple in that
 * priority order. Front is compared before middle/back because it's the zone most often
 * left with an arbitrary leftover card grouping once score is already maximized — e.g.
 * given a choice of which of several same-category pairs to leave in front, prefer the
 * highest one, since front is the zone most likely to be individually beaten by an
 * opponent and a higher pair wins more of those 1-on-1 comparisons even though the formal
 * point value is identical.
 */
function isBetterPartition(candidate: PartitionMetrics, current: PartitionMetrics): boolean {
  if (candidate.total !== current.total) return candidate.total > current.total;
  if (candidate.rawStrength !== current.rawStrength) return candidate.rawStrength > current.rawStrength;
  const frontCmp = compareTuples(candidate.front, current.front);
  if (frontCmp !== 0) return frontCmp > 0;
  const middleCmp = compareTuples(candidate.middle, current.middle);
  if (middleCmp !== 0) return middleCmp > 0;
  return compareTuples(candidate.back, current.back) > 0;
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
 * partitions tie on `total`, and often tie further on raw category sum too (e.g. any of
 * several same-rank pairs can occupy front with identical category). `isBetterPartition`
 * breaks these remaining ties by comparing full hand-strength tuples (front, then middle,
 * then back) so the search settles on a deterministic, materially-strongest choice among
 * formally-equal options instead of whichever one it happened to enumerate first.
 */
export function generateOptimalArrangement(hand: Card[]): Arrangement {
  let best: Arrangement | null = null;
  let bestMetrics: PartitionMetrics = { total: -Infinity, rawStrength: -Infinity, front: [], middle: [], back: [] };
  let bestValid: Arrangement | null = null;
  let bestValidMetrics: PartitionMetrics = { total: -Infinity, rawStrength: -Infinity, front: [], middle: [], back: [] };

  for (const frontCombo of combinations(hand, 3)) {
    const afterFront = hand.filter((c) => !frontCombo.includes(c));
    const frontStrength = getHandStrength(frontCombo);
    const frontScore = frontPoints(frontStrength[0]);

    for (const middleCombo of combinations(afterFront, 5)) {
      const backCombo = afterFront.filter((c) => !middleCombo.includes(c));
      const middleStrength = getHandStrength(middleCombo);
      const backStrength = getHandStrength(backCombo);
      const total = frontScore + middlePoints(middleStrength[0]) + backPoints(backStrength[0]);
      const rawStrength = frontStrength[0] + middleStrength[0] + backStrength[0];
      const metrics: PartitionMetrics = { total, rawStrength, front: frontStrength, middle: middleStrength, back: backStrength };

      const front = frontCombo as FrontHand;
      const middle = middleCombo as FiveCardHand;
      const back = backCombo as FiveCardHand;
      const arrangement: Arrangement = { front, middle, back };

      if (isBetterPartition(metrics, bestMetrics)) {
        bestMetrics = metrics;
        best = arrangement;
      }
      const isValid = validateArrangement(front, middle, back).isValid;
      if (isValid && isBetterPartition(metrics, bestValidMetrics)) {
        bestValidMetrics = metrics;
        bestValid = arrangement;
      }
    }
  }

  return bestValid ?? best!;
}

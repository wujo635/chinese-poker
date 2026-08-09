import { describe, it, expect } from 'vitest';
import { generateAIArrangement, generateOptimalArrangement } from '../ai';
import { createDeck, shuffleDeck } from '../deck';
import { validateArrangement } from '../validate';
import { frontPoints, middlePoints, backPoints } from '../game';
import { getHandStrength } from '../handRank';
import type { Card } from '../../types';

function totalPoints(front: Card[], middle: Card[], back: Card[]): number {
  return (
    frontPoints(getHandStrength(front)[0]) +
    middlePoints(getHandStrength(middle)[0]) +
    backPoints(getHandStrength(back)[0])
  );
}

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

describe('generateAIArrangement', () => {
  it('uses every card in the hand exactly once, split 3/5/5', () => {
    const deck = shuffleDeck(createDeck(), () => 0.42);
    const hand = deck.slice(0, 13);
    const { front, middle, back } = generateAIArrangement(hand);

    expect(front).toHaveLength(3);
    expect(middle).toHaveLength(5);
    expect(back).toHaveLength(5);

    const used = [...front, ...middle, ...back];
    const usedKeys = new Set(used.map((card) => `${card.suit}-${card.rank}`));
    const handKeys = new Set(hand.map((card) => `${card.suit}-${card.rank}`));
    expect(usedKeys).toEqual(handKeys);
    expect(used).toHaveLength(13);
  });

  it('produces a valid (non-fouling) arrangement for a strong, well-distributed hand', () => {
    const hand: Card[] = [
      c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13),
      c('spades', 'Q', 12), c('hearts', 'Q', 12),
      c('spades', '7', 7), c('hearts', '4', 4), c('diamonds', '3', 3), c('clubs', '2', 2),
    ];
    const { front, middle, back } = generateAIArrangement(hand);
    const result = validateArrangement(front, middle, back);
    expect(result.isValid).toBe(true);
  });

  it('puts the strongest 5-card hand available in the back', () => {
    const hand: Card[] = [
      c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13),
      c('spades', 'Q', 12), c('hearts', 'Q', 12),
      c('spades', '7', 7), c('hearts', '4', 4), c('diamonds', '3', 3), c('clubs', '2', 2),
    ];
    const { back } = generateAIArrangement(hand);
    // Four aces is the strongest 5-card hand obtainable from this pool.
    expect(back.filter((card) => card.rank === 'A')).toHaveLength(4);
  });
});

describe('generateOptimalArrangement', () => {
  it('uses every card in the hand exactly once, split 3/5/5', () => {
    const deck = shuffleDeck(createDeck(), () => 0.42);
    const hand = deck.slice(0, 13);
    const { front, middle, back } = generateOptimalArrangement(hand);

    expect(front).toHaveLength(3);
    expect(middle).toHaveLength(5);
    expect(back).toHaveLength(5);

    const used = [...front, ...middle, ...back];
    const usedKeys = new Set(used.map((card) => `${card.suit}-${card.rank}`));
    const handKeys = new Set(hand.map((card) => `${card.suit}-${card.rank}`));
    expect(usedKeys).toEqual(handKeys);
    expect(used).toHaveLength(13);
  });

  it('produces a valid (non-fouling) arrangement for a strong, well-distributed hand', () => {
    const hand: Card[] = [
      c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13),
      c('spades', 'Q', 12), c('hearts', 'Q', 12),
      c('spades', '7', 7), c('hearts', '4', 4), c('diamonds', '3', 3), c('clubs', '2', 2),
    ];
    const { front, middle, back } = generateOptimalArrangement(hand);
    const result = validateArrangement(front, middle, back);
    expect(result.isValid).toBe(true);
  });

  it('avoids breaking up a Full House for a marginally stronger Four of a Kind kicker, scoring higher than the greedy Maximizer on the same hand', () => {
    // Quad 4s (+ a spare kicker card) and a separate Full House (777/99) can't both be
    // kept intact if the greedy Maximizer picks the single strongest raw 5-card hand
    // for the back (Four of a Kind, any kicker) — its best-available kicker is a 9,
    // which cannibalizes one of the two 9s the Full House needs, leaving only Three of
    // a Kind for the middle. The optimal search correctly keeps the Full House intact
    // instead, since a kicker doesn't add any backPoints for a Four of a Kind anyway.
    const hand: Card[] = [
      c('clubs', '4', 4), c('diamonds', '4', 4), c('hearts', '4', 4), c('spades', '4', 4), c('clubs', '2', 2),
      c('clubs', '7', 7), c('diamonds', '7', 7), c('hearts', '7', 7), c('clubs', '9', 9), c('diamonds', '9', 9),
      c('spades', '5', 5), c('diamonds', '6', 6), c('hearts', '3', 3),
    ];

    const maximizer = generateAIArrangement(hand);
    const optimal = generateOptimalArrangement(hand);

    expect(validateArrangement(optimal.front, optimal.middle, optimal.back).isValid).toBe(true);
    expect(getHandStrength(optimal.middle)[0]).toBe(7); // Full House
    expect(getHandStrength(optimal.back)[0]).toBe(8); // Four of a Kind

    const maximizerTotal = totalPoints(maximizer.front, maximizer.middle, maximizer.back);
    const optimalTotal = totalPoints(optimal.front, optimal.middle, optimal.back);
    expect(optimalTotal).toBeGreaterThan(maximizerTotal);
  });

  it('moves the weaker of two Four of a Kinds to the middle for the bigger payout, since the stronger one can still legally beat it from the back', () => {
    const hand: Card[] = [
      c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13),
      c('spades', 'Q', 12), c('hearts', '9', 9), c('diamonds', '7', 7), c('clubs', '4', 4), c('spades', '2', 2),
    ];
    const { middle, back } = generateOptimalArrangement(hand);

    expect(getHandStrength(middle)[0]).toBe(8); // Four of a Kind (kings) — worth 8 in the middle
    expect(middle.filter((card) => card.rank === 'K')).toHaveLength(4);
    expect(getHandStrength(back)[0]).toBe(8); // Four of a Kind (aces) — beats the middle's kings
    expect(back.filter((card) => card.rank === 'A')).toHaveLength(4);
  });

  it('moves a Four of a Kind to the middle when a separate Straight Flush is available to hold the back', () => {
    const hand: Card[] = [
      c('spades', '5', 5), c('spades', '6', 6), c('spades', '7', 7), c('spades', '8', 8), c('spades', '9', 9),
      c('clubs', '3', 3), c('diamonds', '3', 3), c('hearts', '3', 3), c('spades', '3', 3),
      c('hearts', 'K', 13), c('diamonds', 'Q', 12), c('clubs', 'J', 11), c('hearts', '10', 10),
    ];
    const { middle, back } = generateOptimalArrangement(hand);

    expect(getHandStrength(middle)[0]).toBe(8); // Four of a Kind (3s), worth 8 in the middle
    expect(middle.filter((card) => card.rank === '3')).toHaveLength(4);
    expect(getHandStrength(back)[0]).toBe(9); // Straight Flush, the only hand that can legally beat it
  });

  it('keeps a lone unbeatable Four of a Kind in the back, since nothing else in the hand can beat it from the middle', () => {
    const hand: Card[] = [
      c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13),
      c('spades', 'Q', 12), c('hearts', 'Q', 12),
      c('spades', '7', 7), c('hearts', '4', 4), c('diamonds', '3', 3), c('clubs', '2', 2),
    ];
    const { back } = generateOptimalArrangement(hand);
    expect(back.filter((card) => card.rank === 'A')).toHaveLength(4);
  });

  it('prefers a Flush in the back over an equally-scoring but weaker hand, breaking a formal-points tie by raw strength', () => {
    // Reproduces a real play-test bug report: backPoints only rewards Four of a Kind and
    // Straight Flush specially -- a Flush (category 6) scores the same flat 1 point as a bare
    // Pair, so many valid partitions of this hand tie on total formal score (1+1+1=3). Ranks
    // are deliberately non-adjacent (2,3,4,5,7 spades; 9/J/K/A pairs elsewhere) so no Straight
    // can form anywhere in the hand -- a Flush is unambiguously the strongest 5-card hand
    // obtainable here, and nothing can beat it from the middle, so it must land in back.
    const hand: Card[] = [
      c('spades', '2', 2), c('spades', '3', 3), c('spades', '4', 4), c('spades', '5', 5), c('spades', '7', 7),
      c('hearts', '9', 9), c('diamonds', '9', 9),
      c('hearts', 'J', 11), c('diamonds', 'J', 11),
      c('hearts', 'K', 13), c('diamonds', 'K', 13),
      c('hearts', 'A', 14), c('diamonds', 'A', 14),
    ];
    const { back } = generateOptimalArrangement(hand);
    expect(getHandStrength(back)[0]).toBe(6); // Flush
    expect(back.every((card) => card.suit === 'spades')).toBe(true);
  });

  it('puts the highest of several same-category pairs in front when score and category-sum both tie', () => {
    // Back is a lone unbeatable Four of a Kind (4s) -- keeping it intact is strictly the
    // highest-scoring choice (backPoints rewards quads specially), so it never varies.
    // That leaves AA/KK/QQ to split between front (pair + kicker) and middle (two pair +
    // kicker): every such split scores identically (front pair = category 2 = flat 1
    // point; two pair = category 3 = flat 1 point regardless of which two ranks), so the
    // formal score and the raw category-sum tie no matter which single pair lands in
    // front. The tie-break should prefer the highest pair (Aces) in front.
    const hand: Card[] = [
      c('clubs', '4', 4), c('diamonds', '4', 4), c('hearts', '4', 4), c('spades', '4', 4), c('clubs', '5', 5),
      c('spades', 'A', 14), c('hearts', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13),
      c('spades', 'Q', 12), c('hearts', 'Q', 12),
      c('diamonds', '2', 2), c('diamonds', '3', 3),
    ];
    const { front, back } = generateOptimalArrangement(hand);

    expect(back.filter((card) => card.rank === '4')).toHaveLength(4);
    expect(front.filter((card) => card.rank === 'A')).toHaveLength(2);
  });

  it('pairs a Three of a Kind with the smallest available pair for a Full House in back, puts the largest remaining pair in front, and the two middle pairs in the middle', () => {
    // Hand: Three of a Kind (5s) + four pairs (A/K/Q/J) + two singles, no straights or
    // flushes reachable anywhere (ranks/suits deliberately non-adjacent/non-matching).
    // Putting the trips in front for its 3-point frontPoints bonus is tempting on paper,
    // but front (category 4, Trips) would then outrank a Two Pair middle (category 3),
    // which fouls (`middle-must-beat-front`) -- so that option is invalid. The best
    // *valid* arrangement instead uses the trips to complete a Full House in back (the
    // only zone that can legally hold the strongest hand here), leaving the four pairs to
    // split between front (highest pair, by the front-priority tie-break) and middle (the
    // two remaining pairs as Two Pair).
    const hand: Card[] = [
      c('clubs', '5', 5), c('diamonds', '5', 5), c('hearts', '5', 5),
      c('spades', 'A', 14), c('clubs', 'A', 14),
      c('diamonds', 'K', 13), c('hearts', 'K', 13),
      c('spades', 'Q', 12), c('clubs', 'Q', 12),
      c('diamonds', 'J', 11), c('hearts', 'J', 11),
      c('spades', '2', 2), c('clubs', '3', 3),
    ];
    const { front, middle, back } = generateOptimalArrangement(hand);

    expect(getHandStrength(back)[0]).toBe(7); // Full House
    expect(back.filter((card) => card.rank === '5')).toHaveLength(3);
    expect(back.filter((card) => card.rank === 'J')).toHaveLength(2); // smallest pair

    expect(getHandStrength(front)[0]).toBe(2); // Pair
    expect(front.filter((card) => card.rank === 'A')).toHaveLength(2); // largest pair

    expect(getHandStrength(middle)[0]).toBe(3); // Two Pair
    expect(middle.filter((card) => card.rank === 'K')).toHaveLength(2);
    expect(middle.filter((card) => card.rank === 'Q')).toHaveLength(2);

    expect(validateArrangement(front, middle, back).isValid).toBe(true);
  });

  it('never scores lower than the Maximizer on the same hand, across many random deals', () => {
    for (let seed = 0; seed < 20; seed++) {
      const deck = shuffleDeck(createDeck(), () => (seed * 0.61803398875) % 1);
      const hand = deck.slice(0, 13);
      const maximizer = generateAIArrangement(hand);
      const optimal = generateOptimalArrangement(hand);
      const maximizerTotal = totalPoints(maximizer.front, maximizer.middle, maximizer.back);
      const optimalTotal = totalPoints(optimal.front, optimal.middle, optimal.back);
      expect(optimalTotal).toBeGreaterThanOrEqual(maximizerTotal);
    }
  }, 20000);
});

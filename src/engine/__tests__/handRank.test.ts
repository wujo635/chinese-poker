import { describe, it, expect } from 'vitest';
import { getHandStrength, identifyHandType, getSuitValue } from '../handRank';
import type { Card } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

describe('getSuitValue', () => {
  it('ranks ♠ > ♥ > ♣ > ♦', () => {
    expect(getSuitValue('spades')).toBeGreaterThan(getSuitValue('hearts'));
    expect(getSuitValue('hearts')).toBeGreaterThan(getSuitValue('clubs'));
    expect(getSuitValue('clubs')).toBeGreaterThan(getSuitValue('diamonds'));
  });
});

describe('identifyHandType (5-card hands)', () => {
  it('detects a Royal Flush', () => {
    const hand = [
      c('spades', 'A', 14),
      c('spades', 'K', 13),
      c('spades', 'Q', 12),
      c('spades', 'J', 11),
      c('spades', '10', 10),
    ];
    expect(identifyHandType(hand)).toBe('Royal Flush');
  });

  it('detects a Straight Flush that is not a Royal Flush', () => {
    const hand = [
      c('hearts', '9', 9),
      c('hearts', '8', 8),
      c('hearts', '7', 7),
      c('hearts', '6', 6),
      c('hearts', '5', 5),
    ];
    expect(identifyHandType(hand)).toBe('Straight Flush');
  });

  it('detects the A-2-3-4-5 wheel as a Straight (low ace), not a bust', () => {
    const hand = [
      c('spades', 'A', 14),
      c('hearts', '2', 2),
      c('diamonds', '3', 3),
      c('clubs', '4', 4),
      c('spades', '5', 5),
    ];
    const strength = getHandStrength(hand);
    expect(strength[0]).toBe(5); // Straight category
    expect(identifyHandType(hand)).toBe('Straight');
  });

  it('ranks straights per house rule: broadway (A-K-Q-J-10) > wheel (A-2-3-4-5) > every other straight', () => {
    const wheel = [c('spades', 'A', 14), c('hearts', '2', 2), c('diamonds', '3', 3), c('clubs', '4', 4), c('spades', '5', 5)];
    const broadway = [c('clubs', 'A', 14), c('diamonds', 'K', 13), c('hearts', 'Q', 12), c('spades', 'J', 11), c('clubs', '10', 10)];
    // The next-highest natural straight below the wheel: 9-K (K-high), the strongest straight
    // that isn't broadway or the wheel.
    const kHigh = [c('diamonds', '9', 9), c('hearts', '10', 10), c('clubs', 'J', 11), c('spades', 'Q', 12), c('diamonds', 'K', 13)];
    // The lowest natural straight: 2-6 (6-high).
    const sixHigh = [c('spades', '2', 2), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '5', 5), c('spades', '6', 6)];

    const wheelRank = getHandStrength(wheel)[1];
    const broadwayRank = getHandStrength(broadway)[1];
    const kHighRank = getHandStrength(kHigh)[1];
    const sixHighRank = getHandStrength(sixHigh)[1];

    expect(broadwayRank).toBeGreaterThan(wheelRank);
    expect(wheelRank).toBeGreaterThan(kHighRank);
    expect(kHighRank).toBeGreaterThan(sixHighRank);
  });

  it('detects Four of a Kind with correct kicker', () => {
    const hand = [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)];
    expect(identifyHandType(hand)).toBe('Four of a Kind');
    expect(getHandStrength(hand)).toEqual([8, 13, 2]);
  });

  it('detects Full House with trip value ranked over pair value', () => {
    const hand = [c('spades', '7', 7), c('hearts', '7', 7), c('diamonds', '7', 7), c('clubs', '3', 3), c('spades', '3', 3)];
    expect(identifyHandType(hand)).toBe('Full House');
    expect(getHandStrength(hand)).toEqual([7, 7, 3]);
  });

  it('detects a Flush and ranks by kickers when categories match', () => {
    const hand = [c('clubs', 'A', 14), c('clubs', '9', 9), c('clubs', '7', 7), c('clubs', '4', 4), c('clubs', '2', 2)];
    expect(identifyHandType(hand)).toBe('Flush');
    expect(getHandStrength(hand)).toEqual([6, 14, 9, 7, 4, 2]);
  });

  it('detects Two Pair with correct high-pair/low-pair/kicker order', () => {
    const hand = [c('spades', 'J', 11), c('hearts', 'J', 11), c('diamonds', '4', 4), c('clubs', '4', 4), c('spades', '9', 9)];
    expect(identifyHandType(hand)).toBe('Two Pair');
    expect(getHandStrength(hand)).toEqual([3, 11, 4, 9]);
  });

  it('detects High Card and ranks by descending kickers', () => {
    const hand = [c('spades', 'K', 13), c('hearts', '9', 9), c('diamonds', '7', 7), c('clubs', '4', 4), c('spades', '2', 2)];
    expect(identifyHandType(hand)).toBe('High Card');
    expect(getHandStrength(hand)).toEqual([1, 13, 9, 7, 4, 2]);
  });
});

describe('getHandStrength (3-card front hands)', () => {
  it('only ever reaches Trips, Pair, or High Card — no straights/flushes count', () => {
    // Same-suit sequential cards; must NOT be scored as a straight or flush at 3 cards.
    const hand = [c('spades', '5', 5), c('spades', '4', 4), c('spades', '3', 3)];
    expect(getHandStrength(hand)[0]).toBe(1); // High Card, not Straight/Flush
  });

  it('detects Three of a Kind in the front', () => {
    const hand = [c('spades', 'Q', 12), c('hearts', 'Q', 12), c('diamonds', 'Q', 12)];
    expect(getHandStrength(hand)).toEqual([4, 12]);
  });

  it('detects Pair with kicker in the front', () => {
    const hand = [c('spades', '8', 8), c('hearts', '8', 8), c('diamonds', '2', 2)];
    expect(getHandStrength(hand)).toEqual([2, 8, 2]);
  });
});

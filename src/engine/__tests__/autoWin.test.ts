import { describe, it, expect } from 'vitest';
import { detectAutoWin, getAutoWinDisplay, type AutoWinGroup } from '../autoWin';
import type { Card } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

/** Every original card must appear in exactly one group, with no duplicates and no leftovers. */
function assertCoversHandExactlyOnce(hand: Card[], groups: AutoWinGroup[]) {
  const allGroupCards = groups.flatMap((g) => g.cards);
  expect(allGroupCards).toHaveLength(13);
  const keys = allGroupCards.map((c) => `${c.suit}-${c.rank}`);
  expect(new Set(keys).size).toBe(13);
  const handKeys = new Set(hand.map((c) => `${c.suit}-${c.rank}`));
  expect(new Set(keys)).toEqual(handKeys);
}

describe('detectAutoWin', () => {
  it('detects a Dragon: one card of every rank 2-A', () => {
    const ranks: [Card['rank'], number][] = [
      ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8],
      ['9', 9], ['10', 10], ['J', 11], ['Q', 12], ['K', 13], ['A', 14],
    ];
    const suits: Card['suit'][] = ['spades', 'hearts', 'clubs', 'diamonds'];
    const hand = ranks.map(([rank, value], i) => c(suits[i % 4], rank, value));

    expect(detectAutoWin(hand)).toBe('dragon');
  });

  it('detects Six Pairs: six paired ranks plus one odd card', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('hearts', '2', 2),
      c('spades', '3', 3), c('hearts', '3', 3),
      c('spades', '4', 4), c('hearts', '4', 4),
      c('spades', '5', 5), c('hearts', '5', 5),
      c('spades', '6', 6), c('hearts', '6', 6),
      c('spades', '7', 7), c('hearts', '7', 7),
      c('clubs', '9', 9),
    ];
    expect(detectAutoWin(hand)).toBe('six-pairs');
  });

  it('detects Four Pairs + Flush: four paired ranks plus five same-suit singles', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('hearts', '2', 2),
      c('spades', '3', 3), c('hearts', '3', 3),
      c('spades', '4', 4), c('hearts', '4', 4),
      c('spades', '5', 5), c('hearts', '5', 5),
      c('clubs', '7', 7), c('clubs', '9', 9), c('clubs', 'J', 11), c('clubs', 'K', 13), c('clubs', 'A', 14),
    ];
    expect(detectAutoWin(hand)).toBe('four-pairs-flush');
  });

  it('detects Four Pairs + Straight: four paired ranks plus five consecutive-rank singles', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('hearts', '2', 2),
      c('spades', '3', 3), c('hearts', '3', 3),
      c('spades', '4', 4), c('hearts', '4', 4),
      c('spades', '5', 5), c('hearts', '5', 5),
      c('clubs', '8', 8), c('diamonds', '9', 9), c('clubs', '10', 10), c('diamonds', 'J', 11), c('clubs', 'Q', 12),
    ];
    expect(detectAutoWin(hand)).toBe('four-pairs-straight');
  });

  it('detects Three Flushes: three distinct suits, each supplying one zone', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('spades', '3', 3), c('spades', '4', 4),
      c('hearts', '5', 5), c('hearts', '6', 6), c('hearts', '7', 7), c('hearts', '8', 8), c('hearts', '9', 9),
      c('clubs', '2', 2), c('clubs', '3', 3), c('clubs', '4', 4), c('clubs', '5', 5), c('clubs', '6', 6),
    ];
    expect(detectAutoWin(hand)).toBe('three-flushes');
  });

  it('detects Three Flushes: one suit supplying two zones', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('spades', '3', 3), c('spades', '4', 4),
      c('spades', '5', 5), c('spades', '6', 6), c('spades', '7', 7), c('spades', '8', 8), c('spades', '9', 9),
      c('hearts', '2', 2), c('hearts', '3', 3), c('hearts', '4', 4), c('hearts', '5', 5), c('hearts', '6', 6),
    ];
    expect(detectAutoWin(hand)).toBe('three-flushes');
  });

  it('detects Three Straights: three rank-windows tiling the hand, mixed suits', () => {
    const hand: Card[] = [
      c('spades', '2', 2),
      c('hearts', '3', 3), c('clubs', '3', 3),
      c('diamonds', '4', 4), c('spades', '4', 4),
      c('hearts', '5', 5), c('clubs', '6', 6), c('diamonds', '7', 7),
      c('spades', '8', 8), c('hearts', '9', 9), c('clubs', '10', 10), c('diamonds', 'J', 11), c('spades', 'Q', 12),
    ];
    expect(detectAutoWin(hand)).toBe('three-straights');
  });

  it('does NOT falsely detect Three Straights when a demanded rank has zero copies (regression)', () => {
    // No rank-2 cards at all; ranks 3-8 and 10-13 once each; rank 9 three times (13 cards).
    // No valid 3/5/5 straight-window tiling actually exists for this hand -- the only
    // duplicated rank (9) can't simultaneously anchor a window reaching down to cover 3/4
    // and another reaching up to cover 10-13, so every candidate partition leaves some rank
    // uncovered. An earlier version of the algorithm only checked ranks *present* in the
    // hand (via a Map built from rankCounts), silently skipping the zero-count rank-2 demand
    // check and reporting a false positive here.
    const hand: Card[] = [
      c('spades', '3', 3), c('hearts', '4', 4), c('clubs', '5', 5), c('diamonds', '6', 6),
      c('spades', '7', 7), c('hearts', '8', 8),
      c('spades', '9', 9), c('hearts', '9', 9), c('clubs', '9', 9),
      c('clubs', '10', 10), c('diamonds', 'J', 11), c('spades', 'Q', 12), c('hearts', 'K', 13),
    ];
    expect(detectAutoWin(hand)).toBeNull();
  });

  it('prefers Three Flushes over Three Straights by priority order when a hand matches both shapes', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('spades', '3', 3), c('spades', '4', 4),
      c('hearts', '3', 3), c('hearts', '4', 4), c('hearts', '5', 5), c('hearts', '6', 6), c('hearts', '7', 7),
      c('clubs', '8', 8), c('clubs', '9', 9), c('clubs', '10', 10), c('clubs', 'J', 11), c('clubs', 'Q', 12),
    ];
    expect(detectAutoWin(hand)).toBe('three-flushes');
  });

  it('returns null for an unremarkable hand', () => {
    const hand: Card[] = [
      c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13),
      c('spades', 'Q', 12), c('hearts', 'Q', 12),
      c('spades', '7', 7), c('hearts', '4', 4), c('diamonds', '3', 3), c('clubs', '2', 2),
    ];
    expect(detectAutoWin(hand)).toBeNull();
  });
});

describe('getAutoWinDisplay', () => {
  it('returns null for an unremarkable hand', () => {
    const hand: Card[] = [
      c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14),
      c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13),
      c('spades', 'Q', 12), c('hearts', 'Q', 12),
      c('spades', '7', 7), c('hearts', '4', 4), c('diamonds', '3', 3), c('clubs', '2', 2),
    ];
    expect(getAutoWinDisplay(hand)).toBeNull();
  });

  it('groups a Dragon as a single 13-card group', () => {
    const ranks: [Card['rank'], number][] = [
      ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8],
      ['9', 9], ['10', 10], ['J', 11], ['Q', 12], ['K', 13], ['A', 14],
    ];
    const suits: Card['suit'][] = ['spades', 'hearts', 'clubs', 'diamonds'];
    const hand = ranks.map(([rank, value], i) => c(suits[i % 4], rank, value));

    const display = getAutoWinDisplay(hand)!;
    expect(display.type).toBe('dragon');
    expect(display.groups).toHaveLength(1);
    assertCoversHandExactlyOnce(hand, display.groups);
  });

  it('groups Six Pairs into Pair 1..6 (highest rank first) plus one Odd Card', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('hearts', '2', 2),
      c('spades', '3', 3), c('hearts', '3', 3),
      c('spades', '4', 4), c('hearts', '4', 4),
      c('spades', '5', 5), c('hearts', '5', 5),
      c('spades', '6', 6), c('hearts', '6', 6),
      c('spades', '7', 7), c('hearts', '7', 7),
      c('clubs', '9', 9),
    ];
    const display = getAutoWinDisplay(hand)!;
    expect(display.type).toBe('six-pairs');
    expect(display.groups).toHaveLength(7);
    assertCoversHandExactlyOnce(hand, display.groups);

    const [pair1, pair2, pair3, pair4, pair5, pair6, oddCard] = display.groups;
    expect(pair1.label).toBe('Pair 1');
    expect(pair1.cards.every((c) => c.value === 7)).toBe(true); // highest pair first
    expect(pair2.cards.every((c) => c.value === 6)).toBe(true);
    expect(pair3.cards.every((c) => c.value === 5)).toBe(true);
    expect(pair4.cards.every((c) => c.value === 4)).toBe(true);
    expect(pair5.cards.every((c) => c.value === 3)).toBe(true);
    expect(pair6.cards.every((c) => c.value === 2)).toBe(true);
    expect(oddCard.label).toBe('Odd Card');
    expect(oddCard.cards).toEqual([c('clubs', '9', 9)]);
  });

  it('groups Four Pairs + Flush into Pair 1..4 plus a Flush group', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('hearts', '2', 2),
      c('spades', '3', 3), c('hearts', '3', 3),
      c('spades', '4', 4), c('hearts', '4', 4),
      c('spades', '5', 5), c('hearts', '5', 5),
      c('clubs', '7', 7), c('clubs', '9', 9), c('clubs', 'J', 11), c('clubs', 'K', 13), c('clubs', 'A', 14),
    ];
    const display = getAutoWinDisplay(hand)!;
    expect(display.type).toBe('four-pairs-flush');
    expect(display.groups).toHaveLength(5);
    assertCoversHandExactlyOnce(hand, display.groups);

    const flushGroup = display.groups[4];
    expect(flushGroup.label).toBe('Flush');
    expect(flushGroup.cards).toHaveLength(5);
    expect(flushGroup.cards.every((c) => c.suit === 'clubs')).toBe(true);
  });

  it('groups Four Pairs + Straight into Pair 1..4 plus a rank-sorted Straight group', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('hearts', '2', 2),
      c('spades', '3', 3), c('hearts', '3', 3),
      c('spades', '4', 4), c('hearts', '4', 4),
      c('spades', '5', 5), c('hearts', '5', 5),
      c('clubs', '8', 8), c('diamonds', '9', 9), c('clubs', '10', 10), c('diamonds', 'J', 11), c('clubs', 'Q', 12),
    ];
    const display = getAutoWinDisplay(hand)!;
    expect(display.type).toBe('four-pairs-straight');
    expect(display.groups).toHaveLength(5);
    assertCoversHandExactlyOnce(hand, display.groups);

    const straightGroup = display.groups[4];
    expect(straightGroup.label).toBe('Straight');
    expect(straightGroup.cards.map((c) => c.value)).toEqual([8, 9, 10, 11, 12]); // sorted ascending
  });

  it('groups Three Flushes into three flush groups sized 3/5/5, one suit supplying two zones', () => {
    const hand: Card[] = [
      c('spades', '2', 2), c('spades', '3', 3), c('spades', '4', 4),
      c('spades', '5', 5), c('spades', '6', 6), c('spades', '7', 7), c('spades', '8', 8), c('spades', '9', 9),
      c('hearts', '2', 2), c('hearts', '3', 3), c('hearts', '4', 4), c('hearts', '5', 5), c('hearts', '6', 6),
    ];
    const display = getAutoWinDisplay(hand)!;
    expect(display.type).toBe('three-flushes');
    expect(display.groups).toHaveLength(3);
    assertCoversHandExactlyOnce(hand, display.groups);
    expect(display.groups.map((g) => g.cards.length)).toEqual([3, 5, 5]);
    for (const group of display.groups) {
      expect(new Set(group.cards.map((c) => c.suit)).size).toBe(1); // each group is single-suit
    }
  });

  it('groups Three Straights into three straight groups sized 3/5/5, ranks overlapping across windows', () => {
    const hand: Card[] = [
      c('spades', '2', 2),
      c('hearts', '3', 3), c('clubs', '3', 3),
      c('diamonds', '4', 4), c('spades', '4', 4),
      c('hearts', '5', 5), c('clubs', '6', 6), c('diamonds', '7', 7),
      c('spades', '8', 8), c('hearts', '9', 9), c('clubs', '10', 10), c('diamonds', 'J', 11), c('spades', 'Q', 12),
    ];
    const display = getAutoWinDisplay(hand)!;
    expect(display.type).toBe('three-straights');
    expect(display.groups).toHaveLength(3);
    assertCoversHandExactlyOnce(hand, display.groups);
    expect(display.groups.map((g) => g.cards.length)).toEqual([3, 5, 5]);
    for (const group of display.groups) {
      const values = group.cards.map((c) => c.value).sort((a, b) => a - b);
      expect(values.every((v, i) => i === 0 || v === values[i - 1] + 1)).toBe(true); // consecutive
    }
  });
});

import { describe, it, expect } from 'vitest';
import { compareHands } from '../compareHands';
import type { Card } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

describe('compareHands', () => {
  it('picks the higher hand category as the winner', () => {
    const flush = [c('clubs', 'A', 14), c('clubs', '9', 9), c('clubs', '7', 7), c('clubs', '4', 4), c('clubs', '2', 2)];
    const straight = [c('spades', '9', 9), c('hearts', '8', 8), c('diamonds', '7', 7), c('clubs', '6', 6), c('spades', '5', 5)];
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
    expect(compareHands(straight, flush)).toBeLessThan(0);
  });

  it('breaks ties within the same category using kickers', () => {
    const pairOfKings = [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', '9', 9), c('clubs', '4', 4), c('spades', '2', 2)];
    const pairOfQueens = [c('clubs', 'Q', 12), c('diamonds', 'Q', 12), c('hearts', '9', 9), c('spades', '4', 4), c('hearts', '2', 2)];
    expect(compareHands(pairOfKings, pairOfQueens)).toBeGreaterThan(0);
  });

  it('falls back to suit tiebreaker on the highest card when rank strength is identical', () => {
    const highCardSpades = [c('spades', 'K', 13), c('hearts', '9', 9), c('diamonds', '7', 7), c('clubs', '4', 4), c('spades', '2', 2)];
    const highCardClubs = [c('clubs', 'K', 13), c('hearts', '9', 9), c('diamonds', '7', 7), c('clubs', '4', 4), c('spades', '2', 2)];
    expect(compareHands(highCardSpades, highCardClubs)).toBeGreaterThan(0);
  });

  it('returns 0 for a genuine tie (identical cards)', () => {
    const hand = [c('spades', 'K', 13), c('hearts', '9', 9), c('diamonds', '7', 7), c('clubs', '4', 4), c('spades', '2', 2)];
    expect(compareHands(hand, hand)).toBe(0);
  });
});

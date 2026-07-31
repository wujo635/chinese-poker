import { describe, it, expect } from 'vitest';
import { validateArrangement } from '../validate';
import type { Card } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

describe('validateArrangement', () => {
  it('is valid when back > middle > front', () => {
    const front = [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '5', 5)];
    const middle = [c('clubs', '8', 8), c('spades', '8', 8), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '9', 9)];
    const back = [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14), c('spades', '9', 9)];
    const result = validateArrangement(front, middle, back);
    expect(result.isValid).toBe(true);
    expect(result.foulReason).toBeNull();
  });

  it('fouls when middle does not beat front', () => {
    const front = [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)];
    const middle = [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)];
    const back = [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)];
    const result = validateArrangement(front, middle, back);
    expect(result.isValid).toBe(false);
    expect(result.foulReason).toBe('middle-must-beat-front');
  });

  it('fouls when back does not beat middle', () => {
    const front = [c('spades', '2', 2), c('hearts', '3', 3), c('diamonds', '5', 5)];
    const back = [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)];
    const middle = [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)];
    const result = validateArrangement(front, middle, back);
    expect(result.isValid).toBe(false);
    expect(result.foulReason).toBe('back-must-beat-middle');
  });

  it('fouls on an exact tie between back and middle (strict > required)', () => {
    const hand: Card[] = [c('spades', 'K', 13), c('hearts', '9', 9), c('diamonds', '7', 7), c('clubs', '4', 4), c('spades', '2', 2)];
    const front = [c('clubs', '2', 2), c('diamonds', '3', 3), c('hearts', '4', 4)];
    const result = validateArrangement(front, hand, hand);
    expect(result.isValid).toBe(false);
    expect(result.foulReason).toBe('back-must-beat-middle');
  });
});

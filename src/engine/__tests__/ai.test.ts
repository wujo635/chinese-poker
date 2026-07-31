import { describe, it, expect } from 'vitest';
import { generateAIArrangement } from '../ai';
import { createDeck, shuffleDeck } from '../deck';
import { validateArrangement } from '../validate';
import type { Card } from '../../types';

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

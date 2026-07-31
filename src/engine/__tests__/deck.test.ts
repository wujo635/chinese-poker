import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards, compareCards, HAND_SIZE } from '../deck';
import type { Card } from '../../types';

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const keys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });

  it('gives Ace a value of 14', () => {
    const deck = createDeck();
    const aces = deck.filter((c) => c.rank === 'A');
    expect(aces).toHaveLength(4);
    expect(aces.every((c) => c.value === 14)).toBe(true);
  });

  it('gives 2 a value of 2', () => {
    const deck = createDeck();
    expect(deck.find((c) => c.rank === '2')?.value).toBe(2);
  });
});

describe('shuffleDeck', () => {
  it('does not mutate the input deck', () => {
    const deck = createDeck();
    const copy = [...deck];
    shuffleDeck(deck, () => 0.5);
    expect(deck).toEqual(copy);
  });

  it('preserves all cards, just reorders them', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck, () => 0.5);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled)).toEqual(new Set(shuffled));
    const originalKeys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    const shuffledKeys = new Set(shuffled.map((c) => `${c.suit}-${c.rank}`));
    expect(shuffledKeys).toEqual(originalKeys);
  });

  it('actually reorders with a non-trivial rng', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck, () => 0.9);
    expect(shuffled).not.toEqual(deck);
  });
});

describe('dealCards', () => {
  it('deals 13 cards to each of 4 players', () => {
    const deck = createDeck();
    const hands = dealCards(deck, 4);
    expect(hands).toHaveLength(4);
    hands.forEach((hand) => expect(hand).toHaveLength(HAND_SIZE));
  });

  it('deals all distinct cards with no overlap', () => {
    const deck = createDeck();
    const hands = dealCards(deck, 4);
    const allDealt = hands.flat();
    const keys = new Set(allDealt.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });

  it('throws if there are not enough cards', () => {
    const deck = createDeck();
    expect(() => dealCards(deck, 5)).toThrow();
  });
});

describe('compareCards', () => {
  const card = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

  it('ranks a higher value card as the winner', () => {
    const king = card('clubs', 'K', 13);
    const ace = card('clubs', 'A', 14);
    expect(compareCards(ace, king)).toBeGreaterThan(0);
    expect(compareCards(king, ace)).toBeLessThan(0);
  });

  it('uses suit as a tiebreaker when values are equal (♠ > ♥ > ♦ > ♣)', () => {
    const kingSpades = card('spades', 'K', 13);
    const kingClubs = card('clubs', 'K', 13);
    expect(compareCards(kingSpades, kingClubs)).toBeGreaterThan(0);
    expect(compareCards(kingClubs, kingSpades)).toBeLessThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import {
  cardKey,
  computeDragEndResult,
  moveCardToHand,
  moveCardToZoneSlot,
  swapCards,
  type ArrangementState,
} from '../arrangementMoves';
import type { Card } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

const aceSpades = c('spades', 'A', 14);
const kingHearts = c('hearts', 'K', 13);
const queenClubs = c('clubs', 'Q', 12);
const jackDiamonds = c('diamonds', 'J', 11);
const tenSpades = c('spades', '10', 10);

function emptyState(overrides: Partial<ArrangementState> = {}): ArrangementState {
  return { hand: [], front: [], middle: [], back: [], ...overrides };
}

describe('moveCardToHand', () => {
  it('moves a card from front/middle/back back to hand', () => {
    for (const zone of ['front', 'middle', 'back'] as const) {
      const state = emptyState({ [zone]: [aceSpades] });
      const next = moveCardToHand(state, cardKey(aceSpades));
      expect(next.hand).toEqual([aceSpades]);
      expect(next[zone]).toEqual([]);
    }
  });

  it('is a no-op (returns the same reference) when the card is already in hand', () => {
    const state = emptyState({ hand: [aceSpades] });
    const next = moveCardToHand(state, cardKey(aceSpades));
    expect(next).toBe(state);
  });

  it('is a no-op when the key is not found', () => {
    const state = emptyState({ hand: [aceSpades] });
    const next = moveCardToHand(state, cardKey(kingHearts));
    expect(next).toBe(state);
  });
});

describe('moveCardToZoneSlot', () => {
  it('moves a card from hand into an empty zone', () => {
    const state = emptyState({ hand: [aceSpades] });
    const next = moveCardToZoneSlot(state, cardKey(aceSpades), 'front');
    expect(next).not.toBeNull();
    expect(next!.front).toEqual([aceSpades]);
    expect(next!.hand).toEqual([]);
  });

  it('returns null when the target zone is already full', () => {
    const state = emptyState({
      hand: [tenSpades],
      front: [aceSpades, kingHearts, queenClubs],
    });
    expect(moveCardToZoneSlot(state, cardKey(tenSpades), 'front')).toBeNull();
  });

  it('returns null when the card is already in the target zone', () => {
    const state = emptyState({ front: [aceSpades] });
    expect(moveCardToZoneSlot(state, cardKey(aceSpades), 'front')).toBeNull();
  });

  it('returns null when the key is not found', () => {
    const state = emptyState();
    expect(moveCardToZoneSlot(state, cardKey(aceSpades), 'front')).toBeNull();
  });

  it('moves a card from one zone to another (e.g. an empty middle) when reachable', () => {
    const state = emptyState({ front: [aceSpades] });
    const next = moveCardToZoneSlot(state, cardKey(aceSpades), 'middle');
    expect(next).not.toBeNull();
    expect(next!.front).toEqual([]);
    expect(next!.middle).toEqual([aceSpades]);
  });
});

describe('swapCards', () => {
  it('swaps a hand card with a zone card', () => {
    const state = emptyState({ hand: [tenSpades], front: [aceSpades] });
    const next = swapCards(state, cardKey(tenSpades), cardKey(aceSpades));
    expect(next).not.toBeNull();
    expect(next!.hand).toEqual([aceSpades]);
    expect(next!.front).toEqual([tenSpades]);
  });

  it('swaps two cards across different zones', () => {
    const state = emptyState({ front: [aceSpades], middle: [kingHearts, queenClubs, jackDiamonds, tenSpades, c('hearts', '9', 9)] });
    const next = swapCards(state, cardKey(aceSpades), cardKey(kingHearts));
    expect(next).not.toBeNull();
    expect(next!.front).toEqual([kingHearts]);
    expect(next!.middle).toContainEqual(aceSpades);
    expect(next!.middle).not.toContainEqual(kingHearts);
    expect(next!.middle).toHaveLength(5);
  });

  it('returns null when swapping a card with itself', () => {
    const state = emptyState({ hand: [aceSpades] });
    expect(swapCards(state, cardKey(aceSpades), cardKey(aceSpades))).toBeNull();
  });

  it('returns null when both cards are already in the same zone (order has no game meaning)', () => {
    const state = emptyState({ front: [aceSpades, kingHearts] });
    expect(swapCards(state, cardKey(aceSpades), cardKey(kingHearts))).toBeNull();
  });

  it('returns null when either card is not found', () => {
    const state = emptyState({ hand: [aceSpades] });
    expect(swapCards(state, cardKey(aceSpades), cardKey(kingHearts))).toBeNull();
  });

  it('degrades safely (returns null) for a hand-to-hand swap attempt', () => {
    const state = emptyState({ hand: [aceSpades, kingHearts] });
    expect(swapCards(state, cardKey(aceSpades), cardKey(kingHearts))).toBeNull();
  });
});

describe('computeDragEndResult', () => {
  const state = emptyState({ hand: [aceSpades], front: [kingHearts] });

  it('returns null when dropped outside any target (over is null)', () => {
    expect(computeDragEndResult(state, { active: { id: cardKey(aceSpades) }, over: null })).toBeNull();
  });

  it('dispatches to moveCardToHand for the "hand-tray" target', () => {
    const next = computeDragEndResult(state, { active: { id: cardKey(kingHearts) }, over: { id: 'hand-tray' } });
    expect(next).not.toBeNull();
    expect(next!.hand).toContainEqual(kingHearts);
    expect(next!.front).toEqual([]);
  });

  it('dispatches to moveCardToZoneSlot for a "slot:<zone>:<index>" target', () => {
    const next = computeDragEndResult(state, { active: { id: cardKey(aceSpades) }, over: { id: 'slot:middle:2' } });
    expect(next).not.toBeNull();
    expect(next!.middle).toEqual([aceSpades]);
  });

  it('dispatches to swapCards for a bare cardKey target', () => {
    const next = computeDragEndResult(state, { active: { id: cardKey(aceSpades) }, over: { id: cardKey(kingHearts) } });
    expect(next).not.toBeNull();
    expect(next!.hand).toEqual([kingHearts]);
    expect(next!.front).toEqual([aceSpades]);
  });
});

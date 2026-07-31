import { describe, it, expect } from 'vitest';
import { initializeGame, dealRound, submitArrangement, resolveRound, calculateWinner } from '../game';
import type { Card, FiveCardHand, FrontHand, GameState } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

describe('initializeGame', () => {
  it('creates one human (first) and the rest as AI players with zero score', () => {
    const state = initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']);
    expect(state.players).toHaveLength(4);
    expect(state.players[0].type).toBe('human');
    expect(state.players.slice(1).every((p) => p.type === 'ai')).toBe(true);
    expect(state.players.every((p) => p.score === 0)).toBe(true);
    expect(state.status).toBe('dealing');
  });
});

describe('dealRound', () => {
  it('deals 13 cards to each player and resets arrangements', () => {
    const state = dealRound(initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
    expect(state.status).toBe('arranging');
    expect(state.round).toBe(1);
    state.players.forEach((p) => {
      expect(p.hand).toHaveLength(13);
      expect(p.arrangement).toBeNull();
    });
  });

  it('deals no duplicate cards across players', () => {
    const state = dealRound(initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
    const allCards = state.players.flatMap((p) => p.hand);
    const keys = new Set(allCards.map((card) => `${card.suit}-${card.rank}`));
    expect(keys.size).toBe(52);
  });
});

describe('submitArrangement', () => {
  it('marks the arrangement valid and moves to comparing once everyone has submitted', () => {
    let state = dealRound(initializeGame(['You', 'Bot 1']));
    const front: FrontHand = [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '5', 5)];
    const middle: FiveCardHand = [c('clubs', '8', 8), c('spades', '8', 8), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '9', 9)];
    const back: FiveCardHand = [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14), c('spades', '9', 9)];

    state = submitArrangement(state, 'player-0', front, middle, back);
    expect(state.players[0].isValid).toBe(true);
    expect(state.status).toBe('arranging'); // player-1 hasn't submitted yet

    state = submitArrangement(state, 'player-1', front, middle, back);
    expect(state.status).toBe('comparing');
  });

  it('marks a fouled arrangement invalid without blocking the flag from being recorded', () => {
    let state = dealRound(initializeGame(['You', 'Bot 1']));
    const front: FrontHand = [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)];
    const middle: FiveCardHand = [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)];
    const back: FiveCardHand = [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)];

    state = submitArrangement(state, 'player-0', front, middle, back);
    expect(state.players[0].isValid).toBe(false);
  });
});

describe('resolveRound', () => {
  function buildTwoPlayerState(): GameState {
    let state = initializeGame(['You', 'Bot 1']);
    state = { ...state, status: 'comparing' };
    return state;
  }

  it('awards +1/-1 per hand won/lost between two valid arrangements', () => {
    let state = buildTwoPlayerState();
    // player-0 wins front and back, loses middle -> net +1
    state.players[0] = {
      ...state.players[0],
      isValid: true,
      arrangement: {
        front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', '2', 2)],
        middle: [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)],
        back: [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)],
      },
    };
    state.players[1] = {
      ...state.players[1],
      isValid: true,
      arrangement: {
        front: [c('clubs', '3', 3), c('diamonds', '3', 3), c('hearts', '2', 2)],
        middle: [c('hearts', '8', 8), c('spades', '8', 8), c('clubs', '3', 3), c('diamonds', '4', 4), c('hearts', '9', 9)],
        back: [c('clubs', 'Q', 12), c('diamonds', 'Q', 12), c('hearts', 'Q', 12), c('spades', 'Q', 12), c('clubs', '2', 2)],
      },
    };

    state = resolveRound(state);
    expect(state.status).toBe('complete');
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.frontResult).toBe('win');
    expect(p0Result.middleResult).toBe('loss');
    expect(p0Result.backResult).toBe('win');
    expect(p0Result.roundScore).toBe(1);
    expect(state.players[0].score).toBe(1);
    expect(state.players[1].score).toBe(-1);
  });

  it('awards a +6/-6 scoop when one player wins all three hands', () => {
    let state = buildTwoPlayerState();
    state.players[0] = {
      ...state.players[0],
      isValid: true,
      arrangement: {
        front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', '2', 2)],
        middle: [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', '4', 4), c('spades', '2', 2)],
        back: [c('spades', 'Q', 12), c('diamonds', 'Q', 12), c('hearts', 'Q', 12), c('clubs', 'Q', 12), c('spades', '3', 3)],
      },
    };
    state.players[1] = {
      ...state.players[1],
      isValid: true,
      arrangement: {
        front: [c('clubs', '3', 3), c('diamonds', '4', 4), c('hearts', '2', 2)],
        middle: [c('hearts', '8', 8), c('clubs', '9', 9), c('diamonds', '3', 3), c('spades', '5', 5), c('hearts', '9', 9)],
        back: [c('clubs', 'J', 11), c('diamonds', 'J', 11), c('hearts', '3', 3), c('spades', '7', 7), c('clubs', '2', 2)],
      },
    };

    state = resolveRound(state);
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.roundScore).toBe(6);
    expect(state.players[1].score).toBe(-6);
  });

  it('auto-loses -6 for a fouled player against a valid opponent', () => {
    let state = buildTwoPlayerState();
    state.players[0] = { ...state.players[0], isValid: false, arrangement: null };
    state.players[1] = {
      ...state.players[1],
      isValid: true,
      arrangement: {
        front: [c('clubs', '3', 3), c('diamonds', '4', 4), c('hearts', '2', 2)],
        middle: [c('hearts', '8', 8), c('clubs', '9', 9), c('diamonds', '3', 3), c('spades', '5', 5), c('hearts', '9', 9)],
        back: [c('clubs', 'J', 11), c('diamonds', 'J', 11), c('hearts', '3', 3), c('spades', '7', 7), c('clubs', '2', 2)],
      },
    };

    state = resolveRound(state);
    expect(state.players[0].score).toBe(-6);
    expect(state.players[1].score).toBe(6);
  });
});

describe('calculateWinner', () => {
  it('returns the single highest-scoring player', () => {
    const state = initializeGame(['You', 'Bot 1', 'Bot 2']);
    const players = state.players.map((p, i) => ({ ...p, score: i === 1 ? 10 : 0 }));
    expect(calculateWinner(players)).toEqual([players[1]]);
  });

  it('returns multiple players when tied for the top score', () => {
    const state = initializeGame(['You', 'Bot 1']);
    const players = state.players.map((p) => ({ ...p, score: 5 }));
    expect(calculateWinner(players)).toEqual(players);
  });
});

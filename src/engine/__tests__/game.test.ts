import { describe, it, expect } from 'vitest';
import {
  initializeGame,
  dealRound,
  submitArrangement,
  resolveRound,
  calculateWinner,
  frontPoints,
  middlePoints,
  backPoints,
} from '../game';
import type { InitGameConfig } from '../game';
import type { Card, FiveCardHand, FrontHand, GameState } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

/**
 * Splits a 13-card hand into an arbitrary structural 3/5/5 arrangement. `resolveRound`
 * never re-validates an arrangement against `validateArrangement` -- it trusts whatever
 * `isValid` a fixture sets -- so for auto-win tests, which only exercise `player.hand`
 * (detectAutoWin never looks at `arrangement`), any 3/5/5 split is fine.
 */
function splitArrangement(hand: Card[]): { front: FrontHand; middle: FiveCardHand; back: FiveCardHand } {
  return {
    front: hand.slice(0, 3) as FrontHand,
    middle: hand.slice(3, 8) as FiveCardHand,
    back: hand.slice(8, 13) as FiveCardHand,
  };
}

/** One card of every rank 2-A -- an Automatic Winning "Dragon" hand. */
function dragonHand(): Card[] {
  const ranks: [Card['rank'], number][] = [
    ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7], ['8', 8],
    ['9', 9], ['10', 10], ['J', 11], ['Q', 12], ['K', 13], ['A', 14],
  ];
  const suits: Card['suit'][] = ['spades', 'hearts', 'clubs', 'diamonds'];
  return ranks.map(([rank, value], i) => c(suits[i % 4], rank, value));
}

/** Six paired ranks plus one odd card -- an Automatic Winning "Six Pairs" hand. */
function sixPairsHand(): Card[] {
  return [
    c('spades', '2', 2), c('hearts', '2', 2),
    c('spades', '3', 3), c('hearts', '3', 3),
    c('spades', '4', 4), c('hearts', '4', 4),
    c('spades', '5', 5), c('hearts', '5', 5),
    c('spades', '6', 6), c('hearts', '6', 6),
    c('spades', '7', 7), c('hearts', '7', 7),
    c('clubs', '9', 9),
  ];
}

/** Four paired ranks plus five same-suit singles -- an Automatic Winning "Four Pairs + Flush" hand. */
function fourPairsFlushHand(): Card[] {
  return [
    c('spades', '2', 2), c('hearts', '2', 2),
    c('spades', '3', 3), c('hearts', '3', 3),
    c('spades', '4', 4), c('hearts', '4', 4),
    c('spades', '5', 5), c('hearts', '5', 5),
    c('clubs', '7', 7), c('clubs', '9', 9), c('clubs', 'J', 11), c('clubs', 'K', 13), c('clubs', 'A', 14),
  ];
}

/** First name is human/dealer by default, matching the app's old single-human-at-index-0 convention. */
function config(names: string[], dealerIndex = 0): InitGameConfig {
  return { seats: names.map((name, i) => ({ name, type: i === 0 ? 'human' : 'ai' })), dealerIndex };
}

describe('initializeGame', () => {
  it('creates one human (first) and the rest as AI players with zero score', () => {
    const state = initializeGame(config(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
    expect(state.players).toHaveLength(4);
    expect(state.players[0].type).toBe('human');
    expect(state.players.slice(1).every((p) => p.type === 'ai')).toBe(true);
    expect(state.players.every((p) => p.score === 0)).toBe(true);
    expect(state.status).toBe('dealing');
  });

  it('sets dealerId to the player at dealerIndex', () => {
    const humanDealer = initializeGame(config(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
    expect(humanDealer.dealerId).toBe('player-0');

    const aiDealer = initializeGame({
      seats: [
        { name: 'AI Dealer', type: 'ai' },
        { name: 'You', type: 'human' },
        { name: 'Bot 2', type: 'ai' },
        { name: 'You (Seat 2)', type: 'human' },
      ],
      dealerIndex: 0,
    });
    expect(aiDealer.dealerId).toBe('player-0');
    expect(aiDealer.players.find((p) => p.id === aiDealer.dealerId)!.type).toBe('ai');
  });
});

describe('dealRound', () => {
  it('deals 13 cards to each player and resets arrangements', () => {
    const state = dealRound(initializeGame(config(['You', 'Bot 1', 'Bot 2', 'Bot 3'])));
    expect(state.status).toBe('arranging');
    expect(state.round).toBe(1);
    state.players.forEach((p) => {
      expect(p.hand).toHaveLength(13);
      expect(p.arrangement).toBeNull();
    });
  });

  it('deals no duplicate cards across players', () => {
    const state = dealRound(initializeGame(config(['You', 'Bot 1', 'Bot 2', 'Bot 3'])));
    const allCards = state.players.flatMap((p) => p.hand);
    const keys = new Set(allCards.map((card) => `${card.suit}-${card.rank}`));
    expect(keys.size).toBe(52);
  });
});

describe('submitArrangement', () => {
  it('marks the arrangement valid and moves to comparing once everyone has submitted', () => {
    let state = dealRound(initializeGame(config(['You', 'Bot 1'])));
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
    let state = dealRound(initializeGame(config(['You', 'Bot 1'])));
    const front: FrontHand = [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)];
    const middle: FiveCardHand = [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)];
    const back: FiveCardHand = [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)];

    state = submitArrangement(state, 'player-0', front, middle, back);
    expect(state.players[0].isValid).toBe(false);
  });
});

describe('resolveRound', () => {
  function buildTwoPlayerState(): GameState {
    let state = initializeGame(config(['You', 'Bot 1']));
    state = { ...state, status: 'comparing' };
    return state;
  }

  it('scores each hand by the winning hand\'s category, not a flat +-1', () => {
    let state = buildTwoPlayerState();
    // player-0 wins front (pair, +1) and back (four of a kind, +4), loses middle (full house, -2) -> net +3
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
        middle: [c('hearts', '8', 8), c('spades', '8', 8), c('clubs', '8', 8), c('diamonds', '4', 4), c('hearts', '4', 4)],
        back: [c('clubs', 'Q', 12), c('diamonds', 'Q', 12), c('hearts', 'Q', 12), c('spades', 'Q', 12), c('clubs', '2', 2)],
      },
    };

    state = resolveRound(state);
    expect(state.status).toBe('complete');
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.frontResult).toBe('win');
    expect(p0Result.middleResult).toBe('loss');
    expect(p0Result.backResult).toBe('win');
    expect(p0Result.roundScore).toBe(3); // +1 (pair front) - 2 (full house middle) + 4 (quads back)
    expect(state.players[0].score).toBe(3);
    expect(state.players[1].score).toBe(-3);
  });

  it('awards the middle Straight/Royal Flush bonus (10 points) to the winner', () => {
    let state = buildTwoPlayerState();
    state.players[0] = {
      ...state.players[0],
      isValid: true,
      arrangement: {
        front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', '2', 2)],
        middle: [c('spades', '9', 9), c('spades', '8', 8), c('spades', '7', 7), c('spades', '6', 6), c('spades', '5', 5)],
        back: [c('spades', 'Q', 12), c('diamonds', 'Q', 12), c('hearts', 'Q', 12), c('clubs', 'Q', 12), c('spades', '3', 3)],
      },
    };
    state.players[1] = {
      ...state.players[1],
      isValid: true,
      arrangement: {
        front: [c('clubs', '3', 3), c('diamonds', '4', 4), c('hearts', '2', 2)],
        middle: [c('hearts', '8', 8), c('clubs', '9', 9), c('diamonds', '3', 3), c('spades', '2', 2), c('hearts', '9', 9)],
        back: [c('clubs', 'J', 11), c('diamonds', 'J', 11), c('hearts', '3', 3), c('spades', '7', 7), c('clubs', '2', 2)],
      },
    };

    state = resolveRound(state);
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.middleResult).toBe('win');
    expect(state.players[1].score).toBeLessThan(0);
  });

  it('auto-loses -3 for a fouled player against a valid opponent', () => {
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
    expect(state.players[0].score).toBe(-3);
    expect(state.players[1].score).toBe(3);
  });

  it('only pairs the Dealer against each opponent, never two non-dealers against each other', () => {
    // AI Dealer (player-0) vs 3 non-dealer seats (player-1 human, player-2 ai, player-3 human).
    let state = initializeGame({
      seats: [
        { name: 'AI Dealer', type: 'ai' },
        { name: 'You (Seat 1)', type: 'human' },
        { name: 'Bot 2', type: 'ai' },
        { name: 'You (Seat 2)', type: 'human' },
      ],
      dealerIndex: 0,
    });
    state = { ...state, status: 'comparing' };

    const dealerFront: FrontHand = [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '5', 5)]; // Pair
    const dealerMiddle: FiveCardHand = [c('clubs', '8', 8), c('spades', '8', 8), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '9', 9)]; // Pair
    const dealerBack: FiveCardHand = [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14), c('spades', '9', 9)]; // Four of a Kind
    state.players[0] = { ...state.players[0], isValid: true, arrangement: { front: dealerFront, middle: dealerMiddle, back: dealerBack } };

    // Seat 1: strong hand that would crush a non-dealer opponent if ever compared to one, but should
    // only ever be compared against the (weaker) Dealer above.
    const strongFront: FrontHand = [c('clubs', 'K', 13), c('diamonds', 'K', 13), c('hearts', 'K', 13)]; // Trips
    const strongMiddle: FiveCardHand = [c('spades', 'J', 11), c('spades', '10', 10), c('spades', '9', 9), c('spades', '8', 8), c('spades', '7', 7)]; // Straight Flush
    const strongBack: FiveCardHand = [c('hearts', 'Q', 12), c('clubs', 'Q', 12), c('diamonds', 'Q', 12), c('spades', 'Q', 12), c('hearts', '3', 3)]; // Four of a Kind
    state.players[1] = { ...state.players[1], isValid: true, arrangement: { front: strongFront, middle: strongMiddle, back: strongBack } };
    state.players[3] = { ...state.players[3], isValid: true, arrangement: { front: strongFront, middle: strongMiddle, back: strongBack } };

    // Seat 2 (AI, non-dealer): weak hand, deliberately worse than the Dealer's, only to check it
    // never gets paired against seats 1/3's much stronger hands either.
    const weakFront: FrontHand = [c('clubs', '3', 3), c('diamonds', '4', 4), c('hearts', '6', 6)];
    const weakMiddle: FiveCardHand = [c('hearts', '2', 2), c('clubs', '5', 5), c('diamonds', '9', 9), c('spades', 'J', 11), c('hearts', 'K', 13)];
    const weakBack: FiveCardHand = [c('clubs', '2', 2), c('diamonds', '3', 3), c('hearts', '4', 4), c('spades', '5', 5), c('clubs', '7', 7)];
    state.players[2] = { ...state.players[2], isValid: true, arrangement: { front: weakFront, middle: weakMiddle, back: weakBack } };

    state = resolveRound(state);

    // 3 non-dealer opponents -> 3 pairings -> 6 RoundResult entries (dealer + opponent perspective each).
    expect(state.results).toHaveLength(6);
    expect(state.results.every((r) => r.playerId === 'player-0' || r.opponentId === 'player-0')).toBe(true);

    // Seats 1 and 3 (both far stronger than the Dealer) should each show a win against the Dealer only.
    const seat1Result = state.results.find((r) => r.playerId === 'player-1' && r.opponentId === 'player-0')!;
    const seat3Result = state.results.find((r) => r.playerId === 'player-3' && r.opponentId === 'player-0')!;
    expect(seat1Result.roundScore).toBeGreaterThan(0);
    expect(seat3Result.roundScore).toBeGreaterThan(0);

    // No result should ever exist between two non-dealer seats (e.g. player-1 vs player-3).
    expect(state.results.find((r) => r.playerId === 'player-1' && r.opponentId === 'player-3')).toBeUndefined();
    expect(state.results.find((r) => r.playerId === 'player-3' && r.opponentId === 'player-1')).toBeUndefined();
    expect(state.results.find((r) => r.playerId === 'player-2' && r.opponentId === 'player-1')).toBeUndefined();
  });

  it('replaces normal zone-by-zone scoring entirely when a player has a valid Automatic Winning Hand', () => {
    let state = buildTwoPlayerState();
    const hand = sixPairsHand();
    state.players[0] = { ...state.players[0], isValid: true, hand, arrangement: splitArrangement(hand) };

    // Opponent has an objectively crushing hand (Trips front / Quads middle / Straight Flush
    // back) that would net a huge normal-scoring win (+16) against player-0's flimsy pair/two-pair/
    // two-pair split if the auto-win bonus didn't override it.
    state.players[1] = {
      ...state.players[1],
      isValid: true,
      arrangement: {
        front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)],
        middle: [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)],
        back: [c('spades', '5', 5), c('spades', '6', 6), c('spades', '7', 7), c('spades', '8', 8), c('spades', '9', 9)],
      },
    };

    state = resolveRound(state);
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.roundScore).toBe(3); // Six Pairs bonus, not the -16 the zone-by-zone math would otherwise produce
    expect(p0Result.frontResult).toBe('win');
    expect(p0Result.middleResult).toBe('win');
    expect(p0Result.backResult).toBe('win');
    expect(state.players[0].score).toBe(3);
    expect(state.players[1].score).toBe(-3);
  });

  it('applies the Automatic Winning Hand bonus regardless of whether the opponent also fouled', () => {
    let state = buildTwoPlayerState();
    const hand = dragonHand();
    state.players[0] = { ...state.players[0], isValid: true, hand, arrangement: splitArrangement(hand) };
    state.players[1] = { ...state.players[1], isValid: false, arrangement: null };

    state = resolveRound(state);
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.roundScore).toBe(13); // Dragon bonus, not the ordinary +3 foul-win
    expect(p0Result.frontResult).toBe('win');
    expect(state.players[0].score).toBe(13);
    expect(state.players[1].score).toBe(-13);
  });

  it('never applies the Automatic Winning Hand bonus if the player\'s own arrangement fouls', () => {
    let state = buildTwoPlayerState();
    const hand = dragonHand();
    state.players[0] = { ...state.players[0], isValid: false, hand, arrangement: null };
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
    expect(state.players[0].score).toBe(-3); // ordinary foul penalty, no Dragon bonus
    expect(state.players[1].score).toBe(3);
  });

  it('lets a higher-tier Automatic Winning Hand (Dragon) beat a lower-tier one', () => {
    let state = buildTwoPlayerState();
    const dragon = dragonHand();
    const sixPairs = sixPairsHand();
    state.players[0] = { ...state.players[0], isValid: true, hand: dragon, arrangement: splitArrangement(dragon) };
    state.players[1] = { ...state.players[1], isValid: true, hand: sixPairs, arrangement: splitArrangement(sixPairs) };

    state = resolveRound(state);
    expect(state.players[0].score).toBe(13);
    expect(state.players[1].score).toBe(-13);
  });

  it('washes two different tier-1 Automatic Winning Hands against each other', () => {
    let state = buildTwoPlayerState();
    const sixPairs = sixPairsHand();
    const fourPairsFlush = fourPairsFlushHand();
    state.players[0] = { ...state.players[0], isValid: true, hand: sixPairs, arrangement: splitArrangement(sixPairs) };
    state.players[1] = { ...state.players[1], isValid: true, hand: fourPairsFlush, arrangement: splitArrangement(fourPairsFlush) };

    state = resolveRound(state);
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.roundScore).toBe(0);
    expect(p0Result.frontResult).toBe('tie');
    expect(p0Result.middleResult).toBe('tie');
    expect(p0Result.backResult).toBe('tie');
    expect(state.players[0].score).toBe(0);
    expect(state.players[1].score).toBe(0);
  });

  it('washes the same tier-1 Automatic Winning Hand type against itself', () => {
    let state = buildTwoPlayerState();
    const handA = sixPairsHand();
    const handB = sixPairsHand();
    state.players[0] = { ...state.players[0], isValid: true, hand: handA, arrangement: splitArrangement(handA) };
    state.players[1] = { ...state.players[1], isValid: true, hand: handB, arrangement: splitArrangement(handB) };

    state = resolveRound(state);
    expect(state.players[0].score).toBe(0);
    expect(state.players[1].score).toBe(0);
  });

  it('washes two Dragons against each other', () => {
    let state = buildTwoPlayerState();
    const handA = dragonHand();
    const handB = dragonHand();
    state.players[0] = { ...state.players[0], isValid: true, hand: handA, arrangement: splitArrangement(handA) };
    state.players[1] = { ...state.players[1], isValid: true, hand: handB, arrangement: splitArrangement(handB) };

    state = resolveRound(state);
    const p0Result = state.results.find((r) => r.playerId === 'player-0')!;
    expect(p0Result.roundScore).toBe(0);
    expect(p0Result.frontResult).toBe('tie');
    expect(state.players[0].score).toBe(0);
    expect(state.players[1].score).toBe(0);
  });
});

describe('calculateWinner', () => {
  it('returns the single highest-scoring player', () => {
    const state = initializeGame(config(['You', 'Bot 1', 'Bot 2']));
    const players = state.players.map((p, i) => ({ ...p, score: i === 1 ? 10 : 0 }));
    expect(calculateWinner(players)).toEqual([players[1]]);
  });

  it('returns multiple players when tied for the top score', () => {
    const state = initializeGame(config(['You', 'Bot 1']));
    const players = state.players.map((p) => ({ ...p, score: 5 }));
    expect(calculateWinner(players)).toEqual(players);
  });
});

describe('frontPoints', () => {
  it('gives Three of a Kind (category 4) 3 points, everything else 1', () => {
    expect(frontPoints(4)).toBe(3);
    expect(frontPoints(1)).toBe(1);
    expect(frontPoints(2)).toBe(1);
  });
});

describe('middlePoints', () => {
  it('gives Straight/Royal Flush (9) 10, Four of a Kind (8) 8, Full House (7) 2, everything else 1', () => {
    expect(middlePoints(9)).toBe(10);
    expect(middlePoints(8)).toBe(8);
    expect(middlePoints(7)).toBe(2);
    expect(middlePoints(6)).toBe(1);
  });
});

describe('backPoints', () => {
  it('gives Straight/Royal Flush (9) 5, Four of a Kind (8) 4, everything else 1', () => {
    expect(backPoints(9)).toBe(5);
    expect(backPoints(8)).toBe(4);
    expect(backPoints(7)).toBe(1);
  });
});

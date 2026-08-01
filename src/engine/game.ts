import type { Card, FiveCardHand, FrontHand, GameState, Player, RoundResult, MatchupResult } from '../types';
import { createDeck, dealCards, shuffleDeck } from './deck';
import { compareHands } from './compareHands';
import { getHandStrength } from './handRank';
import { validateArrangement } from './validate';

export function initializeGame(playerNames: string[]): GameState {
  const players: Player[] = playerNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    type: i === 0 ? 'human' : 'ai',
    hand: [],
    arrangement: null,
    isValid: false,
    score: 0,
  }));

  return {
    gameId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `game-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: 'dealing',
    players,
    currentPlayerIndex: 0,
    round: 0,
    results: [],
    history: [],
  };
}

/** Shuffles a fresh deck and deals 13 cards to each player, resetting arrangements. */
export function dealRound(state: GameState): GameState {
  const deck = shuffleDeck(createDeck());
  const hands = dealCards(deck, state.players.length);
  const players = state.players.map((p, i) => ({
    ...p,
    hand: hands[i],
    arrangement: null,
    isValid: false,
  }));
  return { ...state, players, status: 'arranging', round: state.round + 1 };
}

export function submitArrangement(
  state: GameState,
  playerId: string,
  front: FrontHand,
  middle: FiveCardHand,
  back: FiveCardHand,
): GameState {
  const { isValid } = validateArrangement(front, middle, back);
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, arrangement: { front, middle, back }, isValid } : p,
  );
  const allSubmitted = players.every((p) => p.arrangement !== null);
  return { ...state, players, status: allSubmitted ? 'comparing' : state.status };
}

function flip(result: MatchupResult): MatchupResult {
  if (result === 'win') return 'loss';
  if (result === 'loss') return 'win';
  return 'tie';
}

/** Front only ever reaches High Card/Pair/Trips (category 4); Trips is worth 3, everything else 1. */
function frontPoints(category: number): number {
  return category === 4 ? 3 : 1;
}

/** Middle: Full House=2, Four of a Kind=8, Straight/Royal Flush=10, everything else 1. */
function middlePoints(category: number): number {
  if (category === 9) return 10;
  if (category === 8) return 8;
  if (category === 7) return 2;
  return 1;
}

/** Back: Four of a Kind=4, Straight/Royal Flush=5, everything else 1. */
function backPoints(category: number): number {
  if (category === 9) return 5;
  if (category === 8) return 4;
  return 1;
}

/**
 * Compares one zone between two hands from `a`'s perspective. The point value is based on
 * the *winning* hand's category on that zone's scale (see frontPoints/middlePoints/backPoints);
 * ties score 0.
 */
function scoreZone(aHand: Card[], bHand: Card[], pointsFor: (category: number) => number): { result: MatchupResult; score: number } {
  const diff = compareHands(aHand, bHand);
  if (diff === 0) return { result: 'tie', score: 0 };
  if (diff > 0) return { result: 'win', score: pointsFor(getHandStrength(aHand)[0]) };
  return { result: 'loss', score: -pointsFor(getHandStrength(bHand)[0]) };
}

/** Scores one pairing between two players, returning a RoundResult from each player's perspective. */
function scorePairwise(a: Player, b: Player): [RoundResult, RoundResult] {
  const aFouled = !a.isValid || !a.arrangement;
  const bFouled = !b.isValid || !b.arrangement;

  if (aFouled && bFouled) {
    const tie = { frontResult: 'tie', middleResult: 'tie', backResult: 'tie', roundScore: 0 } as const;
    return [
      { playerId: a.id, opponentId: b.id, ...tie },
      { playerId: b.id, opponentId: a.id, ...tie },
    ];
  }
  if (aFouled) {
    return [
      { playerId: a.id, opponentId: b.id, frontResult: 'loss', middleResult: 'loss', backResult: 'loss', roundScore: -6 },
      { playerId: b.id, opponentId: a.id, frontResult: 'win', middleResult: 'win', backResult: 'win', roundScore: 6 },
    ];
  }
  if (bFouled) {
    return [
      { playerId: a.id, opponentId: b.id, frontResult: 'win', middleResult: 'win', backResult: 'win', roundScore: 6 },
      { playerId: b.id, opponentId: a.id, frontResult: 'loss', middleResult: 'loss', backResult: 'loss', roundScore: -6 },
    ];
  }

  const front = scoreZone(a.arrangement!.front, b.arrangement!.front, frontPoints);
  const middle = scoreZone(a.arrangement!.middle, b.arrangement!.middle, middlePoints);
  const back = scoreZone(a.arrangement!.back, b.arrangement!.back, backPoints);
  const aScore = front.score + middle.score + back.score;

  return [
    {
      playerId: a.id,
      opponentId: b.id,
      frontResult: front.result,
      middleResult: middle.result,
      backResult: back.result,
      roundScore: aScore,
    },
    {
      playerId: b.id,
      opponentId: a.id,
      frontResult: flip(front.result),
      middleResult: flip(middle.result),
      backResult: flip(back.result),
      roundScore: -aScore,
    },
  ];
}

/**
 * Compares every pair of players' hands and tallies scores. `results` holds one entry per
 * (player, opponent) pairing rather than one per player, since each player's total round
 * score is the sum of independent 1v1 matchups against every other player.
 */
export function resolveRound(state: GameState): GameState {
  const results: RoundResult[] = [];
  const scoreDelta = new Map<string, number>();

  for (let i = 0; i < state.players.length; i++) {
    for (let j = i + 1; j < state.players.length; j++) {
      const [resultA, resultB] = scorePairwise(state.players[i], state.players[j]);
      results.push(resultA, resultB);
      scoreDelta.set(resultA.playerId, (scoreDelta.get(resultA.playerId) ?? 0) + resultA.roundScore);
      scoreDelta.set(resultB.playerId, (scoreDelta.get(resultB.playerId) ?? 0) + resultB.roundScore);
    }
  }

  const players = state.players.map((p) => ({ ...p, score: p.score + (scoreDelta.get(p.id) ?? 0) }));
  return { ...state, players, results, status: 'complete', history: [...state.history, state] };
}

/** Returns the player(s) with the highest cumulative score (ties possible). */
export function calculateWinner(players: Player[]): Player[] {
  const maxScore = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === maxScore);
}

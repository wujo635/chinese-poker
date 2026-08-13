import type { Card, FiveCardHand, FrontHand, GameState, Player, PlayerType, RoundResult, MatchupResult } from '../types';
import { createDeck, dealCards, shuffleDeck } from './deck';
import { compareHands } from './compareHands';
import { getHandStrength } from './handRank';
import { validateArrangement } from './validate';
import { detectAutoWin, AUTO_WIN_POINTS, AUTO_WIN_TIER, type AutoWinType } from './autoWin';

export interface SeatConfig {
  name: string;
  type: PlayerType;
}

export interface InitGameConfig {
  seats: SeatConfig[];
  dealerIndex: number;
}

export function initializeGame(config: InitGameConfig): GameState {
  const players: Player[] = config.seats.map((seat, i) => ({
    id: `player-${i}`,
    name: seat.name,
    type: seat.type,
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
    dealerId: players[config.dealerIndex].id,
    currentPlayerIndex: 0,
    round: 0,
    results: [],
    history: [],
  };
}

/** True if the dealer seat is human-controlled (i.e. this is a "play as Dealer" session). */
export function isDealerModeGame(state: GameState): boolean {
  return state.players.find((p) => p.id === state.dealerId)?.type === 'human';
}

/** Defaults `dealerId` to the first player for saves persisted before the dealer concept existed. */
export function normalizeLegacyGameState(state: GameState): GameState {
  if (state.dealerId) return state;
  return { ...state, dealerId: state.players[0]?.id };
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
export function frontPoints(category: number): number {
  return category === 4 ? 3 : 1;
}

/** Middle: Full House=2, Four of a Kind=8, Straight/Royal Flush=10, everything else 1. */
export function middlePoints(category: number): number {
  if (category === 9) return 10;
  if (category === 8) return 8;
  if (category === 7) return 2;
  return 1;
}

/** Back: Four of a Kind=4, Straight/Royal Flush=5, everything else 1. */
export function backPoints(category: number): number {
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

/**
 * Resolves a pairing where at least one side has a valid Automatic Winning Hand (Dragon,
 * Six Pairs, Four Pairs + Flush/Straight, Three Flushes, or Three Straights) -- detected
 * from the player's raw 13-card deal, independent of how it's arranged. The bonus REPLACES
 * normal front/middle/back scoring for this pairing entirely. Higher tier beats lower
 * (Dragon beats everything); same tier -- including two players with the same type, or two
 * Dragons -- is a wash (0 for both).
 */
function scoreAutoWinPairing(
  a: Player,
  b: Player,
  aType: AutoWinType | null,
  bType: AutoWinType | null,
): [RoundResult, RoundResult] {
  if (aType && bType) {
    const aTier = AUTO_WIN_TIER[aType];
    const bTier = AUTO_WIN_TIER[bType];
    if (aTier === bTier) {
      const wash = { frontResult: 'tie', middleResult: 'tie', backResult: 'tie', roundScore: 0 } as const;
      return [
        { playerId: a.id, opponentId: b.id, ...wash },
        { playerId: b.id, opponentId: a.id, ...wash },
      ];
    }
    const aWins = aTier > bTier;
    const points = AUTO_WIN_POINTS[aWins ? aType : bType];
    return [
      {
        playerId: a.id,
        opponentId: b.id,
        frontResult: aWins ? 'win' : 'loss',
        middleResult: aWins ? 'win' : 'loss',
        backResult: aWins ? 'win' : 'loss',
        roundScore: aWins ? points : -points,
      },
      {
        playerId: b.id,
        opponentId: a.id,
        frontResult: aWins ? 'loss' : 'win',
        middleResult: aWins ? 'loss' : 'win',
        backResult: aWins ? 'loss' : 'win',
        roundScore: aWins ? -points : points,
      },
    ];
  }

  const aWins = !!aType;
  const points = AUTO_WIN_POINTS[(aType ?? bType)!];
  return [
    {
      playerId: a.id,
      opponentId: b.id,
      frontResult: aWins ? 'win' : 'loss',
      middleResult: aWins ? 'win' : 'loss',
      backResult: aWins ? 'win' : 'loss',
      roundScore: aWins ? points : -points,
    },
    {
      playerId: b.id,
      opponentId: a.id,
      frontResult: aWins ? 'loss' : 'win',
      middleResult: aWins ? 'loss' : 'win',
      backResult: aWins ? 'loss' : 'win',
      roundScore: aWins ? -points : points,
    },
  ];
}

/** Scores one pairing between two players, returning a RoundResult from each player's perspective. */
function scorePairwise(a: Player, b: Player): [RoundResult, RoundResult] {
  const aFouled = !a.isValid || !a.arrangement;
  const bFouled = !b.isValid || !b.arrangement;

  // Auto-win status only counts if that player's OWN arrangement is valid -- checked before
  // the foul branches below so a valid auto-win short-circuits past the opponent's foul
  // status entirely (the opponent fouling doesn't matter once the bonus applies).
  const aAutoWin = !aFouled ? detectAutoWin(a.hand) : null;
  const bAutoWin = !bFouled ? detectAutoWin(b.hand) : null;
  if (aAutoWin || bAutoWin) {
    return scoreAutoWinPairing(a, b, aAutoWin, bAutoWin);
  }

  if (aFouled && bFouled) {
    const tie = { frontResult: 'tie', middleResult: 'tie', backResult: 'tie', roundScore: 0 } as const;
    return [
      { playerId: a.id, opponentId: b.id, ...tie },
      { playerId: b.id, opponentId: a.id, ...tie },
    ];
  }
  if (aFouled) {
    return [
      { playerId: a.id, opponentId: b.id, frontResult: 'loss', middleResult: 'loss', backResult: 'loss', roundScore: -3 },
      { playerId: b.id, opponentId: a.id, frontResult: 'win', middleResult: 'win', backResult: 'win', roundScore: 3 },
    ];
  }
  if (bFouled) {
    return [
      { playerId: a.id, opponentId: b.id, frontResult: 'win', middleResult: 'win', backResult: 'win', roundScore: 3 },
      { playerId: b.id, opponentId: a.id, frontResult: 'loss', middleResult: 'loss', backResult: 'loss', roundScore: -3 },
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
 * Compares the Dealer's hand against every other player's hand independently. Non-dealer
 * players never score against each other, only against the Dealer. `results` holds one entry
 * per (player, opponent) pairing rather than one per player, so each player's total round
 * score is the sum of their entries (always exactly one for a non-dealer, or one per opponent
 * for the Dealer).
 */
export function resolveRound(state: GameState): GameState {
  const dealer = state.players.find((p) => p.id === state.dealerId);
  if (!dealer) throw new Error('resolveRound: no player matches state.dealerId');

  const results: RoundResult[] = [];
  const scoreDelta = new Map<string, number>();

  for (const opponent of state.players) {
    if (opponent.id === dealer.id) continue;
    const [dealerResult, opponentResult] = scorePairwise(dealer, opponent);
    results.push(dealerResult, opponentResult);
    scoreDelta.set(dealerResult.playerId, (scoreDelta.get(dealerResult.playerId) ?? 0) + dealerResult.roundScore);
    scoreDelta.set(opponentResult.playerId, (scoreDelta.get(opponentResult.playerId) ?? 0) + opponentResult.roundScore);
  }

  const players = state.players.map((p) => ({ ...p, score: p.score + (scoreDelta.get(p.id) ?? 0) }));
  return { ...state, players, results, status: 'complete', history: [...state.history, state] };
}

/** Returns the player(s) with the highest cumulative score (ties possible). */
export function calculateWinner(players: Player[]): Player[] {
  const maxScore = Math.max(...players.map((p) => p.score));
  return players.filter((p) => p.score === maxScore);
}

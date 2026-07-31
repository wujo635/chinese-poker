import type { Player } from './player';

export type GameStatus = 'dealing' | 'arranging' | 'comparing' | 'complete';

export type MatchupResult = 'win' | 'loss' | 'tie';

export interface RoundResult {
  playerId: string;
  frontResult: MatchupResult;
  middleResult: MatchupResult;
  backResult: MatchupResult;
  roundScore: number;
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  round: number;
  results: RoundResult[];
  history: GameState[];
}

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsScreen } from '../ResultsScreen';
import { initializeGame, submitArrangement, resolveRound } from '../../engine/game';
import type { Card, FiveCardHand, FrontHand, GameState } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

// front < middle < back within this arrangement (pair of 2s < pair of 8s < four-of-a-kind kings).
const strongArrangement = {
  front: [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '3', 3)] as FrontHand,
  middle: [c('clubs', '8', 8), c('spades', '8', 8), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '9', 9)] as FiveCardHand,
  back: [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)] as FiveCardHand,
};

// Deliberately weaker than strongArrangement in all three rows, while staying internally
// valid itself (front < middle < back): high card < pair of 4s < full house queens-over-twos.
const weakArrangement = {
  front: [c('clubs', '5', 5), c('diamonds', '3', 3), c('hearts', '2', 2)] as FrontHand,
  middle: [c('hearts', '4', 4), c('spades', '4', 4), c('clubs', '9', 9), c('diamonds', '3', 3), c('clubs', '2', 2)] as FiveCardHand,
  back: [c('clubs', 'Q', 12), c('diamonds', 'Q', 12), c('hearts', 'Q', 12), c('spades', '2', 2), c('diamonds', '2', 2)] as FiveCardHand,
};

function buildResolvedGame(): GameState {
  let state = initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']);
  state = submitArrangement(state, 'player-0', strongArrangement.front, strongArrangement.middle, strongArrangement.back);
  for (const id of ['player-1', 'player-2', 'player-3']) {
    state = submitArrangement(state, id, weakArrangement.front, weakArrangement.middle, weakArrangement.back);
  }
  return resolveRound(state);
}

describe('ResultsScreen', () => {
  it('shows a matchup row for the human against each opponent with the right score', () => {
    const game = buildResolvedGame();
    const { container } = render(<ResultsScreen game={game} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('You vs Bot 1')).toBeInTheDocument();
    expect(screen.getByText('You vs Bot 2')).toBeInTheDocument();
    expect(screen.getByText('You vs Bot 3')).toBeInTheDocument();

    // The human scooped every opponent (won front, middle, and back) -> +6 each.
    const matchupScores = container.querySelectorAll('.matchup-row__score');
    expect(matchupScores).toHaveLength(3);
    matchupScores.forEach((el) => expect(el.textContent).toBe('+6'));
  });

  it('crowns the top scorer in the standings', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    const youRow = screen.getByText(/👑 You \(You\)/);
    expect(youRow).toBeInTheDocument();
  });

  it('renders each player\'s revealed hand with its hand type', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getAllByText('Four of a Kind')).toHaveLength(1); // human's back
    expect(screen.getAllByText('Full House')).toHaveLength(3); // each bot's back
  });
});

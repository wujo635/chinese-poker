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
  let state = initializeGame({
    seats: [
      { name: 'You', type: 'human' },
      { name: 'Bot 1', type: 'ai' },
      { name: 'Bot 2', type: 'ai' },
      { name: 'Bot 3', type: 'ai' },
    ],
    dealerIndex: 0,
  });
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

  it('shows a round-total summary line and no Standings heading', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText(/Your round total:/)).toBeInTheDocument();
    expect(screen.getByText('+18')).toBeInTheDocument();
    expect(screen.queryByText('Standings')).not.toBeInTheDocument();
  });

  it('marks the dealer\'s revealed hand as "(Dealer)" and "(You)" when the dealer is human', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('You (Dealer) (You)')).toBeInTheDocument();
  });

  it('renders each player\'s revealed hand with its hand type', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getAllByText('Four of a Kind')).toHaveLength(1); // human's back
    expect(screen.getAllByText('Full House')).toHaveLength(3); // each bot's back
  });
});

describe('ResultsScreen (Player mode, AI Dealer)', () => {
  function buildPlayerModeGame(): GameState {
    let state = initializeGame({
      seats: [
        { name: 'AI Dealer', type: 'ai' },
        { name: 'You (Seat 1)', type: 'human' },
        { name: 'Bot 2', type: 'ai' },
        { name: 'You (Seat 2)', type: 'human' },
      ],
      dealerIndex: 0,
    });
    state = submitArrangement(state, 'player-0', strongArrangement.front, strongArrangement.middle, strongArrangement.back);
    for (const id of ['player-1', 'player-2', 'player-3']) {
      state = submitArrangement(state, id, weakArrangement.front, weakArrangement.middle, weakArrangement.back);
    }
    return resolveRound(state);
  }

  it('labels matchup rows with the AI dealer\'s name and marks human non-dealer seats "(You)"', () => {
    const game = buildPlayerModeGame();
    render(<ResultsScreen game={game} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('AI Dealer vs You (Seat 1) (You)')).toBeInTheDocument();
    expect(screen.getByText('AI Dealer vs Bot 2')).toBeInTheDocument();
    expect(screen.getByText('AI Dealer vs You (Seat 2) (You)')).toBeInTheDocument();
    expect(screen.getByText(/AI Dealer's round total:/)).toBeInTheDocument();
  });
});

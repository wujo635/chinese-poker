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
    const { container } = render(<ResultsScreen game={game} sessionTotals={{}} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('You vs Bot 1')).toBeInTheDocument();
    expect(screen.getByText('You vs Bot 2')).toBeInTheDocument();
    expect(screen.getByText('You vs Bot 3')).toBeInTheDocument();

    // The human scooped every opponent (won front, middle, and back) -> +6 each.
    const matchupScores = container.querySelectorAll('.results-screen__matchups .matchup-row__score');
    expect(matchupScores).toHaveLength(3);
    matchupScores.forEach((el) => expect(el.textContent).toBe('+6'));
  });

  it('shows a round-total summary line and no Standings heading', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} sessionTotals={{}} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText(/Your round total:/)).toBeInTheDocument();
    expect(screen.getByText('+18')).toBeInTheDocument();
    expect(screen.queryByText('Standings')).not.toBeInTheDocument();
  });

  it('marks the dealer\'s revealed hand as "(Dealer)" and "(You)" when the dealer is human', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} sessionTotals={{}} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('You (Dealer) (You)')).toBeInTheDocument();
  });

  it('renders each player\'s revealed hand with its hand type', () => {
    const game = buildResolvedGame();
    render(<ResultsScreen game={game} sessionTotals={{}} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getAllByText('Four of a Kind')).toHaveLength(1); // human's back
    expect(screen.getAllByText('Full House')).toHaveLength(3); // each bot's back
  });

  it('colors a hand zone by category tier only when it scores more than 1 point (per game.ts\'s scoring table)', () => {
    const game = buildResolvedGame();
    const { container } = render(<ResultsScreen game={game} sessionTotals={{}} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    // Human's back is a Four of a Kind -- backPoints(8) = 4, notable, tier "quads".
    const fourOfAKindZone = screen.getAllByText('Four of a Kind')[0].closest('.hand-zone');
    expect(fourOfAKindZone).toHaveClass('hand-zone--tier-quads');

    // Each bot's back is a Full House -- backPoints(7) = 1, not notable (Full House only
    // clears the >1 threshold in Middle, worth 2 there; in Back it's still just 1).
    for (const fullHouse of screen.getAllByText('Full House')) {
      expect(fullHouse.closest('.hand-zone')?.className).not.toMatch(/hand-zone--tier-/);
    }

    // Nothing else in this fixture (Pair, High Card) scores above 1 anywhere.
    const tieredZones = container.querySelectorAll('.results-screen__hands [class*="hand-zone--tier-"]');
    expect(tieredZones).toHaveLength(1);
  });

  it('gives Four of a Kind the same tier color whether it lands in Middle or Back', () => {
    // Give the human a Four of a Kind in the Middle instead of the Back, keeping front < middle
    // < back valid (pair of 2s < quad 8s < a stronger hand in back).
    let state = initializeGame({
      seats: [
        { name: 'You', type: 'human' },
        { name: 'Bot 1', type: 'ai' },
        { name: 'Bot 2', type: 'ai' },
        { name: 'Bot 3', type: 'ai' },
      ],
      dealerIndex: 0,
    });
    const front: FrontHand = [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '3', 3)];
    const middle: FiveCardHand = [
      c('clubs', '8', 8),
      c('spades', '8', 8),
      c('hearts', '8', 8),
      c('diamonds', '8', 8),
      c('clubs', '9', 9),
    ];
    const back: FiveCardHand = [
      c('spades', 'A', 14),
      c('hearts', 'A', 14),
      c('diamonds', 'A', 14),
      c('clubs', 'A', 14),
      c('spades', 'K', 13),
    ];
    state = submitArrangement(state, 'player-0', front, middle, back);
    for (const id of ['player-1', 'player-2', 'player-3']) {
      state = submitArrangement(state, id, weakArrangement.front, weakArrangement.middle, weakArrangement.back);
    }
    const game = resolveRound(state);

    render(<ResultsScreen game={game} sessionTotals={{}} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    const quadZones = screen.getAllByText('Four of a Kind').map((el) => el.closest('.hand-zone'));
    expect(quadZones).toHaveLength(2); // human's middle and human's back
    for (const zone of quadZones) {
      expect(zone).toHaveClass('hand-zone--tier-quads');
    }
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
    render(<ResultsScreen game={game} sessionTotals={{}} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('AI Dealer vs You (Seat 1) (You)')).toBeInTheDocument();
    expect(screen.getByText('AI Dealer vs Bot 2')).toBeInTheDocument();
    expect(screen.getByText('AI Dealer vs You (Seat 2) (You)')).toBeInTheDocument();
    expect(screen.getByText(/AI Dealer's round total:/)).toBeInTheDocument();
  });
});

describe('ResultsScreen (Session Totals)', () => {
  it('renders session totals from the sessionTotals prop, not the round\'s own scores, and crowns the leader', () => {
    const game = buildResolvedGame();
    const sessionTotals = {
      'player-0': 42,
      'player-1': 7,
      'player-2': 7,
      'player-3': -3,
    };
    render(<ResultsScreen game={game} sessionTotals={sessionTotals} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('Session Totals')).toBeInTheDocument();
    expect(screen.getByText('👑 You (Dealer) (You)')).toBeInTheDocument();
    expect(screen.getByText('+42')).toBeInTheDocument();
    expect(screen.getAllByText('+7')).toHaveLength(2);
    expect(screen.getByText('-3')).toBeInTheDocument();
    // The human scooped every opponent this round (+6 each, +18 total) -- distinct from the
    // session totals above, proving the section reads sessionTotals rather than recomputing.
    expect(screen.queryByText('+18', { selector: '.results-screen__session-totals *' })).not.toBeInTheDocument();
  });

  it('crowns every tied leader when session totals are tied', () => {
    const game = buildResolvedGame();
    const sessionTotals = {
      'player-0': 10,
      'player-1': 10,
      'player-2': 3,
      'player-3': 3,
    };
    render(<ResultsScreen game={game} sessionTotals={sessionTotals} onPlayAgain={vi.fn()} onHome={vi.fn()} />);

    expect(screen.getByText('👑 You (Dealer) (You)')).toBeInTheDocument();
    expect(screen.getByText('👑 Bot 1')).toBeInTheDocument();
    expect(screen.queryByText('👑 Bot 2')).not.toBeInTheDocument();
    expect(screen.queryByText('👑 Bot 3')).not.toBeInTheDocument();
  });
});

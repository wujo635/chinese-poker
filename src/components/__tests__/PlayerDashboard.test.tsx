import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerDashboard } from '../PlayerDashboard';
import { initializeGame, dealRound, submitArrangement } from '../../engine/game';
import { generateAIArrangement } from '../../engine/ai';

function dealerModeGame() {
  return dealRound(
    initializeGame({
      seats: [
        { name: 'You', type: 'human' },
        { name: 'Bot 1', type: 'ai' },
        { name: 'Bot 2', type: 'ai' },
        { name: 'Bot 3', type: 'ai' },
      ],
      dealerIndex: 0,
    }),
  );
}

describe('PlayerDashboard', () => {
  it('shows each opponent name and "Locked In" once they have an arrangement', () => {
    let state = dealerModeGame();
    const bot1 = state.players[1];
    const arrangement = generateAIArrangement(bot1.hand);
    state = submitArrangement(state, bot1.id, arrangement.front, arrangement.middle, arrangement.back);

    render(<PlayerDashboard players={state.players} dealerId={state.dealerId} arrangingPlayerId={state.players[0].id} />);

    expect(screen.getByText(/Bot 1/)).toBeInTheDocument();
    expect(screen.getByText(/Bot 2/)).toBeInTheDocument();
    expect(screen.getByText(/Bot 3/)).toBeInTheDocument();
    expect(screen.getAllByText(/Locked In/)).toHaveLength(1);
    expect(screen.getAllByText(/Arranging/)).toHaveLength(2);
  });

  it('excludes the currently-arranging player from the displayed list', () => {
    const state = dealerModeGame();
    render(<PlayerDashboard players={state.players} dealerId={state.dealerId} arrangingPlayerId={state.players[0].id} />);

    expect(screen.queryByText(/You/)).not.toBeInTheDocument();
  });

  it('marks the dealer seat distinctly', () => {
    const state = dealRound(
      initializeGame({
        seats: [
          { name: 'AI Dealer', type: 'ai' },
          { name: 'You (Seat 1)', type: 'human' },
          { name: 'Bot 2', type: 'ai' },
        ],
        dealerIndex: 0,
      }),
    );

    render(
      <PlayerDashboard players={state.players} dealerId={state.dealerId} arrangingPlayerId={state.players[1].id} />,
    );

    expect(screen.getByText(/AI Dealer 🎩/)).toBeInTheDocument();
  });

  it('shows "Up Next" for an unarranged human non-dealer seat, distinct from an AI still arranging', () => {
    const state = dealRound(
      initializeGame({
        seats: [
          { name: 'AI Dealer', type: 'ai' },
          { name: 'You (Seat 1)', type: 'human' },
          { name: 'You (Seat 2)', type: 'human' },
        ],
        dealerIndex: 0,
      }),
    );

    render(
      <PlayerDashboard players={state.players} dealerId={state.dealerId} arrangingPlayerId={state.players[1].id} />,
    );

    // Seat 2 (human, not yet arranged) should read "Up Next"; the AI dealer (not yet arranged
    // in this fixture since dealRound doesn't auto-arrange) should read "Arranging…".
    expect(screen.getByText('Up Next')).toBeInTheDocument();
    expect(screen.getByText('Arranging…')).toBeInTheDocument();
  });
});

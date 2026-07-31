import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerDashboard } from '../PlayerDashboard';
import { initializeGame, dealRound, submitArrangement } from '../../engine/game';
import { generateAIArrangement } from '../../engine/ai';

describe('PlayerDashboard', () => {
  it('shows each opponent name and "Locked In" once they have an arrangement', () => {
    let state = dealRound(initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
    const bot1 = state.players[1];
    const arrangement = generateAIArrangement(bot1.hand);
    state = submitArrangement(state, bot1.id, arrangement.front, arrangement.middle, arrangement.back);

    render(<PlayerDashboard opponents={state.players.slice(1)} />);

    expect(screen.getByText('Bot 1')).toBeInTheDocument();
    expect(screen.getByText('Bot 2')).toBeInTheDocument();
    expect(screen.getByText('Bot 3')).toBeInTheDocument();
    expect(screen.getAllByText(/Locked In/)).toHaveLength(1);
    expect(screen.getAllByText(/Arranging/)).toHaveLength(2);
  });
});

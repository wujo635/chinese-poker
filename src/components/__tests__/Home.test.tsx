import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from '../Home';
import { vi } from 'vitest';

describe('Home', () => {
  it('defaults to Dealer mode with the seat-count picker hidden, and calls onNewGame accordingly', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(<Home hasSavedGame={false} onNewGame={onNewGame} onContinue={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /Play as Dealer vs 3 AI/ })).toBeChecked();
    expect(screen.queryByText(/Control \d seat/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith({ mode: 'dealer', humanSeatCount: 1 }, false);
  });

  it('reveals the seat-count picker when Player mode is selected, and calls onNewGame with the chosen count', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(<Home hasSavedGame={false} onNewGame={onNewGame} onContinue={vi.fn()} />);

    await user.click(screen.getByRole('radio', { name: /Play vs AI Dealer/ }));
    expect(screen.getByText('Control 2 seats')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Control 2 seats' }));
    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith({ mode: 'player', humanSeatCount: 2 }, false);
  });

  it('calls onNewGame with allowInvalidSubmissions true once the checkbox is checked', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(<Home hasSavedGame={false} onNewGame={onNewGame} onContinue={vi.fn()} />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith({ mode: 'dealer', humanSeatCount: 1 }, true);
  });
});

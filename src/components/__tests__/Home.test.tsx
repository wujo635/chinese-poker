import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from '../Home';

describe('Home', () => {
  it('calls onNewGame with false by default (checkbox unchecked)', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(<Home hasSavedGame={false} onNewGame={onNewGame} onContinue={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith(false);
  });

  it('calls onNewGame with true once the "allow invalid submissions" checkbox is checked', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(<Home hasSavedGame={false} onNewGame={onNewGame} onContinue={vi.fn()} />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith(true);
  });
});

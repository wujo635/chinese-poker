import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewScreen } from '../ReviewScreen';
import type { Card } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

// Front (pair of Aces) beats middle (pair of 2s) -> fouled arrangement.
const front = [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', '3', 3)];
const middle = [c('clubs', '2', 2), c('spades', '2', 2), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)];
const back = [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)];

describe('ReviewScreen', () => {
  it('disables Confirm for a fouled arrangement when invalid submissions are not allowed', () => {
    render(
      <ReviewScreen
        front={front}
        middle={middle}
        back={back}
        allowInvalidSubmissions={false}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByText(/foul/i)).toBeInTheDocument();
  });

  it('enables Confirm for a fouled arrangement when invalid submissions are allowed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ReviewScreen
        front={front}
        middle={middle}
        back={back}
        allowInvalidSubmissions={true}
        onBack={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalled();
  });
});

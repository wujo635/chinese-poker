import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('starts on the Home screen with no saved game available', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue Saved Game' })).not.toBeInTheDocument();
  });

  it('deals a 13-card hand and moves to the arranging screen on New Game', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(screen.getByText('Your Hand (13)')).toBeInTheDocument();
    expect(screen.getByText(/Front \(0\/3\)/)).toBeInTheDocument();
  });

  it('offers "Continue Saved Game" on Home after Save & Exit', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Save & Exit' }));

    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue Saved Game' })).toBeInTheDocument();
  });

  it('goes straight from arranging to results on Confirm, with no review step', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Enable the toggle so Confirm is guaranteed enabled regardless of whether
    // Auto-Place's greedy strategy happens to foul on this particular deal.
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByRole('heading', { name: 'Round Results' })).toBeInTheDocument();
  });

  it('arranges multiple human seats sequentially in Player mode, then reaches Results', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: /Play vs AI Dealer/ }));
    await user.click(screen.getByRole('radio', { name: 'Control 2 seats' }));
    await user.click(screen.getByRole('checkbox')); // allow invalid submissions, avoids Auto-Place foul flakiness
    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(screen.getByText('Arranging Seat 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    // Still arranging (seat 2), with a fresh 13-card hand and updated progress text.
    expect(screen.getByText('Your Hand (13)')).toBeInTheDocument();
    expect(screen.getByText('Arranging Seat 2 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByRole('heading', { name: 'Round Results' })).toBeInTheDocument();
  });

  it('resumes on the next unconfirmed seat after Save & Exit mid multi-seat arranging', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: /Play vs AI Dealer/ }));
    await user.click(screen.getByRole('radio', { name: 'Control 2 seats' }));
    await user.click(screen.getByRole('checkbox')); // allow invalid submissions, avoids Auto-Place foul flakiness
    await user.click(screen.getByRole('button', { name: 'New Game' }));

    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByText('Arranging Seat 2 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save & Exit' }));
    await user.click(screen.getByRole('button', { name: 'Continue Saved Game' }));

    // Resumes on seat 2, not seat 1 (whose confirmed arrangement stays locked in).
    expect(screen.getByText('Arranging Seat 2 of 2')).toBeInTheDocument();
  });
});

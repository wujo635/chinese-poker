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
});

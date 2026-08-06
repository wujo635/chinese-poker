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

  it('offers "Continue Saved Game" alongside the active session\'s buttons on Home after Save & Exit', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Save & Exit' }));

    expect(screen.getByRole('button', { name: 'Continue Saved Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue Session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End Session' })).toBeInTheDocument();
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

  it('accumulates session totals across two rounds played via Play Again', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('checkbox')); // allow invalid submissions, avoids Auto-Place foul flakiness
    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const round1Total = Number(container.querySelector('.results-screen__summary-score')!.textContent);
    const round1SessionTotal = Number(
      container.querySelector('.results-screen__session-totals .matchup-row__score')!.textContent,
    );
    expect(round1SessionTotal).toBe(round1Total);

    await user.click(screen.getByRole('button', { name: 'Play Again' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const round2Total = Number(container.querySelector('.results-screen__summary-score')!.textContent);
    const round2SessionTotal = Number(
      container.querySelector('.results-screen__session-totals .matchup-row__score')!.textContent,
    );
    expect(round2SessionTotal).toBe(round1Total + round2Total);
  });

  it('accumulates a non-human seat\'s session total in Player mode', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('radio', { name: /Play vs AI Dealer/ }));
    await user.click(screen.getByRole('radio', { name: 'Control 2 seats' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    // Row order mirrors game.players: AI Dealer, You (Seat 1), You (Seat 2), Bot 3.
    const round1BotRow = container.querySelectorAll('.results-screen__session-totals .matchup-row__score')[3];
    const round1BotTotal = Number(round1BotRow.textContent);

    await user.click(screen.getByRole('button', { name: 'Play Again' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const round2BotMatchupTotal = Number(
      Array.from(container.querySelectorAll('.results-screen__matchups .matchup-row')).find((row) =>
        row.textContent!.includes('Bot 3'),
      )!.querySelector('.matchup-row__score')!.textContent,
    );
    const round2BotSessionTotal = Number(
      container.querySelectorAll('.results-screen__session-totals .matchup-row__score')[3].textContent,
    );

    // Bot 3 is a non-dealer seat, so its own net for the round is the negation of the
    // dealer-vs-Bot-3 matchup score shown on Results.
    expect(round2BotSessionTotal).toBe(round1BotTotal - round2BotMatchupTotal);
  });

  it('resets session totals when End Session is clicked, so a fresh New Game starts totals at round-1 values', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await user.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.getByRole('button', { name: 'End Session' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'End Session' }));

    expect(screen.getByRole('button', { name: 'New Game' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue Session' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const roundTotal = Number(container.querySelector('.results-screen__summary-score')!.textContent);
    const sessionTotal = Number(
      container.querySelector('.results-screen__session-totals .matchup-row__score')!.textContent,
    );
    expect(sessionTotal).toBe(roundTotal);
  });

  it('(re)activates session tracking when resuming a saved game with no active session', async () => {
    const user = userEvent.setup();
    const first = render(<App />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Save & Exit' }));
    first.unmount();

    render(<App />);
    expect(await screen.findByRole('button', { name: 'Continue Saved Game' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue Session' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue Saved Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByText('Session Totals')).toBeInTheDocument();
  });

  it('records the session score to the Dealer leaderboard when End Session is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const roundTotal = Number(container.querySelector('.results-screen__summary-score')!.textContent);

    await user.click(screen.getByRole('button', { name: 'Home' }));
    await user.click(screen.getByRole('button', { name: 'End Session' }));

    const dealerEntry = container.querySelector('.home__leaderboard-column .home__leaderboard-list li')!;
    const scoreMatch = dealerEntry.textContent!.match(/^([+-]?\d+)/);
    expect(Number(scoreMatch![1])).toBe(roundTotal);
  });

  it('records the summed score of your controlled seats to the Player leaderboard, annotated with seat count', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('radio', { name: /Play vs AI Dealer/ }));
    await user.click(screen.getByRole('radio', { name: 'Control 2 seats' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    // Row order mirrors game.players: AI Dealer, You (Seat 1), You (Seat 2), Bot 3.
    const sessionScores = Array.from(
      container.querySelectorAll('.results-screen__session-totals .matchup-row__score'),
    ).map((el) => Number(el.textContent));
    const expectedSum = sessionScores[1] + sessionScores[2];

    await user.click(screen.getByRole('button', { name: 'Home' }));
    await user.click(screen.getByRole('button', { name: 'End Session' }));

    const playerColumn = container.querySelectorAll('.home__leaderboard-column')[1];
    const entry = playerColumn.querySelector('.home__leaderboard-list li')!;
    expect(entry.textContent).toContain('(2 seats)');
    const scoreMatch = entry.textContent!.match(/^([+-]?\d+)/);
    expect(Number(scoreMatch![1])).toBe(expectedSum);
  });

  it('does not record a leaderboard entry when a session ends with no rounds played', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'New Game' }));
    await user.click(screen.getByRole('button', { name: 'Save & Exit' }));
    await user.click(screen.getByRole('button', { name: 'End Session' }));

    expect(screen.getAllByText('No scores yet')).toHaveLength(2);
  });
});

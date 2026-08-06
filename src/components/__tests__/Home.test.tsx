import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from '../Home';
import { vi } from 'vitest';

const defaultSessionConfig = { mode: 'dealer' as const, humanSeatCount: 1 as const };
const emptyLeaderboard = { dealer: [], player: [] };

describe('Home', () => {
  it('defaults to Dealer mode with the seat-count picker hidden, and calls onNewGame accordingly', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(
      <Home
        hasSavedGame={false}
        sessionActive={false}
        sessionConfig={defaultSessionConfig}
        leaderboard={emptyLeaderboard}
        onNewGame={onNewGame}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /Play as Dealer vs 3 AI/ })).toBeChecked();
    expect(screen.queryByText(/Control \d seat/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith({ mode: 'dealer', humanSeatCount: 1 }, false);
  });

  it('reveals the seat-count picker when Player mode is selected, and calls onNewGame with the chosen count', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(
      <Home
        hasSavedGame={false}
        sessionActive={false}
        sessionConfig={defaultSessionConfig}
        leaderboard={emptyLeaderboard}
        onNewGame={onNewGame}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /Play vs AI Dealer/ }));
    expect(screen.getByText('Control 2 seats')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Control 2 seats' }));
    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith({ mode: 'player', humanSeatCount: 2 }, false);
  });

  it('calls onNewGame with allowInvalidSubmissions true once the checkbox is checked', async () => {
    const user = userEvent.setup();
    const onNewGame = vi.fn();
    render(
      <Home
        hasSavedGame={false}
        sessionActive={false}
        sessionConfig={defaultSessionConfig}
        leaderboard={emptyLeaderboard}
        onNewGame={onNewGame}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'New Game' }));

    expect(onNewGame).toHaveBeenCalledWith({ mode: 'dealer', humanSeatCount: 1 }, true);
  });

  it('shows the locked-mode indicator and Continue/End Session buttons, and hides the mode picker and New Game, while a session is active', () => {
    render(
      <Home
        hasSavedGame={false}
        sessionActive={true}
        sessionConfig={{ mode: 'dealer', humanSeatCount: 1 }}
        leaderboard={emptyLeaderboard}
        onNewGame={vi.fn()}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText('Session locked: Play as Dealer vs 3 AI')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Play as Dealer vs 3 AI/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Game' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue Session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End Session' })).toBeInTheDocument();
  });

  it('shows the locked-mode label for Player mode with the correct seat count', () => {
    render(
      <Home
        hasSavedGame={false}
        sessionActive={true}
        sessionConfig={{ mode: 'player', humanSeatCount: 2 }}
        leaderboard={emptyLeaderboard}
        onNewGame={vi.fn()}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Session locked: Play vs AI Dealer — controlling 2 seats'),
    ).toBeInTheDocument();
  });

  it('shows all three buttons when a saved game exists and a session is active', () => {
    render(
      <Home
        hasSavedGame={true}
        sessionActive={true}
        sessionConfig={defaultSessionConfig}
        leaderboard={emptyLeaderboard}
        onNewGame={vi.fn()}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Continue Saved Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue Session' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End Session' })).toBeInTheDocument();
  });

  it('calls onContinueSession and onEndSession when their buttons are clicked', async () => {
    const user = userEvent.setup();
    const onContinueSession = vi.fn();
    const onEndSession = vi.fn();
    render(
      <Home
        hasSavedGame={false}
        sessionActive={true}
        sessionConfig={defaultSessionConfig}
        leaderboard={emptyLeaderboard}
        onNewGame={vi.fn()}
        onContinueSession={onContinueSession}
        onEndSession={onEndSession}
        onContinue={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Continue Session' }));
    expect(onContinueSession).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'End Session' }));
    expect(onEndSession).toHaveBeenCalled();
  });

  it('shows "No scores yet" for a mode with no leaderboard entries', () => {
    render(
      <Home
        hasSavedGame={false}
        sessionActive={false}
        sessionConfig={defaultSessionConfig}
        leaderboard={emptyLeaderboard}
        onNewGame={vi.fn()}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    const noScores = screen.getAllByText('No scores yet');
    expect(noScores).toHaveLength(2);
  });

  it('renders dealer-mode entries as a bare score and player-mode entries with a seat-count suffix', () => {
    const leaderboard = {
      dealer: [{ score: 42, seatCount: 1, date: '2026-08-01T00:00:00.000Z' }],
      player: [{ score: 54, seatCount: 3, date: '2026-08-02T00:00:00.000Z' }],
    };
    render(
      <Home
        hasSavedGame={false}
        sessionActive={false}
        sessionConfig={defaultSessionConfig}
        leaderboard={leaderboard}
        onNewGame={vi.fn()}
        onContinueSession={vi.fn()}
        onEndSession={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByText(/^\+42 —/)).toBeInTheDocument();
    expect(screen.getByText(/^\+54 \(3 seats\) —/)).toBeInTheDocument();
  });
});

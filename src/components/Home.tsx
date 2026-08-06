import { useState } from 'react';
import type { Leaderboard } from '../engine/leaderboard';
import './Home.css';

export interface SessionConfig {
  mode: 'dealer' | 'player';
  humanSeatCount: 1 | 2 | 3;
}

interface HomeProps {
  hasSavedGame: boolean;
  sessionActive: boolean;
  sessionConfig: SessionConfig;
  leaderboard: Leaderboard;
  onNewGame: (config: SessionConfig, allowInvalidSubmissions: boolean) => void;
  onContinueSession: (allowInvalidSubmissions: boolean) => void;
  onEndSession: () => void;
  onContinue: () => void;
}

function lockedModeLabel(config: SessionConfig): string {
  if (config.mode === 'dealer') return 'Session locked: Play as Dealer vs 3 AI';
  const n = config.humanSeatCount;
  return `Session locked: Play vs AI Dealer — controlling ${n} seat${n > 1 ? 's' : ''}`;
}

function formatScore(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

export function Home({
  hasSavedGame,
  sessionActive,
  sessionConfig,
  leaderboard,
  onNewGame,
  onContinueSession,
  onEndSession,
  onContinue,
}: HomeProps) {
  const [mode, setMode] = useState<SessionConfig['mode']>('dealer');
  const [humanSeatCount, setHumanSeatCount] = useState<SessionConfig['humanSeatCount']>(1);
  const [allowInvalidSubmissions, setAllowInvalidSubmissions] = useState(false);

  return (
    <div className="home">
      <p className="home__intro">
        Arrange your 13 cards into a front (3), middle (5), and back (5) hand — each hand
        must beat the one before it, back beats middle beats front, or you foul the round.
        One seat is the Dealer; every other seat's hand is scored only against the Dealer's.
      </p>

      {sessionActive ? (
        <p className="home__locked-mode">{lockedModeLabel(sessionConfig)}</p>
      ) : (
        <>
          <fieldset className="home__mode">
            <label className="home__option">
              <input type="radio" name="mode" checked={mode === 'dealer'} onChange={() => setMode('dealer')} />
              Play as Dealer vs 3 AI
            </label>
            <label className="home__option">
              <input type="radio" name="mode" checked={mode === 'player'} onChange={() => setMode('player')} />
              Play vs AI Dealer
            </label>
          </fieldset>

          {mode === 'player' && (
            <fieldset className="home__seat-count">
              {([1, 2, 3] as const).map((n) => (
                <label className="home__option" key={n}>
                  <input
                    type="radio"
                    name="seatCount"
                    checked={humanSeatCount === n}
                    onChange={() => setHumanSeatCount(n)}
                  />
                  Control {n} seat{n > 1 ? 's' : ''}
                </label>
              ))}
            </fieldset>
          )}
        </>
      )}

      <label className="home__option">
        <input
          type="checkbox"
          checked={allowInvalidSubmissions}
          onChange={(e) => setAllowInvalidSubmissions(e.target.checked)}
        />
        Allow submitting an invalid arrangement (fouls still auto-lose the round)
      </label>
      <div className="home__actions">
        {!sessionActive && (
          <button type="button" onClick={() => onNewGame({ mode, humanSeatCount }, allowInvalidSubmissions)}>
            New Game
          </button>
        )}
        {hasSavedGame && (
          <button type="button" onClick={onContinue}>
            Continue Saved Game
          </button>
        )}
        {sessionActive && (
          <>
            <button type="button" onClick={() => onContinueSession(allowInvalidSubmissions)}>
              Continue Session
            </button>
            <button type="button" onClick={onEndSession}>
              End Session
            </button>
          </>
        )}
      </div>

      <section className="home__leaderboard">
        <h3>Leaderboard</h3>
        {(['dealer', 'player'] as const).map((mode) => (
          <div key={mode} className="home__leaderboard-column">
            <h4>{mode === 'dealer' ? 'Dealer Mode' : 'Player Mode'}</h4>
            {leaderboard[mode].length === 0 ? (
              <p className="home__leaderboard-empty">No scores yet</p>
            ) : (
              <ol className="home__leaderboard-list">
                {leaderboard[mode].map((entry, i) => (
                  <li key={i}>
                    {formatScore(entry.score)}
                    {mode === 'player' ? ` (${entry.seatCount} seat${entry.seatCount > 1 ? 's' : ''})` : ''}
                    {' — '}
                    {new Date(entry.date).toLocaleDateString()}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

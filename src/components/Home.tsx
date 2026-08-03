import { useState } from 'react';
import './Home.css';

export interface SessionConfig {
  mode: 'dealer' | 'player';
  humanSeatCount: 1 | 2 | 3;
}

interface HomeProps {
  hasSavedGame: boolean;
  onNewGame: (config: SessionConfig, allowInvalidSubmissions: boolean) => void;
  onContinue: () => void;
}

export function Home({ hasSavedGame, onNewGame, onContinue }: HomeProps) {
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

      <label className="home__option">
        <input
          type="checkbox"
          checked={allowInvalidSubmissions}
          onChange={(e) => setAllowInvalidSubmissions(e.target.checked)}
        />
        Allow submitting an invalid arrangement (fouls still auto-lose the round)
      </label>
      <div className="home__actions">
        <button type="button" onClick={() => onNewGame({ mode, humanSeatCount }, allowInvalidSubmissions)}>
          New Game
        </button>
        {hasSavedGame && (
          <button type="button" onClick={onContinue}>
            Continue Saved Game
          </button>
        )}
      </div>
    </div>
  );
}

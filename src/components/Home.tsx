import { useState } from 'react';
import './Home.css';

interface HomeProps {
  hasSavedGame: boolean;
  onNewGame: (allowInvalidSubmissions: boolean) => void;
  onContinue: () => void;
}

export function Home({ hasSavedGame, onNewGame, onContinue }: HomeProps) {
  const [allowInvalidSubmissions, setAllowInvalidSubmissions] = useState(false);

  return (
    <div className="home">
      <p className="home__intro">
        Arrange your 13 cards into a front (3), middle (5), and back (5) hand — each hand
        must beat the one before it, back beats middle beats front, or you foul the round.
        Then face off against 3 AI opponents to see who scores the most.
      </p>
      <label className="home__option">
        <input
          type="checkbox"
          checked={allowInvalidSubmissions}
          onChange={(e) => setAllowInvalidSubmissions(e.target.checked)}
        />
        Allow submitting an invalid arrangement (fouls still auto-lose the round)
      </label>
      <div className="home__actions">
        <button type="button" onClick={() => onNewGame(allowInvalidSubmissions)}>
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

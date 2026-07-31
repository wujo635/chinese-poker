import './Home.css';

interface HomeProps {
  hasSavedGame: boolean;
  onNewGame: () => void;
  onContinue: () => void;
}

export function Home({ hasSavedGame, onNewGame, onContinue }: HomeProps) {
  return (
    <div className="home">
      <p className="home__intro">
        Arrange your 13 cards into a front (3), middle (5), and back (5) hand — each hand
        must beat the one before it, back beats middle beats front, or you foul the round.
        Then face off against 3 AI opponents to see who scores the most.
      </p>
      <div className="home__actions">
        <button type="button" onClick={onNewGame}>
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

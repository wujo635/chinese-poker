import { useEffect, useState } from 'react';
import type { Card, FiveCardHand, FrontHand, GameState } from './types';
import { initializeGame, dealRound, submitArrangement } from './engine/game';
import { saveGameState, loadGameState, clearGameState, listSavedGameIds } from './engine/persistence';
import { Home } from './components/Home';
import { ArrangementScreen, type ArrangementState } from './components/ArrangementScreen';
import { ReviewScreen } from './components/ReviewScreen';
import './App.css';

type View = 'home' | 'arranging' | 'review' | 'complete';

function emptyArrangement(hand: Card[]): ArrangementState {
  return { hand, front: [], middle: [], back: [] };
}

function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [arrangement, setArrangement] = useState<ArrangementState | null>(null);
  const [view, setView] = useState<View>('home');
  const [savedGameId, setSavedGameId] = useState<string | null>(null);

  useEffect(() => {
    const ids = listSavedGameIds();
    setSavedGameId(ids[0] ?? null);
  }, []);

  function handleNewGame() {
    const fresh = dealRound(initializeGame(['You']));
    setGame(fresh);
    setArrangement(emptyArrangement(fresh.players[0].hand));
    setView('arranging');
  }

  function handleContinue() {
    if (!savedGameId) return;
    const loaded = loadGameState(savedGameId);
    if (!loaded) return;
    setGame(loaded);
    setArrangement(emptyArrangement(loaded.players[0].hand));
    setView('arranging');
  }

  function handleSaveExit() {
    if (game) {
      saveGameState(game);
      setSavedGameId(game.gameId);
    }
    setView('home');
  }

  function handleConfirm() {
    if (!game || !arrangement) return;
    const updated = submitArrangement(
      game,
      game.players[0].id,
      arrangement.front as FrontHand,
      arrangement.middle as FiveCardHand,
      arrangement.back as FiveCardHand,
    );
    setGame(updated);
    clearGameState(game.gameId);
    setSavedGameId(null);
    setView('complete');
  }

  function handleHome() {
    setGame(null);
    setArrangement(null);
    setView('home');
  }

  return (
    <div className="app">
      <h1 className="app__title">Chinese Poker — Solo Play</h1>

      {view === 'home' && (
        <Home hasSavedGame={savedGameId !== null} onNewGame={handleNewGame} onContinue={handleContinue} />
      )}

      {view === 'arranging' && arrangement && (
        <ArrangementScreen
          arrangement={arrangement}
          onChange={setArrangement}
          onReview={() => setView('review')}
          onSaveExit={handleSaveExit}
        />
      )}

      {view === 'review' && arrangement && (
        <ReviewScreen
          front={arrangement.front}
          middle={arrangement.middle}
          back={arrangement.back}
          onBack={() => setView('arranging')}
          onConfirm={handleConfirm}
        />
      )}

      {view === 'complete' && arrangement && (
        <ReviewScreen
          front={arrangement.front}
          middle={arrangement.middle}
          back={arrangement.back}
          locked
          onPlayAgain={handleNewGame}
          onHome={handleHome}
        />
      )}
    </div>
  );
}

export default App;

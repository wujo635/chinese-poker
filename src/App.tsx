import { useEffect, useState } from 'react';
import type { Card, FiveCardHand, FrontHand, GameState } from './types';
import { initializeGame, dealRound, submitArrangement, resolveRound } from './engine/game';
import { generateAIArrangement } from './engine/ai';
import { saveGameState, loadGameState, clearGameState, listSavedGameIds } from './engine/persistence';
import { Home } from './components/Home';
import { PlayerDashboard } from './components/PlayerDashboard';
import { ArrangementScreen, type ArrangementState } from './components/ArrangementScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { ResultsScreen } from './components/ResultsScreen';
import './App.css';

type View = 'home' | 'arranging' | 'review' | 'results';

function emptyArrangement(hand: Card[]): ArrangementState {
  return { hand, front: [], middle: [], back: [] };
}

/** Deals a fresh round and has every AI player lock in their arrangement immediately. */
function dealWithAiArrangements(): GameState {
  let state = dealRound(initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']));
  for (const player of state.players) {
    if (player.type !== 'ai') continue;
    const arrangement = generateAIArrangement(player.hand);
    state = submitArrangement(state, player.id, arrangement.front, arrangement.middle, arrangement.back);
  }
  return state;
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
    const fresh = dealWithAiArrangements();
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
    let updated = submitArrangement(
      game,
      game.players[0].id,
      arrangement.front as FrontHand,
      arrangement.middle as FiveCardHand,
      arrangement.back as FiveCardHand,
    );
    if (updated.status === 'comparing') {
      updated = resolveRound(updated);
    }
    setGame(updated);
    clearGameState(game.gameId);
    setSavedGameId(null);
    setView('results');
  }

  function handleHome() {
    setGame(null);
    setArrangement(null);
    setView('home');
  }

  return (
    <div className="app">
      <h1 className="app__title">Chinese Poker</h1>

      {view === 'home' && (
        <Home hasSavedGame={savedGameId !== null} onNewGame={handleNewGame} onContinue={handleContinue} />
      )}

      {view === 'arranging' && arrangement && game && (
        <>
          <PlayerDashboard opponents={game.players.slice(1)} />
          <ArrangementScreen
            arrangement={arrangement}
            onChange={setArrangement}
            onReview={() => setView('review')}
            onSaveExit={handleSaveExit}
          />
        </>
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

      {view === 'results' && game && (
        <ResultsScreen game={game} onPlayAgain={handleNewGame} onHome={handleHome} />
      )}
    </div>
  );
}

export default App;

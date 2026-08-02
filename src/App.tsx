import { useEffect, useState } from 'react';
import type { Card, FiveCardHand, FrontHand, GameState } from './types';
import type { InitGameConfig } from './engine/game';
import { initializeGame, dealRound, submitArrangement, resolveRound, normalizeLegacyGameState } from './engine/game';
import { generateAIArrangement } from './engine/ai';
import { saveGameState, loadGameState, clearGameState, listSavedGameIds } from './engine/persistence';
import { Home, type SessionConfig } from './components/Home';
import { PlayerDashboard } from './components/PlayerDashboard';
import { ArrangementScreen, type ArrangementState } from './components/ArrangementScreen';
import { ResultsScreen } from './components/ResultsScreen';
import './App.css';

type View = 'home' | 'arranging' | 'results';

function emptyArrangement(hand: Card[]): ArrangementState {
  return { hand, front: [], middle: [], back: [] };
}

function buildSeatConfig(config: SessionConfig): InitGameConfig {
  if (config.mode === 'dealer') {
    return {
      seats: [
        { name: 'You', type: 'human' },
        { name: 'Bot 1', type: 'ai' },
        { name: 'Bot 2', type: 'ai' },
        { name: 'Bot 3', type: 'ai' },
      ],
      dealerIndex: 0,
    };
  }
  const nonDealerSeats = [1, 2, 3].map((n) =>
    n <= config.humanSeatCount
      ? { name: `You (Seat ${n})`, type: 'human' as const }
      : { name: `Bot ${n}`, type: 'ai' as const },
  );
  return { seats: [{ name: 'AI Dealer', type: 'ai' }, ...nonDealerSeats], dealerIndex: 0 };
}

/** Deals a fresh round and has every AI player lock in their arrangement immediately. */
function dealWithAiArrangements(config: SessionConfig): GameState {
  let state = dealRound(initializeGame(buildSeatConfig(config)));
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
  const [arrangingPlayerId, setArrangingPlayerId] = useState<string | null>(null);
  const [pendingHumanIds, setPendingHumanIds] = useState<string[]>([]);
  const [view, setView] = useState<View>('home');
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [allowInvalidSubmissions, setAllowInvalidSubmissions] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({ mode: 'dealer', humanSeatCount: 1 });

  useEffect(() => {
    const ids = listSavedGameIds();
    setSavedGameId(ids[0] ?? null);
  }, []);

  function handleNewGame(config: SessionConfig, allowInvalid: boolean) {
    const fresh = dealWithAiArrangements(config);
    const humanIds = fresh.players.filter((p) => p.type === 'human').map((p) => p.id);
    const [first, ...rest] = humanIds;
    setGame(fresh);
    setSessionConfig(config);
    setArrangingPlayerId(first);
    setArrangement(emptyArrangement(fresh.players.find((p) => p.id === first)!.hand));
    setPendingHumanIds(rest);
    setAllowInvalidSubmissions(allowInvalid);
    setView('arranging');
  }

  function handleContinue() {
    if (!savedGameId) return;
    const loaded = loadGameState(savedGameId);
    if (!loaded) return;
    const normalized = normalizeLegacyGameState(loaded);
    const remainingHumanIds = normalized.players
      .filter((p) => p.type === 'human' && p.arrangement === null)
      .map((p) => p.id);
    const [first, ...rest] = remainingHumanIds;
    setGame(normalized);
    setArrangingPlayerId(first ?? null);
    setArrangement(first ? emptyArrangement(normalized.players.find((p) => p.id === first)!.hand) : null);
    setPendingHumanIds(rest);
    setAllowInvalidSubmissions(false);
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
    if (!game || !arrangement || !arrangingPlayerId) return;
    let updated = submitArrangement(
      game,
      arrangingPlayerId,
      arrangement.front as FrontHand,
      arrangement.middle as FiveCardHand,
      arrangement.back as FiveCardHand,
    );

    if (updated.status === 'comparing') {
      updated = resolveRound(updated);
      setGame(updated);
      clearGameState(game.gameId);
      setSavedGameId(null);
      setArrangingPlayerId(null);
      setPendingHumanIds([]);
      setArrangement(null);
      setView('results');
      return;
    }

    setGame(updated);
    const [next, ...rest] = pendingHumanIds;
    setArrangingPlayerId(next);
    setArrangement(emptyArrangement(updated.players.find((p) => p.id === next)!.hand));
    setPendingHumanIds(rest);
  }

  function handleHome() {
    setGame(null);
    setArrangement(null);
    setArrangingPlayerId(null);
    setPendingHumanIds([]);
    setView('home');
  }

  const seatProgress =
    sessionConfig.humanSeatCount > 1
      ? { current: sessionConfig.humanSeatCount - pendingHumanIds.length, total: sessionConfig.humanSeatCount }
      : undefined;

  return (
    <div className="app">
      <h1 className="app__title">Chinese Poker</h1>

      {view === 'home' && (
        <Home hasSavedGame={savedGameId !== null} onNewGame={handleNewGame} onContinue={handleContinue} />
      )}

      {view === 'arranging' && arrangement && game && arrangingPlayerId && (
        <>
          <PlayerDashboard players={game.players} dealerId={game.dealerId} arrangingPlayerId={arrangingPlayerId} />
          <ArrangementScreen
            key={arrangingPlayerId}
            arrangement={arrangement}
            allowInvalidSubmissions={allowInvalidSubmissions}
            seatProgress={seatProgress}
            onChange={setArrangement}
            onConfirm={handleConfirm}
            onSaveExit={handleSaveExit}
          />
        </>
      )}

      {view === 'results' && game && (
        <ResultsScreen
          game={game}
          onPlayAgain={() => handleNewGame(sessionConfig, allowInvalidSubmissions)}
          onHome={handleHome}
        />
      )}
    </div>
  );
}

export default App;

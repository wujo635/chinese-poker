import type { GameState, MatchupResult } from '../types';
import { HandZone } from './HandZone';
import { identifyHandType } from '../engine/handRank';
import './ResultsScreen.css';

interface ResultsScreenProps {
  game: GameState;
  onPlayAgain: () => void;
  onHome: () => void;
}

const RESULT_ICON: Record<MatchupResult, string> = { win: '✓', loss: '✗', tie: '–' };

function scoreClass(score: number): string {
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'even';
}

function formatScore(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

export function ResultsScreen({ game, onPlayAgain, onHome }: ResultsScreenProps) {
  const human = game.players[0];
  const opponents = game.players.slice(1);
  const topScore = Math.max(...game.players.map((p) => p.score));

  const humanMatchups = opponents.map((opponent) => ({
    opponent,
    result: game.results.find((r) => r.playerId === human.id && r.opponentId === opponent.id)!,
  }));

  const standings = [...game.players].sort((a, b) => b.score - a.score);

  return (
    <div className="results-screen">
      <h2>Round Results</h2>

      <div className="results-screen__matchups">
        {humanMatchups.map(({ opponent, result }) => (
          <div key={opponent.id} className="matchup-row">
            <span className="matchup-row__name">You vs {opponent.name}</span>
            <span className="matchup-row__cell">
              {RESULT_ICON[result.frontResult]} Front
            </span>
            <span className="matchup-row__cell">
              {RESULT_ICON[result.middleResult]} Middle
            </span>
            <span className="matchup-row__cell">
              {RESULT_ICON[result.backResult]} Back
            </span>
            <span className={`matchup-row__score matchup-row__score--${scoreClass(result.roundScore)}`}>
              {formatScore(result.roundScore)}
            </span>
          </div>
        ))}
      </div>

      <div className="results-screen__standings">
        <h3>Standings</h3>
        {standings.map((p) => (
          <div key={p.id} className="standings-row">
            <span>
              {p.score === topScore ? '👑 ' : ''}
              {p.name}
              {p.id === human.id ? ' (You)' : ''}
              {!p.isValid ? ' — Foul' : ''}
            </span>
            <span className={`standings-row__score standings-row__score--${scoreClass(p.score)}`}>
              {formatScore(p.score)}
            </span>
          </div>
        ))}
      </div>

      <div className="results-screen__hands">
        {game.players.map((p) => (
          <div key={p.id} className="results-screen__player-hands">
            <h4>
              {p.name}
              {p.id === human.id ? ' (You)' : ''}
              {!p.isValid ? ' — Foul' : ''}
            </h4>
            {p.arrangement && (
              <div className="results-screen__zones">
                <HandZone label="Front" cards={p.arrangement.front} capacity={3} handTypeLabel={identifyHandType(p.arrangement.front)} />
                <HandZone label="Middle" cards={p.arrangement.middle} capacity={5} handTypeLabel={identifyHandType(p.arrangement.middle)} />
                <HandZone label="Back" cards={p.arrangement.back} capacity={5} handTypeLabel={identifyHandType(p.arrangement.back)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="results-screen__actions">
        <button type="button" onClick={onPlayAgain}>
          Play Again
        </button>
        <button type="button" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}

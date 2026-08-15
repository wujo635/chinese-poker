import type { Card, GameState, MatchupResult } from '../types';
import { HandZone, type NotableTier } from './HandZone';
import { getHandStrength, identifyHandType } from '../engine/handRank';
import { frontPoints, middlePoints, backPoints } from '../engine/game';
import { detectAutoWin, AUTO_WIN_LABELS } from '../engine/autoWin';
import './ResultsScreen.css';

interface ResultsScreenProps {
  game: GameState;
  sessionTotals: Record<string, number>;
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

const TIER_BY_CATEGORY: Partial<Record<number, NotableTier>> = {
  4: 'trips',
  7: 'full-house',
  8: 'quads',
  9: 'straight-flush',
};

/**
 * The color tier for a zone's hand, keyed by category so the same hand (e.g. Four of a Kind)
 * always gets the same color whether it landed in Middle or Back -- or `null` if that zone's
 * hand doesn't score above the base 1 point on its zone-specific scale (see game.ts). A tier
 * only ever maps to categories that also clear that zone's `pointsFor` threshold (Full House
 * is a tier but only scores >1 in Middle, never Back), so the two checks always agree.
 */
function notableTier(cards: Card[], pointsFor: (category: number) => number): NotableTier | null {
  const category = getHandStrength(cards)[0];
  if (pointsFor(category) <= 1) return null;
  return TIER_BY_CATEGORY[category] ?? null;
}

/** An Automatic Winning Hand's label, or null -- the bonus (and its display) only applies to a valid arrangement. */
function autoWinLabel(p: { hand: Card[]; isValid: boolean }): string | null {
  if (!p.isValid) return null;
  const type = detectAutoWin(p.hand);
  return type ? AUTO_WIN_LABELS[type] : null;
}

export function ResultsScreen({ game, sessionTotals, onPlayAgain, onHome }: ResultsScreenProps) {
  const dealer = game.players.find((p) => p.id === game.dealerId)!;
  const opponents = game.players.filter((p) => p.id !== dealer.id);
  const isDealerHuman = dealer.type === 'human';

  const dealerMatchups = opponents.map((opponent) => ({
    opponent,
    result: game.results.find((r) => r.playerId === dealer.id && r.opponentId === opponent.id)!,
  }));

  const roundTotal = dealerMatchups.reduce((sum, { result }) => sum + result.roundScore, 0);
  const topSessionTotal = Math.max(...game.players.map((p) => sessionTotals[p.id] ?? 0));
  const dealerAutoWin = autoWinLabel(dealer);

  return (
    <div className="results-screen">
      <h2>Round Results</h2>

      <p className="results-screen__summary">
        {isDealerHuman ? 'Your' : `${dealer.name}'s`} round total:{' '}
        <span className={`results-screen__summary-score results-screen__summary-score--${scoreClass(roundTotal)}`}>
          {formatScore(roundTotal)}
        </span>
      </p>

      <div className="results-screen__matchups">
        {dealerMatchups.map(({ opponent, result }) => {
          const opponentAutoWin = autoWinLabel(opponent);
          return (
            <div key={opponent.id} className="matchup-row">
              <span className="matchup-row__name">
                {isDealerHuman ? 'You' : dealer.name} vs {opponent.name}
                {opponent.type === 'human' ? ' (You)' : ''}
                {dealerAutoWin ? (
                  <span className="results-screen__auto-win"> — {dealerAutoWin}!</span>
                ) : opponentAutoWin ? (
                  <span className="results-screen__auto-win">
                    {' '}
                    — {opponent.name}: {opponentAutoWin}!
                  </span>
                ) : null}
              </span>
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
          );
        })}
      </div>

      <div className="results-screen__session-totals">
        <h3>Session Totals</h3>
        {game.players.map((p) => (
          <div key={p.id} className="matchup-row">
            <span className="matchup-row__name">
              {(sessionTotals[p.id] ?? 0) === topSessionTotal ? '👑 ' : ''}
              {p.name}
              {p.id === dealer.id ? ' (Dealer)' : ''}
              {p.type === 'human' ? ' (You)' : ''}
            </span>
            <span className={`matchup-row__score matchup-row__score--${scoreClass(sessionTotals[p.id] ?? 0)}`}>
              {formatScore(sessionTotals[p.id] ?? 0)}
            </span>
          </div>
        ))}
      </div>

      <div className="results-screen__hands">
        {game.players.map((p) => {
          const autoWin = autoWinLabel(p);
          return (
            <div key={p.id} className="results-screen__player-hands">
              <h4>
                {p.name}
                {p.id === dealer.id ? ' (Dealer)' : ''}
                {p.type === 'human' ? ' (You)' : ''}
                {!p.isValid ? ' — Foul' : ''}
                {autoWin ? <span className="results-screen__auto-win"> — {autoWin}!</span> : null}
              </h4>
              {p.arrangement && (
                <div className="results-screen__zones">
                  <HandZone
                    label="Front"
                    cards={p.arrangement.front}
                    capacity={3}
                    handTypeLabel={identifyHandType(p.arrangement.front)}
                    notableTier={notableTier(p.arrangement.front, frontPoints)}
                  />
                  <HandZone
                    label="Middle"
                    cards={p.arrangement.middle}
                    capacity={5}
                    handTypeLabel={identifyHandType(p.arrangement.middle)}
                    notableTier={notableTier(p.arrangement.middle, middlePoints)}
                  />
                  <HandZone
                    label="Back"
                    cards={p.arrangement.back}
                    capacity={5}
                    handTypeLabel={identifyHandType(p.arrangement.back)}
                    notableTier={notableTier(p.arrangement.back, backPoints)}
                  />
                </div>
              )}
            </div>
          );
        })}
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

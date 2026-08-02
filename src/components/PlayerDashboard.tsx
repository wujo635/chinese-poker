import type { Player } from '../types';
import './PlayerDashboard.css';

interface PlayerDashboardProps {
  players: Player[];
  dealerId: string;
  arrangingPlayerId: string;
}

/** Shows every seat besides the one currently being arranged — locked-in seats are face-down. */
export function PlayerDashboard({ players, dealerId, arrangingPlayerId }: PlayerDashboardProps) {
  const others = players.filter((p) => p.id !== arrangingPlayerId);

  return (
    <div className="player-dashboard">
      {others.map((p) => (
        <div key={p.id} className="player-dashboard__player">
          <span className="player-dashboard__name">
            {p.name}
            {p.id === dealerId ? ' 🎩' : ''}
          </span>
          <span className="player-dashboard__status">
            {p.arrangement ? '🂠 Locked In' : p.type === 'human' ? 'Up Next' : 'Arranging…'}
          </span>
        </div>
      ))}
    </div>
  );
}

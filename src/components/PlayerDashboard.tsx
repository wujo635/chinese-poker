import type { Player } from '../types';
import './PlayerDashboard.css';

interface PlayerDashboardProps {
  opponents: Player[];
}

/** Shows the AI opponents while the human arranges — face-down since they've already locked in. */
export function PlayerDashboard({ opponents }: PlayerDashboardProps) {
  return (
    <div className="player-dashboard">
      {opponents.map((p) => (
        <div key={p.id} className="player-dashboard__player">
          <span className="player-dashboard__name">{p.name}</span>
          <span className="player-dashboard__status">{p.arrangement ? '🂠 Locked In' : 'Arranging…'}</span>
        </div>
      ))}
    </div>
  );
}

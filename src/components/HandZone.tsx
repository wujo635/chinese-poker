import type { Card } from '../types';
import { CardView } from './CardView';
import './HandZone.css';

/**
 * Keyed by hand category, not by zone -- Four of a Kind is 'quads' whether it landed in
 * Middle or Back, so it always gets the same color (see ResultsScreen's notableTier()).
 */
export type NotableTier = 'trips' | 'full-house' | 'quads' | 'straight-flush';

interface HandZoneProps {
  label: string;
  cards: Card[];
  capacity: number;
  onCardClick?: (card: Card) => void;
  onZoneClick?: () => void;
  handTypeLabel?: string;
  notableTier?: NotableTier | null;
  placeable?: boolean;
}

export function HandZone({
  label,
  cards,
  capacity,
  onCardClick,
  onZoneClick,
  handTypeLabel,
  notableTier,
  placeable,
}: HandZoneProps) {
  const emptySlots = capacity - cards.length;

  return (
    <div
      className={`hand-zone${placeable ? ' hand-zone--placeable' : ''}${notableTier ? ` hand-zone--tier-${notableTier}` : ''}`}
    >
      <div className="hand-zone__header">
        <span className="hand-zone__label">
          {label} ({cards.length}/{capacity})
        </span>
        {handTypeLabel && <span className="hand-zone__type">{handTypeLabel}</span>}
      </div>
      <div className="hand-zone__cards">
        {cards.map((card) => (
          <CardView key={`${card.suit}-${card.rank}`} card={card} onClick={onCardClick ? () => onCardClick(card) : undefined} />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            className="hand-zone__slot"
            onClick={onZoneClick}
            disabled={!onZoneClick}
            aria-label={`Empty slot in ${label}`}
          />
        ))}
      </div>
    </div>
  );
}

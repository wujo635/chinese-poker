import { useDroppable } from '@dnd-kit/core';
import type { Card } from '../types';
import type { ZoneName } from '../engine/arrangementMoves';
import { CardView } from './CardView';
import { DraggableCardView } from './DraggableCardView';
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
  /** Zone identifier, required only when `draggable` is true (used to build slot-droppable ids). */
  zoneName?: ZoneName;
  /** Enables drag-and-drop wiring for this zone's placed cards and empty slots. Omit for read-only usage (e.g. ResultsScreen), which renders exactly as before with no dnd-kit hooks. */
  draggable?: boolean;
}

/** One empty-slot button, droppable via dnd-kit -- only rendered when the zone is draggable. */
function DroppableEmptySlot({ id, label, onZoneClick }: { id: string; label: string; onZoneClick?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`hand-zone__slot${isOver ? ' hand-zone__slot--over' : ''}`}
      onClick={onZoneClick}
      disabled={!onZoneClick}
      aria-label={`Empty slot in ${label}`}
    />
  );
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
  zoneName,
  draggable,
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
        {cards.map((card) =>
          draggable ? (
            <DraggableCardView
              key={`${card.suit}-${card.rank}`}
              card={card}
              droppable
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          ) : (
            <CardView
              key={`${card.suit}-${card.rank}`}
              card={card}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          ),
        )}
        {Array.from({ length: emptySlots }).map((_, i) =>
          draggable ? (
            <DroppableEmptySlot key={`empty-${i}`} id={`slot:${zoneName}:${i}`} label={label} onZoneClick={onZoneClick} />
          ) : (
            <button
              key={`empty-${i}`}
              type="button"
              className="hand-zone__slot"
              onClick={onZoneClick}
              disabled={!onZoneClick}
              aria-label={`Empty slot in ${label}`}
            />
          ),
        )}
      </div>
    </div>
  );
}

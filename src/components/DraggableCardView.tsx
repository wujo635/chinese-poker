import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../types';
import { cardKey } from '../engine/arrangementMoves';
import { CardView } from './CardView';

interface DraggableCardViewProps {
  card: Card;
  /** True for zone cards (valid swap targets); false for hand-tray cards. */
  droppable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Wraps `CardView` with dnd-kit drag/drop wiring. Kept separate from `CardView` itself so that
 * `ResultsScreen`'s read-only hand reveal (which also renders `CardView` via `HandZone`) never
 * mounts dnd-kit hooks or needs a `DndContext` ancestor.
 */
export function DraggableCardView({ card, droppable = false, selected, onClick }: DraggableCardViewProps) {
  const key = cardKey(card);
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: key });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: key, disabled: !droppable });

  function setRefs(element: HTMLButtonElement | null) {
    setDraggableRef(element);
    setDroppableRef(element);
  }

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <CardView
      ref={setRefs}
      card={card}
      selected={selected}
      dragging={isDragging}
      dropTarget={isOver}
      onClick={onClick}
      style={style}
      {...attributes}
      {...listeners}
    />
  );
}

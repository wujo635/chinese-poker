import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { Card } from '../types';
import './CardView.css';

const SUIT_SYMBOL: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

interface CardViewProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'children'> {
  card: Card;
  selected?: boolean;
  /** Drag-in-progress styling, set by `DraggableCardView` -- unused outside a drag context. */
  dragging?: boolean;
  /** Valid-swap-target styling, set by `DraggableCardView` -- unused outside a drag context. */
  dropTarget?: boolean;
  onClick?: () => void;
}

export const CardView = forwardRef<HTMLButtonElement, CardViewProps>(function CardView(
  { card, selected, dragging, dropTarget, onClick, className, ...rest },
  ref,
) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  const classes = [
    'card-view',
    isRed && 'card-view--red',
    selected && 'card-view--selected',
    dragging && 'card-view--dragging',
    dropTarget && 'card-view--drop-target',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      onClick={onClick}
      aria-label={`${card.rank} of ${card.suit}${selected ? ' (selected)' : ''}`}
      {...rest}
    >
      <span className="card-view__rank">{card.rank}</span>
      <span className="card-view__suit">{SUIT_SYMBOL[card.suit]}</span>
    </button>
  );
});

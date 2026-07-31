import type { Card } from '../types';
import './CardView.css';

const SUIT_SYMBOL: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

interface CardViewProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
}

export function CardView({ card, selected, onClick }: CardViewProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <button
      type="button"
      className={`card-view${isRed ? ' card-view--red' : ''}${selected ? ' card-view--selected' : ''}`}
      onClick={onClick}
      aria-label={`${card.rank} of ${card.suit}${selected ? ' (selected)' : ''}`}
    >
      <span className="card-view__rank">{card.rank}</span>
      <span className="card-view__suit">{SUIT_SYMBOL[card.suit]}</span>
    </button>
  );
}

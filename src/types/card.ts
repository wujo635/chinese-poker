export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  /** 2-14. Ace is 14 (high) by default; straight detection special-cases the A-2-3-4-5 low straight. */
  value: number;
}

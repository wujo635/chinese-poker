import type { Card } from './card';

export type PlayerType = 'human' | 'ai';

export type FrontHand = [Card, Card, Card];
export type FiveCardHand = [Card, Card, Card, Card, Card];

export interface Arrangement {
  front: FrontHand;
  middle: FiveCardHand;
  back: FiveCardHand;
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  hand: Card[];
  arrangement: Arrangement | null;
  isValid: boolean;
  score: number;
}

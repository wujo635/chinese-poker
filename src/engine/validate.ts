import type { Card } from '../types';
import { compareHands } from './compareHands';

export interface ValidationResult {
  isValid: boolean;
  foulReason: 'back-must-beat-middle' | 'middle-must-beat-front' | null;
}

/** Ascending strength required: back > middle > front. Ties count as a foul. */
export function validateArrangement(front: Card[], middle: Card[], back: Card[]): ValidationResult {
  if (compareHands(back, middle) <= 0) {
    return { isValid: false, foulReason: 'back-must-beat-middle' };
  }
  if (compareHands(middle, front) <= 0) {
    return { isValid: false, foulReason: 'middle-must-beat-front' };
  }
  return { isValid: true, foulReason: null };
}

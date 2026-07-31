import type { Card, FiveCardHand, FrontHand } from '../types';
import { HandZone } from './HandZone';
import { ValidationStatus } from './ValidationStatus';
import { identifyHandType } from '../engine/handRank';
import { validateArrangement } from '../engine/validate';
import './ReviewScreen.css';

interface ReviewScreenProps {
  front: Card[];
  middle: Card[];
  back: Card[];
  locked?: boolean;
  onBack?: () => void;
  onConfirm?: () => void;
  onPlayAgain?: () => void;
  onHome?: () => void;
}

export function ReviewScreen({ front, middle, back, locked, onBack, onConfirm, onPlayAgain, onHome }: ReviewScreenProps) {
  const validation = validateArrangement(front as FrontHand, middle as FiveCardHand, back as FiveCardHand);

  return (
    <div className="review-screen">
      <h2>{locked ? 'Your Final Arrangement' : 'Review Your Arrangement'}</h2>
      <div className="review-screen__zones">
        <HandZone label="Front" cards={front} capacity={3} handTypeLabel={identifyHandType(front)} />
        <HandZone label="Middle" cards={middle} capacity={5} handTypeLabel={identifyHandType(middle)} />
        <HandZone label="Back" cards={back} capacity={5} handTypeLabel={identifyHandType(back)} />
      </div>
      <ValidationStatus status={validation.isValid ? 'valid' : 'invalid'} foulReason={validation.foulReason} />
      <div className="review-screen__actions">
        {locked ? (
          <>
            <button type="button" onClick={onPlayAgain}>
              Play Again
            </button>
            <button type="button" onClick={onHome}>
              Home
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onBack}>
              Back to Arranging
            </button>
            <button type="button" onClick={onConfirm} disabled={!validation.isValid}>
              Confirm
            </button>
          </>
        )}
      </div>
    </div>
  );
}

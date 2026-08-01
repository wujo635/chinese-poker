import { useState } from 'react';
import type { Card, FiveCardHand, FrontHand } from '../types';
import { CardView } from './CardView';
import { HandZone } from './HandZone';
import { ValidationStatus } from './ValidationStatus';
import { identifyHandType } from '../engine/handRank';
import { validateArrangement } from '../engine/validate';
import { compareCards } from '../engine/deck';
import { generateAIArrangement } from '../engine/ai';
import './ArrangementScreen.css';

export interface ArrangementState {
  hand: Card[];
  front: Card[];
  middle: Card[];
  back: Card[];
}

interface ArrangementScreenProps {
  arrangement: ArrangementState;
  allowInvalidSubmissions: boolean;
  onChange: (next: ArrangementState) => void;
  onReview: () => void;
  onSaveExit: () => void;
}

const ZONE_CAPACITY = { front: 3, middle: 5, back: 5 } as const;
type ZoneName = keyof typeof ZONE_CAPACITY;

function cardKey(card: Card): string {
  return `${card.suit}-${card.rank}`;
}

export function ArrangementScreen({
  arrangement,
  allowInvalidSubmissions,
  onChange,
  onReview,
  onSaveExit,
}: ArrangementScreenProps) {
  const [selected, setSelected] = useState<Card | null>(null);
  const { hand, front, middle, back } = arrangement;

  function handleHandCardClick(card: Card) {
    setSelected((prev) => (prev && cardKey(prev) === cardKey(card) ? null : card));
  }

  function handleZoneClick(zone: ZoneName) {
    if (!selected) return;
    if (arrangement[zone].length >= ZONE_CAPACITY[zone]) return;

    onChange({
      ...arrangement,
      hand: hand.filter((c) => cardKey(c) !== cardKey(selected)),
      [zone]: [...arrangement[zone], selected],
    });
    setSelected(null);
  }

  function handleZoneCardClick(zone: ZoneName, card: Card) {
    onChange({
      ...arrangement,
      hand: [...hand, card],
      [zone]: arrangement[zone].filter((c) => cardKey(c) !== cardKey(card)),
    });
    if (selected && cardKey(selected) === cardKey(card)) setSelected(null);
  }

  function handleReset() {
    onChange({ hand: [...hand, ...front, ...middle, ...back], front: [], middle: [], back: [] });
    setSelected(null);
  }

  function handleAutoPlace() {
    const fullHand = [...hand, ...front, ...middle, ...back];
    const { front: newFront, middle: newMiddle, back: newBack } = generateAIArrangement(fullHand);
    onChange({ hand: [], front: newFront, middle: newMiddle, back: newBack });
    setSelected(null);
  }

  const sortedHand = [...hand].sort((a, b) => compareCards(b, a));

  const isComplete = front.length === 3 && middle.length === 5 && back.length === 5;
  const validation = isComplete
    ? validateArrangement(front as FrontHand, middle as FiveCardHand, back as FiveCardHand)
    : null;

  return (
    <div className="arrangement-screen">
      <div className="arrangement-screen__hand">
        <h2>Your Hand ({hand.length})</h2>
        <div className="arrangement-screen__hand-cards">
          {sortedHand.map((card) => (
            <CardView
              key={cardKey(card)}
              card={card}
              selected={selected ? cardKey(selected) === cardKey(card) : false}
              onClick={() => handleHandCardClick(card)}
            />
          ))}
        </div>
        {selected && (
          <p className="arrangement-screen__hint">
            Selected {selected.rank} of {selected.suit} — click a zone below to place it.
          </p>
        )}
      </div>

      <div className="arrangement-screen__zones">
        <HandZone
          label="Front"
          cards={front}
          capacity={3}
          onCardClick={(card) => handleZoneCardClick('front', card)}
          onZoneClick={() => handleZoneClick('front')}
          handTypeLabel={front.length === 3 ? identifyHandType(front) : undefined}
          placeable={!!selected}
        />
        <HandZone
          label="Middle"
          cards={middle}
          capacity={5}
          onCardClick={(card) => handleZoneCardClick('middle', card)}
          onZoneClick={() => handleZoneClick('middle')}
          handTypeLabel={middle.length === 5 ? identifyHandType(middle) : undefined}
          placeable={!!selected}
        />
        <HandZone
          label="Back"
          cards={back}
          capacity={5}
          onCardClick={(card) => handleZoneCardClick('back', card)}
          onZoneClick={() => handleZoneClick('back')}
          handTypeLabel={back.length === 5 ? identifyHandType(back) : undefined}
          placeable={!!selected}
        />
      </div>

      {!allowInvalidSubmissions && (
        <ValidationStatus
          status={!isComplete ? 'incomplete' : validation!.isValid ? 'valid' : 'invalid'}
          foulReason={validation?.foulReason}
        />
      )}

      <div className="arrangement-screen__actions">
        <button
          type="button"
          onClick={handleReset}
          disabled={front.length === 0 && middle.length === 0 && back.length === 0}
        >
          Reset
        </button>
        <button type="button" onClick={handleAutoPlace}>
          Auto-Place
        </button>
        <button type="button" onClick={onSaveExit}>
          Save &amp; Exit
        </button>
        <button type="button" onClick={onReview} disabled={!isComplete}>
          Review
        </button>
      </div>
    </div>
  );
}

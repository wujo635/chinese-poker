import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Card, FiveCardHand, FrontHand } from '../types';
import { CardView } from './CardView';
import { DraggableCardView } from './DraggableCardView';
import { HandZone } from './HandZone';
import { ValidationStatus } from './ValidationStatus';
import { identifyHandType } from '../engine/handRank';
import { validateArrangement } from '../engine/validate';
import { compareCards } from '../engine/deck';
import { generateAIArrangement } from '../engine/ai';
import {
  cardKey,
  computeDragEndResult,
  moveCardToHand,
  moveCardToZoneSlot,
  type ArrangementState,
  type ZoneName,
} from '../engine/arrangementMoves';
import './ArrangementScreen.css';

export type { ArrangementState } from '../engine/arrangementMoves';

export interface SeatProgress {
  current: number;
  total: number;
}

interface ArrangementScreenProps {
  arrangement: ArrangementState;
  allowInvalidSubmissions: boolean;
  seatProgress?: SeatProgress;
  onChange: (next: ArrangementState) => void;
  onConfirm: () => void;
  onSaveExit: () => void;
}

function HandTray({ children }: { children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: 'hand-tray' });
  return (
    <div ref={setNodeRef} className="arrangement-screen__hand-cards">
      {children}
    </div>
  );
}

export function ArrangementScreen({
  arrangement,
  allowInvalidSubmissions,
  seatProgress,
  onChange,
  onConfirm,
  onSaveExit,
}: ArrangementScreenProps) {
  const [selected, setSelected] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const { hand, front, middle, back } = arrangement;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleHandCardClick(card: Card) {
    setSelected((prev) => (prev && cardKey(prev) === cardKey(card) ? null : card));
  }

  function handleZoneClick(zone: ZoneName) {
    if (!selected) return;
    const next = moveCardToZoneSlot(arrangement, cardKey(selected), zone);
    if (!next) return;
    onChange(next);
    setSelected(null);
  }

  function handleZoneCardClick(card: Card) {
    onChange(moveCardToHand(arrangement, cardKey(card)));
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

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const dragged = [...hand, ...front, ...middle, ...back].find((c) => cardKey(c) === id) ?? null;
    setActiveCard(dragged);
    if (selected && dragged && cardKey(selected) === id) setSelected(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const next = computeDragEndResult(arrangement, event);
    if (next) onChange(next);
    setActiveCard(null);
  }

  function handleDragCancel() {
    setActiveCard(null);
  }

  const sortedHand = [...hand].sort((a, b) => compareCards(b, a));

  const isComplete = front.length === 3 && middle.length === 5 && back.length === 5;
  const validation = isComplete
    ? validateArrangement(front as FrontHand, middle as FiveCardHand, back as FiveCardHand)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="arrangement-screen">
        <div className="arrangement-screen__hand">
          <h2>Your Hand ({hand.length})</h2>
          {seatProgress && seatProgress.total > 1 && (
            <p className="arrangement-screen__seat-progress">
              Arranging Seat {seatProgress.current} of {seatProgress.total}
            </p>
          )}
          <HandTray>
            {sortedHand.map((card) => (
              <DraggableCardView
                key={cardKey(card)}
                card={card}
                selected={selected ? cardKey(selected) === cardKey(card) : false}
                onClick={() => handleHandCardClick(card)}
              />
            ))}
          </HandTray>
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
            zoneName="front"
            draggable
            onCardClick={handleZoneCardClick}
            onZoneClick={() => handleZoneClick('front')}
            handTypeLabel={front.length === 3 ? identifyHandType(front) : undefined}
            placeable={!!selected}
          />
          <HandZone
            label="Middle"
            cards={middle}
            capacity={5}
            zoneName="middle"
            draggable
            onCardClick={handleZoneCardClick}
            onZoneClick={() => handleZoneClick('middle')}
            handTypeLabel={middle.length === 5 ? identifyHandType(middle) : undefined}
            placeable={!!selected}
          />
          <HandZone
            label="Back"
            cards={back}
            capacity={5}
            zoneName="back"
            draggable
            onCardClick={handleZoneCardClick}
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
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isComplete || (!allowInvalidSubmissions && !validation!.isValid)}
          >
            Confirm
          </button>
        </div>
      </div>
      <DragOverlay>{activeCard && <CardView card={activeCard} />}</DragOverlay>
    </DndContext>
  );
}

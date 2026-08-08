import type { Card } from '../types';

export interface ArrangementState {
  hand: Card[];
  front: Card[];
  middle: Card[];
  back: Card[];
}

export const ZONE_CAPACITY = { front: 3, middle: 5, back: 5 } as const;
export type ZoneName = keyof typeof ZONE_CAPACITY;

export function cardKey(card: Card): string {
  return `${card.suit}-${card.rank}`;
}

/** Where a card currently lives, and the card itself -- or undefined if the key isn't found. */
function locateCard(state: ArrangementState, key: string): { card: Card; zone: 'hand' | ZoneName } | undefined {
  const zones: Array<'hand' | ZoneName> = ['hand', 'front', 'middle', 'back'];
  for (const zone of zones) {
    const card = state[zone].find((c) => cardKey(c) === key);
    if (card) return { card, zone };
  }
  return undefined;
}

/** Moves a card (wherever it currently is) back to the hand. No-op if it's already there. */
export function moveCardToHand(state: ArrangementState, key: string): ArrangementState {
  const located = locateCard(state, key);
  if (!located || located.zone === 'hand') return state;

  return {
    ...state,
    hand: [...state.hand, located.card],
    [located.zone]: state[located.zone].filter((c) => cardKey(c) !== key),
  };
}

/** Moves a card into an empty slot in `zone`. Returns null if the zone is full or the card is already there. */
export function moveCardToZoneSlot(state: ArrangementState, key: string, zone: ZoneName): ArrangementState | null {
  const located = locateCard(state, key);
  if (!located || located.zone === zone) return null;
  if (state[zone].length >= ZONE_CAPACITY[zone]) return null;

  return {
    ...state,
    [located.zone]: state[located.zone].filter((c) => cardKey(c) !== key),
    [zone]: [...state[zone], located.card],
  };
}

/**
 * Swaps two cards' positions, wherever they currently are (hand or any zone). Returns null for
 * no-op cases: dropping a card onto itself, or swapping two cards already in the same zone (zone
 * order has no game-logic meaning, so that "swap" wouldn't actually change anything observable).
 */
export function swapCards(state: ArrangementState, keyA: string, keyB: string): ArrangementState | null {
  if (keyA === keyB) return null;

  const a = locateCard(state, keyA);
  const b = locateCard(state, keyB);
  if (!a || !b || a.zone === b.zone) return null;

  const replace = (zone: 'hand' | ZoneName, removeKey: string, addCard: Card) => ({
    [zone]: [...state[zone].filter((c) => cardKey(c) !== removeKey), addCard],
  });

  return {
    ...state,
    ...replace(a.zone, keyA, b.card),
    ...replace(b.zone, keyB, a.card),
  };
}

/**
 * Dispatches a drag-end event to the right move/swap helper based on `over.id`'s namespace.
 * Duck-typed against dnd-kit's `DragEndEvent` shape (not imported from `@dnd-kit/core`), so this
 * stays testable without pulling in dnd-kit or rendering anything.
 */
export function computeDragEndResult(
  state: ArrangementState,
  event: { active: { id: string | number }; over: { id: string | number } | null },
): ArrangementState | null {
  if (!event.over) return null;

  const draggedKey = String(event.active.id);
  const overId = String(event.over.id);

  if (overId === 'hand-tray') {
    const next = moveCardToHand(state, draggedKey);
    return next === state ? null : next;
  }

  const slotMatch = overId.match(/^slot:(front|middle|back):\d+$/);
  if (slotMatch) {
    return moveCardToZoneSlot(state, draggedKey, slotMatch[1] as ZoneName);
  }

  return swapCards(state, draggedKey, overId);
}

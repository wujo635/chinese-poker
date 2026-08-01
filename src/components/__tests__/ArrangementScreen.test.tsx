import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrangementScreen, type ArrangementState } from '../ArrangementScreen';
import type { Card } from '../../types';

const c = (suit: Card['suit'], rank: Card['rank'], value: number): Card => ({ suit, rank, value });

function renderScreen(arrangement: ArrangementState, allowInvalidSubmissions = false) {
  const onChange = vi.fn();
  const onConfirm = vi.fn();
  const onSaveExit = vi.fn();
  const { unmount } = render(
    <ArrangementScreen
      arrangement={arrangement}
      allowInvalidSubmissions={allowInvalidSubmissions}
      onChange={onChange}
      onConfirm={onConfirm}
      onSaveExit={onSaveExit}
    />,
  );
  return { onChange, onConfirm, onSaveExit, unmount };
}

describe('ArrangementScreen', () => {
  it('moves a selected hand card into a zone when the zone is clicked', async () => {
    const user = userEvent.setup();
    const hand = [c('spades', 'A', 14), c('hearts', 'K', 13)];
    const { onChange } = renderScreen({ hand, front: [], middle: [], back: [] });

    await user.click(screen.getByRole('button', { name: 'A of spades' }));
    await user.click(screen.getAllByRole('button', { name: 'Empty slot in Front' })[0]);

    expect(onChange).toHaveBeenCalledWith({
      hand: [c('hearts', 'K', 13)],
      front: [c('spades', 'A', 14)],
      middle: [],
      back: [],
    });
  });

  it('returns a placed card to the hand when clicked in its zone', async () => {
    const user = userEvent.setup();
    const placedCard = c('spades', 'A', 14);
    const { onChange } = renderScreen({ hand: [], front: [placedCard], middle: [], back: [] });

    await user.click(screen.getByRole('button', { name: 'A of spades' }));

    expect(onChange).toHaveBeenCalledWith({
      hand: [placedCard],
      front: [],
      middle: [],
      back: [],
    });
  });

  it('shows "incomplete" status until all 13 cards are placed', () => {
    renderScreen({
      hand: [c('clubs', '2', 2)],
      front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)],
      middle: [],
      back: [],
    });
    expect(screen.getByText(/place all 13 cards/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('shows a valid status and enables Confirm once back > middle > front', () => {
    renderScreen({
      hand: [],
      front: [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '5', 5)],
      middle: [c('clubs', '8', 8), c('spades', '8', 8), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '9', 9)],
      back: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14), c('spades', '9', 9)],
    });
    expect(screen.getByText(/valid arrangement/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('shows a foul message and disables Confirm when middle does not beat front', () => {
    renderScreen({
      hand: [],
      front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)],
      middle: [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)],
      back: [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)],
    });
    expect(screen.getByText(/foul/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('enables Confirm on a fouled arrangement once invalid submissions are allowed', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderScreen(
      {
        hand: [],
        front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)],
        middle: [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)],
        back: [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)],
      },
      true,
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('hides all validation status messages once invalid submissions are allowed', () => {
    const foulArrangement = {
      hand: [],
      front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)],
      middle: [c('clubs', '2', 2), c('spades', '3', 3), c('hearts', '4', 4), c('diamonds', '6', 6), c('clubs', '9', 9)],
      back: [c('spades', 'K', 13), c('hearts', 'K', 13), c('diamonds', 'K', 13), c('clubs', 'K', 13), c('spades', '2', 2)],
    };
    const { unmount } = renderScreen(foulArrangement, true);
    expect(screen.queryByText(/foul/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    unmount();

    const validArrangement = {
      hand: [],
      front: [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '5', 5)],
      middle: [c('clubs', '8', 8), c('spades', '8', 8), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '9', 9)],
      back: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14), c('spades', '9', 9)],
    };
    const { unmount: unmount2 } = renderScreen(validArrangement, true);
    expect(screen.queryByText(/valid arrangement/i)).not.toBeInTheDocument();
    unmount2();

    const incompleteArrangement = {
      hand: [c('clubs', '2', 2)],
      front: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14)],
      middle: [],
      back: [],
    };
    renderScreen(incompleteArrangement, true);
    expect(screen.queryByText(/place all 13 cards/i)).not.toBeInTheDocument();
  });

  it('displays the hand tray sorted by value then suit, not dealt order', () => {
    const hand = [c('clubs', '2', 2), c('spades', 'A', 14), c('hearts', '2', 2)];
    renderScreen({ hand, front: [], middle: [], back: [] });

    const handSection = screen.getByText(/Your Hand/).closest('div')!;
    const cardButtons = handSection.querySelectorAll('.arrangement-screen__hand-cards button');
    const labels = Array.from(cardButtons).map((btn) => btn.getAttribute('aria-label'));

    expect(labels).toEqual(['A of spades', '2 of hearts', '2 of clubs']);
  });

  it('Auto-Place fills front/middle/back from the whole hand and empties the tray', async () => {
    const user = userEvent.setup();
    const hand = [
      c('spades', 'A', 14), c('spades', 'K', 13), c('spades', 'Q', 12), c('spades', 'J', 11), c('spades', '10', 10),
      c('hearts', 'A', 14), c('hearts', 'K', 13), c('hearts', 'Q', 12), c('hearts', 'J', 11), c('hearts', '9', 9),
      c('diamonds', '2', 2), c('diamonds', '3', 3), c('diamonds', '4', 4),
    ];
    const { onChange } = renderScreen({ hand, front: [], middle: [], back: [] });

    await user.click(screen.getByRole('button', { name: 'Auto-Place' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const result = onChange.mock.calls[0][0] as ArrangementState;
    expect(result.hand).toEqual([]);
    expect(result.front).toHaveLength(3);
    expect(result.middle).toHaveLength(5);
    expect(result.back).toHaveLength(5);
  });

  it('calls onConfirm when Confirm is clicked on a valid arrangement', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderScreen({
      hand: [],
      front: [c('spades', '2', 2), c('hearts', '2', 2), c('diamonds', '5', 5)],
      middle: [c('clubs', '8', 8), c('spades', '8', 8), c('hearts', '3', 3), c('diamonds', '4', 4), c('clubs', '9', 9)],
      back: [c('spades', 'A', 14), c('hearts', 'A', 14), c('diamonds', 'A', 14), c('clubs', 'A', 14), c('spades', '9', 9)],
    });

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

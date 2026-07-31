import { describe, it, expect, beforeEach } from 'vitest';
import { saveGameState, loadGameState, clearGameState, listSavedGameIds } from '../persistence';
import { initializeGame } from '../game';

beforeEach(() => {
  localStorage.clear();
});

describe('saveGameState / loadGameState', () => {
  it('round-trips a game state through localStorage', () => {
    const state = initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']);
    saveGameState(state);
    expect(loadGameState(state.gameId)).toEqual(state);
  });

  it('returns null for a gameId that was never saved', () => {
    expect(loadGameState('does-not-exist')).toBeNull();
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    localStorage.setItem('chinese-poker:game:broken', '{not valid json');
    expect(loadGameState('broken')).toBeNull();
  });
});

describe('clearGameState', () => {
  it('removes a saved game', () => {
    const state = initializeGame(['You', 'Bot 1']);
    saveGameState(state);
    clearGameState(state.gameId);
    expect(loadGameState(state.gameId)).toBeNull();
  });
});

describe('listSavedGameIds', () => {
  it('lists only saved chinese-poker game ids, ignoring unrelated localStorage keys', () => {
    const stateA = initializeGame(['You', 'Bot 1']);
    const stateB = initializeGame(['You', 'Bot 1', 'Bot 2', 'Bot 3']);
    saveGameState(stateA);
    saveGameState(stateB);
    localStorage.setItem('some-other-app:setting', 'value');

    const ids = listSavedGameIds();
    expect(ids).toHaveLength(2);
    expect(ids).toContain(stateA.gameId);
    expect(ids).toContain(stateB.gameId);
  });

  it('returns an empty array when nothing is saved', () => {
    expect(listSavedGameIds()).toEqual([]);
  });
});

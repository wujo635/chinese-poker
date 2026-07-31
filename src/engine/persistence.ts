import type { GameState } from '../types';

const STORAGE_PREFIX = 'chinese-poker:game:';

function storageKey(gameId: string): string {
  return `${STORAGE_PREFIX}${gameId}`;
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(storageKey(state.gameId), JSON.stringify(state));
}

export function loadGameState(gameId: string): GameState | null {
  const raw = localStorage.getItem(storageKey(gameId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearGameState(gameId: string): void {
  localStorage.removeItem(storageKey(gameId));
}

/** Lists the gameIds of all saved games, for a "load saved game" screen. */
export function listSavedGameIds(): string[] {
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      ids.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return ids;
}

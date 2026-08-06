export type GameMode = 'dealer' | 'player';

export interface LeaderboardEntry {
  score: number;
  seatCount: number;
  date: string;
}

export type Leaderboard = Record<GameMode, LeaderboardEntry[]>;

const STORAGE_KEY = 'chinese-poker:leaderboard';
const MAX_ENTRIES = 5;

function emptyLeaderboard(): Leaderboard {
  return { dealer: [], player: [] };
}

export function loadLeaderboard(): Leaderboard {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyLeaderboard();
  try {
    const parsed = JSON.parse(raw) as Partial<Leaderboard>;
    return { dealer: parsed.dealer ?? [], player: parsed.player ?? [] };
  } catch {
    return emptyLeaderboard();
  }
}

/** Appends a new entry, sorts descending by score, and truncates to the top 5 for that mode. */
export function recordScore(mode: GameMode, score: number, seatCount: number): Leaderboard {
  const current = loadLeaderboard();
  const entries = [...current[mode], { score, seatCount, date: new Date().toISOString() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);
  const next = { ...current, [mode]: entries };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

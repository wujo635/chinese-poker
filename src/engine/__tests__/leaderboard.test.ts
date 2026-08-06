import { describe, it, expect, beforeEach } from 'vitest';
import { loadLeaderboard, recordScore } from '../leaderboard';

beforeEach(() => {
  localStorage.clear();
});

describe('loadLeaderboard', () => {
  it('returns an empty leaderboard when nothing is stored', () => {
    expect(loadLeaderboard()).toEqual({ dealer: [], player: [] });
  });

  it('returns an empty leaderboard for corrupted JSON instead of throwing', () => {
    localStorage.setItem('chinese-poker:leaderboard', '{not valid json');
    expect(loadLeaderboard()).toEqual({ dealer: [], player: [] });
  });
});

describe('recordScore', () => {
  it('appends and persists an entry', () => {
    recordScore('dealer', 18, 1);
    const loaded = loadLeaderboard();
    expect(loaded.dealer).toHaveLength(1);
    expect(loaded.dealer[0]).toMatchObject({ score: 18, seatCount: 1 });
    expect(loaded.player).toEqual([]);
  });

  it('sorts entries descending by score', () => {
    recordScore('dealer', 10, 1);
    recordScore('dealer', 30, 1);
    recordScore('dealer', 20, 1);
    const { dealer } = loadLeaderboard();
    expect(dealer.map((e) => e.score)).toEqual([30, 20, 10]);
  });

  it('truncates to the top 5 for a mode, dropping the lowest', () => {
    for (const score of [10, 20, 30, 40, 50]) recordScore('dealer', score, 1);
    const updated = recordScore('dealer', 25, 1);
    expect(updated.dealer.map((e) => e.score)).toEqual([50, 40, 30, 25, 20]);
    expect(updated.dealer).toHaveLength(5);
  });

  it('keeps dealer and player lists independent', () => {
    recordScore('dealer', 15, 1);
    recordScore('player', 54, 3);
    const { dealer, player } = loadLeaderboard();
    expect(dealer).toHaveLength(1);
    expect(player).toHaveLength(1);
    expect(player[0]).toMatchObject({ score: 54, seatCount: 3 });
  });
});

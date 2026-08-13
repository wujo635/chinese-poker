import type { Card } from '../types';
import { rankCounts } from './handRank';

export type AutoWinType =
  | 'dragon'
  | 'six-pairs'
  | 'four-pairs-flush'
  | 'four-pairs-straight'
  | 'three-flushes'
  | 'three-straights';

export const AUTO_WIN_POINTS: Record<AutoWinType, number> = {
  dragon: 13,
  'six-pairs': 3,
  'four-pairs-flush': 3,
  'four-pairs-straight': 3,
  'three-flushes': 3,
  'three-straights': 3,
};

/** Higher tier beats lower; same tier (including same type) is a wash. */
export const AUTO_WIN_TIER: Record<AutoWinType, number> = {
  dragon: 2,
  'six-pairs': 1,
  'four-pairs-flush': 1,
  'four-pairs-straight': 1,
  'three-flushes': 1,
  'three-straights': 1,
};

export const AUTO_WIN_LABELS: Record<AutoWinType, string> = {
  dragon: 'Dragon',
  'six-pairs': 'Six Pairs',
  'four-pairs-flush': 'Four Pairs + Flush',
  'four-pairs-straight': 'Four Pairs + Straight',
  'three-flushes': 'Three Flushes',
  'three-straights': 'Three Straights',
};

/** All 13 cards have distinct ranks -- by pigeonhole, that forces exactly one of each rank 2-A. */
function isDragon(hand: Card[]): boolean {
  return new Set(hand.map((c) => c.value)).size === 13;
}

function countPattern(hand: Card[]): number[] {
  return rankCounts(hand).map(([, count]) => count);
}

function isSixPairs(hand: Card[]): boolean {
  return countPattern(hand).join(',') === '2,2,2,2,2,2,1';
}

/** Four paired ranks (8 cards) + five singleton cards, or null if the hand isn't shaped that way. */
function extractFourPairsSingles(hand: Card[]): Card[] | null {
  const counts = rankCounts(hand);
  if (counts.map(([, count]) => count).join(',') !== '2,2,2,2,1,1,1,1,1') return null;
  const singleValues = new Set(counts.filter(([, count]) => count === 1).map(([value]) => value));
  return hand.filter((c) => singleValues.has(c.value));
}

function isFourPairsPlusFlush(hand: Card[]): boolean {
  const singles = extractFourPairsSingles(hand);
  return !!singles && singles.every((c) => c.suit === singles[0].suit);
}

/** No ace-low wheel exception here -- this rule is defined purely as consecutive integers over the 2-14 encoding. */
function isFourPairsPlusStraight(hand: Card[]): boolean {
  const singles = extractFourPairsSingles(hand);
  if (!singles) return false;
  const values = [...singles].map((c) => c.value).sort((a, b) => a - b);
  return values.every((v, i) => i === 0 || v === values[i - 1] + 1);
}

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;

/**
 * The 13 cards partition into three groups (3/5/5), each entirely one suit. Checks every
 * combination of (front-suit, middle-suit, back-suit) and requires the resulting per-suit
 * demand to EXACTLY match each suit's actual card count -- not `<=`, since total demand and
 * total count are both always fixed at 13, so exact equality is what rules out leftover
 * unassigned cards (a suit with cards but zero demand would otherwise slip through).
 */
function isThreeFlushes(hand: Card[]): boolean {
  const counts = Object.fromEntries(SUITS.map((s) => [s, hand.filter((c) => c.suit === s).length])) as Record<
    (typeof SUITS)[number],
    number
  >;
  for (const sFront of SUITS) {
    for (const sMiddle of SUITS) {
      for (const sBack of SUITS) {
        const demand: Partial<Record<(typeof SUITS)[number], number>> = {};
        demand[sFront] = (demand[sFront] ?? 0) + 3;
        demand[sMiddle] = (demand[sMiddle] ?? 0) + 5;
        demand[sBack] = (demand[sBack] ?? 0) + 5;
        if (SUITS.every((s) => (demand[s] ?? 0) === counts[s])) return true;
      }
    }
  }
  return false;
}

function windowsOfSize(size: number): number[][] {
  const windows: number[][] = [];
  for (let start = 2; start + size - 1 <= 14; start++) {
    windows.push(Array.from({ length: size }, (_, i) => start + i));
  }
  return windows;
}

const WINDOWS_3 = windowsOfSize(3); // 11 windows: [2,3,4]..[12,13,14]
const WINDOWS_5 = windowsOfSize(5); // 9 windows: [2,3,4,5,6]..[10,11,12,13,14]

/**
 * The 13 cards partition into three groups (3/5/5), each a run of consecutive ranks
 * (suits don't matter). Rather than brute-forcing all 72,072 card partitions (the same
 * cost class as generateOptimalArrangement, ~150-300ms -- too slow to run for every
 * player every deal), this searches over rank-value WINDOWS instead: only 11*9*9 = 891
 * combinations, each an O(13) demand-vs-count check. For a chosen (front, middle, back)
 * triple of windows, sum how many cards of each rank they'd collectively need, and check
 * that never exceeds the hand's actual count of that rank -- checked across the FULL 2-14
 * domain, not just ranks present in the hand, since total demand and total count are both
 * always exactly 13, so demand <= count everywhere forces demand === count everywhere
 * (any rank left unchecked could hide a shortfall).
 */
function isThreeStraights(hand: Card[]): boolean {
  const counts = new Map(rankCounts(hand).map(([v, c]) => [v, c]));
  for (const front of WINDOWS_3) {
    for (const middle of WINDOWS_5) {
      for (const back of WINDOWS_5) {
        const demand = new Map<number, number>();
        for (const v of [...front, ...middle, ...back]) demand.set(v, (demand.get(v) ?? 0) + 1);
        let ok = true;
        for (let rank = 2; rank <= 14; rank++) {
          if ((demand.get(rank) ?? 0) > (counts.get(rank) ?? 0)) {
            ok = false;
            break;
          }
        }
        if (ok) return true;
      }
    }
  }
  return false;
}

export function detectAutoWin(hand: Card[]): AutoWinType | null {
  if (isDragon(hand)) return 'dragon';
  if (isSixPairs(hand)) return 'six-pairs';
  if (isFourPairsPlusFlush(hand)) return 'four-pairs-flush';
  if (isFourPairsPlusStraight(hand)) return 'four-pairs-straight';
  if (isThreeFlushes(hand)) return 'three-flushes';
  if (isThreeStraights(hand)) return 'three-straights';
  return null;
}

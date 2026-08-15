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

/** A natural sub-grouping of an Automatic Winning Hand, for display purposes only (e.g. "Pair 1", "Straight"). */
export interface AutoWinGroup {
  label: string;
  cards: Card[];
}

export interface AutoWinDisplay {
  type: AutoWinType;
  groups: AutoWinGroup[];
}

/** All 13 cards have distinct ranks -- by pigeonhole, that forces exactly one of each rank 2-A. */
function isDragon(hand: Card[]): boolean {
  return new Set(hand.map((c) => c.value)).size === 13;
}

function dragonGroups(hand: Card[]): AutoWinGroup[] | null {
  if (!isDragon(hand)) return null;
  return [{ label: 'Dragon', cards: [...hand].sort((a, b) => a.value - b.value) }];
}

function countPattern(hand: Card[]): number[] {
  return rankCounts(hand).map(([, count]) => count);
}

function isSixPairs(hand: Card[]): boolean {
  return countPattern(hand).join(',') === '2,2,2,2,2,2,1';
}

/** rankCounts is sorted by count desc then value desc, so the six pair-entries come out highest-rank-first. */
function sixPairsGroups(hand: Card[]): AutoWinGroup[] | null {
  if (!isSixPairs(hand)) return null;
  const counts = rankCounts(hand);
  const groups: AutoWinGroup[] = counts
    .filter(([, count]) => count === 2)
    .map(([value], i) => ({ label: `Pair ${i + 1}`, cards: hand.filter((c) => c.value === value) }));
  const [singleValue] = counts.find(([, count]) => count === 1)!;
  groups.push({ label: 'Odd Card', cards: hand.filter((c) => c.value === singleValue) });
  return groups;
}

/** Four paired ranks (8 cards) + five singleton cards, or null if the hand isn't shaped that way. */
function extractFourPairsSingles(hand: Card[]): Card[] | null {
  const counts = rankCounts(hand);
  if (counts.map(([, count]) => count).join(',') !== '2,2,2,2,1,1,1,1,1') return null;
  const singleValues = new Set(counts.filter(([, count]) => count === 1).map(([value]) => value));
  return hand.filter((c) => singleValues.has(c.value));
}

function fourPairsGroups(hand: Card[], singles: Card[], lastLabel: string): AutoWinGroup[] {
  const counts = rankCounts(hand);
  const groups: AutoWinGroup[] = counts
    .filter(([, count]) => count === 2)
    .map(([value], i) => ({ label: `Pair ${i + 1}`, cards: hand.filter((c) => c.value === value) }));
  groups.push({ label: lastLabel, cards: singles });
  return groups;
}

function isFourPairsPlusFlush(hand: Card[]): boolean {
  const singles = extractFourPairsSingles(hand);
  return !!singles && singles.every((c) => c.suit === singles[0].suit);
}

function fourPairsPlusFlushGroups(hand: Card[]): AutoWinGroup[] | null {
  if (!isFourPairsPlusFlush(hand)) return null;
  const singles = extractFourPairsSingles(hand)!;
  return fourPairsGroups(hand, singles, 'Flush');
}

/** No ace-low wheel exception here -- this rule is defined purely as consecutive integers over the 2-14 encoding. */
function isFourPairsPlusStraight(hand: Card[]): boolean {
  const singles = extractFourPairsSingles(hand);
  if (!singles) return false;
  const values = [...singles].map((c) => c.value).sort((a, b) => a - b);
  return values.every((v, i) => i === 0 || v === values[i - 1] + 1);
}

function fourPairsPlusStraightGroups(hand: Card[]): AutoWinGroup[] | null {
  if (!isFourPairsPlusStraight(hand)) return null;
  // extractFourPairsSingles preserves hand-array order, not rank order -- sort for a readable group.
  const singles = [...extractFourPairsSingles(hand)!].sort((a, b) => a.value - b.value);
  return fourPairsGroups(hand, singles, 'Straight');
}

const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
type Suit = (typeof SUITS)[number];

interface SuitCombo {
  sFront: Suit;
  sMiddle: Suit;
  sBack: Suit;
}

/**
 * The 13 cards partition into three groups (3/5/5), each entirely one suit. Checks every
 * combination of (front-suit, middle-suit, back-suit) and requires the resulting per-suit
 * demand to EXACTLY match each suit's actual card count -- not `<=`, since total demand and
 * total count are both always fixed at 13, so exact equality is what rules out leftover
 * unassigned cards (a suit with cards but zero demand would otherwise slip through).
 */
function findThreeFlushesCombo(hand: Card[]): SuitCombo | null {
  const counts = Object.fromEntries(SUITS.map((s) => [s, hand.filter((c) => c.suit === s).length])) as Record<Suit, number>;
  for (const sFront of SUITS) {
    for (const sMiddle of SUITS) {
      for (const sBack of SUITS) {
        const demand: Partial<Record<Suit, number>> = {};
        demand[sFront] = (demand[sFront] ?? 0) + 3;
        demand[sMiddle] = (demand[sMiddle] ?? 0) + 5;
        demand[sBack] = (demand[sBack] ?? 0) + 5;
        if (SUITS.every((s) => (demand[s] ?? 0) === counts[s])) return { sFront, sMiddle, sBack };
      }
    }
  }
  return null;
}

/**
 * Builds the front/middle/back flush groups from the winning suit combo. Buckets `hand` by
 * suit (sorted by value) and consumes sequentially front->middle->back from each suit's own
 * pool -- since a suit's total demand across whichever zones use it always exactly equals its
 * actual card count, sequential splicing can never underflow, even when one suit supplies two
 * or all three zones (including the degenerate case of a single suit supplying the whole hand).
 */
function threeFlushesGroups(hand: Card[]): AutoWinGroup[] | null {
  const combo = findThreeFlushesCombo(hand);
  if (!combo) return null;
  const pools = Object.fromEntries(
    SUITS.map((s) => [s, hand.filter((c) => c.suit === s).sort((a, b) => a.value - b.value)]),
  ) as Record<Suit, Card[]>;
  const front = pools[combo.sFront].splice(0, 3);
  const middle = pools[combo.sMiddle].splice(0, 5);
  const back = pools[combo.sBack].splice(0, 5);
  return [
    { label: 'Flush (Front)', cards: front },
    { label: 'Flush (Middle)', cards: middle },
    { label: 'Flush (Back)', cards: back },
  ];
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

interface WindowCombo {
  front: number[];
  middle: number[];
  back: number[];
}

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
function findThreeStraightsCombo(hand: Card[]): WindowCombo | null {
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
        if (ok) return { front, middle, back };
      }
    }
  }
  return null;
}

/**
 * Builds the front/middle/back straight groups from the winning window combo. Buckets `hand`
 * by rank value and, for each zone's window in front->middle->back order, takes one card per
 * rank via shift(). Unlike the flush case, processing order doesn't actually matter here --
 * the only invariant required (per-rank demand <= per-rank supply) is already guaranteed by
 * the search that found the combo, regardless of how many windows share a given rank.
 */
function threeStraightsGroups(hand: Card[]): AutoWinGroup[] | null {
  const combo = findThreeStraightsCombo(hand);
  if (!combo) return null;
  const pools = new Map<number, Card[]>();
  for (const c of hand) {
    if (!pools.has(c.value)) pools.set(c.value, []);
    pools.get(c.value)!.push(c);
  }
  const takeGroup = (window: number[]): Card[] => window.map((rank) => pools.get(rank)!.shift()!);
  return [
    { label: 'Straight (Front)', cards: takeGroup(combo.front) },
    { label: 'Straight (Middle)', cards: takeGroup(combo.middle) },
    { label: 'Straight (Back)', cards: takeGroup(combo.back) },
  ];
}

/**
 * Detects an Automatic Winning Hand and returns the natural card grouping for display (e.g.
 * "Pair 1".."Pair 6" + "Odd Card" for Six Pairs), independent of how the 13-card hand is
 * actually arranged. `detectAutoWin` below is a thin wrapper over this -- single source of
 * truth, so detection and grouping can never disagree.
 */
export function getAutoWinDisplay(hand: Card[]): AutoWinDisplay | null {
  const dragon = dragonGroups(hand);
  if (dragon) return { type: 'dragon', groups: dragon };
  const sixPairs = sixPairsGroups(hand);
  if (sixPairs) return { type: 'six-pairs', groups: sixPairs };
  const fourPairsFlush = fourPairsPlusFlushGroups(hand);
  if (fourPairsFlush) return { type: 'four-pairs-flush', groups: fourPairsFlush };
  const fourPairsStraight = fourPairsPlusStraightGroups(hand);
  if (fourPairsStraight) return { type: 'four-pairs-straight', groups: fourPairsStraight };
  const threeFlushes = threeFlushesGroups(hand);
  if (threeFlushes) return { type: 'three-flushes', groups: threeFlushes };
  const threeStraights = threeStraightsGroups(hand);
  if (threeStraights) return { type: 'three-straights', groups: threeStraights };
  return null;
}

export function detectAutoWin(hand: Card[]): AutoWinType | null {
  return getAutoWinDisplay(hand)?.type ?? null;
}

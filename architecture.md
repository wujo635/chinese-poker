# Architecture

## Overview
Chinese Poker (十三水) MVP — a React + TypeScript + Vite single-page app. Game logic is built as a pure, framework-free "engine" layer, with React components consuming it. This separation keeps the trickiest code (hand ranking, comparison, validation, scoring) independently testable without any UI concerns.

## Stack
- **Build tool**: Vite
- **UI**: React 19 + TypeScript
- **Testing**: Vitest + React Testing Library (jsdom environment)
- **Linting**: oxlint
- **Persistence**: browser `localStorage` (no backend)
- **Deploy target**: GitHub Pages (static build, `base: '/chinese-poker/'` in `vite.config.ts`)

## Folder Structure
```
src/
  engine/          # Pure game logic, no React dependencies
    __tests__/     # Vitest unit tests for engine modules
  components/       # React UI components
  types/            # Shared TypeScript types (Card, Player, GameState, ...)
    card.ts          # Suit, Rank, Card
    player.ts         # PlayerType, Arrangement (front/middle/back tuples), Player
    gameState.ts       # GameStatus, MatchupResult, RoundResult, GameState
    index.ts           # barrel export
  test/
    setup.ts        # Vitest/jest-dom global test setup
  App.tsx           # Root component (Vite default, to be replaced)
  main.tsx          # React entry point
```

## Engine Layer
Pure functions with no side effects, unit-tested independently of the UI (`src/engine/__tests__/`):
- `deck.ts` — deck creation, shuffling, dealing, card comparison. Ace is 14 by default.
- `handRank.ts` — `getHandStrength()` returns a comparable `[category, ...tiebreakers]` tuple (not just a 1-10 number) so same-category hands compare correctly by kicker. Straight detection special-cases the A-2-3-4-5 wheel (high card = 5, not 14). Royal Flush is category 9 internally (same as Straight Flush) — `identifyHandType()` only distinguishes it for display naming, since an Ace-high straight flush already outranks others via the tiebreaker. **3-card front hands only ever reach High Card / Pair / Three of a Kind** — straights/flushes are not scored at 3 cards, per standard Chinese Poker rules.
- `compareHands.ts` — compares two same-size hands via their strength tuples; falls back to a suit tiebreaker (♠>♥>♦>♣) on each hand's highest card if the rank strength is exactly equal.
- `validate.ts` — `validateArrangement()` requires **strict** back > middle > front; an exact tie between two rows is a foul.
- `game.ts` — game/round orchestration. `resolveRound()` scores every pair of players independently (round-robin), so `GameState.results` holds one `RoundResult` per (player, opponent) pairing rather than one per player — a player's total round score is the sum of their entries. A fouled player auto-loses -6 against every valid opponent; two fouled players tie 0 against each other.
- `ai.ts` — `generateAIArrangement()`: brute-force strongest 5-card back, then strongest 5-card middle from the remainder, leftover 3 cards become front. Can theoretically foul on rare/weak hands (acceptable for MVP per spec).
- `persistence.ts` — `saveGameState`/`loadGameState`/`clearGameState` keyed by `gameId` under a `chinese-poker:game:` localStorage prefix; `listSavedGameIds()` scans that prefix for a "load saved game" screen. `loadGameState` returns `null` (not a throw) on missing or corrupted data.

## Status
- **v0.1.0**: Project scaffolding only. No game logic or custom UI yet.
- **v0.2.0**: Core types defined (`Card`, `Player`, `Arrangement`, `GameState`). `front`/`middle`/`back` are typed as fixed-length tuples (3/5/5) rather than plain arrays for compile-time safety. No engine logic yet.
- **v0.3.0**: Full engine layer implemented and unit-tested (deck, hand ranking, comparison, validation, game/round orchestration, AI arrangement). No UI yet — not runnable as an app.
- **v0.4.0**: localStorage persistence added. Engine layer is now feature-complete for the MVP. Still no UI — not runnable as an app yet (that's Phase 4).

## Change Log Pointer
See [CHANGELOG.md](CHANGELOG.md) for version history. This document should be updated alongside every feature that changes the app's structure.

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
    __tests__/       # React Testing Library component tests
    Home.tsx          # New Game / Continue Saved Game
    CardView.tsx       # Single-card display (rank/suit, selectable)
    HandZone.tsx        # A front/middle/back zone: cards placed + empty slots to place into
    ArrangementScreen.tsx # Click-to-assign hand arranging: select a card, click a zone slot to place it
    ReviewScreen.tsx      # Read-only pre-confirm review of the human's arrangement
    PlayerDashboard.tsx   # Shows AI opponents as face-down "Locked In" while the human arranges
    ResultsScreen.tsx     # Post-round reveal: human's matchups vs each AI, standings, all 4 hands revealed
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
- `game.ts` — game/round orchestration. `resolveRound()` scores every pair of players independently (round-robin), so `GameState.results` holds one `RoundResult` per (player, opponent) pairing rather than one per player — a player's total round score is the sum of their entries. Each `RoundResult` carries an explicit `opponentId` (added in v0.6.0) so the UI can look up "my result against this specific opponent" without relying on array ordering. A fouled player auto-loses -6 against every valid opponent; two fouled players tie 0 against each other.
- `ai.ts` — `generateAIArrangement()`: brute-force strongest 5-card back, then strongest 5-card middle from the remainder, leftover 3 cards become front. Can theoretically foul on rare/weak hands (acceptable for MVP per spec).
- `persistence.ts` — `saveGameState`/`loadGameState`/`clearGameState` keyed by `gameId` under a `chinese-poker:game:` localStorage prefix; `listSavedGameIds()` scans that prefix for a "load saved game" screen. `loadGameState` returns `null` (not a throw) on missing or corrupted data.

## Status
- **v0.1.0**: Project scaffolding only. No game logic or custom UI yet.
- **v0.2.0**: Core types defined (`Card`, `Player`, `Arrangement`, `GameState`). `front`/`middle`/`back` are typed as fixed-length tuples (3/5/5) rather than plain arrays for compile-time safety. No engine logic yet.
- **v0.3.0**: Full engine layer implemented and unit-tested (deck, hand ranking, comparison, validation, game/round orchestration, AI arrangement). No UI yet — not runnable as an app.
- **v0.4.0**: localStorage persistence added. Engine layer is now feature-complete for the MVP. Still no UI — not runnable as an app yet (that's Phase 4).
- **v0.5.0**: Solo-play UI complete and manually verified in-browser (deal → click-to-assign arrange → live validation/hand-type display → review → confirm → locked result; Save & Exit / Continue Saved Game round-trips through localStorage). This is the first version that's actually playable. Single human player only — no AI opponents or scoring yet (Phase 5).
  - **Known limitation**: "Save & Exit" persists the dealt hand but not in-progress card placement — resuming a saved game re-deals the same `GameState` and the player re-arranges from scratch. Acceptable for MVP; revisit if it's annoying in practice.
  - `App.tsx` owns all game/view state (`GameState`, the in-progress `ArrangementState`, and which screen is showing) and passes it down; components are otherwise presentational plus local UI-only state (e.g. `ArrangementScreen`'s currently-selected card).
- **v0.6.0**: 4-player AI opponents (Phase 5). Dealing a round now immediately auto-arranges the 3 AI players via `generateAIArrangement()` and locks them in — `PlayerDashboard` shows them as face-down "Locked In" while the human arranges. Confirming the human's arrangement triggers `resolveRound()` and moves to `ResultsScreen`, which shows the human's matchup results against each AI (front/middle/back win/loss/tie + net score), a standings list with a crown for the top scorer, and all 4 players' hands revealed with hand-type labels. Manually verified end-to-end in-browser, including a scoop loss (-6) and a mixed matchup result. Replaced `RoundResult`'s previous ambiguity by adding `opponentId` (see engine notes above).

## Change Log Pointer
See [CHANGELOG.md](CHANGELOG.md) for version history. This document should be updated alongside every feature that changes the app's structure.

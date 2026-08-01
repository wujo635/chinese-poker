# Architecture

## Overview
Chinese Poker (十三水) MVP — a React + TypeScript + Vite single-page app. Game logic is built as a pure, framework-free "engine" layer, with React components consuming it. This separation keeps the trickiest code (hand ranking, comparison, validation, scoring) independently testable without any UI concerns.

## Stack
- **Build tool**: Vite
- **UI**: React 19 + TypeScript
- **Testing**: Vitest + React Testing Library (jsdom environment)
- **Linting**: oxlint
- **Persistence**: browser `localStorage` (no backend)
- **Deploy target**: GitHub Pages (static build, `base: '/chinese-poker/'` in `vite.config.ts`), auto-deployed via `.github/workflows/deploy.yml` on push to `main`

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
    ArrangementScreen.tsx # Click-to-assign hand arranging: select a card, click a zone slot to place it; Confirm submits directly (no separate review step)
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
- `compareHands.ts` — compares two same-size hands via their strength tuples; falls back to a suit tiebreaker (♠>♥>♣>♦) on each hand's highest card if the rank strength is exactly equal.
- `validate.ts` — `validateArrangement()` requires **strict** back > middle > front; an exact tie between two rows is a foul.
- `game.ts` — game/round orchestration. `resolveRound()` scores every pair of players independently (round-robin), so `GameState.results` holds one `RoundResult` per (player, opponent) pairing rather than one per player — a player's total round score is the sum of their entries. Each `RoundResult` carries an explicit `opponentId` (added in v0.6.0) so the UI can look up "my result against this specific opponent" without relying on array ordering. A fouled player auto-loses -3 against every valid opponent (changed from -6 in v0.11.0); two fouled players tie 0 against each other. **Per-hand scoring (v0.10.0)**: each of front/middle/back is scored independently, and the winner's point value depends on the *winning* hand's category on a zone-specific scale (not a flat ±1) — see `frontPoints()`/`middlePoints()`/`backPoints()`. Front: Three of a Kind = 3, anything else = 1. Middle: Straight/Royal Flush = 10, Four of a Kind = 8, Full House = 2, anything else = 1. Back: Straight/Royal Flush = 5, Four of a Kind = 4, anything else = 1. There is no scoop bonus — a round score is just the sum of the three zone scores. Ties score 0. Foul penalty is a flat -3 against every valid opponent.
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
- **v0.7.0**: GitHub Pages deploy workflow (Phase 7). `.github/workflows/deploy.yml` builds and deploys on every push to `main` using the official `actions/{configure,upload,deploy}-pages` flow: install → `test:ci` (Vitest in non-watch mode, added as a separate script from the interactive `test`) → `build` → deploy. Requires a one-time manual step in the GitHub repo (Settings → Pages → Source → "GitHub Actions") before the first deploy will actually publish — not something this workflow file itself can configure.
- **v0.7.1**: Fixed the deploy workflow — it was pinned to Node 20, but `jsdom@30` requires Node ^22.22.2, so every test worker crashed on CI (worked fine locally on Node 24). Bumped the workflow to Node 22 and added `engines.node` to `package.json` to make the requirement explicit.
- **v0.8.0**: Changed the suit tiebreaker order from ♠>♥>♦>♣ to ♠>♥>♣>♦ (clubs now rank above diamonds), per explicit request. This only affects outcomes when two hands/cards are otherwise exactly equal in rank strength.
- **v0.9.0**: Two small UI-only refinements to `ArrangementScreen`, both wiring up existing pure engine functions that were previously unused by the UI: the hand tray now sorts via `compareCards()` (`deck.ts`) instead of showing dealt order, and a new "Auto-Place" button re-arranges the whole hand via `generateAIArrangement()` (`ai.ts`), the same logic AI opponents already use.
- **v0.10.0**: New scoring method (see Engine Layer notes above) — replaced the flat ±1 per hand + ±6 scoop bonus with per-zone, hand-category-based point values (front/middle/back each use their own scale, no scoop). Foul penalty stays a flat ±6. This is purely an engine/scoring change with no new UI.
- **v0.11.0**: Foul penalty reduced from a flat ±6 to a flat ±3, to be more proportionate to the new per-hand point scale (top single-zone win is 10, so a full-round foul loss of 6 was disproportionately harsh next to it).
- **v0.12.0**: Optional "allow invalid submissions" toggle. A checkbox on `Home` (default off, per-New-Game setting stored in `App.tsx` state, not part of `GameState`/persistence) controls whether the Confirm button is blocked when the arrangement fouls. When enabled, a fouled arrangement can be submitted directly and is scored via the existing foul-loss path (flat -3). "Play Again" carries the setting forward from the just-played round; "Continue Saved Game" always resets it to off, since saved games don't record it. When `allowInvalidSubmissions` is on, `ArrangementScreen` skips rendering `ValidationStatus` entirely — not just the foul message, but "Valid arrangement" and "Place all 13 cards" too. The reasoning: once foul-blocking is off, validation isn't gating anything the player needs to react to, so surfacing partial validation state (valid vs. invalid vs. incomplete) is just noise.
- **v0.13.0**: Removed `ReviewScreen` entirely. With the foul-validation toggle in place, the "one last look before it's irreversible" safety net Review provided was judged unnecessary — it had become a near-duplicate of `ArrangementScreen`'s read-only state. `ArrangementScreen`'s "Review" button is now "Confirm" and submits the round directly: disabled while incomplete, and disabled on a fouled arrangement unless `allowInvalidSubmissions` is on (previously Review was only gated by completeness, with foul-blocking enforced one screen later). `App.tsx`'s `View` type drops `'review'` — the flow is now `home → arranging → results`.

## Change Log Pointer
See [CHANGELOG.md](CHANGELOG.md) for version history. This document should be updated alongside every feature that changes the app's structure.

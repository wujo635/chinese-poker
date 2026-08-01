# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-07-31

### Added
- Hand tray in `ArrangementScreen` now displays cards sorted (descending by value, then suit ♠>♥>♣>♦) via the existing `compareCards()` instead of dealt order.
- "Auto-Place" button in `ArrangementScreen`: one click re-arranges the entire hand (including any already-placed cards) using the existing `generateAIArrangement()`, the same greedy strongest-back-then-middle strategy used for AI opponents.
- 2 new component tests covering hand sort order and Auto-Place behavior.

## [0.8.0] - 2026-07-31

### Changed
- Suit tiebreaker order changed from ♠ > ♥ > ♦ > ♣ to **♠ > ♥ > ♣ > ♦** (clubs now outrank diamonds), per explicit request. Affects `SUIT_VALUE` (`src/engine/deck.ts`, used by `compareCards`) and `getSuitValue()` (`src/engine/handRank.ts`, used by `compareHands()`'s tiebreak when two hands have identical rank strength).

## [0.7.1] - 2026-07-31

### Fixed
- CI deploy workflow was pinned to Node 20, but `jsdom@30` (a test dependency) requires Node ^22.22.2 — every test worker crashed on startup (`webidl.util.markAsUncloneable is not a function`) and the deploy never got past the test step. Bumped the workflow to Node 22.
- Added an `engines.node` field (`>=22.22.2`) to `package.json` to self-document this requirement and avoid the same mismatch recurring.

## [0.7.0] - 2026-07-31

### Added
- `.github/workflows/deploy.yml`: builds and deploys to GitHub Pages on every push to `main` (install → test → build → deploy via the official Pages Actions)
- `npm run test:ci` script (`vitest run`, non-watch mode) for use in CI, separate from the interactive `npm run test`

### Note
Requires a one-time manual step before the first deploy publishes: in the GitHub repo, go to **Settings → Pages → Source** and select **"GitHub Actions"**.

## [0.6.0] - 2026-07-31

### Added
- 4-player AI opponents: dealing now auto-arranges the 3 AI players immediately via `generateAIArrangement()`
- `PlayerDashboard`: shows AI opponents as face-down "Locked In" while the human arranges
- `ResultsScreen`: post-round reveal with human-vs-each-AI matchup breakdown (front/middle/back + net score), a standings list with a crown for the top scorer, and all 4 revealed hands with hand-type labels
- `RoundResult.opponentId` added so the UI can look up a specific matchup without relying on array order
- 5 new tests (ResultsScreen, PlayerDashboard)

### Changed
- `ReviewScreen` simplified back to its original pre-confirm-only role — the "locked" final view is now `ResultsScreen`'s job

Manually verified end-to-end in-browser: dealt hand → AI opponents lock in instantly → human arranges and confirms → results correctly show win/loss/tie per hand, a -6 scoop loss, and accurate standings.

## [0.5.0] - 2026-07-31

### Added
- Solo-play UI: Home, click-to-assign ArrangementScreen (with live validation and per-zone hand-type display), ReviewScreen (doubles as the locked final-result view), CardView, HandZone
- `App.tsx` wires it all together: New Game (deal), Save & Exit / Continue Saved Game (localStorage round-trip), Review, Confirm, Play Again
- 8 React Testing Library component tests (ArrangementScreen interactions + validation states, App-level flow)
- Removed default Vite template boilerplate (counter demo, template assets/CSS)

This is the first version that's actually playable — deal 13 cards, arrange them into front/middle/back, see live validation and hand-type feedback, and lock in a final arrangement. Manually verified end-to-end in-browser, including a deliberate foul case.

## [0.4.0] - 2026-07-31

### Added
- `persistence.ts`: `saveGameState`, `loadGameState`, `clearGameState`, `listSavedGameIds` — localStorage-backed game persistence
- 6 Vitest unit tests covering round-tripping, missing data, corrupted JSON, and listing saved games

## [0.3.0] - 2026-07-31

### Added
- `deck.ts`: `createDeck`, `shuffleDeck`, `dealCards`, `compareCards`
- `handRank.ts`: `getHandStrength` (comparable tuple, not just a category number), `identifyHandType`, `getSuitValue`
- `compareHands.ts`: `compareHands` with suit-based tiebreaker fallback
- `validate.ts`: `validateArrangement` with strict back > middle > front foul detection
- `game.ts`: `initializeGame`, `dealRound`, `submitArrangement`, `resolveRound`, `calculateWinner`
- `ai.ts`: `generateAIArrangement` (greedy brute-force strongest back/middle)
- 45 Vitest unit tests across all engine modules, covering the edge cases called out in the spec (A-2-3-4-5 wheel vs A-K-Q-J-10 straight, kicker comparisons, suit tiebreakers, foul detection, scoop scoring)

## [0.2.0] - 2026-07-31

### Added
- Core TypeScript types: `Card`, `Suit`, `Rank` (`src/types/card.ts`)
- `Player`, `PlayerType`, `Arrangement` with tuple-typed `front` (3) / `middle` (5) / `back` (5) hands (`src/types/player.ts`)
- `GameState`, `GameStatus`, `MatchupResult`, `RoundResult` (`src/types/gameState.ts`)
- Barrel export at `src/types/index.ts`

## [0.1.0] - 2026-07-30

### Added
- Project scaffolded with Vite + React + TypeScript (`react-ts` template)
- Vitest + React Testing Library configured for unit/component testing
- Base folder structure: `src/engine/` (pure game logic), `src/components/` (React UI), `src/types/` (shared types)
- `vite.config.ts` set up with `base: '/chinese-poker/'` for future GitHub Pages deployment

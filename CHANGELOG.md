# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.18.0] - 2026-08-06

### Added
- A new "Optimal" AI arrangement strategy (`generateOptimalArrangement`) that maximizes total score across all three zones together, using the game's real scoring table, instead of greedily maximizing the back hand alone. It's a globally optimal maximizer rather than a distinct personality — verified to never miss a legal opportunity to place a strong hand (e.g. a Four of a Kind) in whichever zone pays more, while correctly respecting that back must always beat middle. The AI Dealer (Player mode) now uses this strategy; non-dealer AI bots and the human's "Auto-Place" button are unchanged. This addresses the previous AI producing unrealistically strong back hands (Full House or better ~44% of the time, vs. ~0.14% in random 5-card poker) by considering the whole hand together rather than greedily maximizing one zone first.

### Changed
- `frontPoints`/`middlePoints`/`backPoints` in `src/engine/game.ts` are now exported, so the new AI strategy can reuse the same scoring table as real round resolution rather than a separately-maintained heuristic.

## [0.17.0] - 2026-08-06

### Added
- A persisted, all-time **Leaderboard** on Home — top 5 scores per session mode (Dealer / Player), recorded when a session is explicitly ended via "End Session". Player-mode entries show the seat count they were achieved with (score is the sum of all your controlled seats' totals for that session). Stored in `localStorage` (`chinese-poker:leaderboard`), independent of in-session running totals.

### Known limitation
- Resuming a session via `handleContinue()` (Save & Exit → Continue, or "Continue Saved Game" while a session is active) resets the in-session running totals that feed the leaderboard entry — so a leaderboard score recorded after a resume only reflects rounds played *since* that resume, not the full session. This is pre-existing behavior from v0.16.0's session-totals design; not addressed by this feature.

## [0.16.0] - 2026-08-05

### Added
- Session running totals: once a round is played, Home locks the session's mode/seat-count (hides the picker, shows a locked-mode line) and offers "Continue Session" (deal another round with the same config) alongside a new "End Session" button that resets back to the normal picker.
- `ResultsScreen` gains a "Session Totals" section — one row per seat with that seat's cumulative score across every round played so far this session (not just the human's), crowning the current leader(s) — below the existing per-round matchup rows.
- "Continue Saved Game" now also (re)activates session tracking if none was active, inferring the locked mode/seat-count from the resumed save.

### Changed
- The "Home" button on `ResultsScreen` no longer implicitly ends the session — session totals and the locked mode now persist through Results → Home → Continue Session, exactly as they already do through Results → Play Again. A session now only ends via the explicit new "End Session" button.

## [0.15.0] - 2026-08-01

### Added
- Session mode selector on Home: **"Play as Dealer vs 3 AI"** (default, same as before) or **"Play vs AI Dealer"**, which reveals a picker to control 1, 2, or 3 non-dealer seats yourself (remaining seats are AI-controlled).
- When controlling multiple seats, they're arranged **sequentially** — one full `ArrangementScreen` per seat, each showing an "Arranging Seat X of Y" progress indicator, before moving to the next.
- `ResultsScreen` shows a one-line round-total summary (e.g. "Your round total: -6") above the per-opponent matchup rows.
- `PlayerDashboard` marks the Dealer's seat with 🎩 and distinguishes an unarranged human seat ("Up Next") from an AI seat still arranging ("Arranging…").

### Changed
- `ResultsScreen`'s matchup rows and hand-reveal section are now derived from `game.dealerId` instead of assuming the human is always `players[0]` — works correctly whether the Dealer is human or AI, and whether there are 1-3 human seats.
- **Removed the "Standings" ranking section** from `ResultsScreen` — with non-dealer seats never scoring against each other (since v0.14.0), a competitive ranking across all 4 players no longer means anything. Replaced by the round-total summary line plus the individual per-opponent rows.
- "Play Again" now carries forward both the session mode/seat-count and the "allow invalid submissions" setting from the round just played.
- "Continue Saved Game" resumes correctly mid-multi-seat-arranging: already-confirmed seats stay locked in, and the queue picks up on the next unconfirmed seat. In-progress card placement on the seat being actively arranged is still lost on resume (same pre-existing limitation as single-seat saves).

## [0.14.0] - 2026-08-01

### Fixed
- `resolveRound` no longer scores AI opponents against each other. Previously it ran a full round-robin over all 4 players, so a player's score could swing based on matchups they weren't shown and couldn't control. It now formalizes a **Dealer** concept: every non-dealer player's hand is compared only against the Dealer's, never against each other. `GameState.results` now holds 3 pairings (6 entries) per round instead of 6 pairings (12 entries).

### Added
- `GameState.dealerId` — identifies which seat is the Dealer.
- `initializeGame()` now takes a `{ seats, dealerIndex }` config instead of a plain name list, so seat type (human/AI) and dealer position can be specified explicitly. This is groundwork for an upcoming session-mode selector (play as Dealer vs. AI, or play vs. an AI Dealer) — not yet exposed in the UI this version.
- `normalizeLegacyGameState()` — defaults `dealerId` to the first player for saves persisted before this field existed, so old "Continue Saved Game" saves keep working.

This version is purely an engine/state-shape change; the visible app behavior (solo human vs. 3 AI) is unchanged.

## [0.13.0] - 2026-08-01

### Removed
- `ReviewScreen` — the separate pre-confirm review step. With the "allow invalid submissions" toggle already handling the foul case explicitly, the extra "one last look" screen was judged unnecessary and had become a near-duplicate of `ArrangementScreen`'s read-only state.

### Changed
- `ArrangementScreen`'s "Review" button is now "Confirm" and submits the round directly. It's disabled while the arrangement is incomplete, and disabled on a fouled arrangement unless "allow invalid submissions" is on — previously Review was only gated by completeness, with foul-blocking enforced one screen later on Review's own Confirm button.
- The app flow is now `home → arranging → results` (previously `home → arranging → review → results`).

## [0.12.0] - 2026-08-01

### Added
- New Home screen option: "Allow submitting an invalid arrangement" checkbox (default off). When enabled, `ReviewScreen`'s Confirm button is no longer blocked by a foul — the arrangement submits as-is and scores as the existing automatic foul loss (-3 against every valid opponent). Default (unchecked) behavior — Confirm blocked on foul — is unchanged.
- The setting carries forward through "Play Again" (reuses the same value for the next round), but resets to the default (off) when continuing a previously saved game, since saved games don't record this setting.
- Simplified further: when the toggle is on, `ValidationStatus` doesn't render at all on `ArrangementScreen`/`ReviewScreen` — not just the foul message, but "Valid arrangement" and "Place all 13 cards" too, since none of it is actionable once foul-blocking is off.
- 6 new component tests (`Home.test.tsx`, `ReviewScreen.test.tsx`, `ArrangementScreen.test.tsx`) covering both the default-blocked and toggle-enabled paths.

## [0.11.0] - 2026-07-31

### Changed
- Foul penalty reduced from a flat -6 to a flat -3 against every valid opponent, to better match the new per-hand point scale introduced in 0.10.0.

## [0.10.0] - 2026-07-31

### Changed
- Replaced the flat ±1 per hand + ±6 scoop bonus with a new scoring method: each of front/middle/back is scored independently, and the point value depends on the *winning* hand's category on a zone-specific scale.
  - **Front**: Three of a Kind = 3, anything else = 1
  - **Middle**: Straight/Royal Flush = 10, Four of a Kind = 8, Full House = 2, anything else = 1
  - **Back**: Straight/Royal Flush = 5, Four of a Kind = 4, anything else = 1
  - The scoop bonus is removed entirely — a round score is just the sum of the three zone scores. Ties still score 0. A fouled player's penalty is unchanged (flat -6 against every valid opponent).

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

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

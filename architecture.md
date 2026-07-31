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
  test/
    setup.ts        # Vitest/jest-dom global test setup
  App.tsx           # Root component (Vite default, to be replaced)
  main.tsx          # React entry point
```

## Engine Layer (planned)
Pure functions with no side effects, unit-tested independently of the UI:
- `deck.ts` — deck creation, shuffling, dealing, card comparison
- `handRank.ts` — hand type identification and strength scoring
- `compareHands.ts` — comparing two hands
- `validate.ts` — arrangement validation (foul detection)
- `game.ts` — game/round orchestration and scoring
- `ai.ts` — AI opponent arrangement logic
- `persistence.ts` — localStorage save/load/clear

## Status
- **v0.1.0**: Project scaffolding only. No game logic or custom UI yet.

## Change Log Pointer
See [CHANGELOG.md](CHANGELOG.md) for version history. This document should be updated alongside every feature that changes the app's structure.

# Chinese Poker (十三水)

A web app for Chinese Poker: deal 13 cards, arrange them into front (3), middle (5), and back (5) hands, and play a round against AI opponents. One seat is always the **Dealer** — every other seat is scored only against the Dealer, never against each other.

## Features
- Two session modes, picked on Home: **Play as Dealer vs 3 AI** (you're the Dealer), or **Play vs AI Dealer** (you control 1-3 of the other seats; any remaining seats are AI-controlled)
- When controlling multiple seats, arrange them one at a time with a progress indicator ("Arranging Seat 2 of 3")
- Deal a 13-card hand and arrange it via click-to-assign (select a card, click a zone to place it)
- Live validation and hand-type feedback as you arrange (foul detection: back must beat middle, middle must beat front)
- Hand tray sorted by rank/suit, plus a one-click "Auto-Place" suggestion
- AI-controlled seats arrange their own hands automatically
- Round scoring: each hand is worth points based on the winning hand's strength (see below), automatic -3 foul loss
- Optional "allow invalid submissions" toggle on Home — turn off foul-blocking so a fouled arrangement can still be submitted (and auto-loses as usual)
- Results screen with a round-total summary, Dealer-vs-each-opponent matchup breakdown, and all hands revealed
- Save & Exit / Continue Saved Game via browser `localStorage`, including mid-multi-seat-arranging

## Suit tiebreaker order
♠ Spades > ♥ Hearts > ♣ Clubs > ♦ Diamonds — used only when two hands/cards are otherwise exactly equal in rank strength.

## Scoring
Each of the three hands (front/middle/back) is scored independently — the winner earns points based on the strength of their winning hand, the loser loses the same amount, and ties score 0:

| Hand | Trigger | Points |
|---|---|---|
| Front | Three of a Kind | 3 |
| Front | Anything else | 1 |
| Middle | Straight / Royal Flush | 10 |
| Middle | Four of a Kind | 8 |
| Middle | Full House | 2 |
| Middle | Anything else | 1 |
| Back | Straight / Royal Flush | 5 |
| Back | Four of a Kind | 4 |
| Back | Anything else | 1 |

A round score is the sum of the three hands' points. A fouled arrangement (back doesn't beat middle, or middle doesn't beat front) is an automatic -3 loss against every valid opponent.

## Getting Started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Scripts
- `npm run dev` — start the local dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
- `npm run test` — run tests in watch mode
- `npm run test:ci` — run tests once (used in CI)
- `npm run lint` — lint with oxlint

## Tech Stack
React 19 + TypeScript + Vite, Vitest + React Testing Library for tests, `localStorage` for persistence, deployed to GitHub Pages via GitHub Actions on push to `main`.

## Project Docs
- [architecture.md](architecture.md) — structure, engine design decisions, version-by-version status
- [CHANGELOG.md](CHANGELOG.md) — version history

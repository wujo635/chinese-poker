# Chinese Poker MVP Specification

## Game Overview
**Chinese Poker** (十三水 - "Thirteen Waters") is a 4-player card game where each player arranges 13 cards into three poker hands (3, 5, 5) that must increase in strength.

---

## MVP Scope

### Phase 1: Solo Play (Learning Mode)
- Deal 13 cards to player
- Allow player to arrange cards into front (3), middle (5), back (5)
- Validate hand arrangement (back > middle > front)
- Display hand strength for each group
- Show if arrangement is valid/invalid

### Phase 2: AI Opponents (Single Round)
- Deal to 4 players (human + 3 AI)
- Each player arranges their hand
- Compare all hands (front vs front, middle vs middle, back vs back)
- Calculate scores for the round
- Display results

### Phase 3: Multiplayer Foundation
- Architecture for multiple human players (turn-based)
- State persistence (localStorage)
- Session management

---

## Core Game Rules

### Hand Ranking (Poker Hands)
From lowest to highest:
1. High Card
2. Pair
3. Two Pair
4. Three of a Kind
5. Straight
6. Flush
7. Full House
8. Four of a Kind
9. Straight Flush
10. Royal Flush

### Special Rules
- **Foul**: If back ≤ middle OR middle ≤ front, player loses the round
- **No wild cards** in standard rules
- Ace can be high (A-K-Q) or low (A-2-3) in straights
- Suit ranking (if needed): ♠ > ♥ > ♦ > ♣

### Scoring (Basic)
- Each hand matchup: Win = +1 point, Lose = -1 point, Tie = 0 points
- 3 matchups per round = max ±3 points per player
- Bonus rules (optional for MVP): Scooping all 3 hands = +6 instead of +3

---

## Data Model

### Card
```javascript
{
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
  rank: 'A' | '2' | '3' | ... | '10' | 'J' | 'Q' | 'K',
  value: 2-14 // For comparisons (A=14 or 1)
}
```

### Player
```javascript
{
  id: string,
  name: string,
  type: 'human' | 'ai',
  hand: Card[],
  arrangement: {
    front: Card[3],
    middle: Card[5],
    back: Card[5]
  },
  isValid: boolean,
  score: number
}
```

### GameState
```javascript
{
  gameId: string,
  status: 'dealing' | 'arranging' | 'comparing' | 'complete',
  players: Player[],
  currentPlayerIndex: number,
  round: number,
  results: {
    playerId: string,
    frontResult: 'win' | 'loss' | 'tie',
    middleResult: 'win' | 'loss' | 'tie',
    backResult: 'win' | 'loss' | 'tie',
    roundScore: number
  }[],
  history: GameState[]
}
```

---

## Key Functions to Implement

### Card Management
- `createDeck()` - Generate 52 cards
- `shuffleDeck(deck)` - Randomize order
- `dealCards(deck, playerCount)` - Deal 13 to each player
- `compareCards(card1, card2)` - Return winner or tie

### Hand Validation & Strength
- `identifyHandType(cards[])` - Detect pair, straight, flush, etc.
- `getHandStrength(cards[])` - Return numeric rank (1-10)
- `compareHands(hand1, hand2)` - Determine winner
- `validateArrangement(front, middle, back)` - Ensure ascending strength
- `getSuitValue(suit)` - Return numeric rank for tiebreakers

### Game Logic
- `initializeGame(playerNames)` - Set up new game
- `dealRound()` - Deal 13 cards per player
- `submitArrangement(playerId, front, middle, back)` - Player action
- `resolveRound()` - Compare all hands, calculate scores
- `calculateWinner(players)` - Determine round/game winner

### AI
- `generateAIArrangement(hand)` - Simple algorithm to arrange AI's cards
  - Suggestions: Brute force strongest back hand, then strongest middle, weak front
  - Or: Random valid arrangement (MVP)

### Persistence
- `saveGameState(state)` - Save to localStorage
- `loadGameState(gameId)` - Restore from localStorage
- `clearGameState()` - Reset

---

## UI Components (React Suggested)

### Layout
- **Card Display**: Show cards in hand with drag-to-arrange or click-to-assign
- **Hand Zones**: Three dropzones (front, middle, back) showing current arrangement
- **Validation Status**: Visual indicator (green checkmark or red warning)
- **Hand Strength Meter**: Show strength of each arranged hand
- **Player Dashboard**: Show all 4 players' arranged hands (face-down for others)
- **Results Screen**: Compare each matchup, show scores

### MVP Screens
1. **Home**: Start new game, load saved game
2. **Game Setup**: Choose game mode (solo vs AI)
3. **Arrangement Screen**: Arrange your 13 cards into three hands
4. **Review Screen**: Confirm arrangement is valid before submit
5. **Results Screen**: See all matchups, scores, game summary
6. **History**: View past rounds/games

---

## Tech Stack Suggestion

**Frontend**: Vanilla JS or React (you're experienced with both)
**Styling**: CSS/Tailwind or inline
**State**: Context API (React) or object-based (Vanilla)
**Persistence**: localStorage
**Drag-and-Drop**: HTML5 native or React DnD library

---

## Development Checklist

### MVP v1.0
- [ ] Card data structure & shuffling
- [ ] Hand identification & ranking logic
- [ ] Hand comparison (one-vs-one)
- [ ] Arrangement validation
- [ ] Solo play (human vs dealer, no AI logic yet)
- [ ] Basic UI (card display, dropzones, validation)
- [ ] Results display
- [ ] localStorage persistence

### v1.1 (AI)
- [ ] AI arrangement algorithm
- [ ] 4-player game loop
- [ ] Multiplayer UI updates

### v1.2+ (Enhancements)
- [ ] Advanced AI (minimax, scoring heuristics)
- [ ] Bonus rules (scoops, special hands)
- [ ] Multiplayer networking (optional)
- [ ] Game statistics & leaderboard

---

## Notes & Considerations

1. **Hand Comparison Complexity**: Implement poker hand detection carefully. Test edge cases (A-2-3 vs K-Q-J straights, suit tiebreakers).
2. **UI/UX**: Drag-and-drop card arrangement can be tricky. Consider click-to-assign as fallback.
3. **AI Strategy**: Even simple greedy arrangement (strongest back, then middle, weak front) is playable for MVP.
4. **Scoring Variants**: Different regions have different bonus rules. Document which variant you're implementing.
5. **Testing**: Unit test hand comparison, validation, and deal logic thoroughly.

---

## References & Resources

- Poker hand rankings: https://www.pokernews.com/poker-hands.htm
- Chinese Poker rules variants: Multiple regional versions exist
- Card game architecture patterns: Similar to bridge, contract bridge solvers


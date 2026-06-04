# Poker Settle — Design Spec

**Date:** 2026-06-03
**Status:** Approved

## Problem

Existing poker-settle apps have two annoyances:

1. **Rigid buy-ins.** You can only add money in multiples of the buy-in. If the buy-in is $20 but someone wants to add $10, the app won't allow it.
2. **10-player cap.** Larger home games exceed the cap, which is frustrating.

We want a tool that lets us add **any** dollar amount to a player's stack, **add players mid-game**, and at the end enter each player's chip count and get a clear **who-pays-who** list with the fewest payments.

## Decisions

| Area | Decision |
|------|----------|
| Platform | Mobile-friendly web app (SPA) |
| Operator model | Single device, one operator (no accounts, no real-time sync) |
| Persistence | `localStorage`: active game + history of completed games |
| Chips | Single chip value (cost per chip); enter chip counts at settle |
| Settlement | Minimize the number of payments |
| Validation | Warn if cashed-out total ≠ bought-in total, but still settle |
| Hosting | Deploy to Vercel as a static site |
| Buy-in default | None — always type the dollar amount |
| Cash-out | Buy-ins only; no mid-game cash-out (final value set once at settle) |
| Stack | Vite + React + TypeScript + Tailwind |

## Architecture

A static React SPA. All state lives in a single in-memory store (React context + reducer) **mirrored to `localStorage`** on every change. Two storage keys:

- `poker-settle:active` — the game in progress (survives refresh)
- `poker-settle:history` — array of completed games

Money and settlement logic live in **pure functions** (no React, no storage) so they can be unit-tested in isolation. The UI calls them.

```
src/
  domain/
    types.ts          # Player, Game, Transaction
    money.ts          # cents-based helpers (avoid float bugs)
    settlement.ts     # net positions + minimize-payments algorithm
    settlement.test.ts
  store/
    gameStore.tsx     # context + reducer, localStorage sync
  screens/
    SetupScreen.tsx   # name the game, set $/chip, add players
    GameScreen.tsx    # live roster, add buy-ins, add players mid-game
    SettleScreen.tsx  # enter chip counts, see who-pays-who
    HistoryScreen.tsx # list past games, reopen read-only
  components/         # PlayerRow, MoneyInput, etc.
  App.tsx
```

## Data model

```ts
type Player = {
  id: string;
  name: string;
  buyInsCents: number[];      // each add is its own entry (full audit trail)
  finalChips: number | null;  // chip count entered at settle
};

type Game = {
  id: string;
  name: string;
  centsPerChip: number;       // e.g. 25 = $0.25/chip
  players: Player[];
  status: "active" | "settled";
  createdAt: number;
  settledAt: number | null;
};

type Transaction = {
  fromId: string;
  toId: string;
  amountCents: number;
};
```

**All money is stored as integer cents** to avoid floating-point rounding bugs (the classic `0.1 + 0.2` problem). Each buy-in is a separate array entry, preserving a full ordered history of what each player put in.

## Screens & flow

1. **Setup** — name the game, set cost-per-chip, add starting players (no player cap). → Start game.
2. **Game** — roster showing each player's total money in. Per player: an "+ add" control with a free-form dollar field (any amount). A persistent "add player" button works mid-game. → Go to settle.
3. **Settle** — enter each player's final **chip count**. App shows each player's cash-out value (`chips × rate`), net (`out − in`), a **balance-check banner**, and the **minimized payment list**. → Save to history.
4. **History** — list of past settled games; tap to reopen read-only.

Navigation is screen state in the store (no router needed for v1); deep-linking is not required.

## Settlement algorithm

Two steps, both pure functions.

1. **Net positions.** For each player: `netCents = finalChips × centsPerChip − sum(buyInsCents)`. Positive = owed money (winner); negative = owes money (loser). In a balanced game these sum to zero.

2. **Balance check.** Compare `totalCashedOut = sum(finalChips × rate)` against `totalBoughtIn = sum(all buyInsCents)`. If they differ, surface the gap (in dollars) as a warning banner — but still produce a settlement so the operator can eyeball it.

3. **Minimize payments.** Greedy match:
   - Build a list of debtors (negative net) and creditors (positive net).
   - Repeatedly take the largest debtor and largest creditor, create one payment of `min(|debt|, credit)`, decrement both, and drop anyone who reaches zero.
   - Produces at most *n − 1* payments for *n* players, typically far fewer.

   Output: `Transaction[]`, rendered as "**Alice pays Bob $14.50**".

## Error handling

- Cannot start a game with fewer than 2 players or a non-positive chip rate.
- Cannot settle until **every** player has a chip count entered.
- Negative or non-numeric values in money/chip fields are rejected at entry.
- "Reset / new game" confirms before clearing the active game.

## Testing

Unit tests for `money.ts` and `settlement.ts` covering:

- Simple 2-player game (one winner, one loser).
- Multi-winner / multi-loser game.
- Already-even game → zero payments.
- Unbalanced game → warning path still returns a settlement.
- Rounding edges: odd chip counts at `$0.25`/chip; verify cents-integer math never drifts.
- Minimize-payments produces ≤ *n − 1* transactions and every net is fully settled.

## Out of scope (v1 / YAGNI)

- Accounts, real-time multi-device sync, cloud history.
- Multiple chip denominations / colors.
- Mid-game cash-outs and partial leaves.
- Cross-game player stats / leaderboards.
- A routing library / deep links.

These are deliberately deferred. If shared real-time sessions are wanted later, the app would migrate from a static SPA to a backend-backed stack (e.g. Next.js + a database).

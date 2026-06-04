# Poker Settle

A mobile-friendly web app for settling home poker games among friends. Fixes two annoyances of existing apps: it lets you add **any** dollar amount to a player's stack (not just buy-in multiples) and has **no player cap**. At the end you enter each player's chip count and get a who-pays-who list with the fewest payments.

Full design: [docs/superpowers/specs/2026-06-03-poker-settle-design.md](docs/superpowers/specs/2026-06-03-poker-settle-design.md)

## Stack

- **Vite + React + TypeScript + Tailwind** — pure static SPA, no backend.
- State: React context + reducer, mirrored to `localStorage`.
- Deployed to **Vercel** as a static site.

## Architecture

All state lives in the browser. Two `localStorage` keys:

- `poker-settle:active` — the in-progress game (survives refresh).
- `poker-settle:history` — array of completed games.

Money/settlement logic lives in **pure functions** under `src/domain/` (no React, no storage) so it is unit-testable in isolation. The UI calls these functions; it does not embed money math.

```
src/
  domain/      # types.ts, money.ts, settlement.ts (+ tests) — pure logic
  store/       # gameStore.tsx — context + reducer + localStorage sync
  screens/     # Setup, Game, Settle, History
  components/   # shared UI (PlayerRow, MoneyInput, ...)
  App.tsx
```

## Core rules (do not break these)

- **All money is integer cents.** Never store or compute dollars as floats. Convert at the UI edge only. This avoids `0.1 + 0.2` rounding bugs.
- **Each buy-in is its own array entry** (`buyInsCents: number[]`) — preserves an ordered audit trail; do not collapse into a single total field.
- **Settlement is two pure steps:** net positions, then greedy minimize-payments (match largest debtor with largest creditor). Output ≤ n−1 transactions for n players.
- **Balance check is a warning, not a blocker.** If cashed-out ≠ bought-in, warn but still produce a settlement.

## Conventions

- Domain logic stays framework-free in `src/domain/`. If you're importing React into a `domain/` file, it's in the wrong place.
- Co-locate tests as `*.test.ts` next to the code (Vitest).
- Validate input at entry: reject negative/non-numeric money and chip values; require ≥2 players and a positive chip rate to start; require every player to have a chip count before settling.

## Commands

```
npm install
npm run dev        # local dev server
npm run test       # Vitest unit tests
npm run build      # production static build
npm run preview    # preview the build locally
```

## Scope (v1)

Single device, one operator. **Out of scope:** accounts, real-time multi-device sync, cloud history, multiple chip denominations, mid-game cash-outs, cross-game stats. Defer these unless explicitly requested.

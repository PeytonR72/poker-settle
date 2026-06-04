# Poker Settle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly, client-only web app that tracks arbitrary poker buy-ins for any number of players and computes a minimized who-pays-who settlement from final chip counts.

**Architecture:** Static React SPA. Pure, framework-free domain logic (`src/domain/`) handles all money math in integer cents and the settlement algorithm. A React context+reducer store (`src/store/`) holds game state and mirrors it to `localStorage`. Four screens drive the flow: Setup → Game → Settle → History.

**Tech Stack:** Vite + React + TypeScript + Tailwind CSS v4 + Vitest. Deployed to Vercel as a static site.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/domain/types.ts` | `Player`, `Game`, `Transaction`, `Settlement` types |
| `src/domain/money.ts` | dollars↔cents parsing/formatting, summing |
| `src/domain/money.test.ts` | money helper tests |
| `src/domain/settlement.ts` | net positions, balance check, minimize-payments |
| `src/domain/settlement.test.ts` | settlement tests |
| `src/store/gameStore.tsx` | context, reducer, localStorage sync, screen nav |
| `src/store/gameStore.test.ts` | reducer tests |
| `src/components/MoneyInput.tsx` | validated dollar text input |
| `src/components/PlayerRow.tsx` | one roster row (name + total in + add control) |
| `src/screens/SetupScreen.tsx` | name game, set $/chip, add starting players |
| `src/screens/GameScreen.tsx` | live roster, add buy-ins, add players mid-game |
| `src/screens/SettleScreen.tsx` | enter chip counts, show settlement |
| `src/screens/HistoryScreen.tsx` | list/reopen past games |
| `src/App.tsx` | screen switcher |
| `src/main.tsx` | React root + store provider |
| `src/index.css` | Tailwind import |

---

## Task 1: Scaffold the project

**Files:**
- Create: project scaffold via Vite, `vite.config.ts`, `src/index.css`, `package.json` scripts

- [ ] **Step 1: Scaffold Vite React-TS app into the current directory**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
If prompted that the directory is not empty, choose "Ignore files and continue". Expected: `src/`, `index.html`, `package.json`, `vite.config.ts` created.

- [ ] **Step 2: Install dependencies (runtime + tooling)**

Run:
```bash
npm install
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
```
Expected: installs complete with no errors.

- [ ] **Step 3: Configure Vite with Tailwind v4 plugin and Vitest**

Replace `vite.config.ts` with:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
  },
});
```

- [ ] **Step 4: Add Tailwind import and test setup**

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

Create `src/test-setup.ts`:
```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Add the test script**

In `package.json`, add to the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Verify the scaffold builds and tests run**

Run:
```bash
npm run build
npm run test
```
Expected: build succeeds; `vitest` reports "No test files found" (acceptable at this stage).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Write the types**

Create `src/domain/types.ts`:
```ts
export type Player = {
  id: string;
  name: string;
  buyInsCents: number[]; // each add is its own entry (ordered audit trail)
  finalChips: number | null; // chip count entered at settle
};

export type Game = {
  id: string;
  name: string;
  centsPerChip: number; // e.g. 25 = $0.25 per chip
  players: Player[];
  status: "active" | "settled";
  createdAt: number;
  settledAt: number | null;
};

export type Transaction = {
  fromId: string;
  toId: string;
  amountCents: number;
};

export type Settlement = {
  netCentsByPlayerId: Record<string, number>;
  totalBoughtInCents: number;
  totalCashedOutCents: number;
  isBalanced: boolean;
  imbalanceCents: number; // cashedOut - boughtIn (0 when balanced)
  transactions: Transaction[];
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add domain types"
```

---

## Task 3: Money helpers (TDD)

**Files:**
- Create: `src/domain/money.ts`
- Test: `src/domain/money.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/domain/money.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseDollarsToCents, formatCents, sumCents } from "./money";

describe("parseDollarsToCents", () => {
  it("parses whole dollars", () => {
    expect(parseDollarsToCents("20")).toBe(2000);
  });
  it("parses dollars and cents", () => {
    expect(parseDollarsToCents("12.34")).toBe(1234);
  });
  it("parses a leading-dot value", () => {
    expect(parseDollarsToCents(".5")).toBe(50);
  });
  it("rounds to the nearest cent", () => {
    expect(parseDollarsToCents("0.125")).toBe(13);
  });
  it("tolerates surrounding whitespace and $", () => {
    expect(parseDollarsToCents(" $10 ")).toBe(1000);
  });
  it("returns null for empty input", () => {
    expect(parseDollarsToCents("")).toBeNull();
  });
  it("returns null for non-numeric input", () => {
    expect(parseDollarsToCents("abc")).toBeNull();
  });
  it("returns null for negative input", () => {
    expect(parseDollarsToCents("-5")).toBeNull();
  });
});

describe("formatCents", () => {
  it("formats whole dollars", () => {
    expect(formatCents(2000)).toBe("$20.00");
  });
  it("formats cents", () => {
    expect(formatCents(1234)).toBe("$12.34");
  });
  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });
  it("formats negative values", () => {
    expect(formatCents(-150)).toBe("-$1.50");
  });
});

describe("sumCents", () => {
  it("sums an array", () => {
    expect(sumCents([1000, 500, 250])).toBe(1750);
  });
  it("sums an empty array to zero", () => {
    expect(sumCents([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/money.test.ts`
Expected: FAIL — cannot resolve `./money`.

- [ ] **Step 3: Implement money helpers**

Create `src/domain/money.ts`:
```ts
/** Parse a user-entered dollar string to integer cents. Returns null if invalid or negative. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "");
  if (cleaned === "") return null;
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

/** Format integer cents as a dollar string, e.g. 1234 -> "$12.34", -150 -> "-$1.50". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, "0");
  return `${sign}$${dollars}.${remainder}`;
}

/** Sum an array of integer cents. */
export function sumCents(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/money.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/money.ts src/domain/money.test.ts
git commit -m "feat: add cents-based money helpers"
```

---

## Task 4: Settlement algorithm (TDD)

**Files:**
- Create: `src/domain/settlement.ts`
- Test: `src/domain/settlement.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/domain/settlement.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeSettlement } from "./settlement";
import type { Player } from "./types";

function player(id: string, buyIns: number[], finalChips: number | null): Player {
  return { id, name: id, buyInsCents: buyIns, finalChips };
}

describe("computeSettlement", () => {
  it("settles a simple two-player game in one payment", () => {
    // $0.25/chip. Alice bought $20 (2000c), ends 40 chips = $10. Net -$10.
    // Bob bought $20, ends 120 chips = $30. Net +$10.
    const players = [player("alice", [2000], 40), player("bob", [2000], 120)];
    const s = computeSettlement(players, 25);
    expect(s.netCentsByPlayerId).toEqual({ alice: -1000, bob: 1000 });
    expect(s.isBalanced).toBe(true);
    expect(s.transactions).toEqual([{ fromId: "alice", toId: "bob", amountCents: 1000 }]);
  });

  it("handles multiple buy-ins (arbitrary add-ons) per player", () => {
    // Alice: $20 + $10 = $30 in; ends 80 chips = $20. Net -$10.
    // Bob: $20 in; ends 120 chips = $30. Net +$10.
    const players = [player("alice", [2000, 1000], 80), player("bob", [2000], 120)];
    const s = computeSettlement(players, 25);
    expect(s.netCentsByPlayerId).toEqual({ alice: -1000, bob: 1000 });
    expect(s.transactions).toEqual([{ fromId: "alice", toId: "bob", amountCents: 1000 }]);
  });

  it("minimizes payments across multiple winners and losers", () => {
    // Rate 100c/chip ($1). Buy-ins $10 each (1000c).
    // a ends 0 -> -1000, b ends 5 -> -500, c ends 25 -> +1500, d ends 10 -> 0
    const players = [
      player("a", [1000], 0),
      player("b", [1000], 5),
      player("c", [1000], 25),
      player("d", [1000], 10),
    ];
    const s = computeSettlement(players, 100);
    expect(s.netCentsByPlayerId).toEqual({ a: -1000, b: -500, c: 1500, d: 0 });
    expect(s.isBalanced).toBe(true);
    // a and b both owe c; d is even. Two payments, both to c.
    expect(s.transactions).toHaveLength(2);
    const totalToC = s.transactions
      .filter((t) => t.toId === "c")
      .reduce((sum, t) => sum + t.amountCents, 0);
    expect(totalToC).toBe(1500);
  });

  it("returns zero transactions for an already-even game", () => {
    const players = [player("a", [1000], 10), player("b", [1000], 10)];
    const s = computeSettlement(players, 100);
    expect(s.transactions).toEqual([]);
    expect(s.isBalanced).toBe(true);
  });

  it("flags an unbalanced game but still settles", () => {
    // Total in = $20. Cashed out: a=$5, b=$10 => $15. Imbalance -$5.
    const players = [player("a", [1000], 5), player("b", [1000], 10)];
    const s = computeSettlement(players, 100);
    expect(s.totalBoughtInCents).toBe(2000);
    expect(s.totalCashedOutCents).toBe(1500);
    expect(s.isBalanced).toBe(false);
    expect(s.imbalanceCents).toBe(-500);
    // Still produces a settlement against actual nets.
    expect(s.transactions).toHaveLength(1);
  });

  it("treats null finalChips as zero chips", () => {
    const players = [player("a", [1000], null), player("b", [1000], 20)];
    const s = computeSettlement(players, 100);
    expect(s.netCentsByPlayerId.a).toBe(-1000);
    expect(s.netCentsByPlayerId.b).toBe(1000);
  });

  it("produces at most n-1 transactions and fully settles every net", () => {
    const players = [
      player("a", [1000], 0),
      player("b", [1000], 0),
      player("c", [1000], 0),
      player("d", [1000], 40),
    ];
    const s = computeSettlement(players, 100);
    expect(s.transactions.length).toBeLessThanOrEqual(players.length - 1);
    // Reconstruct nets from transactions; they must cancel the original nets.
    const recovered: Record<string, number> = {};
    for (const p of players) recovered[p.id] = 0;
    for (const t of s.transactions) {
      recovered[t.fromId] -= t.amountCents;
      recovered[t.toId] += t.amountCents;
    }
    for (const p of players) {
      expect(recovered[p.id]).toBe(s.netCentsByPlayerId[p.id]);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/settlement.test.ts`
Expected: FAIL — cannot resolve `./settlement`.

- [ ] **Step 3: Implement the settlement logic**

Create `src/domain/settlement.ts`:
```ts
import type { Player, Settlement, Transaction } from "./types";
import { sumCents } from "./money";

/** Compute net positions, balance check, and a minimized payment list. */
export function computeSettlement(players: Player[], centsPerChip: number): Settlement {
  const netCentsByPlayerId: Record<string, number> = {};
  let totalBoughtInCents = 0;
  let totalCashedOutCents = 0;

  for (const p of players) {
    const inCents = sumCents(p.buyInsCents);
    const chips = p.finalChips ?? 0;
    const outCents = chips * centsPerChip;
    netCentsByPlayerId[p.id] = outCents - inCents;
    totalBoughtInCents += inCents;
    totalCashedOutCents += outCents;
  }

  const imbalanceCents = totalCashedOutCents - totalBoughtInCents;
  const isBalanced = imbalanceCents === 0;

  return {
    netCentsByPlayerId,
    totalBoughtInCents,
    totalCashedOutCents,
    isBalanced,
    imbalanceCents,
    transactions: minimizePayments(netCentsByPlayerId),
  };
}

/** Greedy minimize-payments: match largest debtor with largest creditor. */
function minimizePayments(netByPlayerId: Record<string, number>): Transaction[] {
  const debtors = Object.entries(netByPlayerId)
    .filter(([, net]) => net < 0)
    .map(([id, net]) => ({ id, amount: -net })); // amount owed (positive)
  const creditors = Object.entries(netByPlayerId)
    .filter(([, net]) => net > 0)
    .map(([id, net]) => ({ id, amount: net }));

  // Largest first so we clear big balances quickly.
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      transactions.push({ fromId: debtors[i].id, toId: creditors[j].id, amountCents: pay });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transactions;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/settlement.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/settlement.ts src/domain/settlement.test.ts
git commit -m "feat: add net positions and minimize-payments settlement"
```

---

## Task 5: Game store (reducer + localStorage)

**Files:**
- Create: `src/store/gameStore.tsx`
- Test: `src/store/gameStore.test.ts`

- [ ] **Step 1: Write the failing reducer tests**

Create `src/store/gameStore.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { gameReducer, createGame, type AppState } from "./gameStore";

function activeState(): AppState {
  return {
    screen: "game",
    activeGame: createGame("Friday", 25, ["Alice", "Bob"]),
    history: [],
  };
}

describe("createGame", () => {
  it("creates an active game with players and unique ids", () => {
    const g = createGame("Friday", 25, ["Alice", "Bob"]);
    expect(g.name).toBe("Friday");
    expect(g.centsPerChip).toBe(25);
    expect(g.status).toBe("active");
    expect(g.players).toHaveLength(2);
    expect(g.players[0].id).not.toBe(g.players[1].id);
    expect(g.players[0].buyInsCents).toEqual([]);
    expect(g.players[0].finalChips).toBeNull();
  });
});

describe("gameReducer", () => {
  it("adds a buy-in to a player", () => {
    const state = activeState();
    const id = state.activeGame!.players[0].id;
    const next = gameReducer(state, { type: "ADD_BUYIN", playerId: id, cents: 1000 });
    expect(next.activeGame!.players[0].buyInsCents).toEqual([1000]);
  });

  it("adds a player mid-game", () => {
    const state = activeState();
    const next = gameReducer(state, { type: "ADD_PLAYER", name: "Cara" });
    expect(next.activeGame!.players).toHaveLength(3);
    expect(next.activeGame!.players[2].name).toBe("Cara");
  });

  it("sets a player's final chip count", () => {
    const state = activeState();
    const id = state.activeGame!.players[1].id;
    const next = gameReducer(state, { type: "SET_FINAL_CHIPS", playerId: id, chips: 80 });
    expect(next.activeGame!.players[1].finalChips).toBe(80);
  });

  it("settles a game: moves it to history and clears active", () => {
    const state = activeState();
    const next = gameReducer(state, { type: "SETTLE_GAME" });
    expect(next.activeGame).toBeNull();
    expect(next.history).toHaveLength(1);
    expect(next.history[0].status).toBe("settled");
    expect(next.history[0].settledAt).not.toBeNull();
    expect(next.screen).toBe("history");
  });

  it("navigates between screens", () => {
    const state = activeState();
    const next = gameReducer(state, { type: "NAVIGATE", screen: "settle" });
    expect(next.screen).toBe("settle");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: FAIL — cannot resolve `./gameStore`.

- [ ] **Step 3: Implement the store**

Create `src/store/gameStore.tsx`:
```tsx
import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import type { Game } from "../domain/types";

const ACTIVE_KEY = "poker-settle:active";
const HISTORY_KEY = "poker-settle:history";

export type Screen = "setup" | "game" | "settle" | "history";

export type AppState = {
  screen: Screen;
  activeGame: Game | null;
  history: Game[];
};

export type Action =
  | { type: "NAVIGATE"; screen: Screen }
  | { type: "START_GAME"; name: string; centsPerChip: number; playerNames: string[] }
  | { type: "ADD_PLAYER"; name: string }
  | { type: "ADD_BUYIN"; playerId: string; cents: number }
  | { type: "SET_FINAL_CHIPS"; playerId: string; chips: number }
  | { type: "SETTLE_GAME" }
  | { type: "DISCARD_GAME" };

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createGame(name: string, centsPerChip: number, playerNames: string[]): Game {
  return {
    id: uid(),
    name,
    centsPerChip,
    status: "active",
    createdAt: Date.now(),
    settledAt: null,
    players: playerNames.map((n) => ({
      id: uid(),
      name: n,
      buyInsCents: [],
      finalChips: null,
    })),
  };
}

function mapActive(state: AppState, fn: (g: Game) => Game): AppState {
  if (!state.activeGame) return state;
  return { ...state, activeGame: fn(state.activeGame) };
}

export function gameReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "NAVIGATE":
      return { ...state, screen: action.screen };

    case "START_GAME":
      return {
        ...state,
        activeGame: createGame(action.name, action.centsPerChip, action.playerNames),
        screen: "game",
      };

    case "ADD_PLAYER":
      return mapActive(state, (g) => ({
        ...g,
        players: [...g.players, { id: uid(), name: action.name, buyInsCents: [], finalChips: null }],
      }));

    case "ADD_BUYIN":
      return mapActive(state, (g) => ({
        ...g,
        players: g.players.map((p) =>
          p.id === action.playerId ? { ...p, buyInsCents: [...p.buyInsCents, action.cents] } : p,
        ),
      }));

    case "SET_FINAL_CHIPS":
      return mapActive(state, (g) => ({
        ...g,
        players: g.players.map((p) =>
          p.id === action.playerId ? { ...p, finalChips: action.chips } : p,
        ),
      }));

    case "SETTLE_GAME": {
      if (!state.activeGame) return state;
      const settled: Game = {
        ...state.activeGame,
        status: "settled",
        settledAt: Date.now(),
      };
      return {
        screen: "history",
        activeGame: null,
        history: [settled, ...state.history],
      };
    }

    case "DISCARD_GAME":
      return { ...state, activeGame: null, screen: "setup" };

    default:
      return state;
  }
}

function loadInitialState(): AppState {
  let activeGame: Game | null = null;
  let history: Game[] = [];
  try {
    const a = localStorage.getItem(ACTIVE_KEY);
    if (a) activeGame = JSON.parse(a) as Game;
    const h = localStorage.getItem(HISTORY_KEY);
    if (h) history = JSON.parse(h) as Game[];
  } catch {
    // Corrupt storage: start fresh.
  }
  return { screen: activeGame ? "game" : "setup", activeGame, history };
}

const StoreContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(
  null,
);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      if (state.activeGame) localStorage.setItem(ACTIVE_KEY, JSON.stringify(state.activeGame));
      else localStorage.removeItem(ACTIVE_KEY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    } catch {
      // Ignore quota/serialization errors.
    }
  }, [state.activeGame, state.history]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within GameProvider");
  return ctx;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.tsx src/store/gameStore.test.ts
git commit -m "feat: add game store with reducer and localStorage sync"
```

---

## Task 6: MoneyInput component

**Files:**
- Create: `src/components/MoneyInput.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/MoneyInput.tsx`:
```tsx
import { useState } from "react";
import { parseDollarsToCents } from "../domain/money";

type Props = {
  placeholder?: string;
  buttonLabel: string;
  onSubmit: (cents: number) => void;
};

/** A dollar-amount text field with inline validation. Calls onSubmit with integer cents. */
export function MoneyInput({ placeholder = "0.00", buttonLabel, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const cents = parseDollarsToCents(value);
    if (cents === null || cents === 0) {
      setError("Enter a positive dollar amount");
      return;
    }
    onSubmit(cents);
    setValue("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          className="w-24 rounded border border-gray-300 px-2 py-1"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          type="button"
          className="rounded bg-emerald-600 px-3 py-1 text-white"
          onClick={submit}
        >
          {buttonLabel}
        </button>
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/MoneyInput.tsx
git commit -m "feat: add validated MoneyInput component"
```

---

## Task 7: Setup screen

**Files:**
- Create: `src/screens/SetupScreen.tsx`

- [ ] **Step 1: Implement the screen**

Create `src/screens/SetupScreen.tsx`:
```tsx
import { useState } from "react";
import { useStore } from "../store/gameStore";
import { parseDollarsToCents } from "../domain/money";

export function SetupScreen() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addPlayer() {
    const trimmed = playerName.trim();
    if (!trimmed) return;
    setPlayers((prev) => [...prev, trimmed]);
    setPlayerName("");
  }

  function start() {
    const centsPerChip = parseDollarsToCents(rate);
    if (!name.trim()) return setError("Name the game");
    if (centsPerChip === null || centsPerChip <= 0) return setError("Enter a positive cost per chip");
    if (players.length < 2) return setError("Add at least 2 players");
    dispatch({
      type: "START_GAME",
      name: name.trim(),
      centsPerChip,
      playerNames: players,
    });
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">New Game</h1>

      <label className="mb-3 block">
        <span className="text-sm text-gray-600">Game name</span>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday night"
        />
      </label>

      <label className="mb-3 block">
        <span className="text-sm text-gray-600">Cost per chip ($)</span>
        <input
          inputMode="decimal"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="0.25"
        />
      </label>

      <div className="mb-3">
        <span className="text-sm text-gray-600">Players</span>
        <div className="mt-1 flex gap-2">
          <input
            className="flex-1 rounded border border-gray-300 px-2 py-1"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="Player name"
          />
          <button type="button" className="rounded bg-gray-200 px-3 py-1" onClick={addPlayer}>
            Add
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {players.map((p, i) => (
            <li key={i} className="rounded bg-gray-100 px-2 py-1">
              {p}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" className="rounded bg-emerald-600 px-4 py-2 text-white" onClick={start}>
          Start game
        </button>
        {state.history.length > 0 && (
          <button
            type="button"
            className="rounded bg-gray-200 px-4 py-2"
            onClick={() => dispatch({ type: "NAVIGATE", screen: "history" })}
          >
            History
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SetupScreen.tsx
git commit -m "feat: add setup screen"
```

---

## Task 8: Game screen

**Files:**
- Create: `src/screens/GameScreen.tsx`

- [ ] **Step 1: Implement the screen**

Create `src/screens/GameScreen.tsx`:
```tsx
import { useState } from "react";
import { useStore } from "../store/gameStore";
import { formatCents, sumCents } from "../domain/money";
import { MoneyInput } from "../components/MoneyInput";

export function GameScreen() {
  const { state, dispatch } = useStore();
  const game = state.activeGame;
  const [newPlayer, setNewPlayer] = useState("");

  if (!game) return null;

  const totalPot = sumCents(game.players.flatMap((p) => p.buyInsCents));

  function addPlayer() {
    const trimmed = newPlayer.trim();
    if (!trimmed) return;
    dispatch({ type: "ADD_PLAYER", name: trimmed });
    setNewPlayer("");
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{game.name}</h1>
        <span className="text-sm text-gray-600">{formatCents(game.centsPerChip)}/chip</span>
      </div>
      <p className="mb-4 text-sm text-gray-600">Pot: {formatCents(totalPot)}</p>

      <ul className="space-y-3">
        {game.players.map((p) => (
          <li key={p.id} className="rounded border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{p.name}</span>
              <span className="text-gray-700">in: {formatCents(sumCents(p.buyInsCents))}</span>
            </div>
            <MoneyInput
              buttonLabel="+ add"
              onSubmit={(cents) => dispatch({ type: "ADD_BUYIN", playerId: p.id, cents })}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded border border-gray-300 px-2 py-1"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          placeholder="Add player mid-game"
        />
        <button type="button" className="rounded bg-gray-200 px-3 py-1" onClick={addPlayer}>
          Add
        </button>
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded bg-emerald-600 px-4 py-2 text-white"
        onClick={() => dispatch({ type: "NAVIGATE", screen: "settle" })}
      >
        Settle up
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/GameScreen.tsx
git commit -m "feat: add game screen with buy-ins and mid-game players"
```

---

## Task 9: Settle screen

**Files:**
- Create: `src/screens/SettleScreen.tsx`

- [ ] **Step 1: Implement the screen**

Create `src/screens/SettleScreen.tsx`:
```tsx
import { useStore } from "../store/gameStore";
import { computeSettlement } from "../domain/settlement";
import { formatCents } from "../domain/money";

export function SettleScreen() {
  const { state, dispatch } = useStore();
  const game = state.activeGame;
  if (!game) return null;

  const allChipsEntered = game.players.every((p) => p.finalChips !== null);
  const settlement = computeSettlement(game.players, game.centsPerChip);

  const nameById = Object.fromEntries(game.players.map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">Settle: {game.name}</h1>

      <ul className="space-y-3">
        {game.players.map((p) => {
          const net = settlement.netCentsByPlayerId[p.id];
          return (
            <li key={p.id} className="rounded border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                <span className={net >= 0 ? "text-emerald-700" : "text-red-600"}>
                  {formatCents(net)}
                </span>
              </div>
              <label className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-600">Final chips</span>
                <input
                  inputMode="numeric"
                  className="w-24 rounded border border-gray-300 px-2 py-1"
                  value={p.finalChips ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === "") return; // leave as-is until a number is typed
                    const chips = Number(raw);
                    if (Number.isInteger(chips) && chips >= 0) {
                      dispatch({ type: "SET_FINAL_CHIPS", playerId: p.id, chips });
                    }
                  }}
                  placeholder="0"
                />
              </label>
            </li>
          );
        })}
      </ul>

      {!settlement.isBalanced && (
        <p className="mt-4 rounded bg-amber-100 p-2 text-sm text-amber-800">
          Books don't balance: cashed out is {formatCents(settlement.imbalanceCents)} vs bought in.
          Someone may have miscounted chips.
        </p>
      )}

      <h2 className="mt-6 mb-2 text-lg font-semibold">Payments</h2>
      {!allChipsEntered ? (
        <p className="text-sm text-gray-600">Enter every player's chip count to see payments.</p>
      ) : settlement.transactions.length === 0 ? (
        <p className="text-sm text-gray-600">All square — no payments needed.</p>
      ) : (
        <ul className="space-y-1">
          {settlement.transactions.map((t, i) => (
            <li key={i} className="rounded bg-gray-100 px-2 py-1">
              <span className="font-medium">{nameById[t.fromId]}</span> pays{" "}
              <span className="font-medium">{nameById[t.toId]}</span>{" "}
              <span className="font-semibold">{formatCents(t.amountCents)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className="rounded bg-gray-200 px-4 py-2"
          onClick={() => dispatch({ type: "NAVIGATE", screen: "game" })}
        >
          Back
        </button>
        <button
          type="button"
          disabled={!allChipsEntered}
          className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={() => dispatch({ type: "SETTLE_GAME" })}
        >
          Save to history
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettleScreen.tsx
git commit -m "feat: add settle screen with chip entry and payment list"
```

---

## Task 10: History screen

**Files:**
- Create: `src/screens/HistoryScreen.tsx`

- [ ] **Step 1: Implement the screen**

Create `src/screens/HistoryScreen.tsx`:
```tsx
import { useState } from "react";
import { useStore } from "../store/gameStore";
import { computeSettlement } from "../domain/settlement";
import { formatCents } from "../domain/money";

export function HistoryScreen() {
  const { state, dispatch } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">History</h1>
        <button
          type="button"
          className="rounded bg-emerald-600 px-3 py-1 text-white"
          onClick={() => dispatch({ type: "NAVIGATE", screen: state.activeGame ? "game" : "setup" })}
        >
          {state.activeGame ? "Back to game" : "New game"}
        </button>
      </div>

      {state.history.length === 0 ? (
        <p className="text-sm text-gray-600">No settled games yet.</p>
      ) : (
        <ul className="space-y-2">
          {state.history.map((g) => {
            const settlement = computeSettlement(g.players, g.centsPerChip);
            const nameById = Object.fromEntries(g.players.map((p) => [p.id, p.name]));
            const isOpen = openId === g.id;
            return (
              <li key={g.id} className="rounded border border-gray-200">
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-3 text-left"
                  onClick={() => setOpenId(isOpen ? null : g.id)}
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="text-sm text-gray-600">
                    {g.settledAt ? new Date(g.settledAt).toLocaleDateString() : ""}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-200 p-3">
                    {settlement.transactions.length === 0 ? (
                      <p className="text-sm text-gray-600">All square.</p>
                    ) : (
                      <ul className="space-y-1">
                        {settlement.transactions.map((t, i) => (
                          <li key={i} className="text-sm">
                            {nameById[t.fromId]} pays {nameById[t.toId]} {formatCents(t.amountCents)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/HistoryScreen.tsx
git commit -m "feat: add history screen"
```

---

## Task 11: Wire up App and root

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace App with the screen switcher**

Replace `src/App.tsx`:
```tsx
import { useStore } from "./store/gameStore";
import { SetupScreen } from "./screens/SetupScreen";
import { GameScreen } from "./screens/GameScreen";
import { SettleScreen } from "./screens/SettleScreen";
import { HistoryScreen } from "./screens/HistoryScreen";

export default function App() {
  const { state } = useStore();
  switch (state.screen) {
    case "game":
      return <GameScreen />;
    case "settle":
      return <SettleScreen />;
    case "history":
      return <HistoryScreen />;
    case "setup":
    default:
      return <SetupScreen />;
  }
}
```

- [ ] **Step 2: Wrap the root in GameProvider**

Replace `src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GameProvider } from "./store/gameStore";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
```

- [ ] **Step 3: Verify full build and tests**

Run:
```bash
npx tsc --noEmit
npm run test
npm run build
```
Expected: type-check clean, all tests pass, build succeeds.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open the local URL. Verify: create a game with 3 players and $0.25/chip; add uneven buy-ins (e.g. $20, $10, $37) to different players; add a 4th player mid-game; go to Settle, enter chip counts; confirm the payment list appears and the balance warning shows when chips don't add up; save to history and reopen it. Then stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire up app screens and store provider"
```

---

## Task 12: Vercel deploy config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Add SPA config**

Create `vercel.json`:
```json
{
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel static SPA config"
```

- [ ] **Step 3: Deploy (operator action)**

Run: `npx vercel --prod` (requires a logged-in Vercel account; follow the CLI prompts). Expected: a production URL is printed. This step is performed by the operator when ready to share.

---

## Self-Review Notes

- **Spec coverage:** arbitrary buy-in amounts (Task 8 `MoneyInput` → `ADD_BUYIN`), no player cap (Task 8 add-player), add player mid-game (Task 8), chip-count settle (Task 9), minimize-payments (Task 4), balance warning (Tasks 4 + 9), localStorage active + history (Task 5), history reopen (Task 10), Vercel deploy (Task 12). All covered.
- **Types:** `Player`, `Game`, `Transaction`, `Settlement` defined in Task 2 and used consistently; action names match between store (Task 5) and screens (Tasks 7–9).
- **No placeholders:** every code step contains full code; every run step has an expected result.

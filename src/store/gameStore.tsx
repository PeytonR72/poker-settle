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

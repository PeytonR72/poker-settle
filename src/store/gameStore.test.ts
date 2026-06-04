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

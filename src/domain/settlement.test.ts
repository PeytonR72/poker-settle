import { describe, it, expect } from "vitest";
import { computeSettlement } from "./settlement";
import type { Player } from "./types";

function player(id: string, buyIns: number[], finalChips: number | null): Player {
  return { id, name: id, buyInsCents: buyIns, finalChips };
}

describe("computeSettlement", () => {
  it("settles a simple two-player game in one payment", () => {
    const players = [player("alice", [2000], 40), player("bob", [2000], 120)];
    const s = computeSettlement(players, 25);
    expect(s.netCentsByPlayerId).toEqual({ alice: -1000, bob: 1000 });
    expect(s.isBalanced).toBe(true);
    expect(s.transactions).toEqual([{ fromId: "alice", toId: "bob", amountCents: 1000 }]);
  });

  it("handles multiple buy-ins (arbitrary add-ons) per player", () => {
    const players = [player("alice", [2000, 1000], 80), player("bob", [2000], 120)];
    const s = computeSettlement(players, 25);
    expect(s.netCentsByPlayerId).toEqual({ alice: -1000, bob: 1000 });
    expect(s.transactions).toEqual([{ fromId: "alice", toId: "bob", amountCents: 1000 }]);
  });

  it("minimizes payments across multiple winners and losers", () => {
    const players = [
      player("a", [1000], 0),
      player("b", [1000], 5),
      player("c", [1000], 25),
      player("d", [1000], 10),
    ];
    const s = computeSettlement(players, 100);
    expect(s.netCentsByPlayerId).toEqual({ a: -1000, b: -500, c: 1500, d: 0 });
    expect(s.isBalanced).toBe(true);
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
    // Total in = $20. Cashed out: a=$5 (5 chips), b=$20 (20 chips) => $25. Imbalance +$5.
    const players = [player("a", [1000], 5), player("b", [1000], 20)];
    const s = computeSettlement(players, 100);
    expect(s.totalBoughtInCents).toBe(2000);
    expect(s.totalCashedOutCents).toBe(2500);
    expect(s.isBalanced).toBe(false);
    expect(s.imbalanceCents).toBe(500);
    // a owes 500, b is owed 1000; one payment of 500.
    expect(s.transactions).toHaveLength(1);
    expect(s.transactions[0]).toEqual({ fromId: "a", toId: "b", amountCents: 500 });
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

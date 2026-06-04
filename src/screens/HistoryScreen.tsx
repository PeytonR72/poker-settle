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
          className="min-h-11 rounded bg-emerald-600 px-3 py-2 text-base text-white"
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
                  className="flex min-h-11 w-full items-center justify-between p-3 text-left text-base"
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

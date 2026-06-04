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
                  className="min-h-11 w-24 rounded border border-gray-300 px-2 py-2 text-base"
                  value={p.finalChips ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === "") return;
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
            <li key={i} className="rounded bg-gray-100 px-2 py-2 text-base">
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
          className="min-h-11 rounded bg-gray-200 px-4 py-3 text-base"
          onClick={() => dispatch({ type: "NAVIGATE", screen: "game" })}
        >
          Back
        </button>
        <button
          type="button"
          disabled={!allChipsEntered}
          className="min-h-11 rounded bg-emerald-600 px-4 py-3 text-base text-white disabled:opacity-50"
          onClick={() => dispatch({ type: "SETTLE_GAME" })}
        >
          Save to history
        </button>
      </div>
    </div>
  );
}

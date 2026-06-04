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
          className="min-h-11 flex-1 rounded border border-gray-300 px-2 py-2 text-base"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          placeholder="Add player mid-game"
        />
        <button type="button" className="min-h-11 rounded bg-gray-200 px-3 py-2 text-base" onClick={addPlayer}>
          Add
        </button>
      </div>

      <button
        type="button"
        className="mt-6 min-h-11 w-full rounded bg-emerald-600 px-4 py-3 text-base text-white"
        onClick={() => dispatch({ type: "NAVIGATE", screen: "settle" })}
      >
        Settle up
      </button>
    </div>
  );
}

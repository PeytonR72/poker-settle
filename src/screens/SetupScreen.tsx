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

      <label className="mb-4 block">
        <span className="text-sm text-gray-600">Game name</span>
        <input
          className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 py-2 text-base"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Friday night"
        />
      </label>

      <label className="mb-4 block">
        <span className="text-sm text-gray-600">Cost per chip ($)</span>
        <input
          inputMode="decimal"
          className="mt-1 min-h-11 w-full rounded border border-gray-300 px-2 py-2 text-base"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="0.25"
        />
      </label>

      <div className="mb-4">
        <span className="text-sm text-gray-600">Players</span>
        <div className="mt-1 flex gap-2">
          <input
            className="min-h-11 flex-1 rounded border border-gray-300 px-2 py-2 text-base"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="Player name"
          />
          <button type="button" className="min-h-11 rounded bg-gray-200 px-3 py-2 text-base" onClick={addPlayer}>
            Add
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {players.map((p, i) => (
            <li key={i} className="rounded bg-gray-100 px-2 py-2 text-base">
              {p}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" className="min-h-11 rounded bg-emerald-600 px-4 py-3 text-base text-white" onClick={start}>
          Start game
        </button>
        {state.history.length > 0 && (
          <button
            type="button"
            className="min-h-11 rounded bg-gray-200 px-4 py-3 text-base"
            onClick={() => dispatch({ type: "NAVIGATE", screen: "history" })}
          >
            History
          </button>
        )}
      </div>
    </div>
  );
}

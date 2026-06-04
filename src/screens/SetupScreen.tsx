import { useState } from "react";
import { useStore } from "../store/gameStore";
import { parseDollarsToCents } from "../domain/money";
import { ArrowRightIcon, PlusIcon, TrashIcon, ClockIcon } from "../components/icons";

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
    if (error) setError(null);
  }

  function removePlayer(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  function start() {
    const centsPerChip = parseDollarsToCents(rate);
    if (!name.trim()) return setError("Give the game a name");
    if (centsPerChip === null || centsPerChip <= 0) return setError("Enter a positive cost per chip");
    if (players.length < 2) return setError("Add at least 2 players");
    dispatch({ type: "START_GAME", name: name.trim(), centsPerChip, playerNames: players });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-14">
      {/* Brand */}
      <header className="rise mb-8 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <div
            className="absolute inset-0 -z-10 blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(79,157,255,0.5), transparent 70%)" }}
          />
          <img
            src="/3-cards-icon.png"
            alt=""
            className="h-24 w-24 drop-shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
          />
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          Poker Settle
        </h1>
        <p className="mt-1.5 text-ink-soft">Settle up in seconds</p>
      </header>

      {/* Form */}
      <div className="rise glass space-y-5 rounded-3xl p-5" style={{ animationDelay: "60ms" }}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">Game name</label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday night"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">Cost per chip</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">$</span>
            <input
              inputMode="decimal"
              className="field tnum pl-8"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.25"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">
            Players <span className="text-ink-faint">· {players.length}</span>
          </label>
          <div className="flex gap-2">
            <input
              className="field flex-1"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Add a player"
            />
            <button
              type="button"
              onClick={addPlayer}
              aria-label="Add player"
              className="icon-btn shrink-0"
              style={{ width: "3.25rem", height: "3.25rem", borderRadius: "1rem" }}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {players.length > 0 && (
            <ul className="mt-3 space-y-2">
              {players.map((p, i) => (
                <li
                  key={i}
                  className="glass-soft flex items-center justify-between rounded-2xl py-2.5 pl-3 pr-2"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                      {p.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium text-ink">{p}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removePlayer(i)}
                    aria-label={`Remove ${p}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition active:bg-white/10 active:text-neg"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-neg">{error}</p>}
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <button type="button" onClick={start} className="btn-primary w-full text-base">
          Start game
          <ArrowRightIcon className="h-5 w-5" />
        </button>
        {state.history.length > 0 && (
          <button
            type="button"
            onClick={() => dispatch({ type: "NAVIGATE", screen: "history" })}
            className="btn-ghost w-full text-base"
          >
            <ClockIcon className="h-5 w-5" />
            Past games
          </button>
        )}
      </div>
    </div>
  );
}

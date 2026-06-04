import { useState } from "react";
import { useStore } from "../store/gameStore";
import { formatCents, sumCents } from "../domain/money";
import { MoneyInput } from "../components/MoneyInput";
import { CoinsIcon, UsersIcon, ArrowRightIcon, PlusIcon, ClockIcon } from "../components/icons";

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
    <div className="mx-auto w-full max-w-md px-5 pb-32 pt-12">
      <header className="rise mb-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-soft">Live game</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            {game.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "NAVIGATE", screen: "history" })}
          aria-label="Past games"
          className="icon-btn"
        >
          <ClockIcon className="h-5 w-5" />
        </button>
      </header>

      {/* Pot hero */}
      <div
        className="rise relative mb-6 overflow-hidden rounded-3xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(79,157,255,0.22), rgba(47,111,224,0.08))",
          border: "1px solid rgba(79,157,255,0.25)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(79,157,255,0.45), transparent 70%)" }}
        />
        <img
          src="/poker-chips-3d.png"
          alt=""
          className="pointer-events-none absolute right-4 top-1/2 h-20 w-20 -translate-y-1/2 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
        />
        <p className="text-sm font-medium text-ink-soft">Total on the table</p>
        <p className="tnum mt-1 font-display text-5xl font-semibold tracking-tight text-ink">
          {formatCents(totalPot)}
        </p>
        <div className="mt-4 flex gap-2">
          <span className="chip">
            <UsersIcon className="h-4 w-4" />
            {game.players.length} players
          </span>
          <span className="chip tnum">
            <CoinsIcon className="h-4 w-4" />
            {formatCents(game.centsPerChip)}/chip
          </span>
        </div>
      </div>

      {/* Players */}
      <ul className="space-y-3">
        {game.players.map((p, i) => (
          <li
            key={p.id}
            className="rise glass rounded-3xl p-4"
            style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-semibold text-ink">{p.name}</span>
              </span>
              <span className="text-right">
                <span className="block text-xs text-ink-faint">bought in</span>
                <span className="tnum block font-display text-xl font-semibold text-ink">
                  {formatCents(sumCents(p.buyInsCents))}
                </span>
              </span>
            </div>
            <MoneyInput
              buttonLabel="Add"
              onSubmit={(cents) => dispatch({ type: "ADD_BUYIN", playerId: p.id, cents })}
            />
          </li>
        ))}
      </ul>

      {/* Add player mid-game */}
      <div className="mt-4 flex gap-2">
        <input
          className="field flex-1"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          placeholder="Add a player mid-game"
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

      {/* Sticky settle CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md px-5 pb-6">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{ background: "linear-gradient(180deg, transparent, #060d1c 70%)" }}
        />
        <button
          type="button"
          onClick={() => dispatch({ type: "NAVIGATE", screen: "settle" })}
          className="btn-primary relative w-full text-base"
        >
          Settle up
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

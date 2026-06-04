import { useState } from "react";
import { useStore } from "../store/gameStore";
import { computeSettlement } from "../domain/settlement";
import { formatCents, sumCents } from "../domain/money";
import { ChevronLeftIcon, ChevronDownIcon, PlusIcon } from "../components/icons";

export function HistoryScreen() {
  const { state, dispatch } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-12">
      <header className="rise mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => dispatch({ type: "NAVIGATE", screen: state.activeGame ? "game" : "setup" })}
            aria-label="Back"
            className="icon-btn"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm text-ink-soft">Your</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Past games
            </h1>
          </div>
        </div>
        {!state.activeGame && (
          <button
            type="button"
            onClick={() => dispatch({ type: "NAVIGATE", screen: "setup" })}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent/15 px-4 text-sm font-semibold text-accent ring-1 ring-accent/30"
          >
            <PlusIcon className="h-4 w-4" />
            New
          </button>
        )}
      </header>

      {state.history.length === 0 ? (
        <div className="glass-soft mt-10 flex flex-col items-center rounded-3xl p-10 text-center">
          <img src="/3-cards-icon.png" alt="" className="mb-4 h-20 w-20 opacity-90" />
          <p className="font-medium text-ink">No settled games yet</p>
          <p className="mt-1 text-sm text-ink-soft">Finish a game and it&apos;ll land here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {state.history.map((g, idx) => {
            const settlement = computeSettlement(g.players, g.centsPerChip);
            const nameById = Object.fromEntries(g.players.map((p) => [p.id, p.name]));
            const pot = sumCents(g.players.flatMap((p) => p.buyInsCents));
            const isOpen = openId === g.id;
            return (
              <li
                key={g.id}
                className="rise glass overflow-hidden rounded-3xl"
                style={{ animationDelay: `${Math.min(idx * 40, 240)}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : g.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold text-ink">{g.name}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {g.settledAt ? new Date(g.settledAt).toLocaleDateString() : ""}
                      <span className="text-ink-faint"> · </span>
                      <span className="tnum">{formatCents(pot)} pot</span>
                      <span className="text-ink-faint"> · </span>
                      {g.players.length} players
                    </p>
                  </div>
                  <span className="chip tnum shrink-0">
                    {settlement.transactions.length} pay
                    {settlement.transactions.length === 1 ? "" : "s"}
                  </span>
                  <ChevronDownIcon
                    className={`h-5 w-5 shrink-0 text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-white/8 p-4 pt-3">
                    {settlement.transactions.length === 0 ? (
                      <p className="text-sm text-ink-soft">All square — no payments.</p>
                    ) : (
                      <ul className="space-y-2">
                        {settlement.transactions.map((t, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-ink">
                            <span className="font-medium">{nameById[t.fromId]}</span>
                            <span className="text-ink-faint">→</span>
                            <span className="font-medium">{nameById[t.toId]}</span>
                            <span className="tnum ml-auto font-semibold text-pos">
                              {formatCents(t.amountCents)}
                            </span>
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

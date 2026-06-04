import { useStore } from "../store/gameStore";
import { computeSettlement } from "../domain/settlement";
import { formatCents } from "../domain/money";
import { ChevronLeftIcon, ArrowRightIcon, SendIcon } from "../components/icons";

export function SettleScreen() {
  const { state, dispatch } = useStore();
  const game = state.activeGame;
  if (!game) return null;

  const allChipsEntered = game.players.every((p) => p.finalChips !== null);
  const settlement = computeSettlement(game.players, game.centsPerChip);
  const nameById = Object.fromEntries(game.players.map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-32 pt-12">
      <header className="rise mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => dispatch({ type: "NAVIGATE", screen: "game" })}
          aria-label="Back to game"
          className="icon-btn"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm text-ink-soft">Cash out</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {game.name}
          </h1>
        </div>
      </header>

      {/* Standings — enter final chips, see net */}
      <ul className="space-y-3">
        {game.players.map((p, i) => {
          const net = settlement.netCentsByPlayerId[p.id];
          const hasChips = p.finalChips !== null;
          return (
            <li
              key={p.id}
              className="rise glass rounded-3xl p-4"
              style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-semibold text-ink">{p.name}</span>
                </span>
                <span
                  className={`tnum font-display text-xl font-semibold ${
                    !hasChips ? "text-ink-faint" : net >= 0 ? "text-pos" : "text-neg"
                  }`}
                >
                  {hasChips ? `${net >= 0 ? "+" : ""}${formatCents(net)}` : "—"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3">
                <label className="text-sm text-ink-soft">Final chips</label>
                <input
                  inputMode="numeric"
                  className="field tnum ml-auto w-28 text-right"
                  style={{ minHeight: "2.5rem" }}
                  value={p.finalChips ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw === "") {
                      dispatch({ type: "SET_FINAL_CHIPS", playerId: p.id, chips: null });
                      return;
                    }
                    const chips = Number(raw);
                    if (Number.isInteger(chips) && chips >= 0) {
                      dispatch({ type: "SET_FINAL_CHIPS", playerId: p.id, chips });
                    }
                  }}
                  placeholder="0"
                />
              </div>
            </li>
          );
        })}
      </ul>

      {!settlement.isBalanced && (
        <div
          className="rise mt-4 rounded-2xl p-4 text-sm"
          style={{
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            color: "#fcd34d",
          }}
        >
          <span className="font-semibold">Books don&apos;t balance.</span> Cashed-out total is off by{" "}
          <span className="tnum font-semibold">{formatCents(settlement.imbalanceCents)}</span> versus
          bought-in. Someone may have miscounted chips.
        </div>
      )}

      {/* Payments */}
      <h2 className="mt-8 mb-3 flex items-center gap-2 font-display text-xl font-semibold text-ink">
        Who pays who
      </h2>
      {!allChipsEntered ? (
        <div className="glass-soft rounded-2xl p-5 text-center text-sm text-ink-soft">
          Enter every player&apos;s chip count to see the payouts.
        </div>
      ) : settlement.transactions.length === 0 ? (
        <div className="glass-soft rounded-2xl p-5 text-center text-sm text-ink-soft">
          All square — no payments needed. 🎉
        </div>
      ) : (
        <ul className="space-y-2.5">
          {settlement.transactions.map((t, i) => (
            <li key={i} className="glass flex items-center gap-3 rounded-2xl p-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neg/15 text-sm font-semibold text-neg">
                {nameById[t.fromId].charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  <span className="font-semibold">{nameById[t.fromId]}</span>
                  <span className="text-ink-faint"> pays </span>
                  <span className="font-semibold">{nameById[t.toId]}</span>
                </p>
              </div>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />
              <span className="tnum shrink-0 font-display text-lg font-semibold text-pos">
                {formatCents(t.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Sticky save CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md px-5 pb-6">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{ background: "linear-gradient(180deg, transparent, #060d1c 70%)" }}
        />
        <button
          type="button"
          disabled={!allChipsEntered}
          onClick={() => dispatch({ type: "SETTLE_GAME" })}
          className="btn-primary relative w-full text-base"
        >
          Save to history
          <SendIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

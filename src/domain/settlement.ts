import type { Player, Settlement, Transaction } from "./types";
import { sumCents } from "./money";

/** Compute net positions, balance check, and a minimized payment list. */
export function computeSettlement(players: Player[], centsPerChip: number): Settlement {
  const netCentsByPlayerId: Record<string, number> = {};
  let totalBoughtInCents = 0;
  let totalCashedOutCents = 0;

  for (const p of players) {
    const inCents = sumCents(p.buyInsCents);
    const chips = p.finalChips ?? 0;
    const outCents = chips * centsPerChip;
    netCentsByPlayerId[p.id] = outCents - inCents;
    totalBoughtInCents += inCents;
    totalCashedOutCents += outCents;
  }

  const imbalanceCents = totalCashedOutCents - totalBoughtInCents;
  const isBalanced = imbalanceCents === 0;

  return {
    netCentsByPlayerId,
    totalBoughtInCents,
    totalCashedOutCents,
    isBalanced,
    imbalanceCents,
    transactions: minimizePayments(netCentsByPlayerId),
  };
}

/** Greedy minimize-payments: match largest debtor with largest creditor. */
function minimizePayments(netByPlayerId: Record<string, number>): Transaction[] {
  const debtors = Object.entries(netByPlayerId)
    .filter(([, net]) => net < 0)
    .map(([id, net]) => ({ id, amount: -net }));
  const creditors = Object.entries(netByPlayerId)
    .filter(([, net]) => net > 0)
    .map(([id, net]) => ({ id, amount: net }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > 0) {
      transactions.push({ fromId: debtors[i].id, toId: creditors[j].id, amountCents: pay });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transactions;
}

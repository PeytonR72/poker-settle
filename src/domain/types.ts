export type Player = {
  id: string;
  name: string;
  buyInsCents: number[]; // each add is its own entry (ordered audit trail)
  finalChips: number | null; // chip count entered at settle
};

export type Game = {
  id: string;
  name: string;
  centsPerChip: number; // e.g. 25 = $0.25 per chip
  players: Player[];
  status: "active" | "settled";
  createdAt: number;
  settledAt: number | null;
};

export type Transaction = {
  fromId: string;
  toId: string;
  amountCents: number;
};

export type Settlement = {
  netCentsByPlayerId: Record<string, number>;
  totalBoughtInCents: number;
  totalCashedOutCents: number;
  isBalanced: boolean;
  imbalanceCents: number; // cashedOut - boughtIn (0 when balanced)
  transactions: Transaction[];
};

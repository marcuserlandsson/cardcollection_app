export interface SessionItem {
  cardNumber: string;
  name: string;
  variantName: string;
  qtyAdded: number;
}

/** Most-recently-adjusted first. */
export type SessionState = SessionItem[];

export function recordAdjustment(
  state: SessionState,
  item: { cardNumber: string; name: string; variantName: string },
  delta: number,
): SessionState {
  const existing = state.find((s) => s.cardNumber === item.cardNumber);
  const rest = state.filter((s) => s.cardNumber !== item.cardNumber);
  const newQty = (existing?.qtyAdded ?? 0) + delta;
  if (newQty <= 0) return rest;
  return [
    { cardNumber: item.cardNumber, name: item.name, variantName: item.variantName, qtyAdded: newQty },
    ...rest,
  ];
}

export function sessionTotal(state: SessionState): number {
  return state.reduce((sum, s) => sum + s.qtyAdded, 0);
}

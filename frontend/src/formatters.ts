export function formatCurrencyRm(value: number | null, unavailable: string): string {
  return value === null ? unavailable : `RM${value.toFixed(2)}`;
}

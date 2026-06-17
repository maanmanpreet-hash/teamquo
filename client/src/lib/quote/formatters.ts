export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatMetres(mm: number) {
  return `${(mm / 1000).toFixed(2)}m`;
}

export function safeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export function formatDateInput(value: unknown) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

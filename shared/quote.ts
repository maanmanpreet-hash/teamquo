export function formatQuoteNumber(
  job: { id: number; createdAt?: Date | string | null } | null | undefined
): string {
  if (!job) return "Q-0000-0000";

  const createdAt = job.createdAt ? new Date(job.createdAt) : new Date();
  const year = Number.isNaN(createdAt.getFullYear())
    ? new Date().getFullYear()
    : createdAt.getFullYear();
  const paddedId = String(job.id).padStart(4, "0");

  return `Q-${year}-${paddedId}`;
}

export const CUSTOMER_FACING_COMPANY_NAME =
  "SKYWALL Cabinets & Interior Cladding";

export const QUOTE_TERMS = [
  "Prices include GST unless stated otherwise.",
  "Quote valid for 30 days.",
  "Final price is subject to site conditions and final measurements.",
  "Electrical work is not included unless specifically stated.",
  "Wall preparation or wall repair is not included unless specifically stated.",
];

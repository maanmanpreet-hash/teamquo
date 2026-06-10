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

export function formatMoneyFromCents(cents: number | null | undefined): string {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

export const CUSTOMER_FACING_COMPANY_NAME =
  "SKYWALL Cabinets & Interior Cladding";

export const SKYWALL_CONTACT_DETAILS = {
  abn: "52 935 732 589",
  address: "38 Tuxworth Drive, Kalkallo 3064 VIC",
  phone: "0431 889 004",
  email: "info@skywallcabinets.com.au",
  website: "www.skywallcabinets.com.au",
};

export const QUOTE_TERMS = [
  "Prices include GST unless stated otherwise.",
  "Quote valid for 30 days.",
  "Final price is subject to site conditions and final measurements.",
  "Electrical work is not included unless specifically stated.",
  "Wall preparation or wall repair is not included unless specifically stated.",
];

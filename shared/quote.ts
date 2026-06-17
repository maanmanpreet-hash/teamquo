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
  "Skywall Cabinets";

export const COMPANY_CONTACT_DETAILS = {
  abn: "52 935 732 589",
  address: "38 Tuxworth Drive, Kalkallo 3064 VIC",
  phone: "0431 889 004",
  email: "info@skywallcabinets.com.au",
  website: "www.skywallcabinets.com.au",
};

export const QUOTE_TERMS = [
  "Quote is provided as one supply-and-install total, not as itemised product, labour, or line pricing.",
  "Wall dimensions, products, product sizes, and quantities are shown to define the quoted scope only.",
  "Quote valid for 30 days from the quote date.",
];

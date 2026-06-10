export interface QuoteExtraLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  category: "labour" | "extra" | "allowance";
  customerVisible: boolean;
}

export interface StructuredQuoteNotes {
  operatorNotes: string;
  extras: QuoteExtraLine[];
}

const STRUCTURED_NOTES_VERSION = 1;

export function encodeQuoteNotes(notes: StructuredQuoteNotes): string {
  return JSON.stringify({
    version: STRUCTURED_NOTES_VERSION,
    operatorNotes: notes.operatorNotes || "",
    extras: notes.extras.map(extra => ({
      id: extra.id,
      description: extra.description,
      quantity: extra.quantity,
      unitPrice: extra.unitPrice,
      category: extra.category,
      customerVisible: extra.customerVisible,
    })),
  });
}

export function decodeQuoteNotes(value: string | null | undefined): StructuredQuoteNotes {
  if (!value || !value.trim()) {
    return { operatorNotes: "", extras: [] };
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.extras)) {
      return {
        operatorNotes: String(parsed.operatorNotes || ""),
        extras: parsed.extras
          .map((extra: any): QuoteExtraLine | null => {
            const quantity = Number(extra.quantity);
            const unitPrice = Number(extra.unitPrice);
            if (!extra.description || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
              return null;
            }
            return {
              id: String(extra.id || Date.now()),
              description: String(extra.description),
              quantity: Math.max(1, Math.round(quantity)),
              unitPrice: Math.max(0, Math.round(unitPrice)),
              category: ["labour", "extra", "allowance"].includes(extra.category)
                ? extra.category
                : "extra",
              customerVisible: Boolean(extra.customerVisible),
            };
          })
          .filter((extra): extra is QuoteExtraLine => extra !== null),
      };
    }
  } catch {
    return { operatorNotes: value, extras: [] };
  }

  return { operatorNotes: value, extras: [] };
}

export function quoteExtraLineTotal(extra: QuoteExtraLine): number {
  return extra.quantity * extra.unitPrice;
}

export function quoteExtrasTotal(extras: QuoteExtraLine[]): number {
  return extras.reduce((total, extra) => total + quoteExtraLineTotal(extra), 0);
}

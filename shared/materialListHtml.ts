import type { QuoteMaterialSummary } from "./materialIntelligence";

export interface MaterialListHtmlInput {
  quoteNumber?: string;
  clientName?: string;
  clientAddress?: string;
  generatedDateText?: string;
  summary: QuoteMaterialSummary;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateInternalMaterialListHtml(input: MaterialListHtmlInput) {
  const rows = input.summary.consolidatedLines
    .map(line => `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Material List</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:24px}h1{margin:0 0 4px;font-size:28px;line-height:1.15}.meta{color:#4b5563;font-size:11px;margin-bottom:12px}table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border-bottom:1px solid #e5e7eb;padding:7px 8px;text-align:left;font-size:12px}th{background:#f9fafb}</style></head><body><h1>Material List</h1><div class="meta">Quote: ${escapeHtml(input.quoteNumber || "Draft")}<br>Customer: ${escapeHtml(input.clientName || "Not provided")}<br>Address: ${escapeHtml(input.clientAddress || "Not provided")}<br>Date: ${escapeHtml(input.generatedDateText || "")}</div><table><thead><tr><th>Material</th><th>Qty</th></tr></thead><tbody>${rows || "<tr><td colspan=\"2\">No material lines.</td></tr>"}</tbody></table></body></html>`;
}

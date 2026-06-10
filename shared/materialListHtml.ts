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

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function generateInternalMaterialListHtml(input: MaterialListHtmlInput) {
  const wallSections = input.summary.walls
    .map(wall => {
      const rows = wall.lines
        .map(line => {
          const referenceCost = line.quantity * (line.unitCostCents || 0);
          return `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${line.unitCostCents ? formatMoney(line.unitCostCents) : "-"}</td><td>${formatMoney(referenceCost)}</td></tr>`;
        })
        .join("");

      return `<section><h2>${escapeHtml(wall.wallName)}</h2><table><thead><tr><th>Material</th><th>Qty</th><th>Unit Cost</th><th>Reference Cost</th></tr></thead><tbody>${rows || "<tr><td colspan=\"4\">No automatic material lines.</td></tr>"}</tbody></table></section>`;
    })
    .join("");

  const totalRows = input.summary.consolidatedLines
    .map(line => `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${line.unitCostCents ? formatMoney(line.unitCostCents) : "-"}</td><td>${formatMoney(line.referenceCostCents)}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Internal Material List</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:32px}h1{margin-bottom:4px}h2{margin-top:24px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}.meta{color:#4b5563;font-size:13px;margin-bottom:24px}table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px}th{background:#f9fafb}.total{margin-top:24px}.grand-total{text-align:right;font-size:18px;font-weight:700;margin-top:16px}</style></head><body><h1>Internal Material List</h1><div class="meta">Quote: ${escapeHtml(input.quoteNumber || "Draft")}<br>Customer: ${escapeHtml(input.clientName || "Not provided")}<br>Address: ${escapeHtml(input.clientAddress || "Not provided")}<br>Date: ${escapeHtml(input.generatedDateText || "")}</div>${wallSections}<section class="total"><h2>Consolidated Totals</h2><table><thead><tr><th>Material</th><th>Qty</th><th>Unit Cost</th><th>Reference Cost</th></tr></thead><tbody>${totalRows || "<tr><td colspan=\"4\">No material totals.</td></tr>"}</tbody></table><p class="grand-total">Reference Material Cost: ${formatMoney(input.summary.referenceCostCents)}</p></section></body></html>`;
}

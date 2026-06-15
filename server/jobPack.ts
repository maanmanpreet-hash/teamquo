import type { Job, JobItem, Product, Wall } from "../drizzle/schema";
import { formatMoneyFromCents, formatQuoteNumber, COMPANY_CONTACT_DETAILS } from "../shared/quote";
import { buildJobMaterialSummary } from "./jobMaterials";

type WallSummary = Pick<Wall, "id" | "wallName" | "wallType" | "wallWidthMm" | "wallHeightMm" | "notes">;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatWallDimensions(wall?: WallSummary) {
  if (!wall?.wallWidthMm || !wall?.wallHeightMm) return "As measured on site";
  return `${(wall.wallWidthMm / 1000).toFixed(2)}m W x ${(wall.wallHeightMm / 1000).toFixed(2)}m H`;
}

function buildWallDrawingSvg(wall: WallSummary, index: number) {
  const widthMm = wall.wallWidthMm || 3600;
  const heightMm = wall.wallHeightMm || 2400;
  const maxWidth = 420;
  const maxHeight = 220;
  const scale = Math.min(maxWidth / widthMm, maxHeight / heightMm);
  const drawWidth = Math.max(120, Math.round(widthMm * scale));
  const drawHeight = Math.max(80, Math.round(heightMm * scale));
  const x = 70;
  const y = 36;
  const totalWidth = x + drawWidth + 70;
  const totalHeight = y + drawHeight + 58;

  return `
    <svg viewBox="0 0 ${totalWidth} ${totalHeight}" class="wall-svg" role="img" aria-label="${escapeHtml(wall.wallName || `Wall ${index + 1}`)} drawing">
      <defs>
        <marker id="arrow-${index}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"></path>
        </marker>
      </defs>
      <rect x="${x}" y="${y}" width="${drawWidth}" height="${drawHeight}" rx="6" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"></rect>
      <line x1="${x}" y1="${y + drawHeight + 22}" x2="${x + drawWidth}" y2="${y + drawHeight + 22}" stroke="#475569" stroke-width="1.5" marker-start="url(#arrow-${index})" marker-end="url(#arrow-${index})"></line>
      <line x1="${x - 24}" y1="${y}" x2="${x - 24}" y2="${y + drawHeight}" stroke="#475569" stroke-width="1.5" marker-start="url(#arrow-${index})" marker-end="url(#arrow-${index})"></line>
      <text x="${x + drawWidth / 2}" y="${y + drawHeight + 16}" text-anchor="middle" font-size="12" fill="#334155">${escapeHtml(`${widthMm}mm`)}</text>
      <text x="${x - 30}" y="${y + drawHeight / 2}" text-anchor="middle" font-size="12" fill="#334155" transform="rotate(-90 ${x - 30} ${y + drawHeight / 2})">${escapeHtml(`${heightMm}mm`)}</text>
      <text x="${x + drawWidth / 2}" y="${y + drawHeight / 2}" text-anchor="middle" font-size="14" font-weight="700" fill="#1e293b">${escapeHtml(wall.wallName || `Wall ${index + 1}`)}</text>
    </svg>
  `;
}

function parseItemDetails(value: unknown): Record<string, any> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isCompatibleItemDetails(itemType: JobItem["itemType"], details: Record<string, any>) {
  if (!details || typeof details !== "object") return false;
  const keys = Object.keys(details);
  if (keys.length === 0) return false;

  const detailType = typeof details.productType === "string" ? details.productType : undefined;
  if (detailType) return detailType === itemType;

  if (itemType === "tv_backdrop") {
    return ["tvSizeInches", "backdropWidthMm", "backdropHeightMm", "tvBottomAfflMm", "cabinetToTvGapMm"].some(
      key => key in details
    );
  }

  if (["floating_cabinet", "side_tower", "shelving"].includes(itemType)) {
    return ["widthMm", "heightMm", "depthMm", "heightFromFloorMm", "clientPreferenceNotes"].some(key => key in details);
  }

  if (itemType === "acoustic_panel") {
    return ["fixingMethod", "acousticFixingMethod", "glueTubes", "screws"].some(key => key in details);
  }

  return false;
}

function getTypedItemDetails(item: JobItem) {
  const details = parseItemDetails(item.itemDetails);
  return isCompatibleItemDetails(item.itemType, details) ? details : {};
}

function buildItemDetailLines(item: JobItem, product?: Product) {
  const details = getTypedItemDetails(item);
  const lines: string[] = [];

  if (item.itemType === "tv_backdrop") {
    const tvSize = safeNumber(details.tvSizeInches);
    const backdropWidth = safeNumber(details.backdropWidthMm);
    const backdropHeight = safeNumber(details.backdropHeightMm);
    const tvBottom = safeNumber(details.tvBottomAfflMm);
    const cabinetBottom = safeNumber(details.cabinetBottomAfflMm ?? details.heightFromFloorMm ?? item.cabinetHeightFromFloorMm);
    const cabinetHeight = safeNumber(details.cabinetHeightMm ?? details.heightMm ?? item.cabinetHeightMm);
    const cabinetGap = safeNumber(details.cabinetToTvGapMm);

    if (tvSize) lines.push(`TV: ${tvSize}"`);
    if (backdropWidth && backdropHeight) lines.push(`Backdrop: ${backdropWidth} x ${backdropHeight} mm`);
    if (tvBottom !== undefined) lines.push(`TV bottom AFFL: ${tvBottom} mm`);
    if (cabinetBottom !== undefined && cabinetHeight) lines.push(`Cabinet: ${cabinetBottom} mm AFFL bottom + ${cabinetHeight} mm height`);
    if (cabinetGap) lines.push(`Cabinet to TV gap: ${cabinetGap} mm`);
    if (details.includeTvBracket) lines.push("TV bracket included");
  }

  if (["floating_cabinet", "side_tower", "shelving"].includes(item.itemType)) {
    const width = item.cabinetWidthMm ?? safeNumber(details.widthMm);
    const height = item.cabinetHeightMm ?? safeNumber(details.heightMm);
    const depth = item.cabinetDepthMm ?? safeNumber(details.depthMm);
    const bottom = item.cabinetHeightFromFloorMm ?? safeNumber(details.heightFromFloorMm);
    const preference = typeof details.clientPreferenceNotes === "string" ? details.clientPreferenceNotes.trim() : "";

    if (width && height && depth) lines.push(`Size: ${width} W x ${height} H x ${depth} D mm`);
    if (bottom !== undefined) lines.push(`Bottom from floor: ${bottom} mm`);
    if (preference) lines.push(`Preference: ${preference}`);
  }

  if (item.itemType === "acoustic_panel") {
    const fixingMethod =
      typeof details.fixingMethod === "string"
        ? details.fixingMethod
        : typeof details.acousticFixingMethod === "string"
          ? details.acousticFixingMethod
          : undefined;
    if (fixingMethod && fixingMethod !== "none") lines.push(`Fixing: ${fixingMethod.replace(/_/g, " ")}`);
  }

  if (item.itemType === "fireplace" && product?.name) {
    lines.push(product.name);
  }

  return lines;
}

export function generateJobPackHtml(
  job: Job,
  items: JobItem[],
  products: Map<number, Product>,
  walls: Map<number, WallSummary>
) {
  const quoteNumber = formatQuoteNumber(job);
  const wallEntries = Array.from(
    items.reduce((groups, item) => {
      const wall = walls.get(item.wallId || 0);
      if (!wall) return groups;
      const existing = groups.get(wall.id) || [];
      existing.push(item);
      groups.set(wall.id, existing);
      return groups;
    }, new Map<number, JobItem[]>())
  )
    .map(([wallId, wallItems]) => [walls.get(wallId)!, wallItems] as [WallSummary, JobItem[]]);

  const materialSummary = buildJobMaterialSummary(items, products, walls);

  const wallSections = wallEntries
    .map(([wall, wallItems], index) => {
      const productRows = wallItems
        .map(item => {
          const product = item.productId ? products.get(item.productId) : undefined;
          const detailLines = buildItemDetailLines(item, product);
          return `
            <tr>
              <td>${escapeHtml(product?.name || item.itemType)}</td>
              <td>${escapeHtml(item.itemType)}</td>
              <td>${detailLines.length ? detailLines.map(line => `<div>${escapeHtml(line)}</div>`).join("") : "-"}</td>
              <td>${item.quantityRequired || 1}</td>
              <td>${formatMoneyFromCents(item.unitPrice || 0)}</td>
            </tr>
          `;
        })
        .join("");

      const materialWall = materialSummary.walls.find(summaryWall => summaryWall.wallName === (wall.wallName || "Wall"));
      const materialRows =
        materialWall?.lines
          .map(line => `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${line.unitCostCents ? formatMoneyFromCents(line.unitCostCents) : "-"}</td></tr>`)
          .join("") || `<tr><td colspan="3">No automatic material lines for this wall.</td></tr>`;

      return `
        <section class="wall-section">
          <div class="wall-header">
            <div>
              <h2>${escapeHtml(wall.wallName || `Wall ${index + 1}`)}</h2>
              <p>${escapeHtml(formatWallDimensions(wall))}</p>
            </div>
          </div>
          <div class="wall-grid">
            <div class="drawing-card">
              ${buildWallDrawingSvg(wall, index)}
            </div>
            <div class="table-card">
              <h3>Selected Products</h3>
              <table>
                <thead><tr><th>Product</th><th>Type</th><th>Recorded Details</th><th>Qty</th><th>Quote Rate</th></tr></thead>
                <tbody>${productRows}</tbody>
              </table>
            </div>
          </div>
          <div class="table-card materials-card">
            <h3>Internal Material Lines</h3>
            <table>
              <thead><tr><th>Material</th><th>Qty</th><th>Reference Cost</th></tr></thead>
              <tbody>${materialRows}</tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join("");

  const consolidatedRows = materialSummary.consolidatedLines
    .map(line => `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity}</td><td>${formatMoneyFromCents(line.referenceCostCents)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(quoteNumber)} Job Pack</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
    .page { max-width: 980px; margin: 0 auto; }
    .header { display:flex; justify-content:space-between; gap:24px; border-bottom:3px solid #0f172a; padding-bottom:16px; margin-bottom:24px; }
    .meta { font-size: 13px; line-height: 1.6; color: #334155; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    h2 { font-size: 18px; margin: 0 0 6px; }
    h3 { font-size: 14px; margin: 0 0 10px; text-transform: uppercase; color: #334155; }
    .wall-section { border:1px solid #dbe2ea; border-radius:12px; padding:16px; margin-top:18px; break-inside: avoid; }
    .wall-header { margin-bottom: 14px; }
    .wall-grid { display:grid; grid-template-columns: 1.05fr 1fr; gap:16px; }
    .drawing-card, .table-card { border:1px solid #dbe2ea; border-radius:10px; padding:12px; background:#f8fafc; }
    .materials-card { margin-top: 16px; }
    .wall-svg { width:100%; height:auto; display:block; }
    table { width:100%; border-collapse: collapse; }
    th, td { padding:8px; border-bottom:1px solid #dbe2ea; font-size:12px; text-align:left; vertical-align: top; }
    th { background:#e2e8f0; color:#0f172a; }
    .summary { margin-top: 24px; border:1px solid #dbe2ea; border-radius:12px; padding:16px; }
    .summary-total { text-align:right; font-size:20px; font-weight:700; margin-top:14px; }
    .notes { margin-top: 18px; font-size: 12px; color:#475569; }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div>
        <h1>Installer Job Pack</h1>
        <div class="meta">
          <div><strong>Quote:</strong> ${escapeHtml(quoteNumber)}</div>
          <div><strong>Client:</strong> ${escapeHtml(job.clientName)}</div>
          <div><strong>Address:</strong> ${escapeHtml(job.clientAddress || "Not provided")}</div>
          <div><strong>Operator:</strong> ${escapeHtml(job.operatorName || "Not assigned")}</div>
        </div>
      </div>
      <div class="meta" style="text-align:right">
        <div><strong>Phone:</strong> ${escapeHtml(COMPANY_CONTACT_DETAILS.phone)}</div>
        <div><strong>Email:</strong> ${escapeHtml(COMPANY_CONTACT_DETAILS.email)}</div>
        <div><strong>Total Quote:</strong> ${formatMoneyFromCents(job.totalEstimate)}</div>
      </div>
    </header>
    ${wallSections || `<p>No saved walls/products available for this job pack yet.</p>`}
    <section class="summary">
      <h2>Consolidated Internal Material Totals</h2>
      <table>
        <thead><tr><th>Material</th><th>Qty</th><th>Reference Cost</th></tr></thead>
        <tbody>${consolidatedRows || `<tr><td colspan="3">No material totals available.</td></tr>`}</tbody>
      </table>
      <div class="summary-total">Reference Material Cost: ${formatMoneyFromCents(materialSummary.referenceCostCents)}</div>
      ${materialSummary.notes.length ? `<div class="notes"><strong>Notes</strong><ul>${materialSummary.notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul></div>` : ""}
    </section>
  </div>
</body>
</html>`;
}

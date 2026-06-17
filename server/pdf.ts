import { Job, JobItem, CladdingVariant, Product, Wall } from "../drizzle/schema";
import {
  CUSTOMER_FACING_COMPANY_NAME,
  QUOTE_TERMS,
  COMPANY_CONTACT_DETAILS,
  decodeWallMeta,
  formatMoneyFromCents,
  formatQuoteNumber,
} from "../shared/quote";
import { parseMaterialMetadata } from "../shared/quoteCalculations";
import path from "path";
import { pathToFileURL } from "url";

type WallSummary = Pick<Wall, "id" | "wallName" | "wallType" | "wallWidthMm" | "wallHeightMm" | "notes">;
const PLACEHOLDER_EMAILS = new Set(["test@example.com", "example@example.com", "placeholder@example.com"]);

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

  if (itemType === "custom_item") {
    return ["customItemType", "customItemLabel"].some(key => key in details);
  }

  return false;
}

function getTypedItemDetails(item: JobItem) {
  const details = parseItemDetails(item.itemDetails);
  return isCompatibleItemDetails(item.itemType, details) ? details : {};
}

export function isRealCustomerEmail(email: unknown) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  if (PLACEHOLDER_EMAILS.has(trimmed)) return false;
  if (trimmed.includes("test@") || trimmed.startsWith("test+") || trimmed.includes("example.") || trimmed.includes("placeholder")) return false;
  return true;
}

export function getCustomerQuoteLogoUrlForPdf() {
  const logoPath = path.resolve(process.cwd(), "client/public/skywall-brand.png");
  return pathToFileURL(logoPath).href;
}

/**
 * Generate customer-facing quote HTML for PDF export.
 */
export function generateQuoteHTML(
  job: Job,
  jobItems: JobItem[],
  claddingVariants: Map<number, CladdingVariant>,
  products: Map<number, Product> = new Map(),
  companyName: string = CUSTOMER_FACING_COMPANY_NAME,
  logoUrl: string = "/skywall-brand.png",
  walls: Map<number, WallSummary> = new Map()
): string {
  const quoteNumber = formatQuoteNumber(job);

  const escapeHtml = (value: string | number | null | undefined) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const itemTypeLabels: Record<JobItem["itemType"], string> = {
    cladding: "Cladding",
    acoustic_panel: "Acoustic Slat Panel",
    floating_cabinet: "Floating TV Unit",
    fireplace: "Fireplace",
    mirror: "Mirror",
    marble_sheet: "Marble Sheet",
    tv_backdrop: "TV Backdrop",
    side_tower: "Side Tower",
    shelving: "Shelving",
    custom_item: "Custom Item",
  };

  const formatWallDimensions = (item: JobItem, wall?: WallSummary) => {
    if (wall?.wallWidthMm && wall?.wallHeightMm) {
      return `${(wall.wallWidthMm / 1000).toFixed(2)}m W x ${(
        wall.wallHeightMm / 1000
      ).toFixed(2)}m H`;
    }

    if (item.wallWidthMm && item.wallHeightMm) {
      return `${(item.wallWidthMm / 1000).toFixed(2)}m W x ${(
        item.wallHeightMm / 1000
      ).toFixed(2)}m H`;
    }

    return "As measured on site";
  };

  const formatProductDimensions = (item: JobItem, product?: Product) => {
    const itemDetails = getTypedItemDetails(item);

    if (["floating_cabinet", "side_tower", "shelving"].includes(item.itemType)) {
      const dims = [
        item.cabinetWidthMm ?? safeNumber(itemDetails.widthMm),
        item.cabinetHeightMm ?? safeNumber(itemDetails.heightMm),
        item.cabinetDepthMm ?? safeNumber(itemDetails.depthMm),
      ].filter(Boolean);
      return dims.length ? `${dims.join("mm x ")}mm` : "Custom size";
    }

    if (item.itemType === "tv_backdrop") {
      const tvSize = safeNumber(itemDetails.tvSizeInches);
      const backdropWidth = safeNumber(itemDetails.backdropWidthMm);
      const backdropHeight = safeNumber(itemDetails.backdropHeightMm);
      if (backdropWidth && backdropHeight) {
        return `${backdropWidth}mm x ${backdropHeight}mm backdrop${tvSize ? ` for ${tvSize}" TV` : ""}`;
      }
      return tvSize ? `${tvSize}" TV backdrop allowance` : "TV backdrop allowance recorded";
    }

    if (product?.widthMm && product?.heightMm) {
      return `${product.widthMm}mm x ${product.heightMm}mm${product.depthMm ? ` x ${product.depthMm}mm` : ""}`;
    }

    return "Selected product";
  };

  const itemCustomerNotes = (item: JobItem) => {
    const itemDetails = getTypedItemDetails(item);
    const notes: string[] = [];
    if (typeof itemDetails.clientPreferenceNotes === "string" && itemDetails.clientPreferenceNotes.trim()) {
      notes.push(itemDetails.clientPreferenceNotes.trim());
    }
    return Array.from(new Set(notes));
  };

  const groupedItems = jobItems.reduce((groups, item) => {
    const wallKey = item.wallId || 0;
    const current = groups.get(wallKey) || [];
    current.push(item);
    groups.set(wallKey, current);
    return groups;
  }, new Map<number, JobItem[]>());

  const wallTotals: number[] = [];

  const wallRows = Array.from(groupedItems.entries())
    .map(([wallId, items], wallIndex) => {
      const wall = wallId ? walls.get(wallId) : undefined;
      const wallName = wall?.wallName || `Wall ${wallIndex + 1}`;
      const wallDimensions = formatWallDimensions(items[0], wall);
      const decodedWallNotes = decodeWallMeta(wall?.notes);
      const obstructionLine = decodedWallNotes.obstructionNotes?.trim();
      const wallTotal =
        decodedWallNotes.supplyInstallPrice ??
        (groupedItems.size === 1 ? job.totalEstimate ?? 0 : null);

      if (wallTotal === null) {
        throw new Error(`Manual Supply & Install price is required for ${wallName} before generating the customer quote.`);
      }

      wallTotals.push(wallTotal);

      const productItems = items
        .map(item => {
          const product = item.productId ? products.get(item.productId) : undefined;
          const variant = item.claddingVariantId
            ? claddingVariants.get(item.claddingVariantId)
            : undefined;
          const itemDetails = getTypedItemDetails(item);
          const productName =
            product?.name ||
            variant?.name ||
            (typeof itemDetails.customItemLabel === "string" && itemDetails.customItemLabel.trim()
              ? itemDetails.customItemLabel.trim()
              : itemTypeLabels[item.itemType]);
          const productDesign = product?.design || variant?.design;
          const description = [
            itemTypeLabels[item.itemType],
            productName,
            productDesign,
          ]
            .filter(Boolean)
            .join(" - ");
          const notes = itemCustomerNotes(item);

          return `
            <li>
              ${escapeHtml(description)}
              ${notes.length ? `<ul class="line-notes">${notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
            </li>
          `;
        })
        .join("");

      return `
        <tr class="quote-items-row">
          <td class="quote-items-main">
            <h2>WALL ${wallIndex + 1} - ${escapeHtml(wallName.toUpperCase())} - ${escapeHtml(wallDimensions)}</h2>
            <p class="included-products-label"><strong>Included products:</strong></p>
            <ul class="included-products">${productItems}</ul>
            ${obstructionLine ? `<p>${escapeHtml(obstructionLine)}</p>` : ""}
          </td>
          <td class="quote-items-price">
            <div class="quote-items-price-value">${escapeHtml(formatMoneyFromCents(wallTotal))}</div>
          </td>
        </tr>
      `;
    })
    .join("");
  const supplyInstallTotal = wallTotals.reduce((sum, wallTotal) => sum + wallTotal, 0);

  const terms = QUOTE_TERMS.map(term => `<li>${escapeHtml(term)}</li>`).join("");

  const safeLogoUrl = escapeHtml(logoUrl || "/skywall-brand.png");
  const quoteDate = job.createdAt ? new Date(job.createdAt) : new Date();
  const quoteDateLabel = Number.isNaN(quoteDate.getTime())
    ? new Date().toLocaleDateString()
    : quoteDate.toLocaleDateString();
  const customerLines = [
    job.clientName?.trim() ? `<p><strong>${escapeHtml(job.clientName.trim())}</strong></p>` : "",
    job.clientPhone?.trim() ? `<p>${escapeHtml(job.clientPhone.trim())}</p>` : "",
    isRealCustomerEmail(job.clientEmail) ? `<p>${escapeHtml(job.clientEmail!.trim())}</p>` : "",
    job.clientAddress?.trim() ? `<p>${escapeHtml(job.clientAddress.trim())}</p>` : "",
  ]
    .filter(Boolean)
    .join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${quoteNumber} - ${escapeHtml(job.clientName)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #172033; background: #fff; }
    .page { max-width: 940px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #d7deea; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-block { display: flex; gap: 14px; align-items: flex-start; }
    .brand-logo { width: 300px; max-height: 72px; object-fit: contain; object-position: left top; }
    .company-details { margin-top: 8px; font-size: 11px; line-height: 1.5; color: #5a667a; }
    .quote-box { min-width: 170px; text-align: right; font-size: 12px; line-height: 1.6; color: #4a5568; }
    .quote-number { font-size: 20px; font-weight: 700; color: #14213d; margin-bottom: 2px; }
    .client { margin: 0 0 20px; }
    .panel { background: #fbfcfe; border: 1px solid #dfe5ef; border-radius: 8px; padding: 14px 16px; }
    h1 { font-size: 22px; margin: 0 0 8px; color: #14213d; }
    h2 { font-size: 14px; letter-spacing: .04em; color: #14213d; margin: 0 0 8px; }
    p { margin: 4px 0; }
    .quote-items-wrap { margin-top: 0; }
    .quote-items { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1px solid #dfe5ef; border-radius: 8px; overflow: hidden; }
    .quote-items thead th { background: #f7f9fc; color: #324055; text-align: left; padding: 11px 14px 14px; font-size: 12px; font-weight: 700; border-bottom: 1px solid #dfe5ef; }
    .quote-items thead th:last-child { text-align: right; width: 22%; }
    .quote-items-row td { background: #fcfdff; padding: 0; vertical-align: top; border-top: 1px solid #e7ecf3; }
    .quote-items-row:first-child td { border-top: 0; }
    .quote-items-row + .quote-items-row td { border-top: 10px solid #f7f9fc; }
    .quote-items-main { width: 78%; padding: 18px 16px 16px; }
    .quote-items-price { width: 22%; padding: 18px 16px 16px; border-left: 1px solid #e1e7f0; text-align: right; }
    .quote-items-row:first-child .quote-items-main,
    .quote-items-row:first-child .quote-items-price { padding-top: 20px; }
    .quote-items-row + .quote-items-row .quote-items-main,
    .quote-items-row + .quote-items-row .quote-items-price { padding-top: 22px; }
    .quote-items-main h2 { font-size: 13px; font-weight: 700; letter-spacing: .03em; margin-bottom: 6px; }
    .quote-items-price-value { font-size: 12px; font-weight: 400; color: #172033; white-space: nowrap; line-height: 1.4; }
    .included-products-label { margin-top: 0; font-size: 12px; color: #334155; }
    .included-products { margin: 8px 0 12px; padding-left: 16px; }
    .included-products li { margin: 4px 0; font-size: 12px; line-height: 1.4; color: #172033; }
    .quote-items-main p:last-child { margin: 8px 0 0; font-size: 12px; color: #4b5563; }
    .line-notes { margin: 4px 0 0; padding-left: 16px; color: #64748b; font-size: 10px; line-height: 1.4; }
    .total { display: flex; justify-content: flex-end; margin-top: 18px; }
    .total-card { min-width: 250px; border: 1px solid #cfd8e6; border-radius: 8px; padding: 12px 16px; text-align: right; background: #fbfcfe; }
    .total-label { font-size: 12px; font-weight: 700; color: #5f6c80; margin-bottom: 4px; }
    .total-amount { font-size: 24px; font-weight: 800; color: #14213d; line-height: 1.15; }
    .terms, .notes { margin-top: 20px; background: #fbfcfe; border-radius: 8px; padding: 12px 16px; border: 1px solid #dfe5ef; font-size: 11px; line-height: 1.45; }
    .terms h2 { font-size: 12px; margin-bottom: 8px; }
    .terms ul { margin: 0; padding-left: 16px; }
    .terms li { margin: 3px 0; }
    .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div>
        <div class="brand-block">
          <img src="${safeLogoUrl}" alt="Skywall Cabinets" class="brand-logo" />
        </div>
        <div class="company-details">
          ABN: ${escapeHtml(COMPANY_CONTACT_DETAILS.abn)}<br />
          ${escapeHtml(COMPANY_CONTACT_DETAILS.address)}<br />
          ${escapeHtml(COMPANY_CONTACT_DETAILS.phone)} | ${escapeHtml(COMPANY_CONTACT_DETAILS.email)}<br />
          ${escapeHtml(COMPANY_CONTACT_DETAILS.website)}
        </div>
      </div>
      <div class="quote-box">
        <div class="quote-number">${quoteNumber}</div>
        <div>Date: ${quoteDateLabel}</div>
      </div>
    </header>

    <section class="client">
      <div class="panel">
        <h2>Customer</h2>
        ${customerLines}
      </div>
    </section>

    <section class="quote-items-wrap">
      <table class="quote-items">
        <thead>
          <tr>
            <th>Items</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${wallRows}
        </tbody>
      </table>
    </section>

    <section class="total">
      <div class="total-card">
        <div class="total-label">Supply and Install Total</div>
        <div class="total-amount">${formatMoneyFromCents(supplyInstallTotal)}</div>
      </div>
    </section>

    <section class="terms"><h2>Quote Terms</h2><ul>${terms}</ul></section>
    <footer class="footer">Thank you for considering Skywall Cabinets.</footer>
  </div>
</body>
</html>`;
}

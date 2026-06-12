import { Job, JobItem, CladdingVariant, Product, Wall } from "../drizzle/schema";
import {
  CUSTOMER_FACING_COMPANY_NAME,
  QUOTE_TERMS,
  COMPANY_CONTACT_DETAILS,
  formatMoneyFromCents,
  formatQuoteNumber,
} from "../shared/quote";
import { parseMaterialMetadata } from "../shared/quoteCalculations";

type WallSummary = Pick<Wall, "id" | "wallName" | "wallType" | "wallWidthMm" | "wallHeightMm" | "notes">;

function decodeWallNotes(notes: string | null | undefined) {
  if (!notes) return { obstructionStatus: "unknown", obstructionNotes: "" };

  try {
    const parsed = JSON.parse(notes);
    if (
      parsed &&
      ["unknown", "none", "present"].includes(parsed.obstructionStatus)
    ) {
      return {
        obstructionStatus: parsed.obstructionStatus as "unknown" | "none" | "present",
        obstructionNotes: String(parsed.obstructionNotes || ""),
      };
    }
  } catch {
    return { obstructionStatus: "unknown", obstructionNotes: notes };
  }

  return { obstructionStatus: "unknown", obstructionNotes: notes };
}

function formatQuoteStatus(status: string | null | undefined) {
  const labels: Record<string, string> = {
    quoted: "Draft",
    booked: "Sent",
    commenced: "Accepted",
    completed: "Completed",
    cancelled: "Rejected",
  };

  return labels[status || "quoted"] || "Draft";
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
  logoUrl: string = "/skywall-logo.png",
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
    if (["floating_cabinet", "side_tower", "shelving"].includes(item.itemType)) {
      const dims = [
        item.cabinetWidthMm,
        item.cabinetHeightMm,
        item.cabinetDepthMm,
      ].filter(Boolean);
      return dims.length ? `${dims.join("mm x ")}mm` : "Custom size";
    }

    if (item.itemType === "tv_backdrop") {
      return "TV size and backdrop allowance recorded for final site check";
    }

    if (product?.widthMm && product?.heightMm) {
      return `${product.widthMm}mm x ${product.heightMm}mm${product.depthMm ? ` x ${product.depthMm}mm` : ""}`;
    }

    return "Selected product";
  };

  const itemCustomerNotes = (item: JobItem, product?: Product, wall?: WallSummary) => {
    const notes: string[] = [];
    const metadata = parseMaterialMetadata(product?.description);
    const decodedWallNotes = decodeWallNotes(wall?.notes);

    if (["cladding", "acoustic_panel", "marble_sheet", "tv_backdrop"].includes(item.itemType)) {
      notes.push("Final join layout and cut positions are subject to site measurement confirmation.");
    }

    if (["floating_cabinet", "side_tower", "shelving"].includes(item.itemType)) {
      notes.push("Custom dimensions and final finish details are subject to site measurement confirmation.");
    }

    if (metadata.orientationRule) {
      notes.push(`Install orientation: ${metadata.orientationRule}.`);
    }

    if (decodedWallNotes.obstructionStatus === "present") {
      notes.push(
        decodedWallNotes.obstructionNotes
          ? `Noted wall features: ${decodedWallNotes.obstructionNotes}. Final cut layout to be confirmed on site.`
          : "Wall features/openings are present. Final cut layout to be confirmed on site."
      );
    } else if (decodedWallNotes.obstructionStatus === "unknown") {
      notes.push("Openings, power points, recesses, and other wall features to be confirmed before commencement.");
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

  const wallSections = Array.from(groupedItems.entries())
    .map(([wallId, items], wallIndex) => {
      const wall = wallId ? walls.get(wallId) : undefined;
      const wallName = wall?.wallName || `Wall ${wallIndex + 1}`;
      const wallDimensions = formatWallDimensions(items[0], wall);
      const decodedWallNotes = decodeWallNotes(wall?.notes);
      const obstructionLine =
        decodedWallNotes.obstructionStatus === "none"
          ? "No known obstructions recorded at quoting stage."
          : decodedWallNotes.obstructionStatus === "present"
            ? `Recorded wall features: ${decodedWallNotes.obstructionNotes || "Obstructions present"}.`
            : "Openings/obstructions to be confirmed before commencement.";

      const productRows = items
        .map((item, index) => {
          const product = item.productId ? products.get(item.productId) : undefined;
          const variant = item.claddingVariantId
            ? claddingVariants.get(item.claddingVariantId)
            : undefined;
          const productName =
            product?.name || variant?.name || itemTypeLabels[item.itemType];
          const productDesign = product?.design || variant?.design;
          const description = [
            itemTypeLabels[item.itemType],
            productName,
            productDesign,
          ]
            .filter(Boolean)
            .join(" - ");
          const notes = itemCustomerNotes(item, product, wall);

          return `
            <tr>
              <td>${index + 1}</td>
              <td>
                ${escapeHtml(description)}
                ${notes.length ? `<ul class="line-notes">${notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
              </td>
              <td>${escapeHtml(formatProductDimensions(item, product))}</td>
              <td>Included</td>
            </tr>
          `;
        })
        .join("");

      return `
        <section class="wall-section">
          <div class="wall-heading">
            <div>
              <h2>${escapeHtml(wallName)}</h2>
              <p><strong>Wall dimensions:</strong> ${escapeHtml(wallDimensions)}</p>
              <p>${escapeHtml(obstructionLine)}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>#</th><th>Products included</th><th>Product size</th><th>Status</th></tr>
            </thead>
            <tbody>${productRows}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const terms = QUOTE_TERMS.map(term => `<li>${escapeHtml(term)}</li>`).join("");

  const safeNotes = job.notes
    ? `<section class="notes"><h2>Additional Notes</h2><p>${escapeHtml(job.notes).replace(/\n/g, "<br />")}</p></section>`
    : "";

  const safeLogoUrl = escapeHtml(logoUrl || "/skywall-logo.png");
  const quoteDate = job.createdAt ? new Date(job.createdAt) : new Date();
  const quoteDateLabel = Number.isNaN(quoteDate.getTime())
    ? new Date().toLocaleDateString()
    : quoteDate.toLocaleDateString();
  const quoteStatusLabel = formatQuoteStatus(job.status);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${quoteNumber} - ${escapeHtml(job.clientName)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 28px; color: #172033; background: #fff; }
    .page { max-width: 940px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #14213d; padding-bottom: 18px; margin-bottom: 24px; }
    .brand-block { display: flex; gap: 14px; align-items: flex-start; }
    .brand-logo { width: 190px; max-height: 66px; object-fit: contain; object-position: left top; }
    .brand-name { margin-top: 4px; font-size: 15px; color: #334155; }
    .company-details { margin-top: 10px; font-size: 12px; line-height: 1.5; color: #475569; }
    .quote-box { text-align: right; font-size: 13px; line-height: 1.6; color: #334155; }
    .quote-number { font-size: 20px; font-weight: 700; color: #14213d; }
    .client { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0 26px; }
    .panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    h1 { font-size: 22px; margin: 0 0 8px; color: #14213d; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #475569; margin: 0 0 10px; }
    p { margin: 4px 0; }
    .wall-section { margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .wall-heading { background: #f8fafc; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
    .wall-heading h2 { color: #14213d; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #14213d; color: #fff; text-align: left; padding: 10px; font-size: 12px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px; font-size: 13px; vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    th:nth-child(1), td:nth-child(1) { width: 38px; text-align: center; }
    th:nth-child(3), td:nth-child(3) { width: 170px; }
    th:nth-child(4), td:nth-child(4) { width: 82px; text-align: center; }
    .line-notes { margin: 6px 0 0; padding-left: 18px; color: #475569; font-size: 11px; line-height: 1.4; }
    .total { display: flex; justify-content: flex-end; margin-top: 22px; }
    .total-card { min-width: 280px; border: 2px solid #14213d; border-radius: 10px; padding: 16px; text-align: right; }
    .total-label { font-size: 13px; color: #475569; }
    .total-amount { font-size: 28px; font-weight: 800; color: #14213d; }
    .terms, .notes { margin-top: 26px; background: #f8fafc; border-radius: 10px; padding: 14px 18px; border: 1px solid #e2e8f0; font-size: 12px; line-height: 1.55; }
    .terms ul { margin: 0; padding-left: 18px; }
    .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div>
        <div class="brand-block">
          <img src="${safeLogoUrl}" alt="Skywall Cabinets" class="brand-logo" />
        </div>
        <div class="brand-name">${escapeHtml(companyName)}</div>
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
        <div>Status: ${escapeHtml(quoteStatusLabel)}</div>
      </div>
    </header>

    <section class="client">
      <div class="panel">
        <h2>Customer</h2>
        <p><strong>${escapeHtml(job.clientName)}</strong></p>
        ${job.clientPhone ? `<p>${escapeHtml(job.clientPhone)}</p>` : ""}
        ${job.clientEmail ? `<p>${escapeHtml(job.clientEmail)}</p>` : ""}
        ${job.clientAddress ? `<p>${escapeHtml(job.clientAddress)}</p>` : ""}
      </div>
      <div class="panel">
        <h2>Quote Summary</h2>
        <p>Supply and install quote for the listed walls and selected Skywall Cabinets works.</p>
        <p>Final measurements, join layout, and site conditions to be confirmed before commencement.</p>
      </div>
    </section>

    <section>
      <h1>Supply and Install Scope</h1>
      ${wallSections}
    </section>

    <section class="total">
      <div class="total-card">
        <div class="total-label">Supply and Install Total Estimate</div>
        <div class="total-amount">${formatMoneyFromCents(job.totalEstimate)}</div>
      </div>
    </section>

    <section class="terms"><h2>Quote Terms</h2><ul>${terms}</ul></section>
    ${safeNotes}
    <footer class="footer">Thank you for considering Skywall Cabinets.</footer>
  </div>
</body>
</html>`;
}

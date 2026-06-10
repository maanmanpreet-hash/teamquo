import { Job, JobItem, CladdingVariant, Product } from "../drizzle/schema";
import {
  CUSTOMER_FACING_COMPANY_NAME,
  QUOTE_TERMS,
  SKYWALL_CONTACT_DETAILS,
  formatMoneyFromCents,
  formatQuoteNumber,
} from "../shared/quote";

/**
 * Generate customer-facing quote HTML for PDF export.
 */
export function generateQuoteHTML(
  job: Job,
  jobItems: JobItem[],
  claddingVariants: Map<number, CladdingVariant>,
  products: Map<number, Product> = new Map(),
  companyName: string = CUSTOMER_FACING_COMPANY_NAME,
  logoUrl: string = "/skywall-logo.png"
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
  };

  const formatDimensions = (item: JobItem, product?: Product) => {
    if (item.itemType === "floating_cabinet") {
      const dims = [
        item.cabinetWidthMm,
        item.cabinetHeightMm,
        item.cabinetDepthMm,
      ].filter(Boolean);
      return dims.length ? `${dims.join("mm x ")}mm` : "Custom size";
    }

    if (item.wallWidthMm && item.wallHeightMm) {
      return `${(item.wallWidthMm / 1000).toFixed(2)}m L x ${(
        item.wallHeightMm / 1000
      ).toFixed(2)}m H`;
    }

    if (product?.widthMm && product?.heightMm) {
      return `${product.widthMm}mm x ${product.heightMm}mm`;
    }

    return "As measured on site";
  };

  const rows = jobItems
    .map((item, index) => {
      const product = item.productId ? products.get(item.productId) : undefined;
      const variant = item.claddingVariantId
        ? claddingVariants.get(item.claddingVariantId)
        : undefined;
      const productName =
        product?.name || variant?.name || itemTypeLabels[item.itemType];
      const productDesign = product?.design || variant?.design;
      const quantity = item.quantityRequired || 1;
      const description = [
        itemTypeLabels[item.itemType],
        productName,
        productDesign,
      ]
        .filter(Boolean)
        .join(" - ");

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>Supply and install</strong><br />
            ${escapeHtml(description)}
          </td>
          <td>${escapeHtml(formatDimensions(item, product))}</td>
          <td>${quantity}x</td>
        </tr>
      `;
    })
    .join("");

  const terms = QUOTE_TERMS.map(term => `<li>${escapeHtml(term)}</li>`).join("");

  const safeNotes = job.notes
    ? `<section class="notes"><h2>Notes</h2><p>${escapeHtml(job.notes).replace(/\n/g, "<br />")}</p></section>`
    : "";

  const safeLogoUrl = escapeHtml(logoUrl || "/skywall-logo.png");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${quoteNumber} - ${escapeHtml(job.clientName)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 28px; color: #172033; background: #fff; }
    .page { max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #14213d; padding-bottom: 18px; margin-bottom: 24px; }
    .brand-block { display: flex; gap: 14px; align-items: flex-start; }
    .brand-logo { width: 190px; max-height: 66px; object-fit: contain; object-position: left top; }
    .brand-fallback { font-size: 30px; font-weight: 800; letter-spacing: 1px; color: #14213d; }
    .brand-name { margin-top: 4px; font-size: 15px; color: #334155; }
    .company-details { margin-top: 10px; font-size: 12px; line-height: 1.5; color: #475569; }
    .quote-box { text-align: right; font-size: 13px; line-height: 1.6; color: #334155; }
    .quote-number { font-size: 20px; font-weight: 700; color: #14213d; }
    .client { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0 26px; }
    .panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    h1 { font-size: 22px; margin: 0 0 8px; color: #14213d; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #475569; margin: 0 0 10px; }
    p { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #14213d; color: #fff; text-align: left; padding: 10px; font-size: 12px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px; font-size: 13px; vertical-align: top; }
    th:nth-child(1), td:nth-child(1) { width: 42px; text-align: center; }
    th:nth-child(3), td:nth-child(3) { width: 150px; }
    th:nth-child(4), td:nth-child(4) { width: 80px; text-align: center; }
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
          <img src="${safeLogoUrl}" alt="SKYWALL" class="brand-logo" />
        </div>
        <div class="brand-name">${escapeHtml(companyName)}</div>
        <div class="company-details">
          ABN: ${escapeHtml(SKYWALL_CONTACT_DETAILS.abn)}<br />
          ${escapeHtml(SKYWALL_CONTACT_DETAILS.address)}<br />
          ${escapeHtml(SKYWALL_CONTACT_DETAILS.phone)} | ${escapeHtml(SKYWALL_CONTACT_DETAILS.email)}<br />
          ${escapeHtml(SKYWALL_CONTACT_DETAILS.website)}
        </div>
      </div>
      <div class="quote-box">
        <div class="quote-number">${quoteNumber}</div>
        <div>Date: ${new Date(job.createdAt).toLocaleDateString()}</div>
        <div>Status: ${escapeHtml(job.status)}</div>
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
        <p>Supply and install quote for selected SKYWALL works.</p>
        <p>Final measurements and site conditions to be confirmed before commencement.</p>
      </div>
    </section>

    <section>
      <h1>Supply and Install</h1>
      <table>
        <thead>
          <tr><th>#</th><th>Description</th><th>Dimensions</th><th>Qty</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>

    <section class="total">
      <div class="total-card">
        <div class="total-label">Total Estimate</div>
        <div class="total-amount">${formatMoneyFromCents(job.totalEstimate)}</div>
      </div>
    </section>

    <section class="terms"><h2>Quote Terms</h2><ul>${terms}</ul></section>
    ${safeNotes}
    <footer class="footer">Thank you for considering SKYWALL Cabinets & Interior Cladding.</footer>
  </div>
</body>
</html>`;
}

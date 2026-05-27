import { Job, JobItem, CladdingVariant } from "../drizzle/schema";

/**
 * Generate HTML for a quote PDF
 */
export function generateQuoteHTML(
  job: Job,
  jobItems: JobItem[],
  claddingVariants: Map<number, CladdingVariant>,
  companyName: string = "TeamQuo",
  logoUrl?: string
): string {
  const formatCurrency = (cents: number | null | undefined) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const itemsHTML = jobItems
    .map((item) => {
      if (item.itemType === "cladding") {
        const variant = claddingVariants.get(item.claddingVariantId || 0);
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
              <strong>${variant?.name || "Cladding"}</strong><br/>
              <small>Design: ${variant?.design || "N/A"}</small>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">
              ${item.wallWidthMm}mm × ${item.wallHeightMm}mm
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">
              ${item.quantityRequired}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">
              ${formatCurrency(item.unitPrice)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">
              <strong>${formatCurrency(item.totalPrice)}</strong>
            </td>
          </tr>
        `;
      } else if (item.itemType === "cabinet") {
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
              <strong>Floating Cabinet</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">
              ${item.cabinetWidthMm}mm × ${item.cabinetHeightMm}mm × ${item.cabinetDepthMm}mm
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">
              1
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">
              ${formatCurrency(item.manualPriceOverride)}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">
              <strong>${formatCurrency(item.manualPriceOverride)}</strong>
            </td>
          </tr>
        `;
      }
      return "";
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Quote - ${job.clientName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 20px;
        }
        .company-info {
          flex: 1;
        }
        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #4f46e5;
          margin: 0;
        }
        .logo {
          max-width: 150px;
          max-height: 80px;
        }
        .quote-number {
          text-align: right;
          font-size: 14px;
          color: #666;
        }
        .client-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          gap: 40px;
        }
        .info-section {
          flex: 1;
        }
        .info-section h3 {
          font-size: 12px;
          font-weight: bold;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 10px;
          margin-top: 0;
        }
        .info-section p {
          margin: 5px 0;
          font-size: 14px;
          line-height: 1.6;
        }
        .items-section {
          margin-bottom: 30px;
        }
        .items-section h2 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: #f3f4f6;
          padding: 12px;
          text-align: left;
          font-weight: bold;
          font-size: 13px;
          border-bottom: 2px solid #d1d5db;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .summary-box {
          width: 300px;
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #4f46e5;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .summary-row.total {
          font-size: 18px;
          font-weight: bold;
          border-top: 2px solid #d1d5db;
          padding-top: 10px;
          margin-top: 10px;
          color: #4f46e5;
        }
        .notes {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          font-size: 13px;
          line-height: 1.6;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
        }
        .status-badge {
          display: inline-block;
          background-color: #dbeafe;
          color: #1e40af;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ""}
            <p class="company-name">${companyName}</p>
          </div>
          <div class="quote-number">
            <p><strong>Quote ID:</strong> #${job.id}</p>
            <p><strong>Date:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
            <p><span class="status-badge">${job.status}</span></p>
          </div>
        </div>

        <!-- Client Info -->
        <div class="client-info">
          <div class="info-section">
            <h3>Bill To</h3>
            <p><strong>${job.clientName}</strong></p>
            ${job.clientEmail ? `<p>${job.clientEmail}</p>` : ""}
            ${job.clientPhone ? `<p>${job.clientPhone}</p>` : ""}
            ${job.clientAddress ? `<p>${job.clientAddress}</p>` : ""}
          </div>
        </div>

        <!-- Reference Image -->
        ${
          job.referenceImageUrl
            ? `
          <div class="reference-image" style="margin: 20px 0; page-break-inside: avoid;">
            <h3>Reference Image</h3>
            <img src="${job.referenceImageUrl}" alt="Reference" style="max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;" />
          </div>
        `
            : ""
        }

        <!-- Items -->
        <div class="items-section">
          <h2>Quote Details</h2>
          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Dimensions</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="summary">
          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(job.totalEstimate)}</span>
            </div>
            <div class="summary-row total">
              <span>Total Estimate:</span>
              <span>${formatCurrency(job.totalEstimate)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${
          job.notes
            ? `
          <div class="notes">
            <strong>Notes:</strong><br/>
            ${job.notes.replace(/\n/g, "<br/>")}
          </div>
        `
            : ""
        }

        <!-- Footer -->
        <div class="footer">
          <p>This quote is valid for 30 days from the date above.</p>
          <p>Thank you for your business!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

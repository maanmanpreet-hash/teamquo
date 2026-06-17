import type { ElevationDocument } from "./elevationScene";
import { createElevationPagePlan, type ElevationShape } from "./elevationLayout";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderShape(shape: ElevationShape) {
  if (shape.kind === "rect") {
    return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${shape.radius !== undefined ? ` rx="${shape.radius}"` : ""}${shape.fill ? ` fill="${escapeHtml(shape.fill)}"` : ` fill="none"`}${shape.stroke ? ` stroke="${escapeHtml(shape.stroke)}"` : ""}${shape.strokeWidth !== undefined ? ` stroke-width="${shape.strokeWidth}"` : ""}${shape.strokeOpacity !== undefined ? ` stroke-opacity="${shape.strokeOpacity}"` : ""}${shape.fillOpacity !== undefined ? ` fill-opacity="${shape.fillOpacity}"` : ""}></rect>`;
  }

  if (shape.kind === "line") {
    if (shape.closed) {
      return `<polygon points="${shape.points.join(" ")}"${shape.fill ? ` fill="${escapeHtml(shape.fill)}"` : ` fill="none"`}${shape.stroke ? ` stroke="${escapeHtml(shape.stroke)}"` : ""}${shape.strokeWidth !== undefined ? ` stroke-width="${shape.strokeWidth}"` : ""}${shape.strokeOpacity !== undefined ? ` stroke-opacity="${shape.strokeOpacity}"` : ""}></polygon>`;
    }
    return `<polyline points="${shape.points.join(" ")}" fill="none" stroke="${escapeHtml(shape.stroke)}"${shape.strokeWidth !== undefined ? ` stroke-width="${shape.strokeWidth}"` : ""}${shape.strokeOpacity !== undefined ? ` stroke-opacity="${shape.strokeOpacity}"` : ""}${shape.dash?.length ? ` stroke-dasharray="${shape.dash.join(" ")}"` : ""}></polyline>`;
  }

  if (shape.kind === "circle") {
    return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}"${shape.fill ? ` fill="${escapeHtml(shape.fill)}"` : ` fill="none"`}${shape.stroke ? ` stroke="${escapeHtml(shape.stroke)}"` : ""}${shape.strokeWidth !== undefined ? ` stroke-width="${shape.strokeWidth}"` : ""}></circle>`;
  }

  const anchor = shape.align === "center" ? "middle" : shape.align === "right" ? "end" : "start";
  const x = shape.align === "right" && shape.width ? shape.x + shape.width : shape.align === "center" && shape.width ? shape.x + shape.width / 2 : shape.x;
  return `<text x="${x}" y="${shape.y}" text-anchor="${anchor}" font-size="${shape.fontSize ?? 11}" font-weight="${shape.fontWeight ?? 400}" fill="${escapeHtml(shape.fill ?? "#475569")}">${escapeHtml(shape.text)}</text>`;
}

export function renderElevationPageSvg(page: ElevationDocument["pages"][number], document: ElevationDocument) {
  const plan = createElevationPagePlan(page, document);
  return `<svg viewBox="0 0 ${plan.width} ${plan.height}" role="img" aria-label="${escapeHtml(page.title)}">${plan.shapes.map(renderShape).join("")}</svg>`;
}

export function renderElevationDocumentHtml(document: ElevationDocument) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.documentTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: 100%; margin: 0; padding: 0; background: #ffffff; }
    body { font-family: Arial, sans-serif; color: #0f172a; }
    .page { width: 100vw; height: 100vh; background: #ffffff; }
    .page + .page { page-break-before: always; }
    .drawing { width: 100%; height: 100%; }
    .drawing svg { width: 100%; height: 100%; display: block; }
    @media print {
      html, body { width: 297mm; }
      .page { width: 297mm; height: 210mm; }
    }
  </style>
</head>
<body>
  ${document.pages.map(page => `<div class="page"><div class="drawing">${renderElevationPageSvg(page, document)}</div></div>`).join("")}
</body>
</html>`;
}

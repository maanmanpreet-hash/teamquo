import { type TvBackdropSetout } from "./tvSetout";

export interface TvBackdropSetoutDocument {
  quoteNumber: string;
  clientName: string;
  wallName: string;
  generatedDateLabel?: string;
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetHeightFromFloorMm?: number;
  setout: TvBackdropSetout;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatSetoutMm(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)} mm`;
}

function buildSetoutGeometry(document: TvBackdropSetoutDocument) {
  const { setout, cabinetWidthMm, cabinetHeightMm, cabinetHeightFromFloorMm } = document;
  const canvasWidth = 1123;
  const canvasHeight = 794;
  const leftPad = 118;
  const rightPad = 112;
  const topPad = 18;
  const bottomPad = 116;
  const availableWidth = canvasWidth - leftPad - rightPad;
  const availableHeight = canvasHeight - topPad - bottomPad;
  const scale = Math.min(availableWidth / setout.wallWidthMm, availableHeight / setout.wallHeightMm);
  const wallWidth = setout.wallWidthMm * scale;
  const wallHeight = setout.wallHeightMm * scale;
  const wallX = leftPad + (availableWidth - wallWidth) / 2;
  const wallY = topPad + (availableHeight - wallHeight) / 2;
  const floorY = wallY + wallHeight;
  const wallRight = wallX + wallWidth;

  const toX = (mm: number) => wallX + mm * scale;
  const toY = (afflMm: number) => floorY - afflMm * scale;

  const cabinetRect =
    cabinetWidthMm && cabinetHeightMm && cabinetHeightFromFloorMm !== undefined
      ? {
          x: toX((setout.wallWidthMm - cabinetWidthMm) / 2),
          y: toY(cabinetHeightFromFloorMm + cabinetHeightMm),
          width: cabinetWidthMm * scale,
          height: cabinetHeightMm * scale,
        }
      : null;

  return {
    canvasWidth,
    canvasHeight,
    wallX,
    wallY,
    wallWidth,
    wallHeight,
    wallRight,
    floorY,
    toX,
    toY,
    cabinetRect,
  };
}

function distributeLabelYs(values: number[], minY: number, maxY: number, minGap: number) {
  if (!values.length) return [];

  const positions = values.map(value => Math.max(minY, Math.min(maxY, value)));
  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index], positions[index - 1] + minGap);
  }

  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index], positions[index + 1] - minGap);
  }

  if (positions[0] < minY) {
    const shift = minY - positions[0];
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] += shift;
    }
  }

  if (positions[positions.length - 1] > maxY) {
    const shift = positions[positions.length - 1] - maxY;
    for (let index = 0; index < positions.length; index += 1) {
      positions[index] -= shift;
    }
  }

  return positions;
}

export function generateTvBackdropSetoutSvg(document: TvBackdropSetoutDocument) {
  const { setout } = document;
  const geometry = buildSetoutGeometry(document);
  const {
    canvasWidth,
    canvasHeight,
    wallX,
    wallY,
    wallWidth,
    wallHeight,
    wallRight,
    floorY,
    toX,
    toY,
    cabinetRect,
  } = geometry;

  const backdropX = toX(setout.backdropLeftMm);
  const backdropY = toY(setout.backdropTopAfflMm);
  const backdropWidth = (setout.backdropRightMm - setout.backdropLeftMm) * (wallWidth / setout.wallWidthMm);
  const backdropHeight = (setout.backdropTopAfflMm - setout.backdropBottomAfflMm) * (wallHeight / setout.wallHeightMm);
  const tvX = toX(setout.tvLeftMm);
  const tvY = toY(setout.tvTopAfflMm);
  const tvWidth = (setout.tvRightMm - setout.tvLeftMm) * (wallWidth / setout.wallWidthMm);
  const tvHeight = (setout.tvTopAfflMm - setout.tvBottomAfflMm) * (wallHeight / setout.wallHeightMm);
  const centreX = toX(setout.wallCentreX);

  const marks = [
    {
      label: "Cabinet bottom",
      value: document.setout.cabinetBottomAfflMm,
      y: document.setout.cabinetBottomAfflMm !== undefined ? toY(document.setout.cabinetBottomAfflMm) : undefined,
      witnessX: cabinetRect ? cabinetRect.x : wallX,
    },
    {
      label: "Cabinet top",
      value: document.setout.cabinetTopAfflMm,
      y: document.setout.cabinetTopAfflMm !== undefined ? toY(document.setout.cabinetTopAfflMm) : undefined,
      witnessX: cabinetRect ? cabinetRect.x : wallX,
    },
    { label: "TV bottom", value: setout.tvBottomAfflMm, y: toY(setout.tvBottomAfflMm), witnessX: tvX },
    { label: "TV top", value: setout.tvTopAfflMm, y: toY(setout.tvTopAfflMm), witnessX: tvX },
    { label: "Backdrop bottom", value: setout.backdropBottomAfflMm, y: toY(setout.backdropBottomAfflMm), witnessX: backdropX },
    { label: "Backdrop top", value: setout.backdropTopAfflMm, y: toY(setout.backdropTopAfflMm), witnessX: backdropX },
  ]
    .filter(mark => mark.value !== undefined && mark.y !== undefined)
    .map(mark => ({ ...mark, value: mark.value as number, y: mark.y as number }))
    .sort((a, b) => a.value - b.value);
  const adjustedMarkYs = distributeLabelYs(
    marks.map(mark => mark.y),
    wallY + 24,
    floorY - 18,
    40
  );
  const leftRailX = wallX - 22;
  const leftTextX = 18;
  const leftLeaderEndX = 104;
  const bottomDimY = floorY + 28;
  const backdropDimY = floorY + 62;
  const tvDimY = floorY + 96;
  const wallDimY = floorY + 130;
  const rightDimGapX = wallRight + 24;
  const rightDimCabinetX = wallRight + 54;
  const rightLabelAnchorX = canvasWidth - 16;
  const rightLeaderEndX = canvasWidth - 88;

  const drawCalloutLabel = (
    label: string,
    value: number,
    x: number,
    y: number,
    textAnchor: "start" | "end" = "start"
  ) => `
    <text x="${x}" y="${y - 4}" text-anchor="${textAnchor}" font-size="11" font-weight="600" fill="#0f172a">${escapeHtml(label)}</text>
    <text x="${x}" y="${y + 11}" text-anchor="${textAnchor}" font-size="11" fill="#334155">${escapeHtml(formatSetoutMm(value))}</text>
  `;

  const drawInlineDimLabel = (
    text: string,
    centerX: number,
    y: number,
    emphasized = false
  ) => {
    const width = Math.max(48, text.length * (emphasized ? 6.9 : 6.5) + 18);
    return `
      <rect x="${centerX - width / 2}" y="${y - 16}" width="${width}" height="20" rx="3" fill="#ffffff"></rect>
      <text x="${centerX}" y="${y - 2}" text-anchor="middle" font-size="${emphasized ? 12 : 11}" font-weight="${emphasized ? 600 : 400}" fill="#0f172a">${escapeHtml(text)}</text>
    `;
  };

  const drawRightTag = (label: string, value: number, dimX: number, centerY: number, offsetY = 0) => {
    const labelY = centerY + offsetY;
    return `
      <polyline points="${dimX},${centerY} ${rightLeaderEndX},${centerY}" fill="none" stroke="#64748b" stroke-width="1.2"></polyline>
      ${drawCalloutLabel(label, value, rightLabelAnchorX, labelY, "end")}
    `;
  };

  return `
    <svg viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-label="${escapeHtml(document.wallName)} TV backdrop setout">
      <defs>
        <marker id="setout-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"></path>
        </marker>
      </defs>
      <rect x="1" y="1" width="${canvasWidth - 2}" height="${canvasHeight - 2}" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"></rect>
      <rect x="${wallX}" y="${wallY}" width="${wallWidth}" height="${wallHeight}" fill="#fcfcfd" stroke="#dbe3ea" stroke-width="1.5"></rect>
      <line x1="${wallX}" y1="${floorY}" x2="${wallRight}" y2="${floorY}" stroke="#0f172a" stroke-width="3"></line>
      <line x1="${wallX}" y1="${wallY}" x2="${wallRight}" y2="${wallY}" stroke="#cbd5e1" stroke-width="1.25"></line>
      <line x1="${centreX}" y1="${wallY}" x2="${centreX}" y2="${floorY}" stroke="#dbe3ea" stroke-width="1" stroke-dasharray="6 6"></line>

      ${cabinetRect ? `<rect x="${cabinetRect.x}" y="${cabinetRect.y}" width="${cabinetRect.width}" height="${cabinetRect.height}" rx="4" fill="#e2e8f0" stroke="#64748b" stroke-width="2"></rect>` : ""}
      <rect x="${backdropX}" y="${backdropY}" width="${backdropWidth}" height="${backdropHeight}" rx="5" fill="#eef2ff" stroke="#334155" stroke-width="2.5"></rect>
      <rect x="${tvX}" y="${tvY}" width="${tvWidth}" height="${tvHeight}" rx="4" fill="#111827" stroke="#0f172a" stroke-width="2"></rect>

      <text x="${wallX + 6}" y="${floorY - 10}" font-size="10" fill="#64748b">Floor</text>
      <text x="${wallX + 6}" y="${wallY + 14}" font-size="10" fill="#64748b">Wall top</text>

      ${marks
        .map(
          (mark, index) => `
        <polyline points="${mark.witnessX},${mark.y} ${leftRailX},${mark.y} ${leftRailX},${adjustedMarkYs[index]} ${leftLeaderEndX},${adjustedMarkYs[index]}" fill="none" stroke="#64748b" stroke-width="1.4"></polyline>
        <circle cx="${mark.witnessX}" cy="${mark.y}" r="2.1" fill="#334155"></circle>
        ${drawCalloutLabel(mark.label, mark.value, leftTextX, adjustedMarkYs[index])}
      `
        )
        .join("")}

      <line x1="${wallX}" y1="${floorY}" x2="${wallX}" y2="${wallDimY}" stroke="#cbd5e1" stroke-width="1"></line>
      <line x1="${backdropX}" y1="${floorY}" x2="${backdropX}" y2="${backdropDimY}" stroke="#cbd5e1" stroke-width="1"></line>
      <line x1="${backdropX + backdropWidth}" y1="${floorY}" x2="${backdropX + backdropWidth}" y2="${backdropDimY}" stroke="#cbd5e1" stroke-width="1"></line>
      <line x1="${tvX}" y1="${floorY}" x2="${tvX}" y2="${tvDimY}" stroke="#cbd5e1" stroke-width="1"></line>
      <line x1="${tvX + tvWidth}" y1="${floorY}" x2="${tvX + tvWidth}" y2="${tvDimY}" stroke="#cbd5e1" stroke-width="1"></line>
      <line x1="${wallRight}" y1="${floorY}" x2="${wallRight}" y2="${wallDimY}" stroke="#cbd5e1" stroke-width="1"></line>

      <line x1="${wallX}" y1="${bottomDimY}" x2="${backdropX}" y2="${bottomDimY}" stroke="#64748b" stroke-width="1.5" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
      ${drawInlineDimLabel(`Side ${formatSetoutMm(setout.sideMarginMm)}`, (wallX + backdropX) / 2, bottomDimY)}

      <line x1="${backdropX + backdropWidth}" y1="${bottomDimY}" x2="${wallRight}" y2="${bottomDimY}" stroke="#64748b" stroke-width="1.5" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
      ${drawInlineDimLabel(`Side ${formatSetoutMm(setout.sideMarginMm)}`, (backdropX + backdropWidth + wallRight) / 2, bottomDimY)}

      <line x1="${backdropX}" y1="${backdropDimY}" x2="${backdropX + backdropWidth}" y2="${backdropDimY}" stroke="#475569" stroke-width="1.5" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
      ${drawInlineDimLabel(`Backdrop ${formatSetoutMm(setout.backdropWidthMm)}`, backdropX + backdropWidth / 2, backdropDimY)}

      <line x1="${tvX}" y1="${tvDimY}" x2="${tvX + tvWidth}" y2="${tvDimY}" stroke="#475569" stroke-width="1.5" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
      ${drawInlineDimLabel(`TV ${formatSetoutMm(setout.tvWidthMm)}`, tvX + tvWidth / 2, tvDimY)}

      <line x1="${wallX}" y1="${wallDimY}" x2="${wallRight}" y2="${wallDimY}" stroke="#64748b" stroke-width="1.5" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
      ${drawInlineDimLabel(`Wall ${formatSetoutMm(setout.wallWidthMm)}`, wallX + wallWidth / 2, wallDimY, true)}

      ${setout.actualCabinetToTvGapMm !== undefined && setout.cabinetTopAfflMm !== undefined ? `
        <line x1="${wallRight}" y1="${toY(setout.cabinetTopAfflMm)}" x2="${rightDimGapX}" y2="${toY(setout.cabinetTopAfflMm)}" stroke="#cbd5e1" stroke-width="1"></line>
        <line x1="${wallRight}" y1="${toY(setout.tvBottomAfflMm)}" x2="${rightDimGapX}" y2="${toY(setout.tvBottomAfflMm)}" stroke="#cbd5e1" stroke-width="1"></line>
        <line x1="${rightDimGapX}" y1="${toY(setout.cabinetTopAfflMm)}" x2="${rightDimGapX}" y2="${toY(setout.tvBottomAfflMm)}" stroke="#475569" stroke-width="1.5" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
        ${drawRightTag("Gap", setout.actualCabinetToTvGapMm, rightDimGapX, (toY(setout.cabinetTopAfflMm) + toY(setout.tvBottomAfflMm)) / 2, -8)}
      ` : ""}

      ${setout.cabinetHeightMm !== undefined && setout.cabinetBottomAfflMm !== undefined ? `
        <line x1="${wallRight}" y1="${toY(setout.cabinetBottomAfflMm)}" x2="${rightDimCabinetX}" y2="${toY(setout.cabinetBottomAfflMm)}" stroke="#cbd5e1" stroke-width="1"></line>
        <line x1="${wallRight}" y1="${toY(setout.cabinetTopAfflMm || setout.cabinetBottomAfflMm + setout.cabinetHeightMm)}" x2="${rightDimCabinetX}" y2="${toY(setout.cabinetTopAfflMm || setout.cabinetBottomAfflMm + setout.cabinetHeightMm)}" stroke="#cbd5e1" stroke-width="1"></line>
        <line x1="${rightDimCabinetX}" y1="${toY(setout.cabinetBottomAfflMm)}" x2="${rightDimCabinetX}" y2="${toY(setout.cabinetTopAfflMm || setout.cabinetBottomAfflMm + setout.cabinetHeightMm)}" stroke="#475569" stroke-width="1.5" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
        ${drawRightTag("Cabinet height", setout.cabinetHeightMm, rightDimCabinetX, (toY(setout.cabinetBottomAfflMm) + toY(setout.cabinetTopAfflMm || setout.cabinetBottomAfflMm + setout.cabinetHeightMm)) / 2, 14)}
      ` : ""}
    </svg>
  `;
}

export function generateTvBackdropSetoutHtml(document: TvBackdropSetoutDocument) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.quoteNumber)} ${escapeHtml(document.wallName)} Setout</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; background: #ffffff; }
    .page {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      background: #ffffff;
    }
    .drawing {
      width: 100%;
      height: 100%;
      background: #ffffff;
    }
    .drawing svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    @media print {
      .page {
        width: 297mm;
        height: 210mm;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="drawing">${generateTvBackdropSetoutSvg(document)}</div>
  </div>
</body>
</html>`;
}

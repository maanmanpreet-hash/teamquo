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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distributeLabelYs(values: number[], minY: number, maxY: number, minGap: number) {
  if (!values.length) return [];

  const positions = values.map(value => clamp(value, minY, maxY));
  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index], positions[index - 1] + minGap);
  }
  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index], positions[index + 1] - minGap);
  }
  if (positions[0] < minY) {
    const shift = minY - positions[0];
    for (let index = 0; index < positions.length; index += 1) positions[index] += shift;
  }
  if (positions[positions.length - 1] > maxY) {
    const shift = positions[positions.length - 1] - maxY;
    for (let index = 0; index < positions.length; index += 1) positions[index] -= shift;
  }

  return positions;
}

function buildSetoutGeometry(document: TvBackdropSetoutDocument) {
  const { setout, cabinetWidthMm, cabinetHeightMm, cabinetHeightFromFloorMm } = document;
  const canvasWidth = 1123;
  const canvasHeight = 794;
  const leftPad = 182;
  const rightPad = 164;
  const topPad = 42;
  const installStripHeight = 116;
  const bottomPad = 154;
  const availableWidth = canvasWidth - leftPad - rightPad;
  const availableHeight = canvasHeight - topPad - bottomPad - installStripHeight;
  const scale = Math.min(availableWidth / setout.wallWidthMm, availableHeight / setout.wallHeightMm);
  const wallWidth = setout.wallWidthMm * scale;
  const wallHeight = setout.wallHeightMm * scale;
  const wallX = leftPad + (availableWidth - wallWidth) / 2;
  const wallY = topPad + (availableHeight - wallHeight) / 2 + 16;
  const floorY = wallY + wallHeight;
  const wallRight = wallX + wallWidth;
  const installStripY = canvasHeight - installStripHeight;

  const toX = (mm: number) => wallX + mm * scale;
  const toY = (afflMm: number) => floorY - afflMm * scale;

  const cabinetTopAfflMm =
    setout.cabinetTopAfflMm ??
    (setout.cabinetBottomAfflMm !== undefined && setout.cabinetHeightMm !== undefined
      ? setout.cabinetBottomAfflMm + setout.cabinetHeightMm
      : undefined);

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
    installStripY,
    toX,
    toY,
    cabinetRect,
    cabinetTopAfflMm,
    scale,
  };
}

function drawValueTag(text: string, centerX: number, centerY: number, width = 96) {
  return `
    <rect x="${centerX - width / 2}" y="${centerY - 12}" width="${width}" height="24" rx="4" fill="#ffffff"></rect>
    <text x="${centerX}" y="${centerY + 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#0f172a">${escapeHtml(text)}</text>
  `;
}

function drawAfflLabel(label: string, value: number, x: number, y: number) {
  return `
    <text x="${x}" y="${y - 6}" font-size="12" font-weight="700" fill="#0f172a">${escapeHtml(label)}</text>
    <text x="${x}" y="${y + 12}" font-size="13" font-weight="700" fill="#1e293b">${escapeHtml(formatSetoutMm(value))}</text>
  `;
}

function drawInstallRow(label: string, value: number | undefined, x: number, y: number) {
  return `
    <text x="${x}" y="${y}" font-size="13" font-weight="700" fill="#0f172a">${escapeHtml(label)}:</text>
    <text x="${x + 180}" y="${y}" font-size="13" font-weight="600" fill="#0f172a">${escapeHtml(formatSetoutMm(value))}</text>
  `;
}

function drawSetoutRailRow(mark: { label: string; value: number; railY: number; objectY: number; witnessX: number }, railX: number, tickLength: number, labelX: number, valueX: number) {
  return `
    <line x1="${mark.witnessX}" y1="${mark.objectY}" x2="${railX - 18}" y2="${mark.objectY}" stroke="#475569" stroke-width="1.4" opacity="0.85"></line>
    <line x1="${railX - 18}" y1="${mark.objectY}" x2="${railX}" y2="${mark.railY}" stroke="#475569" stroke-width="1.4" opacity="0.85"></line>
    <circle cx="${mark.witnessX}" cy="${mark.objectY}" r="2.6" fill="#334155"></circle>
    <line x1="${railX}" y1="${mark.railY}" x2="${railX + tickLength}" y2="${mark.railY}" stroke="#334155" stroke-width="2"></line>
    <text x="${labelX}" y="${mark.railY - 6}" font-size="12" font-weight="700" fill="#0f172a">${escapeHtml(mark.label)}</text>
    <text x="${valueX}" y="${mark.railY + 14}" font-size="13" font-weight="700" fill="#1e293b">${escapeHtml(formatSetoutMm(mark.value))}</text>
  `;
}

function drawAttachedVerticalDimension(label: string, anchorX: number, topY: number, bottomY: number, value: number, tagX: number, tagWidth: number) {
  const x = anchorX;
  return `
    <line x1="${x - 14}" y1="${topY}" x2="${x}" y2="${topY}" stroke="#475569" stroke-width="1.2"></line>
    <line x1="${x - 14}" y1="${bottomY}" x2="${x}" y2="${bottomY}" stroke="#475569" stroke-width="1.2"></line>
    <line x1="${x}" y1="${topY}" x2="${x}" y2="${bottomY}" stroke="#334155" stroke-width="1.8" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
    ${drawValueTag(`${escapeHtml(label)} ${formatSetoutMm(value)}`, tagX, (topY + bottomY) / 2, tagWidth)}
  `;
}

function drawWidthDimension(label: string, x1: number, x2: number, y: number, value: number) {
  return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#94a3b8" stroke-opacity="0.45" stroke-width="1" marker-start="url(#setout-arrow)" marker-end="url(#setout-arrow)"></line>
    <text x="${(x1 + x2) / 2}" y="${y - 8}" font-size="11" fill="#475569" text-anchor="middle">${escapeHtml(label)}</text>
    <text x="${(x1 + x2) / 2}" y="${y + 14}" font-size="12" font-weight="600" fill="#475569" text-anchor="middle">${escapeHtml(formatSetoutMm(value))}</text>
  `;
}

export function generateTvBackdropSetoutSvg(document: TvBackdropSetoutDocument) {
  const { setout } = document;
  const {
    canvasWidth,
    canvasHeight,
    wallX,
    wallY,
    wallWidth,
    wallHeight,
    wallRight,
    floorY,
    installStripY,
    toX,
    toY,
    cabinetRect,
    cabinetTopAfflMm,
  } = buildSetoutGeometry(document);

  const backdropX = toX(setout.backdropLeftMm);
  const backdropY = toY(setout.backdropTopAfflMm);
  const backdropWidth = (setout.backdropRightMm - setout.backdropLeftMm) * (wallWidth / setout.wallWidthMm);
  const backdropHeight = (setout.backdropTopAfflMm - setout.backdropBottomAfflMm) * (wallHeight / setout.wallHeightMm);
  const tvX = toX(setout.tvLeftMm);
  const tvY = toY(setout.tvTopAfflMm);
  const tvWidth = (setout.tvRightMm - setout.tvLeftMm) * (wallWidth / setout.wallWidthMm);
  const tvHeight = (setout.tvTopAfflMm - setout.tvBottomAfflMm) * (wallHeight / setout.wallHeightMm);
  const centreX = toX(setout.wallCentreX);

  const afflMarks = [
    {
      label: "Cabinet bottom",
      value: setout.cabinetBottomAfflMm,
      objectY: setout.cabinetBottomAfflMm !== undefined ? toY(setout.cabinetBottomAfflMm) : undefined,
      witnessX: cabinetRect ? cabinetRect.x : backdropX,
    },
    {
      label: "Cabinet top",
      value: cabinetTopAfflMm,
      objectY: cabinetTopAfflMm !== undefined ? toY(cabinetTopAfflMm) : undefined,
      witnessX: cabinetRect ? cabinetRect.x : backdropX,
    },
    {
      label: "Backdrop bottom",
      value: setout.backdropBottomAfflMm,
      objectY: toY(setout.backdropBottomAfflMm),
      witnessX: backdropX,
    },
    {
      label: "TV bottom",
      value: setout.tvBottomAfflMm,
      objectY: toY(setout.tvBottomAfflMm),
      witnessX: tvX,
    },
    {
      label: "TV top",
      value: setout.tvTopAfflMm,
      objectY: toY(setout.tvTopAfflMm),
      witnessX: tvX,
    },
    {
      label: "Backdrop top",
      value: setout.backdropTopAfflMm,
      objectY: toY(setout.backdropTopAfflMm),
      witnessX: backdropX,
    },
  ]
    .filter(mark => mark.value !== undefined && mark.objectY !== undefined)
    .map(mark => ({ ...mark, value: mark.value as number, objectY: mark.objectY as number }))
    .sort((a, b) => a.value - b.value);

  const railX = wallX - 78;
  const railTop = wallY + 16;
  const railBottom = floorY - 16;
  const railCount = afflMarks.length;
  const railStep = railCount > 1 ? (railBottom - railTop) / (railCount - 1) : 0;
  const railMarks = afflMarks.map((mark, index) => ({
    ...mark,
    railY: railCount > 1 ? railBottom - index * railStep : (railTop + railBottom) / 2,
  }));
  const railLabelX = 18;
  const railValueX = 178;
  const railTickLength = 16;

  const widthDimBaseY = installStripY - 70;
  const widthDimStep = 18;
  const cabinetDimX = wallRight + 28;
  const gapDimX = wallRight + 82;
  const widthDims = [
    { label: "Side margin left", x1: wallX, x2: backdropX, value: setout.sideMarginMm },
    { label: "TV", x1: tvX, x2: tvX + tvWidth, value: setout.tvWidthMm },
    { label: "Backdrop", x1: backdropX, x2: backdropX + backdropWidth, value: setout.backdropWidthMm },
    { label: "Side margin right", x1: backdropX + backdropWidth, x2: wallRight, value: setout.sideMarginMm },
    { label: "Wall", x1: wallX, x2: wallRight, value: setout.wallWidthMm },
  ];

  const installRows = [
    { label: "Cabinet bottom", value: setout.cabinetBottomAfflMm },
    { label: "Cabinet top", value: cabinetTopAfflMm },
    { label: "Backdrop bottom", value: setout.backdropBottomAfflMm },
    { label: "TV bottom", value: setout.tvBottomAfflMm },
    { label: "TV top", value: setout.tvTopAfflMm },
    { label: "Backdrop top", value: setout.backdropTopAfflMm },
  ].filter(row => row.value !== undefined) as Array<{ label: string; value: number }>;
  const installColumnCount = 2;
  const installRowsPerColumn = Math.ceil(installRows.length / installColumnCount);
  const installColumnStartX = 30;
  const installColumnSpacing = 392;
  const installBaseY = installStripY + 52;
  const installRowGap = 24;

  return `
    <svg viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-label="${escapeHtml(document.wallName)} TV backdrop setout">
      <defs>
        <marker id="setout-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"></path>
        </marker>
      </defs>

      <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff"></rect>

      <line x1="${railX}" y1="${railTop}" x2="${railX}" y2="${railBottom}" stroke="#64748b" stroke-width="1.4" opacity="0.35"></line>
      <line x1="${railX}" y1="${railTop}" x2="${railX + railTickLength}" y2="${railTop}" stroke="#64748b" stroke-width="1.4" opacity="0.35"></line>
      <line x1="${railX}" y1="${railBottom}" x2="${railX + railTickLength}" y2="${railBottom}" stroke="#64748b" stroke-width="1.4" opacity="0.35"></line>

      <rect x="${wallX}" y="${wallY}" width="${wallWidth}" height="${wallHeight}" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8" stroke-opacity="0.45"></rect>
      <line x1="${wallX}" y1="${wallY}" x2="${wallRight}" y2="${wallY}" stroke="#cbd5e1" stroke-opacity="0.35" stroke-width="1"></line>
      <line x1="${wallX}" y1="${floorY}" x2="${wallRight}" y2="${floorY}" stroke="#0f172a" stroke-width="3"></line>
      <line x1="${centreX}" y1="${wallY}" x2="${centreX}" y2="${floorY}" stroke="#cbd5e1" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="5 6"></line>

      ${cabinetRect ? `<rect x="${cabinetRect.x}" y="${cabinetRect.y}" width="${cabinetRect.width}" height="${cabinetRect.height}" rx="3" fill="#dbe3ef" stroke="#64748b" stroke-width="2"></rect>` : ""}
      <rect x="${backdropX}" y="${backdropY}" width="${backdropWidth}" height="${backdropHeight}" rx="4" fill="#eef2ff" stroke="#334155" stroke-width="2.5"></rect>
      <rect x="${tvX}" y="${tvY}" width="${tvWidth}" height="${tvHeight}" rx="4" fill="#111827" stroke="#0f172a" stroke-width="2"></rect>

      <text x="${wallX + 6}" y="${wallY - 8}" font-size="10" fill="#94a3b8">Wall top reference</text>
      <text x="${wallX + 6}" y="${floorY - 8}" font-size="10" fill="#64748b">Floor</text>

      ${railMarks.map(mark => drawSetoutRailRow(mark, railX, railTickLength, railLabelX, railValueX)).join("")}

      ${setout.cabinetHeightMm !== undefined && setout.cabinetBottomAfflMm !== undefined && cabinetTopAfflMm !== undefined ? drawAttachedVerticalDimension(
        "Cabinet height",
        cabinetDimX,
        toY(cabinetTopAfflMm),
        toY(setout.cabinetBottomAfflMm),
        setout.cabinetHeightMm,
        cabinetDimX + 70,
        164
      ) : ""}

      ${setout.actualCabinetToTvGapMm !== undefined && cabinetTopAfflMm !== undefined ? drawAttachedVerticalDimension(
        "Gap",
        gapDimX,
        toY(cabinetTopAfflMm),
        toY(setout.tvBottomAfflMm),
        setout.actualCabinetToTvGapMm,
        gapDimX + 56,
        108
      ) : ""}

      ${widthDims.map((dim, index) => drawWidthDimension(dim.label, dim.x1, dim.x2, widthDimBaseY + index * widthDimStep, dim.value)).join("")}

      <rect x="0" y="${installStripY}" width="${canvasWidth}" height="${canvasHeight - installStripY}" fill="#f8fafc"></rect>
      <text x="30" y="${installStripY + 26}" font-size="15" font-weight="700" fill="#0f172a">MARK FROM FLOOR</text>
      <line x1="30" y1="${installStripY + 34}" x2="280" y2="${installStripY + 34}" stroke="#cbd5e1" stroke-width="1"></line>
      ${installRows.map((row, index) => {
        const columnIndex = Math.floor(index / installRowsPerColumn);
        const rowIndex = index % installRowsPerColumn;
        const columnX = installColumnStartX + columnIndex * installColumnSpacing;
        return drawInstallRow(row.label, row.value, columnX, installBaseY + rowIndex * installRowGap);
      }).join("")}
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
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #ffffff; }
    body { font-family: Arial, sans-serif; color: #0f172a; }
    .page { width: 100vw; height: 100vh; background: #ffffff; }
    .drawing { width: 100%; height: 100%; }
    .drawing svg { width: 100%; height: 100%; display: block; }
    @media print {
      html, body { width: 297mm; height: 210mm; }
      .page { width: 297mm; height: 210mm; }
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

import type {
  ElevationDocument,
  ElevationHorizontalDimension,
  ElevationMarkList,
  ElevationPage,
  ElevationRailMark,
  ElevationSceneObject,
  ElevationVerticalDimension,
} from "./elevationScene";

type ShapeFill = string | undefined;

export type ElevationShape =
  | {
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: ShapeFill;
      stroke?: string;
      strokeWidth?: number;
      strokeOpacity?: number;
      fillOpacity?: number;
      radius?: number;
    }
  | {
      kind: "line";
      points: number[];
      stroke: string;
      strokeWidth?: number;
      strokeOpacity?: number;
      dash?: number[];
      closed?: boolean;
      fill?: ShapeFill;
    }
  | {
      kind: "circle";
      x: number;
      y: number;
      radius: number;
      fill?: ShapeFill;
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      fontSize?: number;
      fontWeight?: number;
      fill?: string;
      align?: "left" | "center" | "right";
      width?: number;
    };

export interface ElevationPagePlan {
  width: number;
  height: number;
  shapes: ElevationShape[];
}

type PageBounds = {
  canvasWidth: number;
  canvasHeight: number;
  sheetMargin: number;
  titleBandHeight: number;
  drawingLeft: number;
  drawingRight: number;
  drawingTop: number;
  drawingBottom: number;
  floorY: number;
  scale: number;
};

function isInstallerLayout(layout: ElevationPage["layout"]) {
  return layout === "installer_setout" || layout === "tv_installer_setout" || layout === "tv_installer_affl";
}

function isInstallerPage(page: ElevationPage) {
  return page.annotationMode === "installer" || isInstallerLayout(page.layout);
}

function isTvFrontLayout(page: ElevationPage) {
  return page.layout === "tv_front_elevation";
}

function isTvInstallerAfflLayout(page: ElevationPage) {
  return page.layout === "tv_installer_affl";
}

function formatMm(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)} mm`;
}

function getPageBounds(page: ElevationPage): PageBounds {
  const canvasWidth = 1123;
  const canvasHeight = 794;
  const sheetMargin = 28;
  const titleBandHeight = 56;

  if (isInstallerPage(page)) {
    const leftRailWidth = 238;
    const rightDimensionWidth = 92;
    const markListHeight = 118;
    const widthBandHeight = 118;
    const drawingTop = sheetMargin + titleBandHeight + 16;
    const drawingBottom = canvasHeight - sheetMargin - markListHeight - widthBandHeight - 12;
    const drawingLeft = sheetMargin + leftRailWidth;
    const drawingRight = canvasWidth - sheetMargin - rightDimensionWidth;
    const scale = Math.min(
      (drawingRight - drawingLeft) / page.sceneWidthMm,
      (drawingBottom - drawingTop) / page.sceneHeightMm
    );
    return { canvasWidth, canvasHeight, sheetMargin, titleBandHeight, drawingLeft, drawingRight, drawingTop, drawingBottom, floorY: drawingBottom, scale };
  }

  if (isTvFrontLayout(page)) {
    const rightDimensionWidth = 148;
    const bottomDimensionHeight = 118;
    const drawingTop = sheetMargin + titleBandHeight + 18;
    const drawingBottom = canvasHeight - sheetMargin - bottomDimensionHeight;
    const drawingLeft = sheetMargin + 36;
    const drawingRight = canvasWidth - sheetMargin - rightDimensionWidth;
    const scale = Math.min(
      (drawingRight - drawingLeft) / page.sceneWidthMm,
      (drawingBottom - drawingTop) / page.sceneHeightMm
    );
    return { canvasWidth, canvasHeight, sheetMargin, titleBandHeight, drawingLeft, drawingRight, drawingTop, drawingBottom, floorY: drawingBottom, scale };
  }

  const rightDimensionWidth = 190;
  const bottomDimensionHeight = 132;
  const drawingTop = sheetMargin + titleBandHeight + 14;
  const drawingBottom = canvasHeight - sheetMargin - bottomDimensionHeight;
  const drawingLeft = sheetMargin + 24;
  const drawingRight = canvasWidth - sheetMargin - rightDimensionWidth;
  const scale = Math.min(
    (drawingRight - drawingLeft) / page.sceneWidthMm,
    (drawingBottom - drawingTop) / page.sceneHeightMm
  );
  return { canvasWidth, canvasHeight, sheetMargin, titleBandHeight, drawingLeft, drawingRight, drawingTop, drawingBottom, floorY: drawingBottom, scale };
}

function toPageX(bounds: PageBounds, xMm: number) {
  return bounds.drawingLeft + xMm * bounds.scale;
}

function toPageY(bounds: PageBounds, yMm: number) {
  return bounds.floorY - yMm * bounds.scale;
}

function pushText(shapes: ElevationShape[], x: number, y: number, text: string, options?: Partial<Extract<ElevationShape, { kind: "text" }>>) {
  shapes.push({
    kind: "text",
    x,
    y,
    text,
    fontSize: options?.fontSize ?? 11,
    fontWeight: options?.fontWeight ?? 400,
    fill: options?.fill ?? "#475569",
    align: options?.align ?? "left",
    width: options?.width,
  });
}

function layoutSceneObject(object: ElevationSceneObject, bounds: PageBounds): ElevationShape[] {
  if (object.kind === "rect") {
    return [{
      kind: "rect",
      x: toPageX(bounds, object.xMm),
      y: toPageY(bounds, object.bottomMm + object.heightMm),
      width: object.widthMm * bounds.scale,
      height: object.heightMm * bounds.scale,
      fill: object.fill,
      stroke: object.stroke,
      strokeWidth: object.strokeWidth ?? 1.4,
      strokeOpacity: object.strokeOpacity,
      fillOpacity: object.fillOpacity,
      radius: object.radiusPx,
    }];
  }

  if (object.kind === "line") {
    return [{
      kind: "line",
      points: [
        toPageX(bounds, object.x1Mm),
        toPageY(bounds, object.y1Mm),
        toPageX(bounds, object.x2Mm),
        toPageY(bounds, object.y2Mm),
      ],
      stroke: object.stroke,
      strokeWidth: object.strokeWidth ?? 1,
      strokeOpacity: object.strokeOpacity,
      dash: object.dashArray ? object.dashArray.split(" ").map(Number) : undefined,
    }];
  }

  return [{
    kind: "text",
    x: toPageX(bounds, object.xMm),
    y: toPageY(bounds, object.yMm),
    text: object.text,
    fontSize: object.fontSizePx ?? 11,
    fontWeight: object.fontWeight ?? 400,
    fill: object.fill ?? "#475569",
    align: object.anchor === "middle" ? "center" : object.anchor === "end" ? "right" : "left",
  }];
}

function buildRailSlots(count: number, topY: number, bottomY: number) {
  if (count <= 1) return [(topY + bottomY) / 2];
  const normalized =
    count === 7
      ? [1, 0.835, 0.655, 0.485, 0.315, 0.15, 0]
      : count === 6
        ? [1, 0.82, 0.63, 0.45, 0.23, 0]
        : Array.from({ length: count }, (_, index) => 1 - index / (count - 1));
  return normalized.map(value => topY + (bottomY - topY) * value);
}

function addRailRow(shapes: ElevationShape[], mark: ElevationRailMark, rowY: number, railX: number, elbowX: number, labelRightX: number, bounds: PageBounds) {
  const targetY = toPageY(bounds, mark.targetYmm);
  const witnessX = toPageX(bounds, mark.witnessXmm);
  const guideEndX = mark.guideEndXmm !== undefined
    ? toPageX(bounds, mark.guideEndXmm)
    : Math.min(witnessX, bounds.drawingLeft + 46);
  shapes.push(
    { kind: "line", points: [railX, rowY, railX + 10, rowY], stroke: "#334155", strokeWidth: 1.4 },
    { kind: "line", points: [railX + 10, targetY, guideEndX, targetY], stroke: "#cbd5e1", strokeWidth: 0.9, dash: [4, 5], strokeOpacity: 0.65 },
  );
  pushText(shapes, labelRightX - 122, rowY - 14, mark.label, { fontSize: 11, fontWeight: 700, fill: "#0f172a", width: 122, align: "right" });
  pushText(shapes, labelRightX - 122, rowY + 4, formatMm(mark.valueMm), { fontSize: 12, fontWeight: 700, fill: "#1d4ed8", width: 122, align: "right" });
}

function addVerticalDimension(shapes: ElevationShape[], dimension: ElevationVerticalDimension, x: number, bounds: PageBounds) {
  const topY = toPageY(bounds, dimension.topYmm);
  const bottomY = toPageY(bounds, dimension.bottomYmm);
  const witnessX = toPageX(bounds, dimension.witnessXmm);
  const textX = dimension.side === "right" ? x + 8 : x - 120;
  shapes.push(
    { kind: "line", points: [witnessX, topY, x, topY], stroke: "#94a3b8", strokeWidth: 1 },
    { kind: "line", points: [witnessX, bottomY, x, bottomY], stroke: "#94a3b8", strokeWidth: 1 },
    { kind: "line", points: [x, topY, x, bottomY], stroke: "#334155", strokeWidth: 1.5 },
    { kind: "line", points: [x - 8, topY, x + 8, topY], stroke: "#64748b", strokeWidth: 1 },
    { kind: "line", points: [x - 8, bottomY, x + 8, bottomY], stroke: "#64748b", strokeWidth: 1 },
  );
  pushText(shapes, textX, (topY + bottomY) / 2 - 14, dimension.label, {
    fontSize: 11,
    fontWeight: 700,
    fill: "#0f172a",
    width: dimension.side === "right" ? 104 : 104,
    align: dimension.side === "right" ? "left" : "right",
  });
  pushText(shapes, textX, (topY + bottomY) / 2 + 3, formatMm(dimension.valueMm), {
    fontSize: 12,
    fontWeight: 700,
    fill: "#0f172a",
    width: dimension.side === "right" ? 104 : 104,
    align: dimension.side === "right" ? "left" : "right",
  });
}

function addHorizontalDimension(shapes: ElevationShape[], dimension: ElevationHorizontalDimension, y: number, bounds: PageBounds) {
  const x1 = toPageX(bounds, dimension.leftXmm);
  const x2 = toPageX(bounds, dimension.rightXmm);
  const spanWidth = Math.max(x2 - x1, 96);
  const textWidth = Math.min(Math.max(spanWidth - 18, 92), 144);
  const labelX = dimension.align === "start" ? x1 + 8 : (x1 + x2) / 2 - textWidth / 2;
  shapes.push(
    { kind: "line", points: [x1, y, x2, y], stroke: "#cbd5e1", strokeWidth: 1 },
    { kind: "line", points: [x1, y - 6, x1, y + 6], stroke: "#cbd5e1", strokeWidth: 1 },
    { kind: "line", points: [x2, y - 6, x2, y + 6], stroke: "#cbd5e1", strokeWidth: 1 },
  );
  pushText(shapes, labelX, y + 6, dimension.label, {
    fontSize: 10,
    fontWeight: 700,
    fill: "#334155",
    width: textWidth,
    align: dimension.align === "start" ? "left" : "center",
  });
  pushText(shapes, labelX, y + 22, formatMm(dimension.valueMm), {
    fontSize: 12,
    fontWeight: 700,
    fill: "#1d4ed8",
    width: textWidth,
    align: dimension.align === "start" ? "left" : "center",
  });
}

function addMarkList(shapes: ElevationShape[], markList: ElevationMarkList, bounds: PageBounds) {
  const boxTop = bounds.canvasHeight - bounds.sheetMargin - 110;
  const boxHeight = 110;
  const x = bounds.sheetMargin + 20;
  const width = bounds.canvasWidth - bounds.sheetMargin * 2 - 40;
  const headerY = boxTop + 24;
  const columnWidth = (width - 20) / 2;
  const half = Math.ceil(markList.rows.length / 2);
  shapes.push({
    kind: "rect",
    x: bounds.sheetMargin,
    y: boxTop,
    width: bounds.canvasWidth - bounds.sheetMargin * 2,
    height: boxHeight,
    fill: "#f8fafc",
    stroke: "#cbd5e1",
    strokeWidth: 1,
  });
  pushText(shapes, x, headerY - 12, markList.title, { fontSize: 13, fontWeight: 700, fill: "#0f172a" });
  shapes.push({ kind: "line", points: [x, headerY + 2, x + width, headerY + 2], stroke: "#cbd5e1", strokeWidth: 1 });
  markList.rows.forEach((row, index) => {
    const column = index < half ? 0 : 1;
    const rowIndex = column === 0 ? index : index - half;
    const rowX = x + column * (columnWidth + 20);
    const rowY = headerY + 8 + rowIndex * 18;
    shapes.push({ kind: "line", points: [rowX, rowY, rowX + columnWidth, rowY], stroke: "#cbd5e1", strokeWidth: 1 });
    pushText(shapes, rowX + 8, rowY + 3, `${row.label}:`, { fontSize: 11, fontWeight: 700, fill: "#334155" });
    pushText(shapes, rowX + columnWidth - 104, rowY + 3, formatMm(row.valueMm), { fontSize: 11, fontWeight: 700, fill: "#334155", width: 96, align: "right" });
  });
}

function distributeRailLabelYs(targetYs: number[], topY: number, bottomY: number, minGap: number) {
  if (targetYs.length === 0) return [];
  const placed = [...targetYs];
  placed[0] = Math.max(topY, Math.min(bottomY, placed[0]));
  for (let index = 1; index < placed.length; index += 1) {
    placed[index] = Math.max(targetYs[index], placed[index - 1] + minGap);
  }
  placed[placed.length - 1] = Math.min(placed[placed.length - 1], bottomY);
  for (let index = placed.length - 2; index >= 0; index -= 1) {
    placed[index] = Math.min(placed[index], placed[index + 1] - minGap);
  }
  return placed.map(value => Math.max(topY, Math.min(bottomY, value)));
}

function createTvInstallerAfflPagePlan(page: ElevationPage, document: ElevationDocument): ElevationPagePlan {
  const canvasWidth = 1123;
  const canvasHeight = 794;
  const sheetMargin = 28;
  const titleBandHeight = 56;
  const leftColumnWidth = 170;
  const drawingLeft = sheetMargin + leftColumnWidth;
  const drawingRight = canvasWidth - sheetMargin - 28;
  const drawingTop = sheetMargin + titleBandHeight + 16;
  const floorY = canvasHeight - sheetMargin - 178;
  const drawingBottom = floorY;
  const scale = Math.min(
    (drawingRight - drawingLeft) / page.sceneWidthMm,
    (drawingBottom - drawingTop) / page.sceneHeightMm
  );
  const bounds: PageBounds = {
    canvasWidth,
    canvasHeight,
    sheetMargin,
    titleBandHeight,
    drawingLeft,
    drawingRight,
    drawingTop,
    drawingBottom,
    floorY,
    scale,
  };
  const shapes: ElevationShape[] = [];

  shapes.push(
    { kind: "rect", x: 0, y: 0, width: canvasWidth, height: canvasHeight, fill: "#ffffff" },
    { kind: "rect", x: sheetMargin, y: sheetMargin, width: canvasWidth - sheetMargin * 2, height: canvasHeight - sheetMargin * 2, fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1.2 },
    { kind: "line", points: [sheetMargin, sheetMargin + titleBandHeight, canvasWidth - sheetMargin, sheetMargin + titleBandHeight], stroke: "#cbd5e1", strokeWidth: 1 }
  );

  pushText(shapes, sheetMargin + 18, sheetMargin + 12, document.documentTitle, { fontSize: 14, fontWeight: 700, fill: "#0f172a" });
  pushText(shapes, sheetMargin + 18, sheetMargin + 30, document.documentSubtitle, { fontSize: 11, fill: "#475569" });
  pushText(shapes, canvasWidth - sheetMargin - 180, sheetMargin + 12, document.metaRightTop || "Scale to fit A4 landscape", { fontSize: 11, fontWeight: 700, fill: "#334155", width: 180, align: "right" });
  pushText(shapes, canvasWidth - sheetMargin - 180, sheetMargin + 30, document.metaRightBottom || "", { fontSize: 11, fill: "#475569", width: 180, align: "right" });
  pushText(shapes, sheetMargin + 18, drawingTop + 4, "INSTALL HEIGHTS", { fontSize: 15, fontWeight: 700, fill: "#0f172a" });
  pushText(shapes, sheetMargin + 18, drawingTop + 24, "Mark these levels from floor before fixing backdrop.", { fontSize: 10, fill: "#64748b", width: leftColumnWidth - 20 });

  page.objects
    .filter(object => object.kind !== "text" || !["centre-line-label", "wall-top-label"].includes(object.id))
    .forEach(object => {
      shapes.push(...layoutSceneObject(object, bounds));
    });

  if (page.railMarks?.length) {
    const railX = drawingLeft - 36;
    const leftLabelX = sheetMargin + 14;
    const rightGuideX = drawingRight - 8;
    const rightLabelX = rightGuideX + 14;
    const topY = drawingTop + 82;
    const bottomY = floorY - 12;
    const sortedMarks = [...page.railMarks]
      .map(mark => ({ mark, targetY: toPageY(bounds, mark.targetYmm) }))
      .sort((left, right) => left.targetY - right.targetY);
    const leftMarks = sortedMarks.filter(entry => ["backdrop-top", "backdrop-bottom", "floor"].includes(entry.mark.id));
    const rightMarks = sortedMarks.filter(entry => !["backdrop-top", "backdrop-bottom", "floor"].includes(entry.mark.id));
    const leftDistributedYs = distributeRailLabelYs(leftMarks.map(entry => entry.targetY), topY, bottomY, 52);

    leftMarks.forEach((entry, index) => {
      const labelY = leftDistributedYs[index];
      const targetY = entry.targetY;
      const guideEndX = entry.mark.guideEndXmm !== undefined
        ? toPageX(bounds, entry.mark.guideEndXmm)
        : toPageX(bounds, entry.mark.witnessXmm);
      const labelBoxWidth = leftColumnWidth - 20;

      shapes.push(
        { kind: "line", points: [railX - 6, targetY, railX + 10, targetY], stroke: "#334155", strokeWidth: 1.5 },
        { kind: "line", points: [railX + 10, targetY, guideEndX, targetY], stroke: "#94a3b8", strokeWidth: 1.2, strokeOpacity: 0.95 },
        { kind: "circle", x: railX, y: targetY, radius: 3.6, fill: "#1d4ed8" }
      );
      shapes.push({
        kind: "rect",
        x: leftLabelX,
        y: labelY - 18,
        width: labelBoxWidth,
        height: 36,
        fill: "#ffffff",
      });
      pushText(shapes, leftLabelX, labelY - 13, entry.mark.label, {
        fontSize: 10,
        fontWeight: 700,
        fill: "#0f172a",
        width: labelBoxWidth - 10,
        align: "right",
      });
      pushText(shapes, leftLabelX, labelY + 3, formatMm(entry.mark.valueMm), {
        fontSize: 12,
        fontWeight: 700,
        fill: "#1d4ed8",
        width: labelBoxWidth - 10,
        align: "right",
      });
    });

    rightMarks.forEach(entry => {
      const targetY = entry.targetY;
      const label = entry.mark.label.replace(" bottom", "").replace(" top", "") === "TV" ? entry.mark.label : entry.mark.label;
      const guideStartX = entry.mark.guideEndXmm !== undefined
        ? toPageX(bounds, entry.mark.guideEndXmm)
        : toPageX(bounds, entry.mark.witnessXmm);
      shapes.push(
        { kind: "line", points: [guideStartX, targetY, rightGuideX, targetY], stroke: "#64748b", strokeWidth: 1.2, strokeOpacity: 0.95 },
        { kind: "line", points: [rightGuideX - 8, targetY, rightGuideX + 8, targetY], stroke: "#334155", strokeWidth: 1.4 },
        { kind: "circle", x: rightGuideX, y: targetY, radius: 3.6, fill: "#1d4ed8" }
      );
      pushText(shapes, rightLabelX, targetY - 13, entry.mark.label, {
        fontSize: 10,
        fontWeight: 700,
        fill: "#0f172a",
        width: 120,
        align: "left",
      });
      pushText(shapes, rightLabelX, targetY + 3, formatMm(entry.mark.valueMm), {
        fontSize: 12,
        fontWeight: 700,
        fill: "#1d4ed8",
        width: 120,
        align: "left",
      });
    });
  }

  if (page.markList) {
    const boxTop = canvasHeight - sheetMargin - 108;
    const width = canvasWidth - sheetMargin * 2;
    shapes.push({
      kind: "rect",
      x: sheetMargin,
      y: boxTop,
      width,
      height: 108,
      fill: "#f8fafc",
      stroke: "#cbd5e1",
      strokeWidth: 1,
    });
    pushText(shapes, sheetMargin + 18, boxTop + 16, page.markList.title, { fontSize: 12, fontWeight: 700, fill: "#0f172a" });
    const half = Math.ceil(page.markList.rows.length / 2);
    page.markList.rows.forEach((row, index) => {
      const column = index < half ? 0 : 1;
      const rowIndex = column === 0 ? index : index - half;
      const columnX = sheetMargin + 18 + column * ((width - 56) / 2);
      const rowY = boxTop + 34 + rowIndex * 20;
      shapes.push({ kind: "line", points: [columnX, rowY + 14, columnX + (width - 84) / 2, rowY + 14], stroke: "#dbe4ee", strokeWidth: 1 });
      pushText(shapes, columnX + 2, rowY, `${row.label}:`, { fontSize: 11, fontWeight: 700, fill: "#334155" });
      pushText(shapes, columnX + ((width - 84) / 2) - 92, rowY, formatMm(row.valueMm), { fontSize: 11, fontWeight: 700, fill: "#334155", width: 90, align: "right" });
    });
  }

  return {
    width: canvasWidth,
    height: canvasHeight,
    shapes,
  };
}

export function createElevationPagePlan(page: ElevationPage, document: ElevationDocument): ElevationPagePlan {
  if (isTvInstallerAfflLayout(page)) {
    return createTvInstallerAfflPagePlan(page, document);
  }

  const bounds = getPageBounds(page);
  const shapes: ElevationShape[] = [];

  shapes.push(
    { kind: "rect", x: 0, y: 0, width: bounds.canvasWidth, height: bounds.canvasHeight, fill: "#ffffff" },
    { kind: "rect", x: bounds.sheetMargin, y: bounds.sheetMargin, width: bounds.canvasWidth - bounds.sheetMargin * 2, height: bounds.canvasHeight - bounds.sheetMargin * 2, fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 1.2 },
    { kind: "line", points: [bounds.sheetMargin, bounds.sheetMargin + bounds.titleBandHeight, bounds.canvasWidth - bounds.sheetMargin, bounds.sheetMargin + bounds.titleBandHeight], stroke: "#cbd5e1", strokeWidth: 1 }
  );

  pushText(shapes, bounds.sheetMargin + 18, bounds.sheetMargin + 12, document.documentTitle, { fontSize: 14, fontWeight: 700, fill: "#0f172a" });
  pushText(shapes, bounds.sheetMargin + 18, bounds.sheetMargin + 30, document.documentSubtitle + (isInstallerPage(page) ? "" : ` | ${page.title}`), { fontSize: 11, fill: "#475569" });
  pushText(shapes, bounds.canvasWidth - bounds.sheetMargin - 180, bounds.sheetMargin + 12, document.metaRightTop || "Scale to fit A4 landscape", { fontSize: 11, fontWeight: 700, fill: "#334155", width: 180, align: "right" });
  pushText(shapes, bounds.canvasWidth - bounds.sheetMargin - 180, bounds.sheetMargin + 30, document.metaRightBottom || "", { fontSize: 11, fill: "#475569", width: 180, align: "right" });

  page.infoRows?.forEach((row, index) => {
    pushText(
      shapes,
      bounds.canvasWidth - bounds.sheetMargin - 280,
      bounds.sheetMargin + 48 + index * 16,
      `${row.label}: ${row.value}`,
      { fontSize: 10, fontWeight: 700, fill: "#334155", width: 280, align: "right" }
    );
  });

  page.objects.forEach(object => {
    shapes.push(...layoutSceneObject(object, bounds));
  });

  if (page.railMarks?.length) {
    const railX = bounds.drawingLeft - 90;
    const elbowX = bounds.drawingLeft - 16;
    const labelRightX = railX - 12;
    const slots = buildRailSlots(page.railMarks.length, bounds.drawingTop + 14, bounds.floorY - 8);
    shapes.push({ kind: "line", points: [railX, bounds.drawingTop - 6, railX, bounds.floorY + 4], stroke: "#334155", strokeWidth: 1.5 });
    page.railMarks.forEach((mark, index) => addRailRow(shapes, mark, slots[index], railX, elbowX, labelRightX, bounds));
  }

  page.verticalDimensions?.forEach(dimension => {
    const x = dimension.side === "right"
      ? bounds.drawingRight + 4 + dimension.stack * 14
      : bounds.drawingLeft - 24 - dimension.stack * 24;
    addVerticalDimension(shapes, dimension, x, bounds);
  });

  page.horizontalDimensions?.forEach(dimension => {
    const y = isInstallerPage(page)
      ? bounds.canvasHeight - bounds.sheetMargin - 96 - 104 + 2 + dimension.row * 18
      : isTvFrontLayout(page)
        ? bounds.canvasHeight - bounds.sheetMargin - 74 + dimension.row * 20
        : bounds.floorY + 34 + dimension.row * 24;
    addHorizontalDimension(shapes, dimension, y, bounds);
  });

  if (page.markList) {
    addMarkList(shapes, page.markList, bounds);
  }

  return {
    width: bounds.canvasWidth,
    height: bounds.canvasHeight,
    shapes,
  };
}

export function createElevationDocumentPlan(document: ElevationDocument) {
  return document.pages.map(page => createElevationPagePlan(page, document));
}

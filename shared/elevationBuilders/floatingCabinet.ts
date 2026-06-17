import type { ElevationDocument, ElevationPage } from "../elevationScene";
import {
  createDocument,
  createHorizontalDimension,
  createLineObject,
  createProductionPage,
  createRectObject,
  formatDocSubtitle,
  formatMm,
  normaliseSections,
  type FloatingCabinetSectionInput,
} from "../elevationEngine";

export interface FloatingCabinetElevationInput {
  quoteNumber: string;
  clientName: string;
  itemName: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  heightFromFloorMm: number;
  materialThicknessMm?: number;
  sections?: FloatingCabinetSectionInput[];
}

function buildFloatingCabinetFrontObjects(input: FloatingCabinetElevationInput): ElevationPage["objects"] {
  const objects: ElevationPage["objects"] = [
    createLineObject({
      kind: "line",
      id: "floor-line",
      family: "void",
      x1Mm: 0,
      y1Mm: 0,
      x2Mm: input.widthMm,
      y2Mm: 0,
      stroke: "#0f172a",
      strokeWidth: 3,
    }),
    createRectObject({
      kind: "rect",
      id: "cabinet-front",
      family: "cabinet",
      xMm: 0,
      bottomMm: input.heightFromFloorMm,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      fill: "#eef2ff",
      stroke: "#334155",
      strokeWidth: 2.2,
    }),
  ];

  let cursor = 0;
  normaliseSections(input.widthMm, input.sections)
    .slice(0, -1)
    .forEach((section, index) => {
      cursor += section.widthMm;
      objects.push(
        createLineObject({
          kind: "line",
          id: `front-divider-${index}`,
          family: "panel",
          x1Mm: cursor,
          y1Mm: input.heightFromFloorMm,
          x2Mm: cursor,
          y2Mm: input.heightFromFloorMm + input.heightMm,
          stroke: "#64748b",
          strokeWidth: 1.4,
        })
      );
    });

  return objects;
}

function buildFloatingCabinetInternalObjects(input: FloatingCabinetElevationInput, materialThicknessMm: number): ElevationPage["objects"] {
  const objects: ElevationPage["objects"] = [
    createLineObject({
      kind: "line",
      id: "floor-line",
      family: "void",
      x1Mm: 0,
      y1Mm: 0,
      x2Mm: input.widthMm,
      y2Mm: 0,
      stroke: "#0f172a",
      strokeWidth: 3,
    }),
    createRectObject({
      kind: "rect",
      id: "outer-carcass",
      family: "cabinet",
      xMm: 0,
      bottomMm: input.heightFromFloorMm,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      fill: "#ffffff",
      stroke: "#334155",
      strokeWidth: 2.2,
    }),
  ];

  const sections = normaliseSections(input.widthMm, input.sections);
  const innerBottom = input.heightFromFloorMm + materialThicknessMm;
  const innerTop = input.heightFromFloorMm + input.heightMm - materialThicknessMm;
  let cursor = materialThicknessMm;

  objects.push(
    createLineObject({
      kind: "line",
      id: "top-panel",
      family: "panel",
      x1Mm: materialThicknessMm,
      y1Mm: innerTop,
      x2Mm: input.widthMm - materialThicknessMm,
      y2Mm: innerTop,
      stroke: "#64748b",
      strokeWidth: 1.4,
    }),
    createLineObject({
      kind: "line",
      id: "bottom-panel",
      family: "panel",
      x1Mm: materialThicknessMm,
      y1Mm: innerBottom,
      x2Mm: input.widthMm - materialThicknessMm,
      y2Mm: innerBottom,
      stroke: "#64748b",
      strokeWidth: 1.4,
    })
  );

  sections.slice(0, -1).forEach((section, index) => {
    cursor += section.widthMm;
    objects.push(
      createRectObject({
        kind: "rect",
        id: `partition-${index}`,
        family: "panel",
        xMm: cursor - materialThicknessMm / 2,
        bottomMm: innerBottom,
        widthMm: materialThicknessMm,
        heightMm: innerTop - innerBottom,
        fill: "#e2e8f0",
        stroke: "#64748b",
        strokeWidth: 1.4,
      })
    );
  });

  let bayLeft = materialThicknessMm;
  sections.forEach((section, sectionIndex) => {
    section.shelfHeightsMm.forEach((shelfHeight, shelfIndex) => {
      const shelfY = input.heightFromFloorMm + shelfHeight;
      if (shelfY <= innerBottom || shelfY >= innerTop) return;
      const bayRight = bayLeft + section.widthMm - materialThicknessMm;
      objects.push(
        createLineObject({
          kind: "line",
          id: `shelf-${sectionIndex}-${shelfIndex}`,
          family: "shelf",
          x1Mm: bayLeft,
          y1Mm: shelfY,
          x2Mm: bayRight,
          y2Mm: shelfY,
          stroke: "#64748b",
          strokeWidth: 1.4,
        })
      );
    });
    bayLeft += section.widthMm;
  });

  return objects;
}

export function createFloatingCabinetElevationDocument(input: FloatingCabinetElevationInput): ElevationDocument {
  const materialThicknessMm = input.materialThicknessMm ?? 16;
  const sections = normaliseSections(input.widthMm, input.sections);
  const innerOpeningHeightMm = Math.max(input.heightMm - materialThicknessMm * 2, 0);

  let partitionCursor = 0;
  const frontDimensions: ElevationPage["horizontalDimensions"] = [
    createHorizontalDimension({
      id: "overall-width",
      label: "Overall width",
      valueMm: input.widthMm,
      leftXmm: 0,
      rightXmm: input.widthMm,
      witnessYmm: 0,
      row: 0,
      align: "start",
    }),
  ];

  sections.forEach((section, index) => {
    const left = partitionCursor;
    const right = partitionCursor + section.widthMm;
    frontDimensions.push(
      createHorizontalDimension({
        id: `section-width-${index}`,
        label: `Section ${index + 1} width`,
        valueMm: section.widthMm,
        leftXmm: left,
        rightXmm: right,
        witnessYmm: 0,
        row: index + 1,
        align: "start",
      })
    );
    partitionCursor = right;
  });

  let internalCursor = materialThicknessMm;
  const internalDimensions: ElevationPage["horizontalDimensions"] = [];
  sections.forEach((section, index) => {
    const left = internalCursor;
    const openingWidth = Math.max(section.widthMm - materialThicknessMm, 0);
    internalDimensions.push(
      createHorizontalDimension({
        id: `opening-width-${index}`,
        label: `Opening ${index + 1} width`,
        valueMm: openingWidth,
        leftXmm: left,
        rightXmm: left + openingWidth,
        witnessYmm: 0,
        row: index,
        align: "start",
      })
    );
    internalCursor += section.widthMm;
  });

  return createDocument(
    {
      documentTitle: "CABINET ELEVATION",
      documentSubtitle: formatDocSubtitle(input.quoteNumber, input.clientName, input.itemName),
      metaRightTop: "Production elevation",
      metaRightBottom: `${materialThicknessMm} mm melamine`,
      presetKind: "floating_cabinet",
    },
    [
      createProductionPage({
        id: "floating-cabinet-front",
        title: `${input.itemName} Front Elevation`,
        presetKind: "floating_cabinet",
        viewKind: "front",
        layout: "production_overall",
        sceneWidthMm: input.widthMm,
        sceneHeightMm: input.heightFromFloorMm + input.heightMm + 120,
        objects: buildFloatingCabinetFrontObjects(input),
        verticalDimensions: [
          {
            id: "height-from-floor",
            label: "Height from floor",
            valueMm: input.heightFromFloorMm,
            topYmm: input.heightFromFloorMm,
            bottomYmm: 0,
            witnessXmm: 0,
            side: "left",
            stack: 0,
          },
          {
            id: "overall-height",
            label: "Overall height",
            valueMm: input.heightMm,
            topYmm: input.heightFromFloorMm + input.heightMm,
            bottomYmm: input.heightFromFloorMm,
            witnessXmm: input.widthMm,
            side: "right",
            stack: 0,
          },
        ],
        horizontalDimensions: frontDimensions,
        infoRows: [
          { label: "Depth", value: formatMm(input.depthMm) },
          { label: "Material", value: formatMm(materialThicknessMm) },
        ],
      }),
      createProductionPage({
        id: "floating-cabinet-internal",
        title: `${input.itemName} Internal Carcass Breakdown`,
        presetKind: "floating_cabinet",
        viewKind: "internal",
        layout: "production_internal",
        sceneWidthMm: input.widthMm,
        sceneHeightMm: input.heightFromFloorMm + input.heightMm + 120,
        objects: buildFloatingCabinetInternalObjects(input, materialThicknessMm),
        verticalDimensions: [
          {
            id: "internal-opening-height",
            label: "Opening height",
            valueMm: innerOpeningHeightMm,
            topYmm: input.heightFromFloorMm + input.heightMm - materialThicknessMm,
            bottomYmm: input.heightFromFloorMm + materialThicknessMm,
            witnessXmm: input.widthMm,
            side: "right",
            stack: 0,
          },
        ],
        horizontalDimensions: internalDimensions,
        infoRows: [
          { label: "Material", value: formatMm(materialThicknessMm) },
          { label: "Depth", value: formatMm(input.depthMm) },
        ],
      }),
    ]
  );
}

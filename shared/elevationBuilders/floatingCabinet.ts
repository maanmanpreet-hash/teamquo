import type { ElevationDocument, ElevationPage } from "../elevationScene";
import {
  createDocument,
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

export function createFloatingCabinetElevationDocument(input: FloatingCabinetElevationInput): ElevationDocument {
  const sections = normaliseSections(input.widthMm, input.sections);

  return createDocument(
    {
      documentTitle: "CABINET ELEVATION",
      documentSubtitle: formatDocSubtitle(input.quoteNumber, input.clientName, input.itemName),
      metaRightTop: "Production elevation",
      metaRightBottom: "",
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
        horizontalDimensions: [
          {
            id: "overall-width",
            label: "Overall width",
            valueMm: input.widthMm,
            leftXmm: 0,
            rightXmm: input.widthMm,
            witnessYmm: 0,
            row: 0,
            align: "start",
          },
        ],
        infoRows: [
          { label: "Depth", value: formatMm(input.depthMm) },
        ],
      }),
    ]
  );
}

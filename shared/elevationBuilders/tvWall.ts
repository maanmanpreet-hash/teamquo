import type { ElevationDocument, ElevationPage } from "../elevationScene";
import type { TvBackdropSetout } from "../tvSetout";
import {
  createDocument,
  createHorizontalDimension,
  createInstallerPage,
  createProductionPage,
  createLineObject,
  createMarkList,
  createRailMark,
  createRectObject,
  createTextObject,
  createVerticalDimension,
  formatDocSubtitle,
  formatMm,
} from "../elevationEngine";
import { buildTvWallScene } from "./tvWallScene";

export interface TvBackdropSetoutDocumentInput {
  quoteNumber: string;
  clientName: string;
  wallName: string;
  generatedDateLabel?: string;
  cabinetWidthMm?: number;
  cabinetHeightMm?: number;
  cabinetHeightFromFloorMm?: number;
  cabinetSectionWidthsMm?: number[];
  setout: TvBackdropSetout;
}

function buildWallSceneObjects(
  input: TvBackdropSetoutDocumentInput,
  options?: {
    showInternalObjectWidths?: boolean;
    showCabinetDividers?: boolean;
  }
): ElevationPage["objects"] {
  const scene = buildTvWallScene(input);
  const tvMidY = scene.tvCentreAfflMm;
  const showInternalObjectWidths = options?.showInternalObjectWidths ?? true;
  const showCabinetDividers = options?.showCabinetDividers ?? true;

  const objects: ElevationPage["objects"] = [
    createLineObject({
      kind: "line",
      id: "wall-top-reference",
      family: "void",
      x1Mm: 0,
      y1Mm: scene.wallHeightMm,
      x2Mm: scene.wallWidthMm,
      y2Mm: scene.wallHeightMm,
      stroke: "#cbd5e1",
      strokeWidth: 1,
      strokeOpacity: 0.14,
    }),
    createLineObject({
      kind: "line",
      id: "floor-line",
      family: "void",
      x1Mm: 0,
      y1Mm: 0,
      x2Mm: scene.wallWidthMm,
      y2Mm: 0,
      stroke: "#0f172a",
      strokeWidth: 3,
    }),
    createLineObject({
      kind: "line",
      id: "centre-line",
      family: "panel",
      x1Mm: scene.featureCentreX,
      y1Mm: 0,
      x2Mm: scene.featureCentreX,
      y2Mm: scene.wallHeightMm + 24,
      stroke: "#94a3b8",
      strokeWidth: 1,
      strokeOpacity: 0.28,
      dashArray: "6 6",
    }),
    createTextObject({
      kind: "text",
      id: "centre-line-label",
      family: "panel",
      xMm: scene.featureCentreX,
      yMm: scene.wallHeightMm + 44,
      text: "Centreline",
      fontSizePx: 10,
      fill: "#cbd5e1",
      anchor: "middle",
    }),
    createTextObject({
      kind: "text",
      id: "wall-top-label",
      family: "panel",
      xMm: 40,
      yMm: scene.wallHeightMm + 18,
      text: "Wall top reference",
      fontSizePx: 10,
      fill: "#e2e8f0",
    }),
    createRectObject({
      kind: "rect",
      id: "backdrop",
      family: "backdrop",
      xMm: scene.backdropLeftMm,
      bottomMm: scene.backdropBottomAfflMm,
      widthMm: scene.backdropWidthMm,
      heightMm: scene.backdropHeightMm,
      fill: "#eef2ff",
      stroke: "#334155",
      strokeWidth: 2.2,
    }),
    createRectObject({
      kind: "rect",
      id: "tv",
      family: "tv",
      xMm: scene.tvLeftMm,
      bottomMm: scene.tvBottomAfflMm,
      widthMm: scene.tvWidthMm,
      heightMm: scene.tvHeightMm,
      fill: "#111827",
      stroke: "#111827",
      strokeWidth: 2,
    }),
  ];

  if (showInternalObjectWidths) {
    objects.push(
      createLineObject({
        kind: "line",
        id: "tv-width-line",
        family: "tv",
        x1Mm: scene.tvLeftMm + 70,
        y1Mm: tvMidY,
        x2Mm: scene.tvRightMm - 70,
        y2Mm: tvMidY,
        stroke: "#f8fafc",
        strokeWidth: 1.2,
      }),
      createLineObject({
        kind: "line",
        id: "tv-width-left-tick",
        family: "tv",
        x1Mm: scene.tvLeftMm + 70,
        y1Mm: tvMidY - 18,
        x2Mm: scene.tvLeftMm + 70,
        y2Mm: tvMidY + 18,
        stroke: "#f8fafc",
        strokeWidth: 1.2,
      }),
      createLineObject({
        kind: "line",
        id: "tv-width-right-tick",
        family: "tv",
        x1Mm: scene.tvRightMm - 70,
        y1Mm: tvMidY - 18,
        x2Mm: scene.tvRightMm - 70,
        y2Mm: tvMidY + 18,
        stroke: "#f8fafc",
        strokeWidth: 1.2,
      }),
      createTextObject({
        kind: "text",
        id: "tv-width-text",
        family: "tv",
        xMm: scene.tvCentreX,
        yMm: tvMidY - 10,
        text: formatMm(scene.tvWidthMm),
        fontSizePx: 12,
        fontWeight: 700,
        fill: "#f8fafc",
        anchor: "middle",
      })
    );
  }

  if (
    scene.cabinetLeftMm !== undefined &&
    scene.cabinetWidthMm !== undefined &&
    scene.cabinetHeightMm !== undefined &&
    scene.cabinetBottomAfflMm !== undefined
  ) {
    const cabinetMidY = scene.cabinetBottomAfflMm + scene.cabinetHeightMm / 2;
    const sectionWidths = (input.cabinetSectionWidthsMm || []).filter(value => value > 0);
    const sectionTotal = sectionWidths.reduce((sum, value) => sum + value, 0);
    const sectionScale = sectionTotal > 0 ? scene.cabinetWidthMm / sectionTotal : 1;
    objects.push(
      createRectObject({
        kind: "rect",
        id: "cabinet",
        family: "cabinet",
        xMm: scene.cabinetLeftMm,
        bottomMm: scene.cabinetBottomAfflMm,
        widthMm: scene.cabinetWidthMm,
        heightMm: scene.cabinetHeightMm,
        fill: "#d9e2f1",
        stroke: "#64748b",
        strokeWidth: 2,
      })
    );
    if (showInternalObjectWidths) {
      objects.push(
        createLineObject({
          kind: "line",
          id: "cabinet-width-line",
          family: "cabinet",
          x1Mm: scene.cabinetLeftMm + 80,
          y1Mm: cabinetMidY,
          x2Mm: scene.cabinetLeftMm + scene.cabinetWidthMm - 80,
          y2Mm: cabinetMidY,
          stroke: "#ffffff",
          strokeWidth: 1.2,
        }),
        createLineObject({
          kind: "line",
          id: "cabinet-width-left-tick",
          family: "cabinet",
          x1Mm: scene.cabinetLeftMm + 80,
          y1Mm: cabinetMidY - 16,
          x2Mm: scene.cabinetLeftMm + 80,
          y2Mm: cabinetMidY + 16,
          stroke: "#ffffff",
          strokeWidth: 1.2,
        }),
        createLineObject({
          kind: "line",
          id: "cabinet-width-right-tick",
          family: "cabinet",
          x1Mm: scene.cabinetLeftMm + scene.cabinetWidthMm - 80,
          y1Mm: cabinetMidY - 16,
          x2Mm: scene.cabinetLeftMm + scene.cabinetWidthMm - 80,
          y2Mm: cabinetMidY + 16,
          stroke: "#ffffff",
          strokeWidth: 1.2,
        }),
        createTextObject({
          kind: "text",
          id: "cabinet-width-text",
          family: "cabinet",
          xMm: scene.cabinetCentreX ?? scene.featureCentreX,
          yMm: cabinetMidY - 8,
          text: formatMm(scene.cabinetWidthMm),
          fontSizePx: 12,
          fontWeight: 700,
          fill: "#ffffff",
          anchor: "middle",
        })
      );
    }
    if (showCabinetDividers && sectionWidths.length > 1) {
      let cursor = scene.cabinetLeftMm;
      sectionWidths.slice(0, -1).forEach((sectionWidth, index) => {
        cursor += sectionWidth * sectionScale;
        objects.push(
          createLineObject({
            kind: "line",
            id: `cabinet-divider-${index}`,
            family: "panel",
            x1Mm: cursor,
            y1Mm: scene.cabinetBottomAfflMm!,
            x2Mm: cursor,
            y2Mm: scene.cabinetBottomAfflMm! + scene.cabinetHeightMm!,
            stroke: "#94a3b8",
            strokeWidth: 1.2,
            strokeOpacity: 0.85,
          })
        );
      });
    }
  }

  return objects;
}

export function createTvWallInstallerElevationDocument(input: TvBackdropSetoutDocumentInput): ElevationDocument {
  const { setout } = input;
  const scene = buildTvWallScene(input);
  const cabinetTopAfflMm =
    setout.cabinetTopAfflMm ??
    (setout.cabinetBottomAfflMm !== undefined && setout.cabinetHeightMm !== undefined
      ? setout.cabinetBottomAfflMm + setout.cabinetHeightMm
      : undefined);

  return createDocument(
    {
      documentTitle: "TV BACKDROP - ELEVATION (INSTALL SETOUT)",
      documentSubtitle: formatDocSubtitle(input.quoteNumber, input.clientName, input.wallName),
      metaRightTop: "Scale to fit A4 landscape",
      metaRightBottom: input.generatedDateLabel || "",
      presetKind: "tv_wall",
    },
    [
      createInstallerPage({
        id: "tv-wall-install",
        title: "TV Wall Installer Setout",
        presetKind: "tv_wall",
        viewKind: "setout",
        layout: "tv_installer_affl",
        sceneWidthMm: scene.wallWidthMm,
        sceneHeightMm: scene.wallHeightMm + 60,
        objects: buildWallSceneObjects(input, {
          showInternalObjectWidths: false,
          showCabinetDividers: false,
        }),
        railMarks: [
          createRailMark({
            id: "floor",
            label: "Floor (AFFL)",
            valueMm: 0,
            targetYmm: 0,
            witnessXmm: scene.wallWidthMm,
          }),
          ...(setout.cabinetBottomAfflMm !== undefined
            ? [createRailMark({
                id: "cabinet-bottom",
                label: "Cabinet bottom",
                valueMm: setout.cabinetBottomAfflMm,
                targetYmm: setout.cabinetBottomAfflMm,
                witnessXmm: scene.cabinetLeftMm ?? scene.backdropLeftMm,
              })]
            : []),
          ...(cabinetTopAfflMm !== undefined
            ? [createRailMark({
                id: "cabinet-top",
                label: "Cabinet top",
                valueMm: cabinetTopAfflMm,
                targetYmm: cabinetTopAfflMm,
                witnessXmm: scene.cabinetLeftMm ?? scene.backdropLeftMm,
              })]
            : []),
          createRailMark({
            id: "backdrop-bottom",
            label: "Backdrop bottom",
            valueMm: scene.backdropBottomAfflMm,
            targetYmm: scene.backdropBottomAfflMm,
            witnessXmm: scene.backdropLeftMm,
          }),
          createRailMark({
            id: "tv-bottom",
            label: "TV bottom",
            valueMm: scene.tvBottomAfflMm,
            targetYmm: scene.tvBottomAfflMm,
            witnessXmm: scene.tvLeftMm,
          }),
          createRailMark({
            id: "tv-top",
            label: "TV top",
            valueMm: scene.tvTopAfflMm,
            targetYmm: scene.tvTopAfflMm,
            witnessXmm: scene.tvLeftMm,
            guideEndXmm: scene.tvLeftMm,
          }),
          createRailMark({
            id: "backdrop-top",
            label: "Backdrop top",
            valueMm: scene.backdropTopAfflMm,
            targetYmm: scene.backdropTopAfflMm,
            witnessXmm: scene.backdropLeftMm,
            guideEndXmm: scene.backdropLeftMm,
          }),
        ],
        verticalDimensions: [],
        horizontalDimensions: [],
        markList: createMarkList({
          title: "MARK FROM FLOOR",
          rows: [
            ...(setout.cabinetBottomAfflMm !== undefined ? [{ label: "Cabinet bottom", valueMm: setout.cabinetBottomAfflMm }] : []),
            ...(cabinetTopAfflMm !== undefined ? [{ label: "Cabinet top", valueMm: cabinetTopAfflMm }] : []),
            { label: "Backdrop bottom", valueMm: scene.backdropBottomAfflMm },
            { label: "TV bottom", valueMm: scene.tvBottomAfflMm },
            { label: "TV top", valueMm: scene.tvTopAfflMm },
            { label: "Backdrop top", valueMm: scene.backdropTopAfflMm },
          ],
        }),
      }),
      createProductionPage({
        id: "tv-wall-front",
        title: `${input.wallName} Front Elevation`,
        presetKind: "tv_wall",
        viewKind: "front",
        layout: "tv_front_elevation",
        sceneWidthMm: scene.wallWidthMm,
        sceneHeightMm: scene.wallHeightMm + 60,
        objects: buildWallSceneObjects(input, {
          showInternalObjectWidths: true,
          showCabinetDividers: true,
        }),
        verticalDimensions: [
          {
            id: "backdrop-height",
            label: "Backdrop height",
            valueMm: scene.backdropHeightMm,
            topYmm: scene.backdropTopAfflMm,
            bottomYmm: scene.backdropBottomAfflMm,
            witnessXmm: scene.backdropRightMm,
            side: "right",
            stack: 0,
          },
          ...(scene.cabinetBottomAfflMm !== undefined && scene.cabinetTopAfflMm !== undefined && scene.cabinetHeightMm !== undefined
            ? [{
                id: "cabinet-height-front",
                label: "Cabinet height",
                valueMm: scene.cabinetHeightMm,
                topYmm: scene.cabinetTopAfflMm,
                bottomYmm: scene.cabinetBottomAfflMm,
                witnessXmm: scene.cabinetRightMm ?? scene.backdropRightMm,
                side: "right" as const,
                stack: 1,
              }]
            : []),
          ...(scene.cabinetTopAfflMm !== undefined && scene.cabinetToTvGapMm !== undefined
            ? [{
                id: "gap-front",
                label: "Gap",
                valueMm: scene.cabinetToTvGapMm,
                topYmm: scene.tvBottomAfflMm,
                bottomYmm: scene.cabinetTopAfflMm,
                witnessXmm: scene.backdropRightMm,
                side: "right" as const,
                stack: 2,
              }]
            : []),
        ],
        horizontalDimensions: [
          {
            id: "wall-width-front",
            label: "Wall width",
            valueMm: scene.wallWidthMm,
            leftXmm: 0,
            rightXmm: scene.wallWidthMm,
            witnessYmm: 0,
            row: 0,
            align: "start",
          },
          {
            id: "backdrop-width-front",
            label: "Backdrop width",
            valueMm: scene.backdropWidthMm,
            leftXmm: scene.backdropLeftMm,
            rightXmm: scene.backdropRightMm,
            witnessYmm: 0,
            row: 1,
            align: "center",
          },
        ],
      }),
    ]
  );
}

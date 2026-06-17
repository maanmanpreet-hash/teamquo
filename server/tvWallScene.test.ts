import { describe, expect, it } from "vitest";

import { buildTvWallScene } from "../shared/elevationBuilders/tvWallScene";
import { calculateTvBackdropSetout } from "../shared/tvSetout";

describe("buildTvWallScene", () => {
  it("centres the floating cabinet to the TV/backdrop feature composition", () => {
    const setout = calculateTvBackdropSetout({
      wallWidthMm: 3800,
      wallHeightMm: 2600,
      tvSizeInches: 75,
      backdropWidthMm: 2900,
      backdropHeightMm: 1220,
      cabinetBottomAfflMm: 200,
      cabinetHeightMm: 450,
      cabinetToTvGapMm: 200,
    });

    const scene = buildTvWallScene({
      cabinetWidthMm: 2100,
      cabinetHeightMm: 450,
      cabinetHeightFromFloorMm: 200,
      setout,
    });

    expect(scene.featureCentreX).toBe(1900);
    expect(scene.cabinetCentreX).toBe(1900);
    expect(scene.cabinetLeftMm).toBe(850);
    expect(scene.cabinetRightMm).toBe(2950);
    expect(scene.tvCentreX).toBe(1900);
  });
});

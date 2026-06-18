import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import fs from "fs";
import path from "path";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "user" | "admin" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("Cladding Procedures", () => {
  it("should list cladding variants", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw even if DB is unavailable
    const result = await caller.cladding.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should load stocked masterlist categories and products in preview mode", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const productTypes = await caller.products.listTypes();
    expect(productTypes.some(type => type.slug === "marble-sheet")).toBe(true);
    expect(productTypes.some(type => type.slug === "tv-backdrop")).toBe(true);

    const marbleSheetType = productTypes.find(type => type.slug === "marble-sheet");
    expect(marbleSheetType).toBeTruthy();

    const marbleProducts = await caller.products.listByType({ productTypeId: marbleSheetType!.id });
    expect(marbleProducts.length).toBeGreaterThan(0);
    expect(marbleProducts.every(product => product.productTypeId === marbleSheetType!.id)).toBe(true);
  });

  it("should validate cladding creation input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      // This should fail validation for missing required fields
      await caller.cladding.create({
        name: "",
        design: "",
        widthMm: -1,
        heightMm: -1,
        pricePerUnit: -1,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("too_small");
    }
  });

  it("should validate positive dimensions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.cladding.create({
        name: "Test",
        design: "Test",
        widthMm: 0,
        heightMm: 600,
        pricePerUnit: 5000,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("too_small");
    }
  });
});

describe("Jobs Procedures", () => {
  it("should list jobs for authenticated user", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobs.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should validate job creation input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      // Missing required clientName
      await caller.jobs.create({
        clientName: "",
        clientEmail: "test@example.com",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("too_small");
    }
  });

  it("should validate email format", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.jobs.create({
        clientName: "John Doe",
        clientEmail: "invalid-email",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("invalid");
    }
  });

  it("should validate job status update", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.jobs.updateStatus({
        id: 1,
        status: "invalid-status" as any,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("invalid_value");
    }
  });

  it("should save a quote with walls and products in preview mode", async () => {
    const ctx = createAuthContext(77);
    const caller = appRouter.createCaller(ctx);

    const saved = await caller.jobs.saveQuote({
      clientName: "Preview Client",
      clientPhone: "0400000000",
      operatorName: "Manpreet",
      totalEstimate: 150000,
      walls: [
        {
          wallType: "custom",
          wallName: "TV Wall",
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          notes: JSON.stringify({ obstructionStatus: "none", obstructionNotes: "" }),
          products: [
            {
              itemType: "tv_backdrop",
              productId: 701,
              wallWidthMm: 3800,
              wallHeightMm: 2600,
              quantityRequired: 1,
              unitPrice: 0,
              totalPrice: 0,
              itemDetails: JSON.stringify({ tvSizeInches: 75, includeTvBracket: true }),
            },
          ],
        },
      ],
    });

    expect(saved?.id).toBeTruthy();

    const loadedWalls = await caller.walls.getByJobId({ jobId: saved!.id });
    expect(loadedWalls).toHaveLength(1);
    expect(loadedWalls[0].products).toHaveLength(1);
    expect(loadedWalls[0].products[0]).toEqual(
      expect.objectContaining({
        itemType: "tv_backdrop",
        itemDetails: JSON.stringify({ tvSizeInches: 75, includeTvBracket: true }),
      })
    );
  });

  it("should persist preview-mode quotes to disk", async () => {
    const previewStorePath = path.join(process.cwd(), ".preview-quotes.test.json");
    fs.rmSync(previewStorePath, { force: true });
    process.env.PREVIEW_STORE_PATH = previewStorePath;

    const ctx = createAuthContext(178);
    const caller = appRouter.createCaller(ctx);

    const saved = await caller.jobs.saveQuote({
      clientName: "Persistent Client",
      totalEstimate: 123400,
      walls: [
        {
          wallType: "custom",
          wallName: "Persistent Wall",
          wallWidthMm: 3200,
          wallHeightMm: 2400,
          products: [
            {
              itemType: "mirror",
              productId: 401,
              quantityRequired: 1,
              unitPrice: 35000,
              totalPrice: 35000,
            },
          ],
        },
      ],
    });

    expect(saved?.id).toBeTruthy();
    expect(fs.existsSync(previewStorePath)).toBe(true);

    const persisted = JSON.parse(fs.readFileSync(previewStorePath, "utf8"));
    expect(persisted.jobs.some((job: any) => job.id === saved?.id && job.clientName === "Persistent Client")).toBe(true);
    expect(persisted.walls.some((wall: any) => wall.jobId === saved?.id && wall.wallName === "Persistent Wall")).toBe(true);
    expect(persisted.jobItems.some((item: any) => item.jobId === saved?.id && item.itemType === "mirror")).toBe(true);

    fs.rmSync(previewStorePath, { force: true });
    delete process.env.PREVIEW_STORE_PATH;
  });

  it("should persist client details and tv backdrop details through save and reload", async () => {
    const ctx = createAuthContext(111);
    const caller = appRouter.createCaller(ctx);

    const saved = await caller.jobs.saveQuote({
      clientName: "Saved Client",
      clientEmail: "saved@example.com",
      clientPhone: "0412345678",
      clientAddress: "99 Example Road",
      suburb: "Kalkallo",
      operatorName: "Manpreet",
      totalEstimate: 8000,
      walls: [
        {
          wallType: "custom",
          wallName: "TV Wall",
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          notes: JSON.stringify({ obstructionStatus: "none", obstructionNotes: "" }),
          products: [
            {
              itemType: "tv_backdrop",
              productId: 301,
              wallWidthMm: 3800,
              wallHeightMm: 2600,
              quantityRequired: 1,
              unitPrice: 8000,
              totalPrice: 8000,
              itemDetails: JSON.stringify({
                productType: "tv_backdrop",
                tvSizeInches: 75,
                backdropWidthMm: 2900,
                backdropHeightMm: 1220,
                tvBottomAfflMm: 700,
                cabinetTopAfflMm: 450,
                cabinetToTvGapMm: 250,
              }),
            },
          ],
        },
      ],
    });

    const savedJob = await caller.jobs.getById({ id: saved!.id });
    expect(savedJob?.clientName).toBe("Saved Client");
    expect(savedJob?.clientEmail).toBe("saved@example.com");
    expect(savedJob?.clientPhone).toBe("0412345678");
    expect(savedJob?.clientAddress).toBe("99 Example Road");
    expect(savedJob?.suburb).toBe("Kalkallo");

    const loadedWalls = await caller.walls.getByJobId({ jobId: saved!.id });
    expect(loadedWalls).toHaveLength(1);
    expect(loadedWalls[0].products[0]).toEqual(
      expect.objectContaining({
        itemType: "tv_backdrop",
        productId: 301,
        itemDetails: JSON.stringify({
          productType: "tv_backdrop",
          tvSizeInches: 75,
          backdropWidthMm: 2900,
          backdropHeightMm: 1220,
          tvBottomAfflMm: 700,
          cabinetTopAfflMm: 450,
          cabinetToTvGapMm: 250,
        }),
      })
    );
  });

  it("should replace existing walls and products when saving an existing quote", async () => {
    const ctx = createAuthContext(88);
    const caller = appRouter.createCaller(ctx);

    const initial = await caller.jobs.saveQuote({
      clientName: "Original Client",
      totalEstimate: 10000,
      walls: [
        {
          wallType: "custom",
          wallName: "Old Wall",
          wallWidthMm: 3000,
          wallHeightMm: 2400,
          notes: "old",
          products: [
            {
              itemType: "mirror",
              productId: 401,
              quantityRequired: 1,
              unitPrice: 35000,
              totalPrice: 35000,
            },
          ],
        },
      ],
    });

    const updated = await caller.jobs.saveQuote({
      id: initial!.id,
      clientName: "Updated Client",
      totalEstimate: 20000,
      walls: [
        {
          wallType: "garage",
          wallName: "New Wall",
          wallWidthMm: 4200,
          wallHeightMm: 2600,
          notes: "new",
          products: [
            {
              itemType: "fireplace",
              productId: 501,
              quantityRequired: 1,
              unitPrice: 70000,
              totalPrice: 70000,
            },
          ],
        },
      ],
    });

    expect(updated?.id).toBe(initial?.id);
    expect(updated?.clientName).toBe("Updated Client");

    const loadedWalls = await caller.walls.getByJobId({ jobId: initial!.id });
    expect(loadedWalls).toHaveLength(1);
    expect(loadedWalls[0].wallName).toBe("New Wall");
    expect(loadedWalls[0].products).toHaveLength(1);
    expect(loadedWalls[0].products[0].itemType).toBe("fireplace");
  });

  it("should delete a quote together with its saved walls and products", async () => {
    const ctx = createAuthContext(99);
    const caller = appRouter.createCaller(ctx);

    const saved = await caller.jobs.saveQuote({
      clientName: "Delete Me",
      totalEstimate: 5000,
      walls: [
        {
          wallType: "custom",
          wallName: "Disposable Wall",
          wallWidthMm: 2400,
          wallHeightMm: 2400,
          notes: "temporary",
          products: [
            {
              itemType: "mirror",
              productId: 401,
              quantityRequired: 1,
              unitPrice: 35000,
              totalPrice: 35000,
            },
          ],
        },
      ],
    });

    await expect(caller.walls.getByJobId({ jobId: saved!.id })).resolves.toHaveLength(1);
    await expect(caller.jobs.delete({ id: saved!.id })).resolves.toBe(true);
    await expect(caller.jobs.getById({ id: saved!.id })).resolves.toBeUndefined();
    await expect(caller.walls.getByJobId({ jobId: saved!.id })).rejects.toThrow("Unauthorized");
  });
});

describe("Job Items Procedures", () => {
  it("should validate job item creation input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.jobItems.create({
        jobId: 1,
        itemType: "invalid-type" as any,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("invalid_value");
    }
  });


  it("should validate positive quantities", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.jobItems.create({
        jobId: 1,
        itemType: "cladding",
        quantityRequired: 0,
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("too_small");
    }
  });

  it("should generate an internal material list html document in preview mode", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const saved = await caller.jobs.saveQuote({
      clientName: "Example Test Client",
      clientAddress: "123 Preview Street",
      operatorName: "Manpreet",
      totalEstimate: 52500,
      walls: [
        {
          wallType: "custom",
          wallName: "Living Room TV Wall",
          wallWidthMm: 3800,
          wallHeightMm: 2600,
          notes: JSON.stringify({ obstructionStatus: "none", obstructionNotes: "" }),
          products: [
            {
              itemType: "acoustic_panel",
              productId: 201,
              wallWidthMm: 3800,
              wallHeightMm: 2600,
              quantityRequired: 7,
              unitPrice: 7500,
              totalPrice: 52500,
              itemDetails: JSON.stringify({ fixingMethod: "none" }),
            },
            {
              itemType: "tv_backdrop",
              productId: 301,
              wallWidthMm: 3800,
              wallHeightMm: 2600,
              quantityRequired: 1,
              unitPrice: 8000,
              totalPrice: 8000,
              itemDetails: JSON.stringify({
                productType: "tv_backdrop",
                tvSizeInches: 86,
                tvWidthMm: 1900,
                tvHeightMm: 1069,
                backdropWidthMm: 2420,
                backdropHeightMm: 1220,
                tvBottomAfflMm: 700,
                cabinetTopAfflMm: 450,
                cabinetToTvGapMm: 250,
                includeTvBracket: true,
              }),
            },
          ],
        },
      ],
    });

    const result = await caller.jobItems.generateMaterialList({ jobId: saved.id });

    expect(result.quoteNumber).toBe(`Q-2026-${String(saved.id).padStart(4, "0")}`);
    expect(result.html).toContain("Material List");
    expect(result.html).toContain("Example Test Client");
    expect(result.html).toContain("PVC Marble Sheet 1220x3x2900mm");
    expect(result.html).not.toContain("Consolidated Totals");
    expect(result.html).not.toContain("Reference Material Cost");
    expect(result.html).not.toContain("Internal shopping list only.");
    expect(result.html).not.toContain("$");
  });
});


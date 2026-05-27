import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
});


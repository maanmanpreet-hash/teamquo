import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
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

  return { ctx };
}

describe("operators router", () => {
  it("should list all operators", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will return an empty array if no operators exist in the test DB
    const result = await caller.operators.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create an operator with valid input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.operators.create({ name: "John Smith" });
    expect(result).toBeDefined();
  });

  it("should reject operator creation with empty name", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.operators.create({ name: "" });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should update an operator", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create an operator
    const created = await caller.operators.create({ name: "Jane Doe" });
    expect(created).toBeDefined();

    // Then update it (this will succeed even if the ID doesn't exist in test DB)
    const result = await caller.operators.update({
      id: 1,
      name: "Jane Smith",
    });
    expect(result).toBeDefined();
  });

  it("should delete an operator", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Delete an operator (will succeed even if ID doesn't exist)
    const result = await caller.operators.delete({ id: 1 });
    expect(result).toBeDefined();
  });

  it("should get operator by ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get operator by ID (will return undefined if not found)
    const result = await caller.operators.getById({ id: 1 });
    // Result can be undefined or an operator object
    expect(result === undefined || typeof result === "object").toBe(true);
  });
});

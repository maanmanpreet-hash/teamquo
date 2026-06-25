import { describe, expect, it } from "vitest";
import { validateRuntimeConfiguration } from "./_core/runtimeConfig";

describe("validateRuntimeConfiguration", () => {
  it("allows non-production runs without deployment env", () => {
    expect(() =>
      validateRuntimeConfiguration({
        NODE_ENV: "development",
      })
    ).not.toThrow();
  });

  it("blocks production runs without a real database/auth configuration", () => {
    expect(() =>
      validateRuntimeConfiguration({
        NODE_ENV: "production",
        JWT_SECRET: "secret",
      })
    ).toThrow(/DATABASE_URL/);
  });

  it("allows an explicit local preview override", () => {
    expect(() =>
      validateRuntimeConfiguration({
        NODE_ENV: "production",
        ALLOW_PREVIEW_MODE: "true",
      })
    ).not.toThrow();
  });

  it("allows production when required env is present", () => {
    expect(() =>
      validateRuntimeConfiguration({
        NODE_ENV: "production",
        DATABASE_URL: "mysql://user:pass@host/db",
        JWT_SECRET: "secret",
        OAUTH_SERVER_URL: "https://oauth.example.com",
        VITE_APP_ID: "app-id",
      })
    ).not.toThrow();
  });
});

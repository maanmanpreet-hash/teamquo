import { describe, expect, it } from "vitest";

import { getCustomerIdentifierError, hasCustomerIdentifier } from "../client/src/lib/customerIdentity";

describe("customer identity helper", () => {
  it("accepts any one customer identifier", () => {
    expect(hasCustomerIdentifier({ clientName: "Test Client" })).toBe(true);
    expect(hasCustomerIdentifier({ clientEmail: "test@example.com" })).toBe(true);
    expect(hasCustomerIdentifier({ clientPhone: "0412345678" })).toBe(true);
    expect(hasCustomerIdentifier({ clientAddress: "1 Test Street" })).toBe(true);
  });

  it("rejects fully blank customer details", () => {
    expect(hasCustomerIdentifier({})).toBe(false);
    expect(
      hasCustomerIdentifier({
        clientName: " ",
        clientEmail: " ",
        clientPhone: " ",
        clientAddress: " ",
      })
    ).toBe(false);
  });

  it("returns the locked validation message only when all identifiers are blank", () => {
    expect(getCustomerIdentifierError({ clientPhone: "0412345678" })).toBeUndefined();
    expect(getCustomerIdentifierError({})).toBe("Enter at least one customer detail to identify this quote.");
  });
});

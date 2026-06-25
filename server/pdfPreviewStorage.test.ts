import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearPdfPreview, createPdfPreview, readPdfPreview } from "../client/src/lib/pdf";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("pdf preview storage", () => {
  const session = new MemoryStorage();
  const local = new MemoryStorage();

  beforeEach(() => {
    session.clear();
    local.clear();
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("window", {
      location: { origin: "https://teamquo.example" },
      atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
      URL: {
        createObjectURL: vi.fn(),
        revokeObjectURL: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reads preview payloads back even after session storage is lost", () => {
    const token = createPdfPreview("<!doctype html><html><body>Preview</body></html>", "setout.pdf", "/setout/42");
    session.clear();

    const payload = readPdfPreview(token);

    expect(payload?.filename).toBe("setout.pdf");
    expect(payload?.backPath).toBe("/setout/42");
  });

  it("expires stale preview payloads from fallback storage", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T00:00:00Z"));

    const token = createPdfPreview("<!doctype html><html><body>Preview</body></html>", "setout.pdf");

    vi.setSystemTime(new Date("2026-06-27T00:00:01Z"));

    expect(readPdfPreview(token)).toBeNull();
  });

  it("clears preview payloads from both browser stores", () => {
    const token = createPdfPreview("<!doctype html><html><body>Preview</body></html>", "setout.pdf");

    clearPdfPreview(token);

    expect(session.length).toBe(0);
    expect(local.length).toBe(0);
  });
});

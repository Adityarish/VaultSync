import { describe, expect, it } from "vitest";
import { parseApplicationInventory } from "./application-inventory";

describe("application inventory", () => {
  it("accepts a versioned Android application inventory", () => {
    const inventory = parseApplicationInventory(JSON.stringify({
      schemaVersion: 1,
      exportedAt: "2026-10-29T08:00:00.000Z",
      deviceName: "Test phone",
      apps: [{ packageName: "com.example.notes", displayName: "Notes", versionName: "1.2.3", exportEligible: true }],
    }));
    expect(inventory.apps[0]?.packageName).toBe("com.example.notes");
  });

  it("rejects arbitrary JSON and future schema versions", () => {
    expect(() => parseApplicationInventory("not-json")).toThrow("valid JSON");
    expect(() => parseApplicationInventory(JSON.stringify({ schemaVersion: 2, exportedAt: "2026-10-29T08:00:00.000Z", apps: [] }))).toThrow("schema version 1");
  });
});

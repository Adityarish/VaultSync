import { describe, expect, it } from "vitest";
import { categoryForFile, fileIdentity, formatBytes, sha256 } from "./file-utils";

describe("file utilities", () => {
  it("classifies supported backup categories without trusting a filename alone", () => {
    expect(categoryForFile({ name: "photo.bin", type: "image/jpeg" } as File)).toBe("photos");
    expect(categoryForFile({ name: "contacts.vcf", type: "text/plain" } as File)).toBe("contacts");
    expect(categoryForFile({ name: "slides.pptx", type: "" } as File)).toBe("documents");
    expect(categoryForFile({ name: "release.apk", type: "application/octet-stream" } as File)).toBe("apks");
  });

  it("produces a stable SHA-256 digest", async () => {
    await expect(sha256(new Blob(["VaultSync"]))).resolves.toBe("e3e3c01c523b8a1548de1d407b5a03c2bc0b366b60d81e1f0fa565be3e4a3c59");
  });

  it("formats byte totals without fabricated precision", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1536)).toBe("2 KB");
    expect(formatBytes(5 * 1024 ** 3)).toBe("5 GB");
  });

  it("builds a stable identity for duplicate file selections", () => {
    expect(fileIdentity({ name: "photo.jpg", size: 2048, lastModified: 123 } as File)).toBe("photo.jpg\u00002048\u0000123");
    expect(fileIdentity({ name: "photo.jpg", webkitRelativePath: "DCIM/photo.jpg", size: 2048, lastModified: 123 } as File)).toBe("DCIM/photo.jpg\u00002048\u0000123");
  });
});

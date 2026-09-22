import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("immutable source PDF asset", () => {
  const assetPath = join(__dirname, "4FS_Employment_Application_Form.pdf");

  it("is bundled at the expected server-safe path", () => {
    expect(existsSync(assetPath)).toBe(true);
  });

  it("is a non-empty PDF file", () => {
    const stats = statSync(assetPath);
    expect(stats.size).toBeGreaterThan(0);
  });
});

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOURCE_PDF_BASE64 } from "./sourcePdfBase64.generated";

describe("immutable source PDF asset", () => {
  const assetPath = join(__dirname, "4FS_Employment_Application_Form.pdf");

  it("is bundled at the expected server-safe path", () => {
    expect(existsSync(assetPath)).toBe(true);
  });

  it("is a non-empty PDF file", () => {
    const stats = statSync(assetPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it("matches the bundled base64 module byte-for-byte (S13)", () => {
    // sourceAsset.ts loads from sourcePdfBase64.generated.ts, not this raw
    // file, so the two must never drift — if this ever fails, regenerate
    // the base64 module from the raw PDF (see docs/SESSION_LOG.md, S13).
    const rawBytes = readFileSync(assetPath);
    const decodedBytes = Buffer.from(SOURCE_PDF_BASE64, "base64");
    expect(decodedBytes.equals(rawBytes)).toBe(true);
  });
});

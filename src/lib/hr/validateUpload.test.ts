// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateHrUpload } from "./validateUpload";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("validateHrUpload", () => {
  it("accepts a 2-page US Letter PDF matching the template", async () => {
    const buffer = await readFile(
      path.join(FIXTURES_DIR, "synthetic-completed-form.pdf"),
    );
    const result = await validateHrUpload(buffer);
    expect(result.ok).toBe(true);
  });

  it("accepts a 2-page US Letter PDF that isn't the template structurally (leaves content matching to the model)", async () => {
    const buffer = await readFile(
      path.join(FIXTURES_DIR, "synthetic-wrong-template.pdf"),
    );
    const result = await validateHrUpload(buffer);
    expect(result.ok).toBe(true);
  });

  it("rejects a 1-page PDF (wrong page count)", async () => {
    const buffer = await readFile(
      path.join(__dirname, "..", "import", "fixtures", "synthetic-resume.pdf"),
    );
    const result = await validateHrUpload(buffer);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/page/i);
  });

  it("rejects a file that isn't a valid PDF", async () => {
    const result = await validateHrUpload(Buffer.from("not a pdf"));
    expect(result.ok).toBe(false);
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasValidDocxSignature,
  hasValidPdfSignature,
  hasValidSignature,
} from "./fileSignature";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("hasValidPdfSignature", () => {
  it("accepts a real PDF fixture", async () => {
    const buffer = await readFile(
      path.join(FIXTURES_DIR, "synthetic-resume.pdf"),
    );
    expect(hasValidPdfSignature(buffer)).toBe(true);
  });

  it("rejects a file merely named .pdf with unrelated content", () => {
    expect(hasValidPdfSignature(Buffer.from("just some text"))).toBe(false);
  });

  it("rejects an empty buffer", () => {
    expect(hasValidPdfSignature(Buffer.alloc(0))).toBe(false);
  });
});

describe("hasValidDocxSignature", () => {
  it("accepts a real DOCX fixture", async () => {
    const buffer = await readFile(
      path.join(FIXTURES_DIR, "synthetic-resume.docx"),
    );
    expect(hasValidDocxSignature(buffer)).toBe(true);
  });

  it("rejects non-ZIP content", () => {
    expect(hasValidDocxSignature(Buffer.from("not a zip"))).toBe(false);
  });
});

describe("hasValidSignature", () => {
  it("dispatches by MIME type", async () => {
    const pdf = await readFile(
      path.join(FIXTURES_DIR, "synthetic-resume.pdf"),
    );
    const docx = await readFile(
      path.join(FIXTURES_DIR, "synthetic-resume.docx"),
    );
    expect(hasValidSignature(pdf, "application/pdf")).toBe(true);
    expect(
      hasValidSignature(
        docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    // A DOCX's bytes don't have the PDF signature, and vice versa.
    expect(hasValidSignature(docx, "application/pdf")).toBe(false);
  });

  it("rejects an unsupported MIME type outright", () => {
    expect(hasValidSignature(Buffer.from("x"), "image/png")).toBe(false);
  });
});

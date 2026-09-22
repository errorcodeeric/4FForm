import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DOCX_MIME_TYPE,
  PDF_MIME_TYPE,
  extractTextFromFile,
  resolveResumeMimeType,
} from "./extractText";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("extractTextFromFile", () => {
  it("extracts text from a synthetic PDF resume fixture", async () => {
    const buffer = await readFile(
      path.join(FIXTURES_DIR, "synthetic-resume.pdf"),
    );
    const text = await extractTextFromFile(buffer, PDF_MIME_TYPE);
    expect(text).toContain("Alex Synthetic");
    expect(text).toContain("alex.synthetic@example.com");
    expect(text).toContain("National University of Singapore");
  });

  it("extracts text from a synthetic DOCX resume fixture", async () => {
    const buffer = await readFile(
      path.join(FIXTURES_DIR, "synthetic-resume.docx"),
    );
    const text = await extractTextFromFile(buffer, DOCX_MIME_TYPE);
    expect(text).toContain("Alex Synthetic");
    expect(text).toContain("Acme Test Pte Ltd");
  });

  it("rejects an unsupported MIME type", async () => {
    await expect(
      extractTextFromFile(Buffer.from("hi"), "text/plain"),
    ).rejects.toThrow(/unsupported/i);
  });
});

describe("resolveResumeMimeType", () => {
  it("trusts a correctly reported MIME type", () => {
    expect(resolveResumeMimeType(PDF_MIME_TYPE, "resume.pdf")).toBe(
      PDF_MIME_TYPE,
    );
  });

  it("falls back to the file extension for a generic MIME type", () => {
    expect(
      resolveResumeMimeType("application/octet-stream", "resume.docx"),
    ).toBe(DOCX_MIME_TYPE);
  });

  it("rejects a file that is neither PDF nor DOCX by type or extension", () => {
    expect(resolveResumeMimeType("image/png", "photo.png")).toBeNull();
  });
});

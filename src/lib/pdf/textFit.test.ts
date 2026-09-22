import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { fitMultiline, fitSingleLine } from "./textFit";

let font: PDFFont;

beforeAll(async () => {
  const doc = await PDFDocument.create();
  font = await doc.embedFont(StandardFonts.Helvetica);
});

describe("fitSingleLine", () => {
  it("keeps the max font size when the text comfortably fits", () => {
    const result = fitSingleLine("Jane Tan", 200, font, 9, 6);
    expect(result.fontSize).toBe(9);
    expect(result.text).toBe("Jane Tan");
    expect(result.truncated).toBe(false);
  });

  it("shrinks the font size to fit a narrow box before truncating", () => {
    const result = fitSingleLine("Software Engineer", 60, font, 9, 6);
    expect(result.fontSize).toBeLessThan(9);
    expect(result.truncated).toBe(false);
    expect(result.text).toBe("Software Engineer");
  });

  it("truncates with an ellipsis when it still doesn't fit at the minimum size", () => {
    const longValue =
      "A very long employer name that will not fit even at the smallest allowed font size";
    const result = fitSingleLine(longValue, 40, font, 9, 6);
    expect(result.truncated).toBe(true);
    expect(result.fontSize).toBe(6);
    expect(result.text.endsWith("…")).toBe(true);
    expect(font.widthOfTextAtSize(result.text, 6)).toBeLessThanOrEqual(40);
  });
});

describe("fitMultiline", () => {
  it("wraps short text onto multiple lines within the box", () => {
    const result = fitMultiline(
      "1 Test Street, Singapore 123456",
      100,
      40,
      font,
      9,
      6,
    );
    expect(result.truncated).toBe(false);
    expect(result.lines.length).toBeGreaterThan(1);
    for (const line of result.lines) {
      expect(font.widthOfTextAtSize(line, result.fontSize)).toBeLessThanOrEqual(
        100,
      );
    }
  });

  it("truncates the last line when text exceeds the available height even at min size (T16)", () => {
    const longValue = Array.from({ length: 40 }, (_, i) => `word${i}`).join(
      " ",
    );
    const result = fitMultiline(longValue, 80, 20, font, 9, 6);
    expect(result.truncated).toBe(true);
    expect(result.fontSize).toBe(6);
    expect(result.lines[result.lines.length - 1].endsWith("…")).toBe(true);
  });

  it("respects explicit newlines as paragraph breaks", () => {
    const result = fitMultiline("Line one\nLine two", 200, 60, font, 9, 6);
    expect(result.lines).toEqual(["Line one", "Line two"]);
  });
});

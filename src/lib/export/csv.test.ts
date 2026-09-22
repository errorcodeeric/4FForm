import { describe, expect, it } from "vitest";
import { buildCandidateCsv, buildCsv } from "./csv";
import type { CandidateData } from "@/lib/schema";

/** Minimal RFC 4180 parser (quotes, doubled-quote escaping, embedded
 * commas/newlines) — enough to round-trip what buildCsv produces. */
function parseCsv(text: string): string[][] {
  const withoutBom = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < withoutBom.length) {
    const char = withoutBom[i];
    if (inQuotes) {
      if (char === '"') {
        if (withoutBom[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r" && withoutBom[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 2;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

describe("buildCsv", () => {
  it("round-trips Unicode, commas, embedded newlines, and quotes", () => {
    const header = ["name", "note"];
    const value = ['Tân "Jane" Wei Míng', "Line one,\nLine two \"quoted\""];
    const csv = buildCsv(header, [value]);
    const parsed = parseCsv(csv);
    expect(parsed[0]).toEqual(header);
    expect(parsed[1]).toEqual(value);
  });

  it("starts with a UTF-8 BOM so Excel detects the encoding", () => {
    const csv = buildCsv(["a"], [["b"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});

describe("buildCandidateCsv", () => {
  const base: Partial<CandidateData> = {
    full_name: "Jane Tan",
    telephone_mobile: "+65 9012 3400",
    identity_number: "S0012345A",
  };

  it("preserves a leading-zero / leading-plus phone number, recoverable after formula-injection escaping (T17)", () => {
    // "+" is also one of the four OWASP CSV-injection trigger characters,
    // so a phone number in international format (+65 ...) legitimately
    // gets the same "'" prefix as a real formula would — this is the
    // standard, expected mitigation (a bare leading apostrophe is not
    // itself valid phone-number text), and the original value is fully
    // recovered by stripping at most one leading "'".
    const csv = buildCandidateCsv(base, "draft");
    const parsed = parseCsv(csv);
    const header = parsed[0];
    const row = parsed[1];
    const phoneIndex = header.indexOf("telephone_mobile");
    expect(row[phoneIndex].replace(/^'/, "")).toBe("+65 9012 3400");
    const nricIndex = header.indexOf("identity_number");
    expect(row[nricIndex]).toBe("S0012345A");
  });

  it("neutralizes a formula-like value so it round-trips as literal text (T17)", () => {
    const csv = buildCandidateCsv(
      { ...base, supporting_information: "=cmd|'/c calc'!A1" },
      "draft",
    );
    const parsed = parseCsv(csv);
    const header = parsed[0];
    const row = parsed[1];
    const index = header.indexOf("supporting_information");
    expect(row[index]).toBe("'=cmd|'/c calc'!A1");
    expect(row[index].startsWith("'")).toBe(true);
  });

  it("labels an incomplete application as a draft export", () => {
    const csv = buildCandidateCsv(base, "draft");
    const parsed = parseCsv(csv);
    const index = parsed[0].indexOf("export_status");
    expect(parsed[1][index]).toBe("draft");
  });

  it("labels a complete application as a final export", () => {
    const csv = buildCandidateCsv(base, "final");
    const parsed = parseCsv(csv);
    const index = parsed[0].indexOf("export_status");
    expect(parsed[1][index]).toBe("final");
  });

  it("uses field IDs as stable flat headers, including numbered repeat groups", () => {
    const csv = buildCandidateCsv(base, "draft");
    const header = parseCsv(csv)[0];
    for (const id of [
      "education_1_institution",
      "education_2_institution",
      "education_3_institution",
      "employment_1_employer",
      "employment_2_employer",
      "employment_3_employer",
      "reference_1_name",
      "reference_2_name",
    ]) {
      expect(header).toContain(id);
    }
  });

  it("never includes an official_* column", () => {
    const csv = buildCandidateCsv(base, "draft");
    const header = parseCsv(csv)[0];
    expect(header.some((h) => h.startsWith("official_"))).toBe(false);
  });

  it("round-trips repeated identical rows (T17)", () => {
    const csvA = buildCandidateCsv(base, "draft");
    const csvB = buildCandidateCsv(base, "draft");
    expect(csvA).toBe(csvB);
  });

  it("never places raw signature bytes in the export", () => {
    const csv = buildCandidateCsv(
      {
        ...base,
        declaration_accepted: true,
        applicant_signature: {
          kind: "drawn",
          imageDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSU",
        },
      },
      "final",
    );
    expect(csv).not.toContain("base64");
    expect(csv).not.toContain("iVBORw0KGgo");
    expect(csv).toContain("drawn signature on file");
  });
});

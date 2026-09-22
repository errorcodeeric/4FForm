import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import type { CandidateData } from "@/lib/schema";
import {
  CANDIDATE_SHEET_NAME,
  DICTIONARY_SHEET_NAME,
  buildCandidateWorkbook,
  workbookToBuffer,
} from "./xlsx";

const base: Partial<CandidateData> = {
  full_name: "Jane Tan",
  telephone_mobile: "+65 9012 3400",
  identity_number: "S0012345A",
};

describe("buildCandidateWorkbook", () => {
  it("has Candidate Data and Field Dictionary sheets (T18)", () => {
    const workbook = buildCandidateWorkbook(base, "draft");
    expect(workbook.SheetNames).toEqual([
      CANDIDATE_SHEET_NAME,
      DICTIONARY_SHEET_NAME,
    ]);
  });

  it("stores phone numbers and identifiers as text cells, not numbers", () => {
    const workbook = buildCandidateWorkbook(base, "draft");
    const sheet = workbook.Sheets[CANDIDATE_SHEET_NAME];
    const header: string[] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
    })[0] as string[];
    const phoneCol = header.indexOf("telephone_mobile");
    const nricCol = header.indexOf("identity_number");

    const phoneCell = sheet[XLSX.utils.encode_cell({ r: 1, c: phoneCol })];
    const nricCell = sheet[XLSX.utils.encode_cell({ r: 1, c: nricCol })];

    expect(phoneCell.t).toBe("s");
    // "+" is also an OWASP CSV-injection trigger character, so it gets the
    // same "'" prefix a formula would (Excel's own convention for forcing
    // text) — the number itself is unchanged and fully recoverable.
    expect(String(phoneCell.v).replace(/^'/, "")).toBe("+65 9012 3400");
    expect(nricCell.t).toBe("s");
    expect(nricCell.v).toBe("S0012345A");
  });

  it("Field Dictionary lists every exported field with its label and section", () => {
    const workbook = buildCandidateWorkbook(base, "draft");
    const sheet = workbook.Sheets[DICTIONARY_SHEET_NAME];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    const fullName = rows.find((r) => r["Field ID"] === "full_name");
    expect(fullName?.Label).toContain("Full name");
    expect(fullName?.Section).toBe("Personal");
    const exportStatus = rows.find((r) => r["Field ID"] === "export_status");
    expect(exportStatus).toBeDefined();
  });

  it("produces a workbook that opens cleanly as a real .xlsx buffer (T18)", () => {
    const workbook = buildCandidateWorkbook(base, "final");
    const buffer = workbookToBuffer(workbook);
    expect(buffer.byteLength).toBeGreaterThan(0);
    const reloaded = XLSX.read(buffer, { type: "buffer" });
    expect(reloaded.SheetNames).toEqual([
      CANDIDATE_SHEET_NAME,
      DICTIONARY_SHEET_NAME,
    ]);
  });

  it("never includes an official_* row in the Field Dictionary", () => {
    const workbook = buildCandidateWorkbook(base, "draft");
    const sheet = workbook.Sheets[DICTIONARY_SHEET_NAME];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    expect(rows.some((r) => r["Field ID"]?.startsWith("official_"))).toBe(
      false,
    );
  });
});

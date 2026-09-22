import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  ERRORS_SHEET_NAME,
  REVIEWED_SHEET_NAME,
  buildHrBatchCsv,
  buildHrBatchWorkbook,
  hrWorkbookToBuffer,
  type HrExportRecord,
} from "./batchExport";

const RECORDS: readonly HrExportRecord[] = [
  {
    fileName: "candidate-1.pdf",
    status: "success",
    candidateData: { full_name: "Jane Tan" },
    officialData: { official_job_title: "Crew" },
  },
  {
    fileName: "candidate-2.pdf",
    status: "success",
    candidateData: { full_name: "David Ong" },
    officialData: {},
  },
  {
    fileName: "corrupt.pdf",
    status: "error",
    errorMessage: "Could not read that file as a PDF.",
  },
];

describe("buildHrBatchCsv", () => {
  it("includes one row per successful file and omits the failed one (T22)", () => {
    const csv = buildHrBatchCsv(RECORDS);
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    // header + 2 successful rows, no row for the failed file
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Jane Tan");
    expect(lines[2]).toContain("David Ong");
    expect(csv).not.toContain("corrupt.pdf");
  });

  it("does not throw when every file failed", () => {
    const csv = buildHrBatchCsv([
      { fileName: "a.pdf", status: "error", errorMessage: "bad" },
    ]);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(1); // header only
  });
});

describe("buildHrBatchWorkbook", () => {
  it("keeps successful records reviewable and isolates the error (T22, I17)", () => {
    const workbook = buildHrBatchWorkbook(RECORDS);
    expect(workbook.SheetNames).toEqual([REVIEWED_SHEET_NAME, ERRORS_SHEET_NAME]);

    const reviewed = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets[REVIEWED_SHEET_NAME],
    );
    expect(reviewed).toHaveLength(2);
    expect(reviewed.map((r) => r.full_name)).toEqual([
      "Jane Tan",
      "David Ong",
    ]);

    const errors = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets[ERRORS_SHEET_NAME],
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]["File name"]).toBe("corrupt.pdf");
    expect(errors[0].Error).toContain("Could not read");
  });

  it("keeps candidate and official fields as distinct columns", () => {
    const workbook = buildHrBatchWorkbook(RECORDS);
    const reviewed = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets[REVIEWED_SHEET_NAME],
    );
    expect(reviewed[0].official_job_title).toBe("Crew");
    expect(reviewed[0].full_name).toBe("Jane Tan");
  });

  it("produces a workbook that opens cleanly as a real .xlsx buffer", () => {
    const workbook = buildHrBatchWorkbook(RECORDS);
    const buffer = hrWorkbookToBuffer(workbook);
    expect(buffer.byteLength).toBeGreaterThan(0);
    const reloaded = XLSX.read(buffer, { type: "buffer" });
    expect(reloaded.SheetNames).toEqual([REVIEWED_SHEET_NAME, ERRORS_SHEET_NAME]);
  });
});

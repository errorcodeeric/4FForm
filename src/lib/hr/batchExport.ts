import * as XLSX from "xlsx";
import type { CandidateData, OfficialUseData } from "@/lib/schema";
import { buildCsv } from "@/lib/export/csv";
import { buildHrExportRow } from "./exportRow";

export interface HrExportRecord {
  readonly fileName: string;
  readonly status: "success" | "error";
  readonly errorMessage?: string;
  readonly candidateData?: Partial<CandidateData>;
  readonly officialData?: Partial<OfficialUseData>;
}

/**
 * Batch CSV: one row per successfully-reviewed file (T22 — a failed file
 * must not discard the successful ones, so it's simply omitted here, not
 * fatal to the whole export). CSV has no second-sheet concept, so failed
 * files aren't represented at all in this format — use XLSX for a run
 * that needs the error list too.
 */
export function buildHrBatchCsv(records: readonly HrExportRecord[]): string {
  const successful = records.filter((r) => r.status === "success");
  if (successful.length === 0) {
    const headerRow = buildHrExportRow("", {}, {}).map((r) => r.header);
    return buildCsv(headerRow, []);
  }
  const rows = successful.map((r) =>
    buildHrExportRow(r.fileName, r.candidateData ?? {}, r.officialData ?? {}),
  );
  const headerRow = rows[0].map((r) => r.header);
  const dataRows = rows.map((row) => row.map((r) => r.value));
  return buildCsv(headerRow, dataRows);
}

const REVIEWED_SHEET_NAME = "Reviewed Data";
const ERRORS_SHEET_NAME = "Errors";

/**
 * Batch XLSX: a "Reviewed Data" sheet (one row per successful file) plus
 * an "Errors" sheet (file name + error message per failed file), so a
 * partial batch failure is visible and actionable rather than silently
 * dropped (T22).
 */
export function buildHrBatchWorkbook(
  records: readonly HrExportRecord[],
): XLSX.WorkBook {
  const successful = records.filter((r) => r.status === "success");
  const failed = records.filter((r) => r.status === "error");

  const headerRow =
    successful.length > 0
      ? buildHrExportRow(
          successful[0].fileName,
          successful[0].candidateData ?? {},
          successful[0].officialData ?? {},
        ).map((r) => r.header)
      : buildHrExportRow("", {}, {}).map((r) => r.header);

  const dataRows = successful.map((r) =>
    buildHrExportRow(
      r.fileName,
      r.candidateData ?? {},
      r.officialData ?? {},
    ).map((cell) => cell.value),
  );

  const reviewedSheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const errorsSheet = XLSX.utils.aoa_to_sheet([
    ["File name", "Error"],
    ...failed.map((r) => [r.fileName, r.errorMessage ?? "Unknown error"]),
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, reviewedSheet, REVIEWED_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, errorsSheet, ERRORS_SHEET_NAME);
  return workbook;
}

export function hrWorkbookToBuffer(workbook: XLSX.WorkBook): Buffer {
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export { REVIEWED_SHEET_NAME, ERRORS_SHEET_NAME };

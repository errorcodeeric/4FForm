import { buildCandidateExportRow } from "./rowData";
import type { CandidateData } from "@/lib/schema";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generic CSV builder (header + N data rows) so HR's batch export (S10,
 * one row per uploaded form) can reuse this without a separate
 * implementation. RFC 4180-style quoting; a leading UTF-8 BOM so Excel
 * reliably detects UTF-8 instead of guessing a legacy code page for
 * non-ASCII values (Unicode round-trip, T17).
 */
export function buildCsv(
  headerRow: readonly string[],
  dataRows: readonly (readonly string[])[],
): string {
  const lines = [headerRow, ...dataRows].map((cells) =>
    cells.map(csvEscape).join(","),
  );
  const BOM = "﻿";
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

/** One-candidate CSV export, built from the same row data as the XLSX export. */
export function buildCandidateCsv(
  data: Partial<CandidateData>,
  status: "draft" | "final",
): string {
  const rows = buildCandidateExportRow(data, status);
  return buildCsv(
    rows.map((r) => r.header),
    [rows.map((r) => r.value)],
  );
}

import * as XLSX from "xlsx";
import { CANDIDATE_EXPORT_FIELD_IDS, getFieldMeta } from "@/lib/schema";
import type { CandidateData } from "@/lib/schema";
import { buildCandidateExportRow } from "./rowData";

const CANDIDATE_SHEET_NAME = "Candidate Data";
const DICTIONARY_SHEET_NAME = "Field Dictionary";

/**
 * Builds the "Candidate Data" + "Field Dictionary" workbook (T18). Every
 * value handed to `aoa_to_sheet` here is a plain JS string (never a JS
 * `number`), so SheetJS stores every cell with type `s` (string) in the
 * file — Excel displays it exactly as written, including a leading `+` or
 * a leading zero on a phone number or NRIC, because the cell's stored
 * type says "text," not because of any per-column workaround.
 */
export function buildCandidateWorkbook(
  data: Partial<CandidateData>,
  status: "draft" | "final",
): XLSX.WorkBook {
  const rows = buildCandidateExportRow(data, status);

  const candidateSheet = XLSX.utils.aoa_to_sheet([
    rows.map((r) => r.header),
    rows.map((r) => r.value),
  ]);

  const dictionaryRows: (string | number)[][] = [
    ["Field ID", "Label", "Section", "Type", "Notes"],
    [
      "export_status",
      "Export status",
      "Export",
      "text",
      "\"draft\" if the application was incomplete when exported, otherwise \"final\".",
    ],
    ...CANDIDATE_EXPORT_FIELD_IDS.map((id) => {
      const meta = getFieldMeta(id);
      return [id, meta.label, meta.section, meta.type, meta.notes ?? ""];
    }),
  ];
  const dictionarySheet = XLSX.utils.aoa_to_sheet(dictionaryRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, candidateSheet, CANDIDATE_SHEET_NAME);
  XLSX.utils.book_append_sheet(
    workbook,
    dictionarySheet,
    DICTIONARY_SHEET_NAME,
  );
  return workbook;
}

export function workbookToBuffer(workbook: XLSX.WorkBook): Buffer {
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export { CANDIDATE_SHEET_NAME, DICTIONARY_SHEET_NAME };

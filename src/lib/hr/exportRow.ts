import {
  CANDIDATE_EXPORT_FIELD_IDS,
  OFFICIAL_EXPORT_FIELD_IDS,
  getFieldMeta,
  type CandidateData,
  type OfficialUseData,
} from "@/lib/schema";
import { escapeFormulaInjection } from "@/lib/export/formulaInjection";
import type { ExportRow } from "@/lib/export/rowData";

function stringifyValue(meta: { type: string }, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (meta.type === "yes_no" || meta.type === "boolean") {
    if (typeof value !== "boolean") return "";
    return value ? "Yes" : "No";
  }
  return String(value);
}

/**
 * One flat row for a reviewed HR record: file name, then every candidate
 * field, then every official field — the same stable header convention
 * S08 uses for candidate exports, extended with both field groups since
 * HR mode (unlike candidate mode) has access to the FOR OFFICIAL USE ONLY
 * block. Reuses the same formula-injection escaping.
 */
export function buildHrExportRow(
  fileName: string,
  candidateData: Partial<CandidateData>,
  officialData: Partial<OfficialUseData>,
): readonly ExportRow[] {
  const rows: ExportRow[] = [
    { header: "file_name", value: escapeFormulaInjection(fileName) },
  ];
  for (const id of CANDIDATE_EXPORT_FIELD_IDS) {
    const meta = getFieldMeta(id);
    const raw = stringifyValue(meta, (candidateData as Record<string, unknown>)[id]);
    rows.push({ header: id, value: escapeFormulaInjection(raw) });
  }
  for (const id of OFFICIAL_EXPORT_FIELD_IDS) {
    const meta = getFieldMeta(id);
    const raw = stringifyValue(meta, (officialData as Record<string, unknown>)[id]);
    rows.push({ header: id, value: escapeFormulaInjection(raw) });
  }
  return rows;
}

import {
  CANDIDATE_EXPORT_FIELD_IDS,
  getFieldMeta,
  toSignatureExportMetadata,
  type CandidateData,
  type FieldMeta,
  type SignatureValue,
} from "@/lib/schema";
import { escapeFormulaInjection } from "./formulaInjection";

export interface ExportRow {
  readonly header: string;
  readonly value: string;
}

/**
 * Field IDs whose values should be stored as text (not auto-typed as a
 * number) in spreadsheet exports — NRIC/FIN/passport numbers and phone
 * numbers, which lose meaning if Excel strips a leading "+" or a leading
 * zero. Derived from the field map's own type/validation metadata rather
 * than a hand-maintained list, so it can't silently drift.
 */
export const FORCE_TEXT_FIELD_IDS: ReadonlySet<string> = new Set(
  CANDIDATE_EXPORT_FIELD_IDS.filter((id) => {
    const meta = getFieldMeta(id);
    return meta.type === "identifier" || meta.validation === "Phone-like text";
  }),
);

function stringifyFieldValue(meta: FieldMeta, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (meta.type === "signature") {
    const info = toSignatureExportMetadata(value as SignatureValue | undefined);
    if (!info.signaturePresent) return "";
    return `${info.signatureKind ?? "unknown"} signature on file`;
  }
  if (meta.type === "yes_no" || meta.type === "boolean") {
    if (typeof value !== "boolean") return "";
    return value ? "Yes" : "No";
  }
  return String(value);
}

/**
 * One flat, stable-header row for a candidate export (CSV and XLSX both
 * build from this — one place defines "what an export row looks like").
 * `export_status` is a synthetic first column (not a field-map field) so
 * a draft export (missing required fields / no signature yet) is clearly
 * labeled, per the S06 "draft exports remain possible, but labeled"
 * requirement.
 */
export function buildCandidateExportRow(
  data: Partial<CandidateData>,
  status: "draft" | "final",
): readonly ExportRow[] {
  const rows: ExportRow[] = [{ header: "export_status", value: status }];
  for (const id of CANDIDATE_EXPORT_FIELD_IDS) {
    const meta = getFieldMeta(id);
    const raw = stringifyFieldValue(meta, (data as Record<string, unknown>)[id]);
    rows.push({ header: id, value: escapeFormulaInjection(raw) });
  }
  return rows;
}

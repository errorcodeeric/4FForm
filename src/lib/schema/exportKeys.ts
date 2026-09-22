import { FIELD_MAP } from "./fieldMap.generated";
import type { FieldMeta, FieldOwner } from "./types";

/**
 * Stable, flat CSV/XLSX export header order for a given owner, in Field Map
 * order. Because every field ID already encodes its repeat-group index
 * (education_1..3, employment_1..3, reference_1..2), the field ID itself is
 * the stable flat column header (see S08 for CSV/XLSX serialization, which
 * consumes this list directly).
 */
function exportFieldIds(owner: FieldOwner): readonly string[] {
  return (FIELD_MAP as readonly FieldMeta[])
    .filter((f) => f.owner === owner && f.exportable)
    .map((f) => f.id);
}

export const CANDIDATE_EXPORT_FIELD_IDS: readonly string[] =
  exportFieldIds("candidate");

export const OFFICIAL_EXPORT_FIELD_IDS: readonly string[] =
  exportFieldIds("hr");

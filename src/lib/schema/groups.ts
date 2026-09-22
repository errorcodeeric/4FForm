import { FIELD_MAP } from "./fieldMap.generated";
import type { FieldMeta } from "./types";

/** Fields in a repeated group (e.g. education row 2), in Field Map order. */
export interface RepeatGroup {
  readonly section: string;
  readonly row: number;
  readonly fields: readonly FieldMeta[];
}

/**
 * Groups fields that share a section and a `row` index (the fixed-count
 * repeats: 3 education rows, 3 employment rows, 2 reference rows). Intended
 * for driving the sectioned form UI in S03 without hand-listing row layout
 * separately from the field map.
 */
export function getRepeatGroups(section: string): readonly RepeatGroup[] {
  const rows = new Map<number, FieldMeta[]>();
  for (const field of FIELD_MAP as readonly FieldMeta[]) {
    if (field.section !== section || field.row === undefined) continue;
    const existing = rows.get(field.row) ?? [];
    existing.push(field);
    rows.set(field.row, existing);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, fields]) => ({ section, row, fields }));
}

export interface ConditionalRequirement {
  readonly dependsOnFieldId: string;
  readonly equals: string;
}

/**
 * Parses a FieldMeta.conditional description ("field_id = Value") into a
 * structured requirement. Returns undefined for fields with no conditional
 * dependency, or if the description doesn't match the expected shape (in
 * which case the raw text in docs/FIELD_MAP.md / the spreadsheet is
 * authoritative and this helper should not be trusted blindly).
 */
export function parseConditional(
  field: FieldMeta,
): ConditionalRequirement | undefined {
  if (!field.conditional) return undefined;
  const match = /^([a-z0-9_]+)\s*=\s*(.+)$/i.exec(field.conditional);
  if (!match) return undefined;
  return { dependsOnFieldId: match[1], equals: match[2] };
}

/**
 * Field IDs whose conditional requirement depends on `fieldId` (e.g. the
 * detail field(s) revealed by a Yes/No answer), in Field Map order. Used to
 * drive detail-reveal UI directly from the field map instead of hard-coding
 * each answer/detail pairing.
 */
export function getDependentFieldIds(fieldId: string): readonly string[] {
  return (FIELD_MAP as readonly FieldMeta[])
    .filter((f) => parseConditional(f)?.dependsOnFieldId === fieldId)
    .map((f) => f.id);
}

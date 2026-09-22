import { FIELD_MAP } from "./fieldMap.generated";
import type { FieldMeta } from "./types";

const BY_ID = new Map<string, FieldMeta>(FIELD_MAP.map((f) => [f.id, f]));

export function getFieldMeta(id: string): FieldMeta {
  const meta = BY_ID.get(id);
  if (!meta) {
    throw new Error(`Unknown field id: ${id}`);
  }
  return meta;
}

/** Candidate-owned field IDs for a section, in Field Map order. */
export function getSectionFieldIds(
  section: string,
  owner: FieldMeta["owner"] = "candidate",
): readonly string[] {
  return FIELD_MAP.filter(
    (f) => f.section === section && f.owner === owner && f.row === undefined,
  ).map((f) => f.id);
}

/** Every distinct section name for an owner, in Field Map order. */
export function getSections(
  owner: FieldMeta["owner"] = "candidate",
): readonly string[] {
  const seen = new Set<string>();
  const sections: string[] = [];
  for (const field of FIELD_MAP) {
    if (field.owner !== owner) continue;
    if (seen.has(field.section)) continue;
    seen.add(field.section);
    sections.push(field.section);
  }
  return sections;
}

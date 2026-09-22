import { FIELD_MAP } from "@/lib/schema/fieldMap.generated";
import type { FieldMeta } from "@/lib/schema/types";

export type ImportSourceKind = "resume" | "linkedin";

/**
 * Candidate field IDs an AI extraction pass for `sourceKind` is allowed to
 * populate, derived from the field map's Resume/LinkedIn columns (`sources`
 * in fieldMap.generated.ts) — includes repeated-row fields (education,
 * employment, references) since those are flat field IDs like everything
 * else. Fields marked "No" for a source — NRIC/passport, legal right to
 * work, every sensitive yes/no declaration, salaries, termination notice,
 * signature, and declaration acceptance — are structurally excluded here,
 * not just prompted against, so a hallucinated value for one of them can
 * never reach the schema used to validate the model's response.
 */
export function getExtractableFieldIds(
  sourceKind: ImportSourceKind,
): readonly string[] {
  return (FIELD_MAP as readonly FieldMeta[])
    .filter((f) => f.owner === "candidate" && f.sources[sourceKind] !== "No")
    .map((f) => f.id);
}

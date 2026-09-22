import { z, type ZodTypeAny } from "zod";
import { FIELD_MAP } from "./fieldMap.generated";
import type { FieldMeta, FieldOwner, FieldType } from "./types";
import { SignatureValueSchema } from "./signature";

function zodForFieldType(type: FieldType): ZodTypeAny {
  switch (type) {
    case "email":
      // Optional at this layer: empty string means "not yet provided."
      // Non-empty values must be a well-formed email.
      return z.union([z.literal(""), z.string().email()]);
    case "yes_no":
    case "boolean":
      return z.boolean();
    case "signature":
      return SignatureValueSchema;
    case "text":
    case "multiline":
    case "identifier":
    case "text_list":
    case "date":
    case "date_or_year":
    case "date_or_present":
    case "choice":
      return z.string();
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled field type: ${String(exhaustive)}`);
    }
  }
}

/**
 * Builds a Zod object schema whose keys are exactly the canonical field IDs
 * owned by `owner` (see docs/FIELD_MAP.md). Every field is optional here —
 * this is the permissive "data in progress" shape used while importing and
 * editing. Conditional-requirement enforcement (e.g. a Yes answer requiring
 * its detail field) is layered on top in the review step (S06), not here.
 *
 * `.strict()` means a payload containing keys outside this owner's field
 * IDs (e.g. an `official_*` key inside a candidate payload) fails to parse
 * rather than silently passing through — this is what enforces the
 * candidate/official boundary (see T03 in the Acceptance Tests tab).
 */
function buildFieldSchema(owner: FieldOwner) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of FIELD_MAP as readonly FieldMeta[]) {
    if (field.owner !== owner) continue;
    shape[field.id] = zodForFieldType(field.type).optional();
  }
  return z.object(shape).strict();
}

export const CandidateDataSchema = buildFieldSchema("candidate");
export type CandidateData = z.infer<typeof CandidateDataSchema>;

export const OfficialUseDataSchema = buildFieldSchema("hr");
export type OfficialUseData = z.infer<typeof OfficialUseDataSchema>;

/** Field IDs owned by "candidate", in Field Map order. */
export const CANDIDATE_FIELD_IDS: readonly string[] = FIELD_MAP.filter(
  (f) => f.owner === "candidate",
).map((f) => f.id);

/** Field IDs owned by "hr" (the FOR OFFICIAL USE ONLY block), in Field Map order. */
export const OFFICIAL_FIELD_IDS: readonly string[] = FIELD_MAP.filter(
  (f) => f.owner === "hr",
).map((f) => f.id);

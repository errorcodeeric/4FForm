import { z } from "zod";
import { getFieldMeta } from "@/lib/schema";
import { getExtractableFieldIds, type ImportSourceKind } from "./allowedFields";

export type Confidence = "high" | "medium" | "low";

export interface ExtractedField {
  readonly value: string | boolean;
  readonly confidence: Confidence;
}

/** Field ID -> extracted value + confidence. Only allow-listed fields ever appear. */
export type ExtractionResult = Readonly<Record<string, ExtractedField>>;

const ConfidenceSchema = z.enum(["high", "medium", "low"]);

/**
 * Builds a strict Zod schema for an extraction tool response: an object
 * whose only permitted keys are the given field IDs, each an
 * { value, confidence } pair typed to match the field's declared type
 * (boolean for yes_no/boolean fields, string for everything else this
 * pipeline extracts). `.strict()` means the model returning a disallowed
 * key (e.g. an official_* key in a resume extraction) fails validation
 * rather than silently passing through.
 */
export function buildFieldResultSchema(fieldIds: readonly string[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const id of fieldIds) {
    const meta = getFieldMeta(id);
    const valueSchema =
      meta.type === "yes_no" || meta.type === "boolean"
        ? z.boolean()
        : z.string();
    shape[id] = z
      .object({ value: valueSchema, confidence: ConfidenceSchema })
      .strict()
      .optional();
  }
  return z.object(shape).strict();
}

/** Same as buildFieldResultSchema, restricted to a resume/LinkedIn allow-list. */
export function buildExtractionResultSchema(sourceKind: ImportSourceKind) {
  return buildFieldResultSchema(getExtractableFieldIds(sourceKind));
}

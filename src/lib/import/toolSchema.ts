import { getFieldMeta } from "@/lib/schema";
import { getExtractableFieldIds, type ImportSourceKind } from "./allowedFields";

/**
 * JSON schema for the Anthropic tool-use input, generated from the given
 * field IDs — kept as plain JSON-schema-shaped properties (not a full
 * top-level object) so a caller can nest this inside a larger tool
 * schema (see src/lib/hr/toolSchema.ts, which nests two of these).
 */
export function buildFieldToolProperties(
  fieldIds: readonly string[],
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const id of fieldIds) {
    const meta = getFieldMeta(id);
    const isBoolean = meta.type === "yes_no" || meta.type === "boolean";
    properties[id] = {
      type: "object",
      description: meta.label,
      properties: {
        value: isBoolean ? { type: "boolean" } : { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
      additionalProperties: false,
    };
  }
  return properties;
}

/**
 * JSON schema for the Anthropic tool-use input, restricted to a
 * resume/LinkedIn allow-list — generated from the same allow-list
 * buildExtractionResultSchema (types.ts) uses, so the two always describe
 * the same set of fields.
 */
export function buildExtractionToolInputSchema(sourceKind: ImportSourceKind) {
  return {
    type: "object" as const,
    properties: buildFieldToolProperties(getExtractableFieldIds(sourceKind)),
    additionalProperties: false,
  };
}

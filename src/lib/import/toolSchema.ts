import { getFieldMeta } from "@/lib/schema";
import { getExtractableFieldIds, type ImportSourceKind } from "./allowedFields";

/**
 * JSON schema for the Anthropic tool-use input, generated from the same
 * allow-list buildExtractionResultSchema (types.ts) uses — the two are
 * guaranteed to describe the same set of fields since both read
 * getExtractableFieldIds.
 */
export function buildExtractionToolInputSchema(sourceKind: ImportSourceKind) {
  const properties: Record<string, unknown> = {};
  for (const id of getExtractableFieldIds(sourceKind)) {
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
  return {
    type: "object" as const,
    properties,
    additionalProperties: false,
  };
}

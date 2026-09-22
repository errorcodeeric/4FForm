import { buildFieldToolProperties } from "@/lib/import/toolSchema";
import { HR_CANDIDATE_FIELD_IDS, HR_OFFICIAL_FIELD_IDS } from "./allowedFields";

/**
 * Anthropic tool-use input schema for HR extraction: a `templateMatch`
 * flag plus two field groups, generated from the same allow-lists
 * HrToolResponseSchema (types.ts) validates against.
 */
export function buildHrToolInputSchema() {
  return {
    type: "object" as const,
    properties: {
      templateMatch: {
        type: "boolean",
        description:
          "True only if this document is the 4FINGERS Employment Application Form (the exact two-page template, including the 4FINGERS CRISPY CHICKEN letterhead and a FOR OFFICIAL USE ONLY block on page 2). False for any other document.",
      },
      templateMismatchReason: {
        type: "string",
        description:
          "Required when templateMatch is false: a short, specific reason (e.g. 'This is a resume, not the employment application form.').",
      },
      candidateFields: {
        type: "object",
        description:
          "Only present when templateMatch is true. Fields the applicant filled in.",
        properties: buildFieldToolProperties(HR_CANDIDATE_FIELD_IDS),
        additionalProperties: false,
      },
      officialFields: {
        type: "object",
        description:
          "Only present when templateMatch is true. The FOR OFFICIAL USE ONLY block on page 2, if filled in.",
        properties: buildFieldToolProperties(HR_OFFICIAL_FIELD_IDS),
        additionalProperties: false,
      },
    },
    required: ["templateMatch"],
    additionalProperties: false,
  };
}

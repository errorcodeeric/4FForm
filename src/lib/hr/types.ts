import { z } from "zod";
import { buildFieldResultSchema, type ExtractionResult } from "@/lib/import/types";
import { HR_CANDIDATE_FIELD_IDS, HR_OFFICIAL_FIELD_IDS } from "./allowedFields";

export interface HrExtractionResult {
  readonly templateMatch: boolean;
  readonly templateMismatchReason?: string;
  readonly candidateFields: ExtractionResult;
  readonly officialFields: ExtractionResult;
}

/**
 * Strict schema for the HR extraction tool response: `templateMatch` lets
 * the model explicitly say "this isn't the 4FINGERS form" instead of
 * fabricating a record from an unrelated document (T20), and
 * candidateFields/officialFields are each restricted to their own
 * allow-list — candidateFields can never contain an official_* key, and
 * vice versa, the same structural guarantee resume/LinkedIn import has.
 */
export const HrToolResponseSchema = z
  .object({
    templateMatch: z.boolean(),
    templateMismatchReason: z.string().optional(),
    candidateFields: buildFieldResultSchema(HR_CANDIDATE_FIELD_IDS).optional(),
    officialFields: buildFieldResultSchema(HR_OFFICIAL_FIELD_IDS).optional(),
  })
  .strict();

import {
  CANDIDATE_FIELD_IDS,
  OFFICIAL_FIELD_IDS,
  getFieldMeta,
} from "@/lib/schema";

/**
 * HR mode reads a *completed* copy of the exact template — unlike resume
 * extraction, there's no "is this inferable from a resume" question,
 * every candidate field the applicant could have written is fair game.
 * The one exception is `applicant_signature`: HR extraction can note
 * whether a signature mark is present via a separate presence flag, but
 * can't produce a typed/drawn SignatureValue the way the candidate's own
 * form does, so it's excluded from the extractable set here.
 */
export const HR_CANDIDATE_FIELD_IDS: readonly string[] =
  CANDIDATE_FIELD_IDS.filter((id) => getFieldMeta(id).type !== "signature");

/** Every FOR OFFICIAL USE ONLY field — HR mode is the only place these are ever extracted. */
export const HR_OFFICIAL_FIELD_IDS: readonly string[] = OFFICIAL_FIELD_IDS;

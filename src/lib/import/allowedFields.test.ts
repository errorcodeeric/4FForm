import { describe, expect, it } from "vitest";
import { getExtractableFieldIds } from "./allowedFields";
import { CANDIDATE_FIELD_IDS, OFFICIAL_FIELD_IDS } from "@/lib/schema";

describe("getExtractableFieldIds", () => {
  it("never allows an official_* field for any source", () => {
    for (const sourceKind of ["resume", "linkedin"] as const) {
      const ids = getExtractableFieldIds(sourceKind);
      for (const officialId of OFFICIAL_FIELD_IDS) {
        expect(ids).not.toContain(officialId);
      }
    }
  });

  it("excludes every field the spec says must never be inferred", () => {
    const neverInfer = [
      "identity_number",
      "legal_right_to_work_sg",
      "driving_licence_answer",
      "criminal_charge_answer",
      "employment_discipline_answer",
      "medical_impact_answer",
      "bankruptcy_answer",
      "company_contact_answer",
      "employment_1_last_salary",
      "employment_2_last_salary",
      "employment_3_last_salary",
      "employment_1_reason_leaving",
      "employment_2_reason_leaving",
      "employment_3_reason_leaving",
      "expected_salary",
      "termination_notice",
      "declaration_accepted",
      "declaration_date",
      "applicant_signature",
    ];
    const resumeIds = getExtractableFieldIds("resume");
    for (const id of neverInfer) {
      expect(resumeIds).not.toContain(id);
    }
  });

  it("allows core resume-inferable fields", () => {
    const resumeIds = getExtractableFieldIds("resume");
    for (const id of [
      "full_name",
      "email",
      "education_1_institution",
      "employment_1_employer",
      "languages_spoken",
    ]) {
      expect(resumeIds).toContain(id);
    }
  });

  it("only returns field IDs that exist and are candidate-owned", () => {
    const candidateSet = new Set(CANDIDATE_FIELD_IDS);
    for (const sourceKind of ["resume", "linkedin"] as const) {
      for (const id of getExtractableFieldIds(sourceKind)) {
        expect(candidateSet.has(id)).toBe(true);
      }
    }
  });
});
